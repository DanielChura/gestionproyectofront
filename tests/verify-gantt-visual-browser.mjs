import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { chooseGanttPeriod } from "./ganttBrowserControls.mjs";

const { chromium } = await import(pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE));
const qa = JSON.parse(fs.readFileSync(process.env.GM_QA_SECRETS_PATH, "utf8")), c = qa.regressions;
assert.ok(c && process.env.GM_BROWSER_REPORT_DIR);
const out = process.env.GM_BROWSER_REPORT_DIR;
const browser = await chromium.launch({ channel: "chrome", headless: true, ignoreDefaultArgs: ["--hide-scrollbars"] });
const page = await browser.newPage({ viewport: { width: 1820, height: 920 }, timezoneId: "America/Lima", colorScheme: "dark" });
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
async function ready() { await page.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor(); await chooseGanttPeriod(page, "year"); await level(5); await settle(); }
async function step(name, action) {
  if (process.env.GM_VISUAL_CASE && !name.startsWith(process.env.GM_VISUAL_CASE)) return;
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
async function geometry(label) {
  const value = await page.evaluate(() => {
    const root = globalThis.document.querySelector('.gm-task-gantt'), chart = root.querySelector('.wx-chart'), canvas = root.closest('.gm-gantt-canvas');
    const headers = [...root.querySelectorAll('.gm-gantt-time-header [role=row]')].at(-1).querySelectorAll('[data-gantt-header-start]');
    const grid = [...root.querySelectorAll('[data-gantt-grid-start]')];
    const rail = root.querySelector('[aria-label="Desplazamiento vertical del Gantt"]');
    const deltas = [...headers].map(h => { const g = grid.find(n => n.dataset.ganttGridEnd === h.dataset.ganttHeaderEnd); if (!g) throw Error('Missing grid column'); return Math.abs(h.getBoundingClientRect().right - g.getBoundingClientRect().right); });
    return { deltas, outerOverflow: canvas.scrollWidth - canvas.clientWidth, rightGap: root.getBoundingClientRect().right - chart.getBoundingClientRect().right, scrollbarHeight: chart.offsetHeight - chart.clientHeight, columns: grid.length, rail: rail?.getBoundingClientRect().width ?? 0 };
  });
  assert.ok(value.columns > 0); assert.ok(Math.max(...value.deltas) <= .1, JSON.stringify({ label, ...value })); assert.equal(value.outerOverflow, 0); assert.ok(Math.abs(value.rightGap - value.rail) <= 1); assert.equal(value.scrollbarHeight, 0); measurements.push({ label, ...value });
}
async function expose() {
  await page.evaluate(() => { let f = globalThis.document.querySelector('.gm-task-gantt'); f = f[Object.keys(f).find(k => k.startsWith('__reactFiber'))]; for (; f; f = f.return) for (let h = f.memoizedState; h; h = h.next) if (h.memoizedState?.getState && h.memoizedState?.exec) { globalThis.qaApi = h.memoizedState; return; } });
}
async function edge(id, side) {
  await page.mouse.move(850, 180); await page.getByRole('region', { name: 'Calendario de tareas; tabla y línea de tiempo', exact: true }).focus();
  await page.evaluate(({ id, side }) => { const api = globalThis.qaApi, state = api.getState(), row = api.getTask(id); api.exec('scroll-chart', { left: row.$x - (side === 'right' ? state._chartWidth - row.$w - 3 : side === 'center' ? state._chartWidth / 2 : 3) }); }, { id, side }); await settle();
}
async function mutateBar(id, mode, pixels) {
  await bar(id).hover(); await settle();
  const node = mode === 'move' ? bar(id) : page.locator(`[data-gantt-edit-task="${id}"][data-gantt-calendar-mode="${mode}"]`), box = await node.boundingBox(), count = writes.length;
  assert.ok(box); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await settle(); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + pixels, box.y + box.height / 2, { steps: 8 });
  assert.equal(writes.length, count); const waiting = page.waitForResponse(r => new URL(r.url()).pathname === '/api/' + endpoint(id) && r.request().method() === 'PATCH'); await page.mouse.up(); const response = await waiting; assert.equal(response.status(), 200, await response.text()); assert.equal(writes.length, count + 1); assert.equal(await page.getByRole('dialog').count(), 0); await settle();
}
try {
  await page.goto(`http://localhost:5189/proyectos/${c.project}?vista=gantt`);
  await page.getByLabel('Correo electrónico').fill(qa.admin.email); await page.getByLabel('Contraseña', { exact: true }).fill(qa.admin.password); await page.getByRole('button', { name: 'Ingresar', exact: true }).click(); await ready(); await expose();
  for (const [source, target] of [[c.purple, c.green], [c.green, c.purple]]) if ((await task(target)).dependencies.includes(source)) await api('delete', endpoint(target) + 'dependencies/', { predecessor_id: source });
  if (!process.env.GM_VISUAL_CASE) {
    const row = await task(c.green), date = offset => { const day = new Date(c.today + "T12:00:00Z"); day.setUTCDate(day.getUTCDate() + offset); return day.toISOString().slice(0, 10); };
    assert.equal((await api('patch', endpoint(c.green), { start_date: date(-39), due_date: date(-24), expected_calendar_revision: row.calendar_revision, calendar_intent_id: crypto.randomUUID() })).status, 200); await page.reload(); await ready(); await expose();
  }
  await step('Clic derecho en raíz y subtarea sin modal ni escritura, y orden por drag persistente', async () => {
    const count = writes.length;
    for (const name of ['Septima Tarea', 'Hola', 'Actividad 11']) { await page.getByRole('button', { name: 'Abrir tarea ' + name, exact: true }).click({ button: 'right' }); assert.equal(await page.getByRole('dialog').count(), 0); }
    assert.equal(writes.length, count);
    const source = page.getByRole('button', { name: 'Abrir tarea Segunda tarea', exact: true }), target = page.getByRole('button', { name: 'Abrir tarea Tarea Quinta', exact: true });
    const id = await source.evaluate(n => Number(n.closest('[data-gantt-tree-id]').dataset.ganttTreeId)), a = await source.boundingBox(), b = await target.boundingBox();
    await page.mouse.move(a.x + 10, a.y + a.height / 2); await page.mouse.down(); await page.mouse.move(a.x + 18, a.y + a.height / 2); await page.mouse.move(b.x + 12, b.y + 2, { steps: 8 });
    const waiting = page.waitForResponse(r => new URL(r.url()).pathname === '/api/' + endpoint(id) + 'move/' && r.request().method() === 'POST'); await page.mouse.up(); assert.equal((await waiting).status(), 200); assert.equal(writes.length, count + 1);
    await page.reload(); await ready(); await expose(); assert.equal(await page.locator('[data-gantt-tree-id]').first().getAttribute('data-gantt-tree-id'), String(id));
  });
  await step('Expansión desde barra, etiqueta y foco mantiene controles, fechas y fila en ambos temas', async () => {
    await level(1); const before = await task(c.green), count = writes.length;
    for (const theme of ['dark', 'light']) {
      await page.evaluate(dark => globalThis.document.documentElement.classList.toggle('dark', dark), theme === 'dark');
      for (const side of ['left', 'right']) {
        await edge(c.green, side); await bar(c.green).hover(); await settle();
        assert.equal(await bar(c.green).getAttribute('data-gantt-expanded'), ''); const expanded = await bar(c.green).boundingBox(); assert.ok(expanded.width >= 71);
        const name = await page.locator(`[data-gantt-tree-id="${c.green}"]`).boundingBox(); assert.ok(Math.abs(expanded.y + expanded.height / 2 - name.y - name.height / 2) <= 1);
        const label = page.locator(`[data-gantt-label-task="${c.green}"] button`); await label.hover(); await settle(); assert.equal(await bar(c.green).getAttribute('data-gantt-expanded'), '');
        for (const mode of ['start', 'end']) { const handle = page.locator(`[data-gantt-edit-task="${c.green}"][data-gantt-calendar-mode="${mode}"]`); if (!await handle.count()) continue; await handle.hover(); await settle(); assert.equal(await bar(c.green).getAttribute('data-gantt-expanded'), ''); }
        await bar(c.green).focus(); await page.mouse.move(800, 180); await settle(); assert.equal(await bar(c.green).getAttribute('data-gantt-expanded'), ''); await page.screenshot({ path: out + `/after-${theme}-short-${side}.png` });
      }
      await level(9); await edge(c.purple, 'left'); await bar(c.purple).hover(); await settle(); assert.equal(await bar(c.purple).getAttribute('data-gantt-expanded'), null); await geometry(theme + ' ancha');
    }
    assert.equal(writes.length, count); assert.deepEqual((await task(c.green)).schedule, before.schedule); await ready(); await expose();
  });
  await step('Clic abre el detalle correcto, cuerpo mueve y ambos extremos redimensionan sin abrir detalle', async () => {
    await top(); await edge(c.green, 'left'); const before = await task(c.green);
    await bar(c.green).hover(); await settle();
    const detail = page.waitForResponse(r => new URL(r.url()).pathname === '/api/' + endpoint(c.green) && r.request().method() === 'GET'); await bar(c.green).click(); assert.equal((await detail).status(), 200); await page.getByRole('dialog').waitFor(); await page.getByRole('button', { name: 'Cerrar modal', exact: true }).click();
    await edge(c.green, 'center'); await mutateBar(c.green, 'move', 10); const moved = await task(c.green); assert.notEqual(moved.start_date, before.start_date); assert.equal(Date.parse(moved.due_date) - Date.parse(moved.start_date), Date.parse(before.due_date) - Date.parse(before.start_date));
    await mutateBar(c.green, 'end', 8); await mutateBar(c.green, 'start', 6); const resized = await task(c.green); assert.notEqual(resized.due_date, moved.due_date); assert.notEqual(resized.start_date, moved.start_date);
    await page.reload(); await ready(); await expose(); assert.equal((await task(c.green)).due_date, resized.due_date);
  });
  await step('Dependencias inmediatas, flechas coordinadas, eliminación y Deshacer conservados', async () => {
    await chooseGanttPeriod(page, 'quarter'); await level(5); await edge(c.purple, 'center'); await connect(c.purple, c.green, 'start', 'start', 'SS'); await bar(c.green).hover(); await settle(); assert.equal(await page.locator(`[data-gantt-link="${c.purple}:${c.green}"]`).getAttribute('data-related'), 'true');
    await remove(c.purple, c.green, false); await page.getByRole('button', { name: 'Deshacer', exact: true }).click(); await page.locator(`[data-gantt-link="${c.purple}:${c.green}"]`).waitFor(); assert.equal((await task(c.green)).dependency_links.find(l => l.predecessor_id === c.purple).type, 'SS'); await remove(c.purple, c.green);
  });
  await step('Cabecera y cuadrícula alineadas en cinco escalas, tres zooms y ambos temas, sin scroll duplicado', async () => {
    const count = writes.length;
    for (const theme of ['dark', 'light']) {
      await page.evaluate(dark => globalThis.document.documentElement.classList.toggle('dark', dark), theme === 'dark');
      for (const period of ['year', 'quarter', 'month', 'week', 'day']) {
        await chooseGanttPeriod(page, period);
        for (const zoom of [1, 5, 9]) {
          await level(zoom); await geometry(`${theme} ${period} ${zoom}`);
          const chart = await page.locator('.wx-chart').boundingBox(); await page.mouse.move(chart.x + 100, chart.y + 100); await page.mouse.wheel(137.5, 0); await settle(); await geometry(`${theme} ${period} ${zoom} pan`);
        }
      }
      await ready(); await page.screenshot({ path: out + `/after-${theme}-year.png` });
    }
    assert.equal(writes.length, count);
    await page.setViewportSize({ width: 1366, height: 760 }); await settle(); await geometry('viewport estrecho');
    await page.setViewportSize({ width: 1820, height: 760 }); await settle(); await geometry('viewport ancho');
    for (const panel of ['.wx-table', '.wx-chart']) { await wheel(panel, -10000); await alignment(panel + ' arriba'); await wheel(panel, 80); await alignment(panel + ' medio'); await wheel(panel, 10000); await alignment(panel + ' abajo'); }
    await page.getByRole('button', { name: 'Subir filas de Gantt', exact: true }).click(); await alignment('indicador');
    const header = await page.locator('.gm-gantt-time-header').boundingBox(), beforePan = await page.locator('.wx-chart').evaluate(n => n.scrollLeft);
    await page.mouse.move(header.x + 200, header.y + 12); await page.mouse.down(); await page.mouse.move(header.x + 120, header.y + 12, { steps: 8 }); await page.mouse.up(); await settle(); assert.notEqual(await page.locator('.wx-chart').evaluate(n => n.scrollLeft), beforePan); await geometry('arrastre cabecera');
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click(); await settle(); await geometry('indicador horizontal'); assert.equal(writes.length, count);
    await page.screenshot({ path: out + '/after-bottom.png' });
  });
  assert.deepEqual(errors, []);
} finally {
  fs.writeFileSync(out + '/visual-browser.json', JSON.stringify({ checks, writes, errors, measurements }, null, 2)); await page.screenshot({ path: out + '/visual-last.png' }).catch(() => {}); await browser.close();
}
