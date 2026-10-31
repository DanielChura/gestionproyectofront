import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import os from "node:os";

const { chromium } = await import(pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE).href);
const secrets = JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH, "utf8"));
const output = process.env.GM_BROWSER_REPORT_DIR;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, timezoneId: "America/Lima" });
const page = await context.newPage();
page.setDefaultTimeout(30000);
const requests = [], errors = [], measurements = [], checks = [];
let currentCheck = "benchmark";
page.on("pageerror", error => errors.push(error.message.slice(0, 300)));
page.on("response", response => {
  const url = new URL(response.url());
  if (url.pathname.startsWith("/api/")) requests.push({ path: url.pathname, method: response.request().method(), status: response.status() });
});
const origin = "http://localhost:5189";
const row = id => page.locator(".gm-task-gantt .wx-row[data-id='" + id + "']");
const bar = id => page.locator("[data-gantt-calendar-task='" + id + "']");
const metrics = async cdp => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map(item => [item.name, item.value]));
const settled = () => page.evaluate(() => new Promise(resolve => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
async function load(sample) {
  const started = performance.now();
  const reply = page.waitForResponse(response => new URL(response.url()).pathname === "/api/projects/" + sample.project + "/tasks/" && response.request().method() === "GET");
  await page.goto(origin + "/proyectos/" + sample.project + "?vista=gantt");
  assert.equal((await reply).status(), 200);
  await row(sample.first).waitFor();
  await settled();
  return performance.now() - started;
}
async function dragCancel(sample) {
  const node = bar(sample.drag);
  await node.scrollIntoViewIfNeeded();
  const box = await node.boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + Math.min(box.width / 2, 20), box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + Math.min(box.width / 2, 20) + 60, box.y + box.height / 2, { steps: 30 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  assert.equal(await page.locator("[data-calendar-dragging='true']").count(), 0);
}
try {
  await page.goto(origin);
  await page.getByLabel("Correo electrónico", { exact: true }).fill(secrets.admin.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(secrets.admin.password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByRole("button", { name: "Abrir menú de perfil" }).waitFor();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("Profiler.enable");
  if (!process.argv.includes("--checks-only")) for (const sample of secrets.context.benchmarks) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const before = requests.length;
      const mountedMs = await load(sample);
      const collection = await page.evaluate(async id => {
        const { toGanttRows } = await import("/src/features/projects/TaskGantt/ganttCalendar.ts");
        const entries = performance.getEntriesByType("resource").filter(entry => entry.name.endsWith("/api/projects/" + id + "/tasks/"));
        return { resource: entries.map(entry => ({ duration: entry.duration, transferred: entry.transferSize, encoded: entry.encodedBodySize, decoded: entry.decodedBodySize })), adapterAvailable: typeof toGanttRows === "function" };
      }, sample.project);
      const renderedRows = await page.locator(".gm-task-gantt .wx-row[data-id]").count();
      assert.ok(renderedRows > 0 && renderedRows < 100);
      const localizerCount = await page.getByRole("combobox", { name: "Localizar tarea", exact: true }).locator("option").count();
      assert.equal(localizerCount, sample.size + 1);
      await cdp.send("HeapProfiler.collectGarbage");
      const first = await metrics(cdp);
      await cdp.send("Profiler.startPreciseCoverage", { callCount: true, detailed: true });
      const started = performance.now();
      await dragCancel(sample);
      const gestureMs = performance.now() - started;
      const coverage = await cdp.send("Profiler.takePreciseCoverage");
      await cdp.send("Profiler.stopPreciseCoverage");
      const calls = {};
      for (const script of coverage.result.filter(script => script.url.includes("/src/features/projects/TaskGantt/"))) {
        for (const fn of script.functions) if (["TaskGantt", "TaskGanttToolbar", "TaskGanttBar", "useTaskGantt", "toGanttRows"].includes(fn.functionName)) {
          calls[fn.functionName] = (calls[fn.functionName] ?? 0) + fn.ranges[0].count;
        }
      }
      await cdp.send("HeapProfiler.collectGarbage");
      const last = await metrics(cdp);
      const reads = requests.slice(before).filter(entry => entry.method === "GET" && entry.path.startsWith("/api/projects/"));
      assert.equal(reads.filter(entry => entry.path === "/api/projects/" + sample.project + "/tasks/").length, 1);
      assert.equal(reads.filter(entry => /\/tasks\/\d+\//.test(entry.path)).length, 0);
      measurements.push({ size: sample.size, attempt, mounted_ms: mountedMs, gesture_ms: gestureMs, function_calls: calls,
        rendered_rows: renderedRows, localizer_options: localizerCount, collection, reads,
        gesture_script_ms: (last.ScriptDuration - first.ScriptDuration) * 1000,
        gesture_task_ms: (last.TaskDuration - first.TaskDuration) * 1000,
        listeners_before: first.JSEventListeners, listeners_after: last.JSEventListeners, nodes_before: first.Nodes, nodes_after: last.Nodes });
      console.log("MEASURE " + sample.size + " #" + attempt + " mount=" + mountedMs.toFixed(0) + " gesture=" + gestureMs.toFixed(0) + " calls=" + JSON.stringify(calls));
    }
  }

  const sample = secrets.context.benchmarks[0];
  await load(sample);
  const locate = async id => {
    await page.getByRole("combobox", { name: "Localizar tarea", exact: true }).selectOption(String(id));
    await row(id).waitFor();
    await settled();
  };
  async function check(name, callback) {
    currentCheck = name;
    checks.push({ name, status: "Aprobado", details: await callback() });
    console.log("OK " + name);
  }
  await check("Adapter cost, complete references and no tree adaptation for each pointer move", async () => {
    const results = [];
    for (const sample of secrets.context.benchmarks) {
      await load(sample);
      const listing = await page.getByRole("combobox", { name: "Localizar tarea", exact: true }).locator("option").count();
      assert.equal(listing, sample.size + 1);
      const measured = await page.evaluate(async sample => {
        const { toGanttRows, fromGanttWindow } = await import("/src/features/projects/TaskGantt/ganttCalendar.ts");
        const { ganttProjection, emptyGanttFilters } = await import("/src/features/projects/TaskGantt/ganttQuery.ts");
        const auth = await import("/src/features/auth/api.ts");
        const { getTasks } = await import("/src/features/projects/services.ts");
        const before = auth.sessionVersion();
        const tasks = await getTasks(sample.project);
        if (before !== auth.sessionVersion()) throw new Error("Unexpected session change");
        const times = [];
        for (let repeat = 0; repeat < 31; repeat++) {
          const start = performance.now();
          const rows = toGanttRows(ganttProjection(tasks, emptyGanttFilters, tasks[4].start_date).tasks);
          const window = fromGanttWindow(rows[3]);
          if (window.due_date !== null) throw new Error("Null due changed");
          if (repeat) times.push(performance.now() - start);
        }
        times.sort((a, b) => a - b);
        return { rows: tasks.length, samples: times.length, median_ms: times[15], p95_ms: times[28], max_ms: times[29] };
      }, sample);
      assert.equal(measured.rows, sample.size);
      results.push(measured);
    }
    await load(sample);
    return results;
  });
  await check("Light/dark at 1600, 1024, 768 and 390px, scoped typography, contrast and readable timeline", async () => {
    const snapshots = [];
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => { globalThis.localStorage.setItem("theme", theme); }, theme);
      await page.reload();
      await row(sample.first).waitFor();
      for (const width of [1600, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await settled();
        const values = await page.locator(".gm-task-gantt").evaluate(node => {
          const rgb = color => {
            const canvas = globalThis.document.createElement("canvas");
            canvas.width = canvas.height = 1;
            const c = canvas.getContext("2d");
            c.fillStyle = color; c.fillRect(0, 0, 1, 1);
            return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3);
          };
          const luminance = color => rgb(color).map(v => { const n = v / 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }).reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
          const style = globalThis.getComputedStyle(node.querySelector(".wx-willow-theme"));
          const fg = style.getPropertyValue("--wx-grid-header-font-color");
          const bg = style.getPropertyValue("--wx-background");
          const a = luminance(fg), b = luminance(bg);
          const table = node.querySelector(".wx-table"), chart = node.querySelector(".wx-chart");
          return { width: node.clientWidth, grid_width: table.getBoundingClientRect().width, timeline_width: chart.getBoundingClientRect().width,
            outer_width: node.parentElement.clientWidth, overflow: node.parentElement.scrollWidth > node.parentElement.clientWidth,
            page_width: globalThis.document.documentElement.scrollWidth, viewport_width: globalThis.innerWidth,
            font: style.getPropertyValue("--wx-grid-header-font"), contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
            columns: [...node.querySelectorAll(".wx-header .wx-cell")].map(cell => cell.textContent) };
        });
        assert.ok(values.timeline_width >= 350, JSON.stringify(values));
        assert.ok(values.page_width <= width + 1, JSON.stringify(values));
        assert.match(values.font, /Inter/);
        assert.ok(values.contrast >= 4.5, JSON.stringify(values));
        if (width === 390) assert.ok(values.overflow);
        if (width === 1600) {
          const normal = await row(sample.first).locator("time span").first().evaluate(node => globalThis.getComputedStyle(node).color);
          const historic = await row(sample.red).locator("[data-before-creation]").first().evaluate(node => ({
            color: globalThis.getComputedStyle(node).color,
            token: globalThis.getComputedStyle(node).getPropertyValue("--color-red-300"),
          }));
          values.date_colors = { normal, historical_before_creation: historic };
          assert.notEqual(historic.color, normal, JSON.stringify({ theme, normal, historic }));
        }
        await page.screenshot({ path: path.join(output, theme + "-" + width + ".png"), fullPage: true });
        snapshots.push({ theme, width, ...values });
      }
    }
    return snapshots;
  });
  await check("Columns use shared popover, keyboard focus returns and no compressed timeline", async () => {
    const trigger = page.getByRole("button", { name: "Columnas de Gantt:", exact: true });
    await trigger.click();
    const popup = page.getByRole("dialog", { name: "Columnas de Gantt", exact: true });
    await popup.waitFor();
    await popup.getByRole("button", { name: "Responsable", exact: true }).click();
    assert.equal(await popup.getByRole("button", { name: "Responsable", exact: true }).getAttribute("aria-pressed"), "true");
    await page.keyboard.press("Escape");
    assert.equal(await trigger.evaluate(node => node === globalThis.document.activeElement), true);
    const region = page.getByRole("region", { name: "Calendario de tareas; tabla y línea de tiempo", exact: true });
    await region.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => globalThis.document.querySelector("[aria-label=\"Calendario de tareas; tabla y línea de tiempo\"]").scrollLeft > 0);
    const scrolled = await region.evaluate(node => node.scrollLeft);
    assert.ok(scrolled > 0);
    await page.screenshot({ path: path.join(output, "mobile-columns-scroll.png"), fullPage: true });
    await page.setViewportSize({ width: 1600, height: 1100 });
    await page.reload();
    await row(sample.first).waitFor();
    return { shared_popup: true, keyboard_return: true, keyboard_horizontal_scroll: scrolled };
  });
  await check("Per-control borders, concise tooltips, visible focus and keyboard navigation", async () => {
    const previous = page.getByRole("button", { name: "Anterior", exact: true });
    const today = page.getByRole("button", { name: "Hoy", exact: true });
    await page.getByRole("heading", { level: 1 }).click();
    await page.mouse.move(1, 1);
    assert.equal(await today.evaluate(node => globalThis.getComputedStyle(node).borderColor), "rgba(0, 0, 0, 0)");
    await previous.hover();
    assert.notEqual(await previous.evaluate(node => globalThis.getComputedStyle(node).borderColor), "rgba(0, 0, 0, 0)");
    assert.equal(await today.evaluate(node => globalThis.getComputedStyle(node).borderColor), "rgba(0, 0, 0, 0)");
    await page.getByRole("combobox", { name: "Escala de Gantt", exact: true }).focus();
    await page.keyboard.press("Tab");
    assert.equal(await previous.evaluate(node => node === globalThis.document.activeElement), true);
    const outline = await previous.evaluate(node => globalThis.getComputedStyle(node).outlineWidth);
    assert.notEqual(outline, "0px");
    await page.keyboard.press("Enter");
    await today.click();
    await locate(sample.drag);
    const name = await row(sample.drag).getByRole("button", { name: /^Abrir tarea/ }).textContent();
    await page.getByRole("region", { name: "Acciones de la tarea seleccionada", exact: true }).getByRole("button", { name: "Editar datos", exact: true }).click();
    await page.locator("dialog[open]").waitFor();
    assert.ok((await page.locator("dialog[open]").textContent()).includes("Fecha"));
    await page.keyboard.press("Escape");
    return { normal_border: "transparent", individual_hover: true, focus_width: outline, keyboard: true, shared_calendar_form: Boolean(name) };
  });
  await check("Repeated cancellation immediately restarts, smooth preview without extra card or residual modal", async () => {
    await locate(sample.drag);
    const startRequests = requests.filter(entry => entry.method !== "GET" && entry.path.startsWith("/api/projects/")).length;
    for (let i = 0; i < 5; i++) await dragCancel(sample);
    const node = bar(sample.drag), box = await node.boundingBox();
    await page.mouse.move(box.x + 20, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + box.height / 2, { steps: 20 });
    assert.equal(await page.locator(".gm-gantt-preview").count(), 1);
    assert.equal(await page.getByRole("region", { name: "Operaciones de calendario", exact: true }).count(), 0);
    await page.screenshot({ path: path.join(output, "drag-preview.png"), fullPage: true });
    await page.keyboard.press("Escape"); await page.mouse.up();
    assert.equal(await page.locator("dialog[open]").count(), 0);
    await row(sample.drag).getByRole("button", { name: /^Abrir tarea/ }).click();
    await page.locator("dialog[open]").waitFor();
    await page.keyboard.press("Escape");
    assert.equal(requests.filter(entry => entry.method !== "GET" && entry.path.startsWith("/api/projects/")).length, startRequests);
    await cdp.send("HeapProfiler.collectGarbage");
    const before = await metrics(cdp);
    for (let i = 0; i < 5; i++) await dragCancel(sample);
    await page.getByRole("heading", { level: 1 }).click();
    await page.mouse.move(1, 1);
    await cdp.send("HeapProfiler.collectGarbage");
    const after = await metrics(cdp);
    assert.ok(after.JSEventListeners <= before.JSEventListeners + 2, JSON.stringify({ before: before.JSEventListeners, after: after.JSEventListeners }));
    return { cancellations: 11, writes: 0, no_residual_modal: true, listeners_before: before.JSEventListeners, listeners_after: after.JSEventListeners };
  });
  await check("Targeted refresh preserves chart, selection, expansion and scroll, errors retain valid rows", async () => {
    await locate(sample.parent);
    const collapse = page.getByRole("button", { name: "Contraer subtareas de Tarea 0010 medición QA", exact: true });
    await collapse.click();
    await locate(sample.drag);
    const chart = page.locator(".gm-task-gantt .wx-chart");
    await chart.hover(); await page.mouse.wheel(120, 120); await settled();
    const before = await chart.evaluate(node => ({ left: node.scrollLeft, top: node.scrollTop }));
    const handle = await page.locator(".gm-task-gantt").elementHandle();
    const collection = "**/api/projects/" + sample.project + "/tasks/";
    let release, started;
    const gate = new Promise(resolve => { release = resolve; });
    const seen = new Promise(resolve => { started = resolve; });
    const delay = async route => { const response = await route.fetch(); started(); await gate; await route.fulfill({ response }); };
    await page.route(collection, delay);
    await page.getByRole("button", { name: "Actualizar Gantt", exact: true }).click();
    await seen;
    assert.equal(await handle.evaluate(node => node.isConnected), true);
    assert.equal(await page.getByText("Cargando Gantt…", { exact: true }).count(), 0);
    release();
    await page.getByRole("button", { name: "Actualizar Gantt", exact: true }).waitFor({ state: "visible" });
    await page.waitForFunction(() => !globalThis.document.querySelector("button[aria-label='Actualizar Gantt']")?.disabled);
    await page.unroute(collection, delay);
    assert.equal(await handle.evaluate(node => node.isConnected), true);
    assert.equal(await page.getByRole("combobox", { name: "Localizar tarea", exact: true }).inputValue(), String(sample.drag));
    const after = await chart.evaluate(node => ({ left: node.scrollLeft, top: node.scrollTop }));
    assert.ok(Math.abs(before.left - after.left) < 2 && Math.abs(before.top - after.top) < 2, JSON.stringify({ before, after }));
    const failure = route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Error QA de actualización" }) });
    await page.route(collection, failure);
    await page.getByRole("button", { name: "Actualizar Gantt", exact: true }).click();
    await page.getByRole("button", { name: "Reintentar tareas", exact: true }).waitFor();
    assert.equal(await handle.evaluate(node => node.isConnected), true);
    await page.unroute(collection, failure);
    await page.getByRole("button", { name: "Reintentar tareas", exact: true }).click();
    await page.getByRole("button", { name: "Reintentar tareas", exact: true }).waitFor({ state: "hidden" });
    await locate(sample.parent);
    await page.getByRole("button", { name: "Expandir subtareas de Tarea 0010 medición QA", exact: true }).waitFor();
    return { same_widget: true, before, after, collapse_preserved: true, readable_error_and_retry: true };
  });
  await check("Creation-relative red dates, normal historical date, List/Board/Home CSS and lazy boundaries", async () => {
    await page.setViewportSize({ width: 1600, height: 1100 });
    await locate(sample.first);
    assert.equal(await row(sample.first).locator("[data-before-creation='true']").count(), 0);
    assert.ok(await row(sample.red).locator("[data-before-creation='true']").count() > 0);
    const previous = secrets.context.project;
    await page.goto(origin + "/proyectos/" + previous + "?vista=gantt");
    await row(secrets.context.one_day).waitFor();
    assert.equal(await row(secrets.context.one_day).locator("[data-before-creation='true']").count(), 0);
    await row(secrets.context.historical).waitFor();
    assert.ok(await row(secrets.context.historical).locator("[data-before-creation='true']").count() > 0);
    const region = page.getByRole("region", { name: "Calendario de tareas; tabla y línea de tiempo", exact: true });
    assert.equal(await region.evaluate(node => globalThis.getComputedStyle(node).fontFamily).then(text => text.includes("Inter")), true);
    const routeChecks = [];
    for (const view of ["lista", "tablero"]) {
      await page.goto(origin + "/proyectos/" + previous + "?vista=" + view);
      await page.getByRole("button", { name: "Crear nueva tarea", exact: true }).waitFor();
      assert.equal(await page.locator(".gm-task-gantt").count(), 0);
      const resources = await page.evaluate(() => performance.getEntriesByType("resource").filter(entry => /TaskGantt\.tsx|@svar-ui_react-gantt|taskGantt\.css/.test(entry.name)).map(entry => entry.name));
      assert.deepEqual(resources, []);
      await page.screenshot({ path: path.join(output, "regression-" + view + ".png"), fullPage: true });
      routeChecks.push({ view, gantt_resources: resources.length });
    }
    await page.goto(origin + "/");
    await page.getByRole("button", { name: "Abrir menú de perfil", exact: true }).waitFor();
    assert.equal(await page.locator(".gm-task-gantt").count(), 0);
    await page.screenshot({ path: path.join(output, "regression-home.png"), fullPage: true });
    return { creation_rule_unchanged: true, routeChecks };
  });

  assert.equal(requests.filter(entry => entry.method !== "GET" && entry.path.startsWith("/api/projects/")).length, 0);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: path.join(output, "baseline-large.png"), fullPage: true });
  checks.push({ name: "Complete authorized collections, virtualization, no per-task read and cancellation without writes", status: "Aprobado" });
} catch (error) {
  checks.push({ name: currentCheck, status: "Fallido", reason: error.message.slice(0, 600) });
  await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await writeFile(path.join(output, "performance-browser.json"), JSON.stringify({ environment: { chrome: browser.version(), node: process.version, os: os.platform() + " " + os.release(), cpus: os.cpus().length, cpu: os.cpus()[0]?.model, memory_gib: os.totalmem() / 2 ** 30, viewport: { width: 1600, height: 1100 }, mode: "Vite dev / Chrome CDP precise coverage, no CPU/network throttle" }, measurements, checks, requests, errors }, null, 2));
  await context.close();
  await browser.close();
}
