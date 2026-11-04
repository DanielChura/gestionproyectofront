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
const page = await context.newPage();
page.setDefaultTimeout(20000);
observeGanttCollections(page);
const checks = [], traffic = [], writes = [], errors = [], accepted = [], finalCalendars = {}, snapshots = [], consoleErrors = [];
let token, current = "", baseline;
page.on("pageerror", error => errors.push(error.message.slice(0, 400)));
page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text().slice(0, 600)); });
page.on("request", request => {
  const pathname = new URL(request.url()).pathname;
  if (pathname.startsWith("/api/projects/") && request.method() !== "GET") writes.push({ method: request.method(), path: pathname, payload: request.postDataJSON() });
});
page.on("response", response => {
  const pathname = new URL(response.url()).pathname;
  if (pathname.startsWith("/api/")) traffic.push({ method: response.request().method(), path: pathname, status: response.status() });
});
const settled = () => page.evaluate(() => new Promise(resolve => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
const intervalText = () => page.getByRole("navigation", { name: "Navegación temporal de Gantt" }).locator(":scope > span.tabular-nums").textContent();
const row = id => page.locator(".gm-task-gantt .wx-row[data-id='" + id + "']");
const bar = id => page.locator("[data-gantt-calendar-task='" + id + "']");
const collection = id => "/api/projects/" + id + "/tasks/";
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
async function api(id) {
  const response = await context.request.get(origin + collection(qa.project) + id + "/", { headers: { Authorization: "Bearer " + token }, maxRetries: 0 });
  assert.equal(response.status(), 200);
  return (await response.json()).task;
}
async function load(id) {
  const waiting = page.waitForResponse(response => new URL(response.url()).pathname === collection(id) && response.status() === 200);
  await page.goto(origin + "/proyectos/" + id + "?vista=gantt"); await waiting; await waitGantt(page); await settled();
}
async function check(name, run) {
  current = name;
  if (process.env.GM_GANTT_CHECK && !name.includes(process.env.GM_GANTT_CHECK)) return;
  const details = await run();
  checks.push({ name, status: "Aprobado", details });
  console.log("OK " + name);
}
async function fit() {
  await page.getByRole("button", { name: "Ajuste automático", exact: true }).click(); await settled();
  await page.waitForFunction(() => {
    const chart = globalThis.document.querySelector(".gm-task-gantt .wx-chart");
    return chart && chart.scrollWidth <= chart.clientWidth + 1;
  });
  return page.locator(".gm-task-gantt .wx-chart").evaluate(node => ({ width: node.clientWidth, content: node.scrollWidth, left: node.scrollLeft }));
}
async function fields() {
  await page.getByRole("button", { name: "Añadir o quitar columnas", exact: true }).click();
  return page.getByRole("dialog", { name: "Campos", exact: true });
}
async function cancel(id) {
  const node = bar(id), bounds = await node.boundingBox();
  assert.ok(bounds && bounds.width > 14);
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 24, y, { steps: 12 });
  await page.locator("[data-calendar-dragging='true']").waitFor();
  await page.keyboard.press("Escape"); await page.mouse.up();
  assert.equal(await page.locator("[data-calendar-dragging='true']").count(), 0);
  assert.equal(await page.locator("dialog[open]").count(), 0);
}
async function saveGesture(id, mode, dx) {
  const before = await api(id), count = writes.length;
  const node = mode === "move" ? bar(id) : bar(id).locator("[data-gantt-calendar-mode='" + mode + "']");
  await node.scrollIntoViewIfNeeded();
  const box = await node.boundingBox(); assert.ok(box && box.width > 0);
  const waiting = page.waitForResponse(response => new URL(response.url()).pathname === collection(qa.project) + id + "/" && response.request().method() === "PATCH");
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y, { steps: 20 }); await page.mouse.up();
  const response = await waiting; assert.equal(response.status(), 200);
  const result = await response.json();
  await page.getByRole("region", { name: "Operaciones de calendario", exact: true }).getByRole("status").filter({ hasText: "Calendario confirmado:" }).waitFor();
  assert.equal(writes.length, count + 1);
  const payload = response.request().postDataJSON();
  assert.equal(typeof payload.expected_calendar_revision, "string");
  assert.equal(payload.expected_calendar_revision, before.calendar_revision);
  assert.match(payload.calendar_intent_id, /^[0-9a-f-]{36}$/i);
  assert.equal(BigInt(result.calendar_revision), BigInt(before.calendar_revision) + 1n);
  const changed = ["start_date", "due_date"].filter(field => payload[field] !== undefined && payload[field] !== before[field]);
  assert.ok(changed.length > 0);
  for (const field of ["start_date", "due_date"]) if (field in payload) assert.equal(result[field], payload[field]);
  for (const field of Object.keys(before).filter(field => !["start_date", "due_date", "calendar_revision", "updated_at", "move_revision"].includes(field))) {
    assert.deepEqual(result[field], before[field], "unrelated field " + field);
  }
  accepted.push({ task_id: id, intent_id: payload.calendar_intent_id, fields: changed });
  finalCalendars[id] = { start_date: result.start_date, due_date: result.due_date, calendar_revision: result.calendar_revision };
  return { mode, revision: result.calendar_revision, start: result.start_date, due: result.due_date, payload_fields: Object.keys(payload) };
}
try {
  await page.goto(origin);
  await page.getByLabel("Correo electrónico", { exact: true }).fill(secrets.admin.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(secrets.admin.password);
  const login = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/login/" && response.request().method() === "POST");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  const response = await login; assert.equal(response.status(), 200); token = (await response.json()).access;
  await page.getByRole("button", { name: "Abrir menú de perfil" }).waitFor();
  await load(qa.project);
  baseline = await api(qa.subject);
  await check("Compact toolbar integrates one shared create action, removes localization and permanent filters", async () => {
    const toolbar = page.getByRole("group", { name: "Consulta de Gantt", exact: true });
    assert.equal(await toolbar.getByRole("button", { name: "Crear nueva tarea", exact: true }).count(), 1);
    assert.equal(await page.getByRole("button", { name: "Crear nueva tarea", exact: true }).count(), 1);
    assert.equal(await page.getByRole("combobox", { name: /Localizar/ }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "Localizar selección", exact: true }).count(), 0);
    assert.equal(await toolbar.getByRole("combobox").count(), 0);
    assert.equal(await toolbar.getByRole("button", { name: "Anterior", exact: true }).count(), 0);
    assert.equal(await toolbar.getByRole("button", { name: /Columnas/ }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "Buscar tareas", exact: true }).count(), 1);
    const bounds = await toolbar.boundingBox(), create = await toolbar.getByRole("button", { name: "Crear nueva tarea" }).boundingBox();
    assert.ok(create.y >= bounds.y && create.y + create.height <= bounds.y + bounds.height + 1);
    const element = await page.locator(".gm-task-gantt").elementHandle();
    await page.getByRole("button", { name: "Crear nueva tarea" }).click(); await page.locator("dialog[open]").waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await element.evaluate(node => node.isConnected), true);
    return { one_toolbar: true, one_search: true, localization_controls: 0, same_widget: true };
  });
  await check("Six real periods, coherent temporal anchors, custom inclusive range and today use no writes", async () => {
    const results = [];
    for (const scale of ["day", "week", "month", "quarter", "year"]) {
      await chooseGanttPeriod(page, scale); await page.getByRole("button", { name: "Hoy", exact: true }).click(); await settled();
      const interval = await intervalText();
      const bounds = interval.match(/\d{4}-\d{2}-\d{2}/g);
      assert.ok(bounds[0] <= data.today && bounds[1] >= data.today);
      const subject = await bar(qa.subject).boundingBox(), chart = await page.locator(".gm-task-gantt .wx-chart").boundingBox();
      assert.ok(subject.x >= chart.x - 1 && subject.x < chart.x + chart.width, JSON.stringify({ scale, subject, chart }));
      results.push({ scale, interval });
    }
    const first = data.today, last = data.today;
    await chooseGanttPeriod(page, "flexible");
    await page.getByLabel("Inicio del intervalo", { exact: true }).fill(first);
    await page.getByLabel("Fin del intervalo", { exact: true }).fill(last);
    await page.screenshot({ path: path.join(output, "period-flexible.png"), fullPage: true });
    await page.keyboard.press("Escape");
    await flexibleGanttRange(page, first, last); await settled();
    assert.match(await page.getByRole("button", { name: /^Periodo de Gantt:/ }).textContent(), /Flexible/);
    assert.equal(await page.locator(".gm-task-gantt .wx-chart").evaluate(node => node.scrollWidth <= node.clientWidth + 1), true);
    await chooseGanttPeriod(page, "day"); await page.getByRole("button", { name: "Hoy", exact: true }).click();
    assert.equal(writes.length, 0);
    return { periods: results, single_day_flexible: true, writes: 0 };
  });
  await check("Search and combined filters retain ancestors and all assignments without requests", async () => {
    const reads = traffic.length;
    await page.getByRole("button", { name: "Buscar tareas", exact: true }).click();
    const search = page.getByRole("searchbox", { name: "Buscar tareas por nombre, responsable o etiqueta" });
    assert.equal(await search.evaluate(node => node === globalThis.document.activeElement), true);
    await search.fill("Revisión controles QA");
    await row(qa.leaf).waitFor(); await row(qa.parent).waitFor(); await row(qa.child).waitFor();
    await search.press("Escape");
    const task = currentGanttTasks(page).find(task => task.id === qa.leaf), person = task.assignees.find(person => person.id !== task.responsible_id);
    assert.ok(person);
    await ganttFilter(page, "Persona", String(person.id)); await ganttFilter(page, "Estado", "PENDIENTE"); await ganttFilter(page, "Fecha", "undated");
    await row(qa.leaf).waitFor(); await row(qa.parent).waitFor(); await row(qa.child).waitFor();
    await page.screenshot({ path: path.join(output, "filters.png"), fullPage: true });
    await page.keyboard.press("Escape");
    assert.match(await page.getByRole("button", { name: /^Filtros de Gantt:/ }).textContent(), /3/);
    assert.equal(await page.getByRole("button", { name: /^Filtros de Gantt:/ }).evaluate(node => node === globalThis.document.activeElement), true);
    await page.getByRole("button", { name: "Buscar tareas", exact: true }).click(); await search.fill("ninguna coincidencia controles");
    await page.getByText("No hay tareas que coincidan con los filtros.", { exact: true }).waitFor();
    await search.press("Escape"); await clearGanttFilters(page); await row(qa.subject).waitFor();
    assert.equal(traffic.length, reads);
    return { ancestor_rows: 3, additional_assignment: true, active_filters: 3, extra_requests: 0, writes: writes.length };
  });
  await check("Fit uses all task bounds including null starts with filters, fields open and resized timeline", async () => {
    await ganttFilter(page, "Estado", "EN_CURSO"); await page.keyboard.press("Escape");
    const originalWidth = await page.locator(".gm-task-gantt .wx-table").evaluate(node => node.getBoundingClientRect().width);
    const first = await fit();
    const interval = await intervalText();
    const tasks = currentGanttTasks(page), earliest = tasks.map(task => task.start_date).sort()[0], latest = tasks.map(task => task.due_date ?? task.start_date).sort().at(-1);
    const dates = interval.match(/\d{4}-\d{2}-\d{2}/g);
    assert.ok(dates[0] <= earliest && dates[1] >= latest, JSON.stringify({ dates, earliest, latest }));
    assert.equal(await page.locator(".gm-task-gantt .wx-table").evaluate(node => node.getBoundingClientRect().width), originalWidth);
    const panel = await fields(); await panel.getByRole("searchbox", { name: "Buscar campos de tarea" }).fill("Inicio");
    assert.equal(await panel.getByRole("switch").count(), 1);
    await panel.getByRole("searchbox").fill("");
    assert.equal(await panel.getByRole("switch").count(), 5);
    assert.equal(await panel.getByRole("switch", { name: "Tarea, siempre visible", exact: true }).isDisabled(), true);
    await settled();
    const open = await page.locator(".gm-task-gantt .wx-chart").evaluate(node => ({ width: node.clientWidth, content: node.scrollWidth }));
    assert.ok(open.content <= open.width + 1, JSON.stringify(open));
    await panel.getByRole("heading", { name: "Campos", exact: true }).hover();
    await page.screenshot({ path: path.join(output, "fields-fit.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 1100 }); await settled();
    const resized = await page.locator(".gm-task-gantt .wx-chart").evaluate(node => ({ width: node.clientWidth, content: node.scrollWidth }));
    assert.ok(resized.content <= resized.width + 1, JSON.stringify(resized));
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("button", { name: "Añadir o quitar columnas", exact: true }).evaluate(node => node === globalThis.document.activeElement), true);
    await page.setViewportSize({ width: 1600, height: 1100 }); await clearGanttFilters(page); await settled();
    return { first, open, resized, all_authorized_bounds: { earliest, latest }, left_table_unchanged: true };
  });
  await check("Header fields and diagram navigation preserve widget, hierarchy and manual window", async () => {
    await chooseGanttPeriod(page, "day"); await page.getByRole("button", { name: "Hoy", exact: true }).click();
    await row(qa.subject).locator(".wx-cell").last().click();
    const element = await page.locator(".gm-task-gantt").elementHandle();
    const before = await intervalText();
    const panel = await fields();
    await panel.getByRole("switch", { name: "Responsable", exact: true }).click();
    await panel.getByRole("switch", { name: "Inicio", exact: true }).click();
    await page.getByRole("button", { name: "Cerrar campos", exact: true }).click(); await settled();
    assert.equal(await element.evaluate(node => node.isConnected), true);
    assert.equal(await intervalText(), before);
    await page.getByRole("region", { name: "Acciones de la tarea seleccionada" }).waitFor();
    const nav = page.getByRole("navigation", { name: "Navegación temporal de Gantt" });
    await nav.getByRole("button", { name: "Siguiente", exact: true }).click(); await settled();
    assert.notEqual(await nav.locator(":scope > span.tabular-nums").textContent(), before);
    await nav.getByRole("button", { name: "Anterior", exact: true }).click();
    assert.equal(await element.evaluate(node => node.isConnected), true);
    return { widget_preserved: true, manual_interval_preserved_by_fields: true, selection_preserved: true, navigation_at_timeline_edges: true };
  });
  await check("Refresh is single-flight, retains context and rows, and exposes retry after controlled error", async () => {
    const path = collection(qa.project), gate = deferred(), entered = deferred();
    const routeHandler = async route => { const response = await route.fetch(); entered.resolve(); await gate.promise; await route.fulfill({ response }); };
    await page.route("**" + path, routeHandler);
    const element = await page.locator(".gm-task-gantt").elementHandle();
    const trigger = page.getByRole("button", { name: "Actualizar Gantt", exact: true });
    const count = traffic.filter(item => item.path === path).length;
    const interval = await intervalText();
    await trigger.click(); await entered.promise;
    assert.equal(await trigger.isDisabled(), true);
    const box = await trigger.boundingBox(); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    assert.equal(await element.evaluate(node => node.isConnected), true);
    gate.resolve(); await page.waitForFunction(() => !globalThis.document.querySelector("[aria-label='Actualizar Gantt']")?.disabled);
    await page.unroute("**" + path, routeHandler);
    assert.equal(traffic.filter(item => item.path === path).length, count + 1);
    assert.equal(await intervalText(), interval);
    const failure = route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Actualización QA no disponible" }) });
    await page.route("**" + path, failure); await trigger.click();
    await page.getByRole("button", { name: "Reintentar tareas", exact: true }).waitFor();
    assert.equal(await element.evaluate(node => node.isConnected), true);
    await row(qa.subject).waitFor();
    await page.unroute("**" + path, failure); await page.getByRole("button", { name: "Reintentar tareas", exact: true }).click();
    await page.getByRole("button", { name: "Reintentar tareas", exact: true }).waitFor({ state: "hidden" });
    return { collection_requests: 1, same_widget: true, retained_window: true, controlled_503: true, retry: true };
  });
  await check("Empty, all-null, one-day and centuries fit without task rewrites or fictional bars", async () => {
    const results = [];
    for (const id of [data.empty_project, data.null_project, qa.single, qa.extreme]) {
      await load(id); const geometry = await fit(); const tasks = currentGanttTasks(page);
      for (const task of tasks.filter(task => task.due_date === null)) assert.equal(await bar(task.id).isVisible(), false);
      assert.equal(await page.locator(".wx-bar.wx-summary").count(), 0);
      results.push({ project: id, rows: tasks.length, geometry, interval: await intervalText() });
    }
    assert.equal(writes.length, 0);
    await load(qa.project);
    return { projects: results, writes: 0 };
  });
  await check("Both themes at 1600,1280,1024,768,390px keep accessible controls and contained overflow", async () => {
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => globalThis.localStorage.setItem("theme", theme), theme); await page.reload(); await waitGantt(page);
      for (const width of [1600, 1280, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 1100 }); await settled();
        const values = await page.evaluate(() => {
          const bar = globalThis.document.querySelector(".gm-gantt-controls"), create = bar.querySelector("[aria-label='Crear nueva tarea']"), chart = globalThis.document.querySelector(".gm-task-gantt .wx-chart");
          return { page: globalThis.document.documentElement.scrollWidth, viewport: globalThis.innerWidth, toolbar: bar.getBoundingClientRect().toJSON(), create: create.getBoundingClientRect().toJSON(), chart: chart.clientWidth };
        });
        assert.ok(values.page <= width + 1, JSON.stringify(values));
        assert.ok(values.chart >= 350, JSON.stringify(values));
        assert.ok(values.create.right <= width + 1 && values.create.left >= 0, JSON.stringify(values));
        const panel = await fields(); await panel.getByRole("searchbox").waitFor();
        assert.equal(await panel.getByRole("searchbox").evaluate(node => node === globalThis.document.activeElement), true);
        await page.keyboard.press("Escape");
        assert.equal(await page.getByRole("button", { name: "Añadir o quitar columnas", exact: true }).evaluate(node => node === globalThis.document.activeElement), true);
        if (width === 390) {
          const expanded = await fields();
          await expanded.getByRole("switch", { name: "Responsable", exact: true }).click();
          await page.keyboard.press("Escape"); await settled();
          const previous = await page.getByRole("button", { name: "Anterior", exact: true }).boundingBox();
          const next = await page.getByRole("button", { name: "Siguiente", exact: true }).boundingBox();
          assert.ok(previous.x + previous.width <= next.x && next.x + next.width <= width + 1, JSON.stringify({ previous, next }));
          const restore = await fields(); await restore.getByRole("switch", { name: "Responsable", exact: true }).click(); await page.keyboard.press("Escape");
        }
        await page.screenshot({ path: path.join(output, theme + "-" + width + ".png"), fullPage: true });
        snapshots.push({ theme, width, ...values });
      }
    }
    await page.setViewportSize({ width: 1600, height: 1100 }); await page.evaluate(() => globalThis.localStorage.setItem("theme", "light")); await page.reload(); await waitGantt(page);
    return { snapshots, writes: writes.length };
  });
  await check("2000 authorized rows stay searchable, virtualized and one collection, with no per-task requests", async () => {
    const before = traffic.length, start = performance.now();
    await load(qa.large); const mount = performance.now() - start;
    assert.equal(currentGanttTasks(page).length, 2000);
    const rendered = await page.locator(".gm-task-gantt .wx-row[data-id]").count(); assert.ok(rendered > 0 && rendered < 100);
    const requests = traffic.slice(before).filter(item => item.path.startsWith("/api/projects/") && item.method === "GET");
    assert.equal(requests.filter(item => item.path === collection(qa.large)).length, 1);
    assert.equal(requests.filter(item => /\/tasks\/\d+\/$/.test(item.path)).length, 0);
    const handle = await page.locator(".gm-task-gantt").elementHandle();
    await page.getByRole("button", { name: "Buscar tareas", exact: true }).click();
    await page.getByRole("searchbox", { name: "Buscar tareas por nombre, responsable o etiqueta" }).fill("Fila controles 1999");
    await row(qa.large_last).waitFor(); assert.equal(await handle.evaluate(node => node.isConnected), true);
    assert.equal(traffic.slice(before).filter(item => item.path === collection(qa.large)).length, 1);
    await load(qa.project);
    return { rows: 2000, rendered, collection_requests: 1, detail_requests: 0, observed_mount_ms: mount };
  });
  await check("Real pointer move/resize after quarter, year and fit keep one logical write and immediate cancellation", async () => {
    const results = [];
    for (const scale of ["quarter", "year", "fit"]) {
      if (scale === "fit") await fit(); else { await chooseGanttPeriod(page, scale); await page.getByRole("button", { name: "Hoy", exact: true }).click(); }
      await row(qa.subject).locator(".wx-cell").last().click(); await settled();
      const count = writes.length;
      await cancel(qa.subject); await cancel(qa.subject);
      assert.equal(writes.length, count);
      results.push({ scale, move: await saveGesture(qa.subject, "move", 24), resize: await saveGesture(qa.subject, "end", 20) });
    }
    const last = await api(qa.subject); await page.reload(); await waitGantt(page);
    assert.deepEqual((({ start_date, due_date, calendar_revision }) => ({ start_date, due_date, calendar_revision }))(await api(qa.subject)), finalCalendars[qa.subject]);
    for (const field of ["parent_id", "state_code", "estimated_minutes", "priority", "dependencies", "assignees", "labels"]) assert.deepEqual(last[field], baseline[field]);
    await selectGanttTask(page, qa.subject, { calendar: false });
    await page.getByRole("region", { name: "Acciones de la tarea seleccionada" }).getByRole("button", { name: "Editar datos", exact: true }).click();
    await page.locator("dialog[open]").waitFor(); await page.keyboard.press("Escape");
    for (const name of ["Lista", "Tablero", "Gantt"]) {
      await page.getByRole("link", { name, exact: true }).click();
      if (name === "Gantt") await waitGantt(page);
    }
    await row(qa.child).waitFor(); assert.equal((await api(qa.child)).state_code, "EN_CURSO");
    return { gestures: results, cancellations: 6, writes: writes.length, preserved_unrelated_fields: true, shared_forms_and_views: true, persisted: finalCalendars[qa.subject] };
  });
  await check("Repeated panel lifecycle leaves no accumulating listeners or remounted widget", async () => {
    const cdp = await context.newCDPSession(page); await cdp.send("Performance.enable");
    const value = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map(item => [item.name, item.value]));
    const globalListeners = async () => {
      const counts = {};
      for (const expression of ["window", "document"]) {
        const remote = await cdp.send("Runtime.evaluate", { expression, objectGroup: "gantt-listeners" });
        const { listeners } = await cdp.send("DOMDebugger.getEventListeners", { objectId: remote.result.objectId });
        counts[expression] = listeners.reduce((result, listener) => { result[listener.type] = (result[listener.type] ?? 0) + 1; return result; }, {});
      }
      await cdp.send("Runtime.releaseObjectGroup", { objectGroup: "gantt-listeners" });
      return counts;
    };
    const neutral = async () => {
      await page.getByRole("heading", { level: 1 }).click(); await page.mouse.move(1, 1); await settled();
      await cdp.send("HeapProfiler.collectGarbage");
    };
    let warmup = 0;
    for (let i = 0; i < 2; i++) { await fields(); await page.keyboard.press("Escape"); await neutral(); warmup++; }
    while (!(await globalListeners()).window["__playwright_global_listeners_check__"] && warmup < 30) {
      await fields(); await page.keyboard.press("Escape"); await neutral(); warmup++;
    }
    assert.ok((await globalListeners()).window["__playwright_global_listeners_check__"], "Playwright input instrumentation must be installed before measuring its listeners");
    await neutral(); const before = await value(), globalBefore = await globalListeners();
    const element = await page.locator(".gm-task-gantt").elementHandle();
    for (let i = 0; i < 10; i++) { await fields(); await page.keyboard.press("Escape"); }
    await neutral(); const after = await value();
    const globalAfter = await globalListeners();
    for (let i = 0; i < 10; i++) { await fields(); await page.keyboard.press("Escape"); }
    await neutral(); const later = await value(), globalLater = await globalListeners();
    const samples = { warmup, before: before.JSEventListeners, after: after.JSEventListeners, later: later.JSEventListeners, globalBefore, globalAfter, globalLater };
    console.log("LISTENERS " + JSON.stringify(samples));
    await writeFile(path.join(output, "listeners.json"), JSON.stringify(samples, null, 2));
    assert.ok(after.JSEventListeners <= before.JSEventListeners + 2, JSON.stringify({ before: before.JSEventListeners, after: after.JSEventListeners }));
    assert.ok(later.JSEventListeners <= after.JSEventListeners + 2);
    assert.deepEqual(globalAfter, globalBefore);
    assert.deepEqual(globalLater, globalBefore);
    assert.equal(await element.evaluate(node => node.isConnected), true);
    return { cycles: 20, ...samples, same_widget: true };
  });
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, "closure-ledger.json"), JSON.stringify({ final_calendars: finalCalendars, accepted_intents: accepted }, null, 2));
  await writeFile(path.join(output, "controls-browser.json"), JSON.stringify({ captured_at: new Date().toISOString(), browser: await browser.version(), checks, errors, consoleErrors, traffic, writes, snapshots }, null, 2));
  console.log("PASS " + checks.length + " controls groups; real Chrome and MySQL.");
} catch (error) {
  await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
  await writeFile(path.join(output, "controls-browser-failure.json"), JSON.stringify({ current, message: error.message, checks, errors, traffic, writes, snapshots,
    geometry: await page.locator(".gm-task-gantt .wx-chart").evaluate(node => ({client:node.clientWidth, scroll:node.scrollWidth, bounds:node.getBoundingClientRect().toJSON(), children:[...node.querySelectorAll("div")].filter(el=>el.scrollWidth>node.clientWidth+1).slice(0,10).map(el=>({class:el.className,width:el.clientWidth,scroll:el.scrollWidth,style:el.getAttribute("style")}))})).catch(()=>null) }, null, 2));
  throw error;
} finally {
  await context.close(); await browser.close();
}
