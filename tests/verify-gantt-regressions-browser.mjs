import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { chooseGanttPeriod } from "./ganttBrowserControls.mjs";

const { chromium } = await import(pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE));
const qa = JSON.parse(fs.readFileSync(process.env.GM_QA_SECRETS_PATH, "utf8")), c = qa.regressions;
assert.ok(c && process.env.GM_BROWSER_REPORT_DIR);
const out = process.env.GM_BROWSER_REPORT_DIR;
const browser = await chromium.launch({ channel: "chrome", headless: true, ignoreDefaultArgs: ["--hide-scrollbars"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 900 }, timezoneId: "America/Lima", colorScheme: "dark" });
page.setDefaultTimeout(12000);
const checks = [], writes = [], errors = [], measurements = [];
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => {
  if (new URL(request.url()).pathname.startsWith("/api/projects/") && !["GET", "OPTIONS"].includes(request.method())) writes.push({ path: new URL(request.url()).pathname, method: request.method(), data: request.postDataJSON() });
});
const endpoint = id => `projects/${c.project}/tasks/${id}/`;
const bar = id => page.locator(`[data-gantt-calendar-task="${id}"]`).first();
const port = (id, side) => page.locator(`[data-connector-task="${id}"][data-connector-side="${side}"]`);
const settle = () => page.evaluate(() => new Promise(resolve => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
async function api(method, url, data) {
  return page.evaluate(async args => {
    const { httpClient } = await import("/src/core/api/httpClient.ts");
    try { const r = await httpClient.request(args); return { status: r.status, data: r.data }; }
    catch (e) { return { status: e.status, data: e.payload }; }
  }, { method, url, data });
}
async function task(id) { const r = await api("get", endpoint(id)); assert.equal(r.status, 200); return r.data.task; }
async function ready() { await page.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor(); await chooseGanttPeriod(page, "quarter"); await settle(); }
async function step(name, action) {
  if (process.env.GM_REGRESSION_CASE && !name.startsWith(process.env.GM_REGRESSION_CASE)) return;
  await action(); checks.push(name); console.log("PASS " + name);
}
async function wheel(panel, delta) {
  const box = await page.locator(".gm-task-gantt " + panel).boundingBox();
  await page.mouse.move(box.x + 100, box.y + 150); await page.mouse.wheel(0, delta); await page.waitForTimeout(80); await settle();
}
async function top() { await wheel(".wx-chart", -10000); }
async function point(id, side) {
  const bounds = await port(id, side).boundingBox(); assert.ok(bounds, `Port ${id} ${side}`);
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}
async function connect(source, target, first, last, expected, body = false) {
  await bar(source).hover(); await settle();
  const a = await point(source, first), bounds = body ? await bar(target).boundingBox() : null;
  const b = body ? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 } : await point(target, last);
  const count = writes.length;
  await page.mouse.move(a.x, a.y); await settle(); await page.mouse.down(); await page.mouse.move(a.x + 8, a.y + 1); await page.mouse.move(b.x, b.y, { steps: 8 });
  assert.equal(writes.length, count);
  const pending = page.waitForResponse(r => new URL(r.url()).pathname === "/api/" + endpoint(target) + "dependencies/" && r.request().method() === "POST");
  await page.mouse.up(); const result = await pending; assert.equal(result.status(), 201, await result.text());
  await page.locator(`[data-gantt-link="${source}:${target}"]`).waitFor(); assert.equal(writes.length, count + 1); assert.equal(writes.at(-1).data.predecessor_id, source); assert.equal(writes.at(-1).data.dependency_type, expected);
  assert.equal((await task(target)).dependency_links.find(link => link.predecessor_id === source)?.type, expected);
  assert.equal(await page.getByRole("dialog").count(), 0); assert.equal(await page.locator(".gm-gantt-link-preview").count(), 0);
}
async function remove(source, target, close = true) {
  await page.locator(`[data-gantt-link="${source}:${target}"]`).focus();
  const pending = page.waitForResponse(r => new URL(r.url()).pathname === "/api/" + endpoint(target) + "dependencies/" && r.request().method() === "DELETE");
  await page.locator(`[data-remove-link="${source}:${target}"]`).click(); assert.equal((await pending).status(), 204);
  await page.getByRole("button", { name: "Deshacer", exact: true }).waitFor();
  if (close) await page.getByRole("button", { name: "Cerrar aviso de dependencia", exact: true }).click();
}
async function alignment(label) {
  const result = await page.evaluate(() => {
    const root = globalThis.document.querySelector(".gm-task-gantt"), scene = root.querySelector(".gm-gantt-scene").getBoundingClientRect();
    const chart = root.querySelector(".wx-chart"), header = root.querySelector(".gm-gantt-time-header").getBoundingClientRect();
    const rows = [...root.querySelectorAll("[data-gantt-tree-id]")].flatMap(n => {
      const id = Number(n.dataset.ganttTreeId), name = n.getBoundingClientRect(), y = name.y + name.height / 2;
      if (y < header.bottom || y >= scene.bottom) return [];
      const b = [...root.querySelectorAll(`[data-gantt-calendar-task="${id}"]`)].map(n => n.getBoundingClientRect()).find(r => r.height > 0);
      const ports = [...root.querySelectorAll(`[data-connector-task="${id}"]`)].map(n => { const r = n.getBoundingClientRect(); return r.y + r.height / 2; });
      const external = [...root.querySelectorAll(".gm-gantt-exterior button")].find(b => b.getAttribute("aria-label") === "Abrir detalle de " + n.innerText)?.getBoundingClientRect();
      return [{ id, y, bar: b ? b.y + b.height / 2 : null, ports, label: external ? external.y + external.height / 2 : null }];
    });
    const edges = [...root.querySelectorAll("[data-gantt-link]")].map(n => { const box = n.closest("svg").getBoundingClientRect(), first = n.getPointAtLength(0), last = n.getPointAtLength(n.getTotalLength()); return { id: n.dataset.ganttLink, from: box.y + first.y, to: box.y + last.y }; });
    return { top: chart.scrollTop, gutter: root.querySelector(".wx-gantt").offsetWidth - root.querySelector(".wx-gantt").clientWidth, overflow: globalThis.getComputedStyle(root.querySelector(".wx-gantt")).overflow, rows, edges };
  });
  for (const row of result.rows) for (const y of [row.bar, row.label, ...row.ports].filter(y => y !== null)) assert.ok(Math.abs(y - row.y) <= 1, JSON.stringify({ label, row }));
  for (const edge of result.edges) {
    const [source, target] = edge.id.split(":").map(Number), a = result.rows.find(r => r.id === source), b = result.rows.find(r => r.id === target);
    if (a && b) { assert.ok(Math.abs(edge.from - a.y) <= 1); assert.ok(Math.abs(edge.to - b.y) <= 1); }
  }
  assert.equal(result.gutter, 0); assert.equal(result.overflow, "clip"); measurements.push({ label, ...result }); return result;
}
async function level(value) {
  for (let n = 0; n < 9; n++) { const current = Number(await page.locator(".gm-task-gantt").getAttribute("data-gantt-zoom")); if (current === value) return; await page.getByRole("button", { name: current < value ? "Acercar cronograma" : "Alejar cronograma", exact: true }).click(); }
}
try {
  await page.goto(`http://localhost:5189/proyectos/${c.project}?vista=gantt`);
  await page.getByLabel("Correo electrónico").fill(qa.admin.email); await page.getByLabel("Contraseña", { exact: true }).fill(qa.admin.password); await page.getByRole("button", { name: "Ingresar", exact: true }).click(); await ready();
  if (!process.env.GM_REGRESSION_CASE) {
    for (const [source, target] of [[c.purple, c.green], [c.green, c.purple]]) if ((await task(target)).dependencies.includes(source)) assert.equal((await api("delete", endpoint(target) + "dependencies/", { predecessor_id: source })).status, 204);
    const date = offset => { const day = new Date(c.today + "T12:00:00Z"); day.setUTCDate(day.getUTCDate() + offset); return day.toISOString().slice(0, 10); };
    for (const [id, first, last] of [[c.last, -10, 14], [c.green, -39, -24]]) {
      const row = await task(id);
      if (row.start_date !== date(first) || row.due_date !== date(last)) assert.equal((await api("patch", endpoint(id), { start_date: date(first), due_date: date(last), expected_calendar_revision: row.calendar_revision, calendar_intent_id: crypto.randomUUID() })).status, 200);
    }
    const current = await task(c.hello);
    if (current.due_date) assert.equal((await api("patch", endpoint(c.hello), { due_date: null, expected_calendar_revision: current.calendar_revision, calendar_intent_id: crypto.randomUUID() })).status, 200);
    await page.reload(); await ready();
  }
  await step("SS, SF, FS y FF de morada a verde persisten con IDs y extremos guardados", async () => {
    for (const type of ["SS", "SF", "FS", "FF"]) {
      await top(); await connect(c.purple, c.green, type[0] === "S" ? "start" : "end", type[1] === "S" ? "start" : "end", type);
      await page.reload(); await ready(); assert.equal((await task(c.green)).dependency_links.find(l => l.predecessor_id === c.purple)?.type, type); await alignment(type); await remove(c.purple, c.green);
    }
  });
  await step("Cuerpo y ajuste compatible comparten criterio, y el ciclo queda fuera de elegibilidad", async () => {
    await top(); await connect(c.purple, c.green, "start", "start", "SS", true); await remove(c.purple, c.green);
    await connect(c.green, c.purple, "end", "start", "FF", true);
    const a = await point(c.purple, "start"), b = await point(c.green, "end"), count = writes.length;
    await page.mouse.move(a.x, a.y); await settle(); await page.mouse.down(); await page.mouse.move(a.x + 8, a.y); await page.mouse.move(b.x, b.y, { steps: 8 });
    assert.equal(await port(c.green, "end").isDisabled(), true); assert.equal(await page.locator('[data-connection-target="true"]').count(), 0); await page.mouse.up(); await settle(); assert.equal(writes.length, count);
    await remove(c.green, c.purple);
  });
  await step("Hola cerrada con subtarea guarda un rango válido y conserva estado, parentesco e historia", async () => {
    await top(); const before = await task(c.hello), child = await task(c.child);
    const name = await page.locator(`[data-gantt-tree-id="${c.hello}"]`).boundingBox(), chart = await page.locator(".gm-task-gantt .wx-chart").boundingBox();
    const y = name.y + name.height / 2, x = chart.x + chart.width * .48, count = writes.length;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 100, y, { steps: 8 }); await page.locator(`[data-gantt-programming="${c.hello}"][data-dragging]`).waitFor();
    const pending = page.waitForResponse(r => new URL(r.url()).pathname === "/api/" + endpoint(c.hello) && r.request().method() === "PATCH"); await page.mouse.up(); const r = await pending; assert.equal(r.status(), 200, await r.text()); assert.equal(writes.length, count + 1);
    const after = await task(c.hello); assert.equal(after.start_date, child.start_date); assert.ok(after.due_date); assert.equal(after.state_code, before.state_code); assert.equal(after.parent_id, before.parent_id); assert.deepEqual(after.execution, before.execution); assert.deepEqual((await task(c.child)).execution, child.execution);
    await page.reload(); await ready(); assert.equal((await task(c.hello)).due_date, after.due_date); assert.ok((await bar(c.hello).boundingBox()).height > 0); await page.screenshot({ path: out + "/hola-persisted.png" });
  });
  await step("Rueda en ambos paneles, indicadores, jerarquía, filtros y temporalidades mantienen alineación", async () => {
    await page.setViewportSize({ width: 1920, height: 760 }); await settle(); const count = writes.length;
    for (const panel of [".wx-table", ".wx-chart"]) {
      await wheel(panel, -10000); await alignment(panel + " arriba"); await wheel(panel, 60); assert.ok((await alignment(panel + " medio")).top > 0); await wheel(panel, 10000); await alignment(panel + " abajo");
    }
    await page.getByRole("button", { name: "Subir filas de Gantt", exact: true }).click(); const higher = await alignment("indicador arriba"); await page.getByRole("button", { name: "Bajar filas de Gantt", exact: true }).click(); assert.ok((await alignment("indicador abajo")).top > higher.top);
    await top(); await page.getByRole("region", { name: "Calendario de tareas; tabla y línea de tiempo", exact: true }).focus(); await page.keyboard.press("PageDown"); await settle(); assert.ok((await alignment("teclado abajo")).top > 0); await page.keyboard.press("PageUp"); await settle(); assert.equal((await alignment("teclado arriba")).top, 0);
    const chart = page.locator(".gm-task-gantt .wx-chart"), previous = await chart.evaluate(n => n.scrollLeft), box = await chart.boundingBox(); await page.mouse.move(box.x + 100, box.y + 100); await page.mouse.wheel(80, 0); await settle(); assert.ok(await chart.evaluate(n => n.scrollLeft) > previous);
    await top(); await page.getByRole("button", { name: "Contraer subtareas de Hola", exact: true }).click(); await wheel(".wx-table", 10000); await alignment("contraído"); await top(); await page.getByRole("button", { name: "Expandir subtareas de Hola", exact: true }).click(); await wheel(".wx-chart", 10000); await alignment("expandido");
    await page.getByRole("button", { name: "Buscar tareas", exact: true }).click(); await page.getByPlaceholder("Buscar tareas…").fill("Tarea de prueba"); await settle(); await alignment("filtrado"); assert.equal(await page.getByRole("navigation", { name: "Desplazamiento vertical del Gantt" }).count(), 0);
    await page.getByPlaceholder("Buscar tareas…").fill(""); await page.getByRole("button", { name: "Buscar tareas", exact: true }).click();
    for (const period of ["day", "week", "month", "quarter", "year"]) { await chooseGanttPeriod(page, period); for (const zoom of [1, 9]) { await level(zoom); await wheel(".wx-table", 10000); await alignment(period + " " + zoom); } }
    assert.equal(writes.length, count); await chooseGanttPeriod(page, "quarter"); await level(5); await wheel(".wx-chart", 10000); await page.screenshot({ path: out + "/bottom-alignment.png" });
  });
  await step("Edición de última barra modifica su ID y persiste al recargar", async () => {
    const before = await task(c.last), b = await bar(c.last).boundingBox(), count = writes.length;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2 + 35, b.y + b.height / 2, { steps: 8 });
    const pending = page.waitForResponse(r => new URL(r.url()).pathname === "/api/" + endpoint(c.last) && r.request().method() === "PATCH"); await page.mouse.up(); const r = await pending; assert.equal(r.status(), 200, await r.text()); assert.equal(writes.length, count + 1); assert.equal(writes.at(-1).path, "/api/" + endpoint(c.last)); const after = await task(c.last); assert.notEqual(after.start_date, before.start_date); assert.equal(after.state_code, before.state_code);
    await page.reload(); await ready(); assert.equal((await task(c.last)).start_date, after.start_date);
  });
  await step("Aviso de error expira y permite rueda, barras y conectores mientras está visible", async () => {
    await top(); const before = await task(c.hello), b = await bar(c.hello).boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2 + 80, b.y + b.height / 2, { steps: 8 });
    const pending = page.waitForResponse(r => new URL(r.url()).pathname === "/api/" + endpoint(c.hello) && r.request().method() === "PATCH"); await page.mouse.up(); assert.equal((await pending).status(), 400);
    const notice = page.getByRole("complementary", { name: "Calendario de Hola", exact: true }); await notice.waitFor(); assert.equal(await notice.evaluate(n => globalThis.getComputedStyle(n).pointerEvents), "none");
    await wheel(".wx-table", 40); await alignment("aviso sobre tabla"); await top();
    const green = await bar(c.green).boundingBox(); await page.mouse.move(green.x + green.width / 2, green.y + green.height / 2); await page.mouse.down(); await page.mouse.move(green.x + green.width / 2 + 30, green.y + green.height / 2, { steps: 8 });
    const moved = page.waitForResponse(r => new URL(r.url()).pathname === "/api/" + endpoint(c.green) && r.request().method() === "PATCH"); await page.mouse.up(); assert.equal((await moved).status(), 200); assert.equal(await notice.isVisible(), true);
    await connect(c.purple, c.green, "start", "start", "SS"); assert.equal((await task(c.hello)).start_date, before.start_date);
    await notice.waitFor({ state: "detached", timeout: 11000 }); await page.screenshot({ path: out + "/notice-expired.png" });
  });
  await step("Eliminar, deshacer y expiración conservan tipo y persistencia", async () => {
    await top(); await remove(c.purple, c.green, false); await page.getByRole("button", { name: "Deshacer", exact: true }).click(); await page.locator(`[data-gantt-link="${c.purple}:${c.green}"]`).waitFor(); assert.equal((await task(c.green)).dependency_links.find(l => l.predecessor_id === c.purple)?.type, "SS");
    await remove(c.purple, c.green, false); await page.getByRole("status", { name: "Dependencia retirada" }).waitFor({ state: "detached", timeout: 11000 }); await page.reload(); await ready(); assert.equal((await task(c.green)).dependencies.includes(c.purple), false);
  });
  assert.deepEqual(errors, []);
} finally {
  fs.writeFileSync(out + "/regressions-browser.json", JSON.stringify({ checks, writes, errors, measurements }, null, 2)); await page.screenshot({ path: out + "/regressions-last.png" }).catch(() => {}); await browser.close();
}
