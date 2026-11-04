param([string]$OutputPath, [ValidateSet(1, 2, 3, 4, 5, 6)][int]$Stage = 1, [switch]$ChecksOnly, [switch]$Controls, [switch]$Content, [switch]$TimezonesOnly)
$ErrorActionPreference = 'Stop'
$ganttFront = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ganttBack = (Resolve-Path (Join-Path $ganttFront '../backend')).Path
if (-not $OutputPath) { $OutputPath = Join-Path $ganttFront (('docs/gantt/evidencias-etapa-' + $Stage + '-') + (Get-Date -Format yyyyMMddHHmmss)) }
$ganttOutput = [IO.Path]::GetFullPath($OutputPath)
$ganttTemp = Join-Path ([IO.Path]::GetTempPath()) ('gm-gantt-' + [Guid]::NewGuid().ToString('N'))
$ganttContainer = $null
$ganttServer = $null
$ganttVite = $null
$ganttPrevious = @{}
$ganttKeys = @('MYSQL_ROOT_PASSWORD','MYSQL_PWD','GM_TEST_MYSQL_PASSWORD','GM_TEST_MYSQL_PORT','DJANGO_SETTINGS_MODULE','FRONTEND_ORIGIN','VITE_API_BASE_URL','API_PROXY_TARGET','GM_CALENDAR_BROWSER','GM_GANTT_BROWSER','GM_GANTT_STAGE','GM_GANTT_CONTROLS','GM_GANTT_CONTENT','GM_QA_SECRETS_PATH','GM_BROWSER_REPORT_DIR','GM_PLAYWRIGHT_MODULE','PYTHONIOENCODING')
foreach ($key in $ganttKeys) { $ganttPrevious[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
try {
    docker info --format '{{.ServerVersion}}'
    if ($LASTEXITCODE -ne 0) { throw 'Docker no está disponible; no se conectará otra base.' }
    $ports = [Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners().Port
    if (8819 -in $ports -or 5189 -in $ports) { throw 'Puertos QA ocupados; no se reutilizarán servidores ajenos.' }
    New-Item -ItemType Directory -Path $ganttTemp | Out-Null
    New-Item -ItemType Directory -Force -Path $ganttOutput | Out-Null
    $env:MYSQL_ROOT_PASSWORD = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
    $env:MYSQL_PWD = $env:MYSQL_ROOT_PASSWORD
    $env:GM_TEST_MYSQL_PASSWORD = $env:MYSQL_ROOT_PASSWORD
    $created = docker run --detach --label gm.gantt-stage-1=true --env MYSQL_ROOT_PASSWORD --publish 127.0.0.1::3306 mysql:8.4 --skip-log-bin
    if ($LASTEXITCODE -ne 0 -or $created -notmatch '^[a-f0-9]{64}$') { throw 'No se pudo crear MySQL desechable.' }
    $ganttContainer = $created.Trim()
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        $ErrorActionPreference = 'Continue'
        $null = docker exec --env MYSQL_PWD $ganttContainer mysql --protocol=TCP --host=127.0.0.1 --user=root --execute 'SELECT 1' 2>&1
        $probeExit = $LASTEXITCODE
        $ErrorActionPreference = 'Stop'
        if ($probeExit -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw 'MySQL temporal no arrancó.' }
    $network = docker inspect --format '{{json .NetworkSettings.Ports}}' $ganttContainer | ConvertFrom-Json
    $env:GM_TEST_MYSQL_PORT = $network.'3306/tcp'[0].HostPort
    docker exec --env MYSQL_PWD $ganttContainer mysql --user=root --execute 'CREATE DATABASE gm_test_task_status_templates CHARACTER SET utf8mb4'
    if ($LASTEXITCODE -ne 0) { throw 'No se creó la base sintética nueva.' }
    $env:DJANGO_SETTINGS_MODULE = 'config.settings_test_mysql_templates'
    $env:FRONTEND_ORIGIN = 'http://localhost:5189'
    $env:VITE_API_BASE_URL = ''
    $env:API_PROXY_TARGET = 'http://127.0.0.1:8819'
    $env:GM_CALENDAR_BROWSER = '1'
    $env:GM_GANTT_BROWSER = '1'
    $env:GM_GANTT_STAGE = [string]$Stage
    $env:GM_GANTT_CONTROLS = [string][int][bool]($Controls -or $Content)
    $env:GM_GANTT_CONTENT = [string][int][bool]$Content
    $env:PYTHONIOENCODING = 'utf-8'
    $env:GM_QA_SECRETS_PATH = Join-Path $ganttTemp 'credentials.json'
    $env:GM_BROWSER_REPORT_DIR = $ganttOutput
    if (-not $env:GM_PLAYWRIGHT_MODULE) {
        $env:GM_PLAYWRIGHT_MODULE = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
    }
    if (-not (Test-Path -LiteralPath $env:GM_PLAYWRIGHT_MODULE)) { throw 'Define GM_PLAYWRIGHT_MODULE con un Playwright existente; no se instala ninguno.' }
    $ganttServer = Start-Process -FilePath (Join-Path $ganttBack '.venv/Scripts/python.exe') -ArgumentList '-m apps.projects.tests.gantt_browser_server' -WorkingDirectory $ganttBack -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $ganttTemp 'server.log') -RedirectStandardError (Join-Path $ganttTemp 'server-errors.log')
    $ganttVite = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList 'node_modules/vite/bin/vite.js --host localhost --port 5189 --strictPort' -WorkingDirectory $ganttFront -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $ganttTemp 'vite.log') -RedirectStandardError (Join-Path $ganttTemp 'vite-errors.log')
    for ($attempt = 0; $attempt -lt 100 -and -not (Test-Path -LiteralPath $env:GM_QA_SECRETS_PATH); $attempt++) {
        if ($ganttServer.HasExited) { Get-Content -LiteralPath (Join-Path $ganttTemp 'server-errors.log'); throw 'Falló el fixture MySQL.' }
        Start-Sleep -Seconds 1
    }
    if (-not (Test-Path -LiteralPath $env:GM_QA_SECRETS_PATH)) { throw 'El fixture no terminó de preparar los datos QA.' }
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        try { $response = Invoke-WebRequest -Uri 'http://localhost:5189' -TimeoutSec 2; if ($response.StatusCode -eq 200) { break } } catch {}
        Start-Sleep -Milliseconds 250
    }
    Push-Location $ganttFront
    try {
        if ($Content) { $contentArguments = @(); if ($TimezonesOnly) { $contentArguments += "--timezones-only" }; & node.exe tests/verify-gantt-content-browser.mjs @contentArguments } elseif ($Controls) { & node.exe tests/verify-gantt-controls-browser.mjs } elseif ($Stage -eq 6) { & node.exe tests/verify-gantt-stage6-browser.mjs } elseif ($Stage -eq 5) { $ganttArguments = @(); if ($ChecksOnly) { $ganttArguments += "--checks-only" }; & node.exe tests/verify-gantt-stage5-browser.mjs @ganttArguments } elseif ($Stage -eq 4) { & node.exe tests/verify-gantt-stage4-browser.mjs } elseif ($Stage -eq 3) { & node.exe tests/verify-gantt-stage3-browser.mjs } elseif ($Stage -eq 2) { & node.exe tests/verify-gantt-stage2-browser.mjs } else { & node.exe tests/verify-gantt-browser.mjs }
        if ($LASTEXITCODE -ne 0) { throw 'Falló la comprobación Chrome de Gantt.' }
        Push-Location $ganttBack
        try {
            & ./.venv/Scripts/python.exe manage.py check --settings=config.settings_test_mysql_templates
            if ($LASTEXITCODE -ne 0) { throw 'Django check falló en configuración MySQL aislada.' }
            & ./.venv/Scripts/python.exe -m apps.projects.tests.gantt_browser_server --verify-domain
            if ($LASTEXITCODE -ne 0) { throw 'Los datos confirmados cambiaron durante la consulta.' }
        } finally { Pop-Location }

    } finally { Pop-Location }
} finally {
    foreach ($log in @('server.log','server-errors.log','vite.log','vite-errors.log')) {
        $source = Join-Path $ganttTemp $log
        if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination (Join-Path $ganttOutput $log) -Force }
    }
    foreach ($process in @($ganttServer, $ganttVite)) {
        if ($null -ne $process -and -not $process.HasExited) { Stop-Process -Id $process.Id }
    }
    if ($ganttContainer -match '^[a-f0-9]{64}$') {
        $labels = docker inspect --format '{{json .Config.Labels}}' $ganttContainer | ConvertFrom-Json
        if ($LASTEXITCODE -eq 0 -and $labels.'gm.gantt-stage-1' -eq 'true') { docker rm --force $ganttContainer | Out-Null }
    }
    if (Test-Path -LiteralPath $ganttTemp) {
        $resolved = (Resolve-Path -LiteralPath $ganttTemp).Path
        if ($resolved.StartsWith([IO.Path]::GetTempPath(), [StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $resolved) -match '^gm-gantt-[a-f0-9]{32}$') {
            Remove-Item -LiteralPath $resolved -Recurse -Force
        }
    }
    foreach ($key in $ganttKeys) { [Environment]::SetEnvironmentVariable($key, $ganttPrevious[$key], 'Process') }
    Write-Output 'MySQL y servidores QA retirados; credenciales temporales eliminadas; evidencias conservadas.'
}
