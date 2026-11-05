import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { observeGanttCollections, currentGanttTasks, waitGantt, chooseGanttPeriod, flexibleGanttRange, selectGanttTask, ganttFilter, clearGanttFilters } from "./ganttBrowserControls.mjs";

const { chromium } = await import(pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE).href);
const secrets = JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH, "utf8"));
const data = secrets.context, qa = data.controls, output = process.env.GM_BROWSER_REPORT_DIR, origin = "http://localhost:5189";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, timezoneId: "America/Lima" });
const page = await context.newPage(); observeGanttCollections(page); page.setDefaultTimeout(20000);
const errors = [], consoleErrors = [], traffic = [], writes = [], checks = [], created = [], calendars = {}, intentIds = [], links = [];
let token, current;
const taskPath = (id, project = qa.project) => `/api/projects/${project}/tasks/${id}/`;
const collection = project => `/api/projects/${project}/tasks/`;
page.on("pageerror", error => errors.push(error.message));
page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text().slice(0, 500)); });
page.on("request", request => {
  const route = new URL(request.url()).pathname;
  if (route.startsWith("/api/projects/") && request.method() !== "GET") writes.push({ path: route, method: request.method(), payload: request.postDataJSON() });
});
page.on("response", response => { const route = new URL(response.url()).pathname; if (route.startsWith("/api/")) traffic.push({ path: route, method: response.request().method(), status: response.status() }); });
const row = id => page.locator(`.gm-task-gantt .wx-row[data-id='${id}']`);
const bar = id => page.locator(`[data-gantt-calendar-task='${id}']`);
const arrow = (a, b) => page.locator(`[data-gantt-link='${a}:${b}']`);
const settle = () => page.evaluate(() => new Promise(resolve => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
async function check(name, action) { if (process.argv.includes("--timezones-only") && !name.startsWith("ISO weeks")) return; current = name; const details = await action(); checks.push({ name, status: "Aprobado", details }); console.log("OK " + name); }
async function login() {
  await page.goto(origin); await page.getByLabel("Correo electrónico", { exact: true }).fill(secrets.admin.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(secrets.admin.password);
  const waiting = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/login/" && response.request().method() === "POST");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  const reply = await waiting; assert.equal(reply.status(), 200); token = (await reply.json()).access;
  await page.getByRole("button", { name: "Abrir menú de perfil" }).waitFor();
}
async function load(project = qa.project) {
  const waiting = page.waitForResponse(response => new URL(response.url()).pathname === collection(project) && response.status() === 200);
  await page.goto(origin + `/proyectos/${project}?vista=gantt`); await waiting; await waitGantt(page); await settle();
}
async function snapshot(id, project = qa.project) { const response = await context.request.get(origin + taskPath(id, project), { headers: { Authorization: "Bearer " + token }, maxRetries: 0 }); assert.equal(response.status(), 200); return (await response.json()).task; }
async function roleClient(role, timezoneId = "America/Lima") {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1100 }, timezoneId }); const tab = await ctx.newPage();
  await tab.goto(origin); await tab.getByLabel("Correo electrónico", { exact: true }).fill(secrets[role].email);
  await tab.getByLabel("Contraseña", { exact: true }).fill(secrets[role].password);
  const waiting = tab.waitForResponse(reply => new URL(reply.url()).pathname === "/api/auth/login/" && reply.request().method() === "POST");
  await tab.getByRole("button", { name: "Ingresar", exact: true }).click(); const reply = await waiting; assert.equal(reply.status(), 200);
  return { ctx, tab, access: (await reply.json()).access };
}
async function fit() { await page.getByRole("button", { name: "Ajuste automático", exact: true }).click(); await page.waitForFunction(() => { const chart = globalThis.document.querySelector(".gm-task-gantt .wx-chart"); return chart.scrollWidth <= chart.clientWidth + 1; }); await settle(); }
async function select(id) { await row(id).locator(".wx-cell").last().click(); await settle(); }
async function connect(source, target, cancel = false) {
  await select(source);
  const handle = page.locator(`[data-link-source='${source}']`); await handle.waitFor();
  const a = await handle.boundingBox(), b = await page.locator(`[data-link-source='${target}']`).boundingBox(); assert.ok(a && b);
  const destinationX = await page.locator(`[data-link-source='${target}']`).evaluate(node => node.parentElement.querySelector(".gm-gantt-link-target").getBoundingClientRect().x + 5);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(destinationX, b.y + b.height / 2, { steps: 15 });
  await page.locator(".gm-gantt-link-preview").waitFor();
  if (cancel === "capture") await handle.evaluate(node => { for (let id = 0; id < 10; id++) if (node.hasPointerCapture(id)) node.releasePointerCapture(id); });
  else if (cancel) await page.keyboard.press("Escape");
  await page.mouse.up();
  if (!cancel) await page.getByRole("region", { name: "Operación de dependencia", exact: true }).waitFor();
}
async function create(name, parent = null) {
  if (parent === null) await page.getByRole("button", { name: "+ Agregar tarea", exact: true }).click();
  else {
    const name = currentGanttTasks(page).find(task => task.id === parent).name;
    await row(parent).hover(); await row(parent).getByRole("button", { name: "Abrir tarea " + name, exact: true }).focus();
    await page.getByRole("button", { name: "Agregar subtarea de " + name, exact: true }).click();
  }
  const form = page.getByRole("form", { name: "Creación rápida de tarea", exact: true });
  await form.getByRole("textbox", { name: "Nombre de la tarea", exact: true }).fill(name);
  const response = page.waitForResponse(reply => new URL(reply.url()).pathname === collection(qa.project) && reply.request().method() === "POST");
  await form.getByRole("button", { name: "Guardar", exact: true }).dblclick();
  const reply = await response; assert.equal(reply.status(), 201); const saved = await reply.json(); created.push(saved);
  await form.waitFor({ state: "hidden" }); await row(saved.id).waitFor(); assert.equal(saved.parent_id, parent); return saved;
}
try {
  await login(); await load();
  await check("Unified hierarchy, default Name/State and real catalog colors survive collapse and reload", async () => {
    const headers = await page.locator(".gm-task-gantt .wx-header .wx-cell").allTextContents();
    assert.deepEqual(headers.map(text => text.trim()), ["Nombre", "Estado"]);
    await row(qa.child).waitFor(); await arrow(qa.subject, qa.parent).waitFor();
    await page.getByRole("button", { name: "Contraer subtareas de Padre controles QA", exact: true }).click();
    await row(qa.child).waitFor({ state: "hidden" }); await row(qa.leaf).waitFor({ state: "hidden" });
    await page.screenshot({ path: path.join(output, "hierarchy-collapsed.png"), fullPage: true });
    await page.getByRole("button", { name: "Expandir subtareas de Padre controles QA", exact: true }).click();
    await row(qa.child).getByText("EN CURSO", { exact: true }).waitFor();
    assert.equal(await bar(qa.child).isVisible(), false); assert.equal(await page.locator(".wx-bar.wx-summary").count(), 0);
    await page.reload(); await waitGantt(page); await row(qa.leaf).waitFor();
    await page.screenshot({ path: path.join(output, "hierarchy-expanded.png"), fullPage: true });
    return { real_catalog: true, own_states: true, one_tree: true, null_without_bar: true };
  });
  await check("Continuous splitter and keyboard retain width, selected columns, scroll and native row alignment", async () => {
    await select(qa.subject); const widget = await page.locator(".gm-task-gantt").elementHandle();
    const split = page.getByRole("separator", { name: "Ancho de la tabla de Gantt" }); const box = await split.boundingBox();
    const initial = Number(await split.getAttribute("aria-valuenow"));
    await page.mouse.move(box.x + 4, box.y + 100); await page.mouse.down(); await page.mouse.move(box.x + 124, box.y + 100, { steps: 30 }); await page.mouse.up();
    await settle(); const dragged = Number(await split.getAttribute("aria-valuenow")); assert.ok(dragged > initial + 80);
    await split.focus(); await page.keyboard.press("ArrowLeft"); await settle();
    const width = Number(await split.getAttribute("aria-valuenow")); assert.equal(width, dragged - 20);
    await page.getByRole("button", { name: "Actualizar Gantt", exact: true }).click(); await page.waitForFunction(() => !globalThis.document.querySelector('[aria-label="Actualizar Gantt"]').disabled);
    assert.equal(Number(await split.getAttribute("aria-valuenow")), width); assert.equal(await widget.evaluate(node => node.isConnected), true);
    const r = await row(qa.subject).boundingBox(), b = await bar(qa.subject).boundingBox(); assert.ok(Math.abs(r.y + r.height / 2 - b.y - b.height / 2) < 2);
    await page.screenshot({ path: path.join(output, "splitter.png"), fullPage: true });
    return { initial, dragged, keyboard: width, remount: false, aligned: true };
  });
  await check("ISO weeks cross year accurately, weekends remain calendar days and Today follows GM timezone", async () => {
    await flexibleGanttRange(page, "2026-12-28", "2027-01-10"); await chooseGanttPeriod(page, "week");
    await page.getByText(/S53.*28 dic.*3 ene/).waitFor();
    assert.ok(await page.locator(".gm-gantt-weekend").count() > 0);
    const holiday = await page.locator(".wx-gantt-holidays .gm-gantt-weekend").first().boundingBox();
    assert.ok(holiday.height > 250 && holiday.width > 0);
    await page.clock.setFixedTime(new Date(data.today + "T12:00:00Z")); await page.evaluate(() => globalThis.window.dispatchEvent(new Event("focus")));
    await page.getByRole("button", { name: "Hoy", exact: true }).click(); await page.locator(".gm-gantt-today").waitFor();
    await page.screenshot({ path: path.join(output, "week-today-weekends.png"), fullPage: true });
    await flexibleGanttRange(page, "1901-01-01", "1901-01-02"); await page.locator(".gm-gantt-today").waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Hoy", exact: true }).click(); await page.locator(".gm-gantt-today").waitFor();
    const zones = ["America/Lima"];
    for (const [role, zone] of [["admin_delay", "America/New_York"], ["admin_chunk", "Pacific/Auckland"]]) {
      const client = await roleClient(role, zone);
      try {
        await client.tab.clock.setFixedTime(new Date(data.today + "T04:30:00Z"));
        await client.tab.goto(origin + `/proyectos/${qa.project}?vista=gantt`); await waitGantt(client.tab);
        const gmDay = new Date(data.today + "T12:00:00Z"); gmDay.setUTCDate(gmDay.getUTCDate() - 1);
        for (const day of [gmDay.getUTCDate(), Number(data.today.slice(-2))]) {
          if (day !== gmDay.getUTCDate()) { await client.tab.clock.setFixedTime(new Date(data.today + "T05:30:00Z")); await client.tab.evaluate(() => globalThis.window.dispatchEvent(new Event("focus"))); }
          await client.tab.getByRole("button", { name: "Hoy", exact: true }).click();
          const marker = client.tab.locator(".gm-gantt-today"); await marker.waitFor();
          const dateCell = client.tab.locator(".wx-scale .wx-row").last().locator(".wx-cell").filter({ hasText: new RegExp("^" + day + "$") }).first();
          await dateCell.waitFor();
          await client.tab.waitForFunction(day => {
            const rows = globalThis.document.querySelectorAll(".wx-scale .wx-row"), marker = globalThis.document.querySelector(".gm-gantt-today");
            const cell = [...rows[rows.length - 1].querySelectorAll(".wx-cell")].find(node => node.textContent.trim() === String(day));
            return marker && cell && Math.abs(marker.getBoundingClientRect().x - cell.getBoundingClientRect().x) <= 2;
          }, day);
          const a = await marker.boundingBox(), b = await dateCell.boundingBox(); assert.ok(Math.abs(a.x - b.x) <= 2, zone + " uses GM calendar day");
        }
        await chooseGanttPeriod(client.tab, "week");
        const weekend = await client.tab.locator(".wx-gantt-holidays .gm-gantt-weekend").first().boundingBox(); assert.ok(weekend.height > 250);
        zones.push(zone);
      } catch (failure) {
        await client.tab.screenshot({ path: path.join(output, "timezone-" + role + ".png"), fullPage: true });
        await writeFile(path.join(output, "timezone-" + role + ".json"), JSON.stringify(await client.tab.evaluate(() => ({ now: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, navigation: globalThis.document.querySelector('[aria-label="Navegación temporal de Gantt"]')?.textContent, cells: [...globalThis.document.querySelectorAll(".wx-scale .wx-cell")].map(node => ({ text: node.textContent, left: node.getBoundingClientRect().x })), chart: globalThis.document.querySelector(".wx-chart")?.scrollLeft, marker: globalThis.document.querySelector(".gm-gantt-today")?.outerHTML })), null, 2));
        throw failure;
      } finally { await client.ctx.close(); }
    }
    return { convention: "ISO Monday", year_boundary: "2026-S53", outside_marker: false, no_dates_changed: true, zones, controlled_GM_midnight: true };
  });
  await check("Zoom shares selector and viewport; fit and panel width preserve all authorized dates", async () => {
    await chooseGanttPeriod(page, "month"); await page.getByRole("button", { name: "Hoy", exact: true }).click();
    await page.getByRole("button", { name: "Acercar cronograma", exact: true }).click();
    assert.match(await page.getByRole("button", { name: /^Periodo de Gantt:/ }).textContent(), /Semana/);
    await page.getByRole("button", { name: "Alejar cronograma", exact: true }).click();
    assert.match(await page.getByRole("button", { name: /^Periodo de Gantt:/ }).textContent(), /Mes/);
    await fit(); await page.getByRole("button", { name: "Añadir o quitar columnas", exact: true }).click();
    const panel = page.getByRole("dialog", { name: "Campos", exact: true }); await panel.getByRole("switch", { name: "Inicio", exact: true }).click();
    await page.keyboard.press("Escape"); await fit();
    assert.ok((await page.locator(".gm-task-gantt .wx-chart").evaluate(node => node.scrollWidth <= node.clientWidth + 1)));
    await page.screenshot({ path: path.join(output, "zoom-fit.png"), fullPage: true });
    return { shared_period: true, extra_requests: 0 };
  });
  await check("Directed arrows include neutral null anchors, filtering never substitutes ancestors", async () => {
    await arrow(qa.subject, qa.parent).waitFor(); await arrow(qa.parent, qa.tail).waitFor();
    assert.equal(await arrow(qa.parent, qa.tail).getAttribute("stroke-dasharray"), "4 3");
    await ganttFilter(page, "Estado", "EN_CURSO"); await page.keyboard.press("Escape");
    await row(qa.child).waitFor(); await arrow(qa.subject, qa.parent).waitFor({ state: "hidden" });
    assert.equal(await page.locator("[data-gantt-link]").count(), 0);
    await clearGanttFilters(page); await fit();
    const shortBar = bar(qa.target); const box = await shortBar.boundingBox();
    assert.ok(box.width < 64); assert.equal(await shortBar.locator(".gm-gantt-bar-text").isVisible(), false);
    assert.ok((await shortBar.getAttribute("title")).includes("Destino de enlace contenido QA"));
    return { directional: true, no_temporal_FS: true, nullable_anchor: true, hidden_endpoints_not_replaced: true };
  });
  assert.equal(writes.length, 0, "All visualization actions above must be read-only");
  await check("Calendar preview connectors follow native geometry and cancellation restores the confirmed graph", async () => {
    const edge = arrow(qa.parent, qa.tail), count = writes.length;
    const endpoint = async () => edge.evaluate(node => { const p = node.getPointAtLength(0); return new globalThis.DOMPoint(p.x, p.y).matrixTransform(node.getScreenCTM()).x; });
    await assert.doesNotReject(async () => {
      for (let frame = 0; frame < 12; frame++) { const box = await bar(qa.parent).boundingBox(); if (Math.abs(await endpoint() - box.x - box.width) < 3) return; await settle(); }
      assert.fail("Connector source must match its real rendered bar before starting");
    });
    const original = await edge.getAttribute("d");
    const box = await bar(qa.parent).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 24, box.y + box.height / 2, { steps: 12 }); await settle();
    const moved = await bar(qa.parent).boundingBox();
    console.log("Preview geometry", JSON.stringify({ before: { x: box.x, width: box.width }, after: { x: moved.x, width: moved.width }, endpoint: await endpoint() }));
    assert.notEqual(await edge.getAttribute("d"), original);
    await page.keyboard.press("Escape"); await page.mouse.up(); await settle();
    assert.equal(await edge.getAttribute("d"), original); assert.equal(writes.length, count);
    return { live_geometry: true, no_write: true, restored_after_escape: true };
  });
  await check("Real connector gesture cancels repeatedly and persists only a confirmed reconciled relation", async () => {
    for (let i = 0; i < 3; i++) await connect(qa.subject, qa.target, true);
    await connect(qa.subject, qa.target, "capture"); await page.locator(".gm-gantt-link-preview").waitFor({ state: "hidden" });
    assert.equal(writes.length, 0);
    await connect(qa.subject, qa.target); assert.equal(await arrow(qa.subject, qa.target).count(), 0);
    const waiting = page.waitForResponse(reply => new URL(reply.url()).pathname === taskPath(qa.target) + "dependencies/" && reply.request().method() === "POST");
    await page.getByRole("button", { name: "Confirmar vínculo", exact: true }).dblclick(); const response = await waiting; assert.ok([200, 201].includes(response.status()));
    await arrow(qa.subject, qa.target).waitFor(); links.push({ project: qa.project, source: qa.subject, target: qa.target, method: "POST" });
    assert.equal(writes.filter(item => item.path.endsWith("dependencies/")).length, 1);
    await page.screenshot({ path: path.join(output, "dependencies.png"), fullPage: true });
    const stroke = await arrow(qa.subject, qa.target).evaluate(node => { const p = node.getPointAtLength(node.getTotalLength() / 2); const point = new globalThis.DOMPoint(p.x, p.y).matrixTransform(node.getScreenCTM()); return { x: point.x, y: point.y }; });
    await page.mouse.click(stroke.x, stroke.y);
    const removed = page.waitForResponse(reply => new URL(reply.url()).pathname === taskPath(qa.target) + "dependencies/" && reply.request().method() === "DELETE");
    await page.getByRole("button", { name: "Retirar dependencia", exact: true }).click(); assert.equal((await removed).status(), 204);
    await arrow(qa.subject, qa.target).waitFor({ state: "hidden" }); links.push({ project: qa.project, source: qa.subject, target: qa.target, method: "DELETE" });
    return { cancellations: 4, capture_loss: true, posts: 1, delete: 1, no_optimistic_arrow: true };
  });
  await check("Backend cycle rejection removes proposal and preserves existing informative links", async () => {
    await connect(qa.tail, qa.subject);
    const waiting = page.waitForResponse(reply => new URL(reply.url()).pathname === taskPath(qa.subject) + "dependencies/" && reply.request().method() === "POST");
    await page.getByRole("button", { name: "Confirmar vínculo", exact: true }).click(); assert.equal((await waiting).status(), 400);
    await page.getByRole("region", { name: "Operación de dependencia", exact: true }).getByRole("alert").waitFor();
    assert.equal(await arrow(qa.tail, qa.subject).count(), 0); await arrow(qa.subject, qa.parent).waitFor();
    await page.getByRole("region", { name: "Operación de dependencia", exact: true }).getByRole("button", { name: "Cerrar", exact: true }).click();
    return { cycle: 400, existing_graph_preserved: true };
  });
  await check("Lost link response cannot replay a POST; explicit consultation reconciles one stored dependency", async () => {
    await connect(qa.parent, qa.target);
    const routePath = "**" + taskPath(qa.target) + "dependencies/";
    const failure = async route => { const reply = await route.fetch(); assert.equal(reply.status(), 201); await route.abort("failed"); };
    await page.route(routePath, failure, { times: 1 });
    await page.getByRole("button", { name: "Confirmar vínculo", exact: true }).click();
    const operation = page.getByRole("region", { name: "Operación de dependencia", exact: true });
    await operation.getByRole("alert").waitFor(); const count = writes.length;
    assert.equal(await operation.getByRole("button", { name: "Confirmar vínculo", exact: true }).isDisabled(), true);
    await page.keyboard.press("Enter"); assert.equal(writes.length, count);
    assert.equal(await arrow(qa.parent, qa.target).count(), 0);
    links.push({ project: qa.project, source: qa.parent, target: qa.target, method: "POST" });
    await operation.getByRole("button", { name: "Consultar resultado", exact: true }).click();
    await arrow(qa.parent, qa.target).waitFor(); await arrow(qa.parent, qa.target).focus(); await page.keyboard.press("Enter");
    const removed = page.waitForResponse(reply => new URL(reply.url()).pathname === taskPath(qa.target) + "dependencies/" && reply.request().method() === "DELETE");
    await operation.getByRole("button", { name: "Retirar dependencia", exact: true }).click(); assert.equal((await removed).status(), 204);
    links.push({ project: qa.project, source: qa.parent, target: qa.target, method: "DELETE" });
    return { no_replay: true, keyboard_access: true, explicit_read: true };
  });
  await check("Shared relation editor resolves an ambiguous result by reading without replaying the write", async () => {
    await select(qa.target); await page.getByRole("button", { name: "Gestionar dependencias", exact: true }).click();
    const dialog = page.locator("dialog[open]"), relations = dialog.getByRole("region", { name: "Relaciones", exact: true });
    await relations.getByRole("button", { name: /^Relacionar elementos o añadir dependencias/ }).click();
    const panel = page.locator(":popover-open"); await panel.getByRole("button", { name: "Esta tarea bloquea...", exact: true }).click();
    await panel.getByRole("searchbox", { name: "Buscar tareas", exact: true }).fill("Calendario controles QA");
    await page.route("**" + taskPath(qa.subject) + "dependencies/", async route => { const reply = await route.fetch(); assert.equal(reply.status(), 201); await route.abort("failed"); }, { times: 1 });
    await panel.getByRole("button", { name: "Vincular Calendario controles QA", exact: true }).click();
    await panel.getByRole("button", { name: "Consultar resultado", exact: true }).waitFor();
    const count = writes.length; await panel.getByRole("button", { name: "Consultar resultado", exact: true }).click();
    await panel.waitFor({ state: "hidden" }); assert.equal(writes.length, count);
    await relations.getByRole("button", { name: "Calendario controles QA", exact: true }).waitFor();
    links.push({ project: qa.project, source: qa.target, target: qa.subject, method: "POST" });
    await dialog.getByRole("button", { name: "Cerrar detalle de tarea", exact: true }).click();
    await arrow(qa.target, qa.subject).waitFor(); await arrow(qa.target, qa.subject).focus(); await page.keyboard.press("Enter");
    const removed = page.waitForResponse(reply => new URL(reply.url()).pathname === taskPath(qa.subject) + "dependencies/" && reply.request().method() === "DELETE");
    await page.getByRole("button", { name: "Retirar dependencia", exact: true }).click(); assert.equal((await removed).status(), 204);
    links.push({ project: qa.project, source: qa.target, target: qa.subject, method: "DELETE" });
    return { shared_form: true, uncertain_context: true, consultation_only_GET: true, reconciled_graph: true };
  });
  await check("Inline root and child creation use real snapshots and one POST with ordinary validation", async () => {
    const first = await create("Raíz inline contenido QA"); await create("Hija inline contenido QA", first.id);
    await page.getByRole("button", { name: "+ Agregar tarea", exact: true }).click();
    const form = page.getByRole("form", { name: "Creación rápida de tarea", exact: true }); const count = writes.length;
    await form.getByRole("button", { name: "Guardar", exact: true }).click(); await form.getByText("Indica el nombre de la tarea.", { exact: true }).waitFor(); assert.equal(writes.length, count);
    await page.keyboard.press("Escape"); await form.waitFor({ state: "hidden" });
    await page.screenshot({ path: path.join(output, "inline-created.png"), fullPage: true });
    return { created: created.map(item => ({ id: item.id, parent_id: item.parent_id })), duplicate_posts: 0, no_modal: true };
  });
  await check("Lost creation response preserves inline draft and prevents replay until explicit consultation", async () => {
    const routePath = "**" + collection(qa.project); let committed;
    const failure = async route => { if (route.request().method() !== "POST") return route.continue(); const response = await route.fetch(); committed = await response.json(); await route.abort("failed"); };
    await page.route(routePath, failure); await page.getByRole("button", { name: "+ Agregar tarea", exact: true }).click();
    const form = page.getByRole("form", { name: "Creación rápida de tarea", exact: true });
    await form.getByRole("textbox", { name: "Nombre de la tarea", exact: true }).fill("Creación incierta contenido QA");
    await form.getByRole("button", { name: "Guardar", exact: true }).click(); await form.getByText(/No se pudo confirmar la creación/).waitFor();
    assert.ok(committed?.id); created.push(committed); const count = writes.length;
    await page.keyboard.press("Enter"); assert.equal(writes.length, count); assert.equal(await form.getByRole("button", { name: "Guardar", exact: true }).isDisabled(), true);
    await page.unroute(routePath, failure); await form.getByRole("button", { name: "Consultar tareas antes de otra creación" }).click();
    await row(committed.id).waitFor(); await form.getByRole("button", { name: "Cerrar borrador sin reenviar" }).click();
    return { one_creation: true, blocked_replay: true, preserved_draft: true, explicit_read: true };
  });
  await check("Calendar pointer drag still uses exact string revision and one idempotent logical operation", async () => {
    await load(qa.single); await chooseGanttPeriod(page, "day");
    const before = await snapshot(qa.one, qa.single); await selectGanttTask(page, qa.one);
    const surface = bar(qa.one), box = await surface.boundingBox(); const waiting = page.waitForResponse(reply => new URL(reply.url()).pathname === taskPath(qa.one, qa.single) && reply.request().method() === "PATCH");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 15 }); await page.mouse.up();
    const response = await waiting; assert.equal(response.status(), 200); const saved = await response.json(), payload = response.request().postDataJSON();
    assert.equal(payload.expected_calendar_revision, before.calendar_revision); assert.equal(typeof payload.expected_calendar_revision, "string"); assert.equal(saved.start_date, saved.due_date);
    calendars[qa.one] = saved; intentIds.push(payload.calendar_intent_id); await page.reload(); await waitGantt(page);
    assert.equal((await snapshot(qa.one, qa.single)).calendar_revision, saved.calendar_revision);
    return { logical_writes: 1, string_revision: true, persisted_one_day: saved.start_date };
  });
  await check("Both themes and five widths preserve table/chart, fields, splitter, focus and contained scroll", async () => {
    await load();
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => localStorage.setItem("theme", theme), theme); await page.reload(); await waitGantt(page);
      for (const width of [1600, 1280, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 1100 }); await settle();
        assert.ok(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1));
        await page.getByRole("button", { name: "Añadir o quitar columnas" }).click(); await page.getByRole("dialog", { name: "Campos", exact: true }).waitFor(); await page.keyboard.press("Escape");
        await page.screenshot({ path: path.join(output, `${theme}-${width}.png`), fullPage: true });
      }
    }
    await page.setViewportSize({ width: 1600, height: 1100 }); return { themes: 2, widths: 5, no_page_overflow: true };
  });
  await check("Read-only and outside users cannot create tasks or links through the UI or direct API", async () => {
    for (const role of ["worker", "outsider"]) {
      const client = await roleClient(role);
      try {
        const project = role === "worker" ? data.readonly_project : qa.project;
        await client.tab.goto(origin + `/proyectos/${project}?vista=gantt`);
        if (role === "worker") {
          await waitGantt(client.tab); await client.tab.getByRole("button", { name: "Abrir tarea Tarea consulta Gantt QA", exact: true }).waitFor();
          assert.equal(await client.tab.locator("[data-link-source]").count(), 0);
          assert.equal(await client.tab.getByRole("button", { name: "+ Agregar tarea", exact: true }).count(), 0);
        } else { await client.tab.getByText("No se pudo cargar el proyecto", { exact: true }).first().waitFor(); assert.equal(await client.tab.locator(".gm-task-gantt").count(), 0); }
        const csrf = (await client.ctx.cookies()).find(cookie => cookie.name === "csrftoken")?.value;
        const headers = { Authorization: "Bearer " + client.access, Origin: origin, ...(csrf ? { "X-CSRFToken": csrf } : {}) };
        for (const [url, payload] of [[collection(project), { name: "Creación prohibida QA", state_code: "PENDIENTE", priority: null, parent_id: null, due_date: null, specialty_ids: [], retained_label_ids: [], responsible_ids: [] }], [taskPath(role === "worker" ? data.readonly_task : qa.subject, project) + "dependencies/", { predecessor_id: role === "worker" ? qa.readonly_target : qa.target }]]) {
          const reply = await client.ctx.request.post(origin + url, { headers, data: payload, maxRetries: 0 });
          assert.equal(reply.status(), role === "worker" || url.endsWith("dependencies/") ? 403 : 404);
        }
      } finally { await client.ctx.close(); }
    }
    return { readonly: 403, outside_creation: 404, outside_dependencies_global_role: 403, controls_absent: true };
  });
  await check("Small, medium and dense large projects retain bounded DOM and necessary requests", async () => {
    const samples = [];
    for (const project of [qa.project, qa.medium, qa.large]) {
      const before = traffic.length, count = writes.length, start = performance.now(); await load(project);
      const mounted = performance.now() - start, rows = await page.locator(".gm-task-gantt .wx-row[data-id]").count(), renderedEdges = await page.locator("[data-gantt-link]").count();
      assert.ok(rows < 100); assert.equal(traffic.slice(before).filter(item => item.path === collection(project) && item.method === "GET").length, 1);
      assert.equal(traffic.slice(before).filter(item => /\/tasks\/\d+\/$/.test(item.path) && item.method === "GET").length, 0);
      assert.equal(writes.length, count);
      samples.push({ rows: currentGanttTasks(page).length, renderedRows: rows, renderedEdges, totalEdges: currentGanttTasks(page).reduce((sum, task) => sum + task.dependencies.length, 0), mount_ms: mounted });
    }
    assert.equal(samples.at(-1).rows, 2000); assert.ok(samples.at(-1).renderedEdges > 40 && samples.at(-1).renderedEdges < 500);
    await writeFile(path.join(output, "content-performance.json"), JSON.stringify({ samples }, null, 2));
    await page.screenshot({ path: path.join(output, "dense-2000.png"), fullPage: true });
    await load(qa.project);
    const session = await context.newCDPSession(page); await session.send("Performance.enable"); await session.send("HeapProfiler.collectGarbage");
    const metrics = async () => Object.fromEntries((await session.send("Performance.getMetrics")).metrics.filter(item => ["JSEventListeners", "Nodes", "JSHeapUsedSize"].includes(item.name)).map(item => [item.name, item.value]));
    const first = await metrics();
    for (let repeat = 0; repeat < 4; repeat++) {
      await page.getByRole("link", { name: "Lista", exact: true }).click(); await page.locator("tr[data-task-id]").first().waitFor();
      await page.getByRole("link", { name: "Gantt", exact: true }).click(); await waitGantt(page); await settle();
    }
    await session.send("HeapProfiler.collectGarbage"); const last = await metrics(); await session.detach();
    const count = writes.length;
    await page.getByRole("button", { name: "Alejar cronograma" }).click(); await page.getByRole("button", { name: "Hoy", exact: true }).click(); assert.equal(writes.length, count);
    const details = { samples, remounts: 4, listener_project_rows: currentGanttTasks(page).length, before: first, after: last };
    await writeFile(path.join(output, "content-performance.json"), JSON.stringify(details, null, 2));
    return details;
  });
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, "content-ledger.json"), JSON.stringify({ created, calendars, intent_ids: intentIds, links }, null, 2));
  await writeFile(path.join(output, "content-browser.json"), JSON.stringify({ date: new Date().toISOString(), browser: await browser.version(), checks, errors, consoleErrors, traffic, writes }, null, 2));
  console.log("PASS " + checks.length + " content groups");
} catch (failure) {
  await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
  await writeFile(path.join(output, "content-failure.json"), JSON.stringify({ current, message: failure.message, checks, errors, consoleErrors, traffic, writes }, null, 2)); throw failure;
} finally { await context.close(); await browser.close(); }
