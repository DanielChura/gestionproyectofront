import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE).href);
const secrets = JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH, "utf8"));
const data = secrets.context;
const output = process.env.GM_BROWSER_REPORT_DIR;
await mkdir(output, { recursive: true });
const origin = "http://localhost:5189";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const resources = [], network = [], errors = [], records = [], clients = [];
let admin, baselineTasks, currentCheck = "";
function observe(page, role) {
  page.on("pageerror", (error) => errors.push({ role, message: error.message.slice(0, 300) }));
  page.on("request", (request) => resources.push({ role, path: new URL(request.url()).pathname }));
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith("/api/")) network.push({ role, path: pathname, method: response.request().method(), status: response.status() });
  });
}
async function login(role) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, timezoneId: "America/Lima" });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  observe(page, role);
  clients.push({ page, context, role });
  await page.goto(origin);
  await page.getByLabel("Correo electrónico", { exact: true }).fill(secrets[role].email);
  await page.getByLabel("Contraseña", { exact: true }).fill(secrets[role].password);
  const waiting = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/auth/login/" && response.request().method() === "POST");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  const reply = await waiting;
  assert.equal(reply.status(), 200);
  await page.getByRole("button", { name: "Abrir menú de perfil" }).waitFor();
  return { page, context, role, token: (await reply.json()).access };
}
async function request(client, resource) {
  const response = await client.context.request.get(origin + "/api/" + resource, {
    headers: { Authorization: "Bearer " + client.token }, maxRetries: 0,
  });
  return { status: response.status(), body: await response.json() };
}
function ganttAssets(role = "admin") {
  return resources.filter((entry) => entry.role === role && /@svar-ui_react-gantt|TaskGantt\/TaskGantt\.tsx|taskGantt\.css|TaskGantt-[^/]+\.js/.test(entry.path));
}
async function check(name, callback) {
  currentCheck = name;
  const details = await callback();
  records.push({ name, status: "Aprobado", details });
  console.log("OK " + name);
}
try {
  admin = await login("admin");
  await check("Inicio Lista y Tablero no solicitan el widget Gantt", async () => {
    assert.equal(ganttAssets().length, 0);
    await admin.page.goto(origin + "/proyectos/" + data.project);
    await admin.page.locator(".gm-task-list").waitFor();
    await admin.page.getByRole("link", { name: "Tablero", exact: true }).click();
    await admin.page.getByRole("link", { name: "Lista", exact: true }).click();
    await admin.page.locator(".gm-task-list").waitFor();
    assert.equal(ganttAssets().length, 0);
    return { widget_requests: 0 };
  });
  await check("Montaje real MIT con colección autorizada", async () => {
    const tasks = await request(admin, "projects/" + data.project + "/tasks/");
    assert.equal(tasks.status, 200);
    baselineTasks = tasks.body;
    await admin.page.getByRole("link", { name: "Gantt", exact: true }).click();
    await admin.page.getByRole("button", { name: "Abrir tarea Un día Gantt QA", exact: true }).waitFor();
    assert.ok(ganttAssets().length > 0);
    await admin.page.screenshot({ path: path.join(output, "01_gantt_real.png"), fullPage: true });
    const diagnostics = await admin.page.locator(".gm-task-gantt").evaluate((element) => ({
      text: element.textContent.slice(0, 1800),
      bars: [...element.querySelectorAll("[data-id]")].slice(0, 35).map((node) => ({ tag: node.tagName, id: node.getAttribute("data-id"), class: node.getAttribute("class") })),
      buttons: [...element.querySelectorAll("button")].map((node) => ({ label: node.getAttribute("aria-label"), text: node.textContent })),
    }));
    await writeFile(path.join(output, "montaje_dom.json"), JSON.stringify(diagnostics, null, 2));
    return { authorized_tasks: tasks.body.length, widget_requests: ganttAssets().length };
  });
  await check("Un día histórico y límite null conservan fechas y presentación", async () => {
    for (const id of [data.one_day, data.historical]) {
      const task = baselineTasks.find((item) => item.id === id);
      const row = admin.page.locator(".gm-task-gantt .wx-row[data-id='" + id + "']");
      assert.equal(await row.locator("time[datetime='" + task.start_date + "']").count(), 2);
      const bar = admin.page.locator(".gm-task-gantt .wx-bar[data-id='" + id + "']");
      const box = await bar.boundingBox();
      assert.ok(box && Math.abs(box.width - 40) < 2, "one day must occupy one calendar cell");
    }
    assert.equal(await admin.page.locator(".gm-task-gantt .wx-row[data-id='" + data.historical + "'] [data-before-creation]").count(), 2);
    for (const id of [data.unbounded, data.null_child, data.orphan]) {
      const row = admin.page.locator(".gm-task-gantt .wx-row[data-id='" + id + "']");
      await row.getByText("Sin fecha límite", { exact: true }).waitFor();
      assert.equal(await row.locator("time").count(), 1);
      assert.equal(await admin.page.locator(".gm-task-gantt .wx-bar[data-id='" + id + "']").isVisible(), false);
    }
    await admin.page.screenshot({ path: path.join(output, "02_fechas_y_null.png"), fullPage: true });
    return { one_day_cells: 1, historical_cells: 1, unbounded_rows: 3, unbounded_temporal_bars: 0 };
  });
  await check("Jerarquía navegable por teclado sin resúmenes ni propagación", async () => {
    const collapse = admin.page.getByRole("button", { name: "Contraer subtareas de Sin límite Gantt QA", exact: true });
    await collapse.focus();
    await admin.page.keyboard.press("Enter");
    await admin.page.getByRole("button", { name: "Abrir tarea Subtarea sin límite Gantt QA", exact: true }).waitFor({ state: "hidden" });
    const expand = admin.page.getByRole("button", { name: "Expandir subtareas de Sin límite Gantt QA", exact: true });
    await expand.focus();
    await admin.page.keyboard.press("Enter");
    await admin.page.getByRole("button", { name: "Abrir tarea Subtarea sin límite Gantt QA", exact: true }).waitFor();
    assert.equal(await admin.page.locator(".gm-task-gantt .wx-bar.wx-summary").count(), 0);
    assert.deepEqual((await request(admin, "projects/" + data.project + "/tasks/")).body, baselineTasks);
    return { keyboard_expand_collapse: true, summary_tasks: 0, own_states_and_dates_preserved: true };
  });
  await check("Detalle compartido accesible desde una tarea sin fecha límite", async () => {
    await admin.page.getByRole("button", { name: "Abrir tarea Sin límite Gantt QA", exact: true }).click();
    await admin.page.locator('dialog[open] section[aria-label="Propiedades de la tarea"]').waitFor();
    await admin.page.keyboard.press("Escape");
    await admin.page.locator("dialog[open]").waitFor({ state: "hidden" });
    return { existing_detail: true, writes: 0 };
  });
  await check("Ratón teclado doble clic y menú no editan el widget", async () => {
    const bar = admin.page.locator(".gm-task-gantt .wx-bar[data-id='" + data.one_day + "']");
    await bar.scrollIntoViewIfNeeded();
    const box = await bar.boundingBox();
    assert.ok(box);
    await admin.page.mouse.move(box.x + 10, box.y + box.height / 2);
    await admin.page.mouse.down();
    await admin.page.mouse.move(box.x + 90, box.y + box.height / 2, { steps: 8 });
    await admin.page.mouse.up();
    await bar.dblclick();
    await admin.page.keyboard.press("Delete");
    await admin.page.keyboard.press("Insert");
    await admin.page.keyboard.press("Control+c");
    await admin.page.keyboard.press("Control+v");
    await bar.click({ button: "right" });
    await admin.page.keyboard.press("Escape");
    assert.equal(await admin.page.locator(".wx-gantt-editor,dialog[open]").count(), 0);
    assert.equal(network.filter((entry) => entry.path.startsWith("/api/projects/") && entry.method !== "GET").length, 0);
    assert.deepEqual((await request(admin, "projects/" + data.project + "/tasks/")).body, baselineTasks);
    return { pointer_drag: true, keyboard_attempts: 4, internal_editor: false, domain_writes: 0 };
  });
  await check("Proyecto completamente sin límites mantiene sus dos filas y ninguna barra", async () => {
    await admin.page.goto(origin + "/proyectos/" + data.null_project + "?vista=gantt");
    await admin.page.getByRole("button", { name: "Abrir tarea Padre abierto Gantt QA", exact: true }).waitFor();
    await admin.page.getByRole("button", { name: "Abrir tarea Hijo abierto Gantt QA", exact: true }).waitFor();
    assert.equal(await admin.page.locator(".gm-task-gantt .wx-row[data-id]").count(), 2);
    assert.equal(await admin.page.locator(".gm-task-gantt .wx-bar:visible").count(), 0);
    await admin.page.screenshot({ path: path.join(output, "03_solo_sin_limites.png"), fullPage: true });
    return { rows: 2, visible_bars: 0 };
  });
  await check("Vacío real y fallo de carga con reintento se distinguen", async () => {
    const route = "**/api/projects/" + data.empty_project + "/tasks/";
    let once = false;
    const failure = async (request) => {
      if (once) return request.continue();
      once = true;
      await request.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Indisponibilidad QA controlada" }) });
    };
    await admin.page.route(route, failure);
    await admin.page.goto(origin + "/proyectos/" + data.empty_project + "?vista=gantt");
    await admin.page.locator("main").getByRole("button", { name: "Reintentar", exact: true }).waitFor();
    assert.equal(await admin.page.getByText("Este proyecto todavía no tiene tareas.", { exact: true }).count(), 0);
    await admin.page.locator("main").getByRole("button", { name: "Reintentar", exact: true }).click();
    await admin.page.getByText("Este proyecto todavía no tiene tareas.", { exact: true }).waitFor();
    await admin.page.unroute(route, failure);
    return { failed_read: 503, retry_success: 200, valid_empty: true };
  });
  await check("Carga diferida cancelada al salir no monta una vista anterior", async () => {
    const client = await login("admin_delay");
    let arrived, release, delivered;
    const pending = new Promise((resolve) => { arrived = resolve; });
    const gate = new Promise((resolve) => { release = resolve; });
    const done = new Promise((resolve) => { delivered = resolve; });
    const route = "**/src/features/projects/TaskGantt/TaskGantt.tsx*";
    const hold = async (request) => { arrived(); await gate; await request.continue(); delivered(); };
    await client.page.route(route, hold);
    await client.page.goto(origin + "/proyectos/" + data.project);
    await client.page.locator(".gm-task-list").waitFor();
    await client.page.getByRole("link", { name: "Gantt", exact: true }).click();
    await pending;
    await client.page.getByText("Cargando Gantt…", { exact: true }).waitFor();
    await client.page.getByRole("link", { name: "Lista", exact: true }).click();
    release();
    await done;
    await client.page.unroute(route, hold);
    await client.page.locator(".gm-task-list").waitFor();
    assert.equal(await client.page.locator(".gm-task-gantt").count(), 0);
    await client.page.getByRole("link", { name: "Gantt", exact: true }).click();
    await client.page.getByRole("button", { name: "Abrir tarea Un día Gantt QA", exact: true }).waitFor();
    return { delayed_module: true, left_view_during_load: true, late_mount: false };
  });
  await check("Trabajador recibe solo sus tareas y conserva subtarea cuyo padre no está autorizado", async () => {
    const worker = await login("worker");
    const visible = await request(worker, "projects/" + data.project + "/tasks/");
    assert.equal(visible.status, 200);
    assert.ok(visible.body.some((item) => item.id === data.orphan));
    assert.ok(!visible.body.some((item) => item.id === data.unbounded));
    await worker.page.goto(origin + "/proyectos/" + data.project + "?vista=gantt");
    await worker.page.getByRole("button", { name: "Abrir tarea Subtarea autorizada Gantt QA", exact: true }).waitFor();
    assert.equal(await worker.page.getByRole("button", { name: "Abrir tarea Sin límite Gantt QA", exact: true }).count(), 0);
    assert.equal(await worker.page.locator(".gm-task-gantt .wx-row[data-id]").count(), visible.body.length);
    await worker.page.screenshot({ path: path.join(output, "04_ambito_trabajador.png"), fullPage: true });
    await worker.page.goto(origin + "/proyectos/" + data.readonly_project + "?vista=gantt");
    await worker.page.getByRole("button", { name: "Abrir tarea Tarea consulta Gantt QA", exact: true }).waitFor();
    assert.equal(await worker.page.locator(".wx-gantt-editor").count(), 0);
    const readonly = await request(worker, "projects/" + data.readonly_project + "/tasks/" + data.readonly_task + "/");
    assert.equal(readonly.status, 200);
    assert.equal(readonly.body.task.permissions.edit, false);
    assert.equal(readonly.body.task.permissions.state, false);

    return { authorized_rows: visible.body.length, foreign_parent_fetched: false, readonly_project_visible: true };
  });
  await check("Un usuario ajeno no recibe el proyecto ni sus tareas", async () => {
    const outsider = await login("outsider");
    const project = await request(outsider, "projects/" + data.project + "/");
    const tasks = await request(outsider, "projects/" + data.project + "/tasks/");
    assert.equal(project.status, 404);
    assert.equal(tasks.status, 404);
    await outsider.page.goto(origin + "/proyectos/" + data.project + "?vista=gantt");
    await outsider.page.locator("main [role='alert']").waitFor();
    assert.equal(await outsider.page.locator(".gm-task-gantt").count(), 0);
    return { project: project.status, tasks: tasks.status, widget_mounted: false };
  });
  await check("Temas claro oscuro y ancho móvil mantienen tabla accesible", async () => {
    await admin.page.evaluate(() => globalThis.localStorage.setItem("theme", "dark"));
    await admin.page.goto(origin + "/proyectos/" + data.project + "?vista=gantt");
    await admin.page.getByRole("button", { name: "Abrir tarea Un día Gantt QA", exact: true }).waitFor();
    assert.equal(await admin.page.evaluate(() => globalThis.document.documentElement.classList.contains("dark")), true);
    const background = await admin.page.locator(".gm-task-gantt .wx-willow-theme").first().evaluate((node) => globalThis.getComputedStyle(node).getPropertyValue("--wx-background").trim());
    assert.ok(background);
    await admin.page.screenshot({ path: path.join(output, "05_gantt_oscuro.png"), fullPage: true });
    await admin.page.setViewportSize({ width: 390, height: 844 });
    await admin.page.getByRole("region", { name: "Calendario de tareas; tabla y línea de tiempo", exact: true }).waitFor();
    const horizontal = await admin.page.getByRole("region", { name: "Calendario de tareas; tabla y línea de tiempo", exact: true }).evaluate((node) => node.scrollWidth > node.clientWidth);
    assert.equal(horizontal, true);
    await admin.page.screenshot({ path: path.join(output, "06_gantt_movil.png"), fullPage: true });
    await admin.page.setViewportSize({ width: 1600, height: 1000 });
    await admin.page.evaluate(() => globalThis.localStorage.setItem("theme", "light"));
    return { dark_theme: true, mobile_scroll_region: true, mobile_width: 390 };
  });
  await check("Fallo del módulo diferido conserva error y permite reintentar", async () => {
    const client = await login("admin_chunk");
    let once = false;
    const route = "**/src/features/projects/TaskGantt/TaskGantt.tsx*";
    const fail = async (request) => {
      if (once) return request.continue();
      once = true;
      await request.fulfill({ status: 503, contentType: "text/javascript", headers: { "Cache-Control": "no-store" }, body: "" });
    };
    await client.page.route(route, fail);
    await client.page.goto(origin + "/proyectos/" + data.project);
    await client.page.locator(".gm-task-list").waitFor();
    await client.page.getByRole("link", { name: "Gantt", exact: true }).click();
    await client.page.getByRole("button", { name: "Reintentar Gantt", exact: true }).waitFor();
    await client.page.getByRole("button", { name: "Reintentar Gantt", exact: true }).click();
    await client.page.getByRole("button", { name: "Abrir tarea Un día Gantt QA", exact: true }).waitFor();
    await client.page.unroute(route, fail);
    return { module_failure: 503, retry_succeeded: true };
  });
  await check("Recarga entrada y salida repetidas no escriben ni alteran calendarios", async () => {
    await admin.page.reload();
    await admin.page.getByRole("button", { name: "Abrir tarea Un día Gantt QA", exact: true }).waitFor();
    for (let index = 0; index < 3; index++) {
      await admin.page.getByRole("link", { name: "Lista", exact: true }).click();
      await admin.page.locator(".gm-task-list").waitFor();
      await admin.page.getByRole("link", { name: "Gantt", exact: true }).click();
      await admin.page.getByRole("button", { name: "Abrir tarea Un día Gantt QA", exact: true }).waitFor();
    }
    const writes = network.filter((entry) => entry.path.startsWith("/api/projects/") && entry.method !== "GET");
    assert.deepEqual(writes, []);
    assert.deepEqual((await request(admin, "projects/" + data.project + "/tasks/")).body, baselineTasks);
    return { remounts: 3, reload: true, project_writes: 0, snapshots_identical: true };
  });

  assert.deepEqual(errors, []);
} catch (error) {
  records.push({ name: currentCheck || "Recorrido actual", status: "Fallido", detail: error.message });
  if (admin) await admin.page.screenshot({ path: path.join(output, "fallo.png"), fullPage: true }).catch(() => {});
  process.exitCode = 1;
  console.error(error.message);
} finally {
  await writeFile(path.join(output, "resultados.json"), JSON.stringify({ date: new Date().toISOString(), browser: browser.version(), records, network, resources, errors }, null, 2));
  await Promise.all(clients.map((client) => client.context.close()));
  await browser.close();
}
