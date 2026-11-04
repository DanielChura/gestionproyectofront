import { observeGanttCollections, currentGanttTasks, waitGantt, selectGanttTask } from "./ganttBrowserControls.mjs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE).href);
const secrets = JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH, "utf8"));
const data = secrets.context, projects = data.closure_projects;
const output = process.env.GM_BROWSER_REPORT_DIR, origin = "http://localhost:5189";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const clients = [], records = [], traffic = [], requests = [], errors = [], accepted = new Map();
let current = "", reader, active;
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const resource = (project, id) => "/api/projects/" + project + "/tasks/" + (id ? id + "/" : "");
const row = (client, id) => client.page.locator(".gm-task-gantt .wx-row[data-id='" + id + "']");
const bar = (client, id) => client.page.locator("[data-gantt-calendar-task='" + id + "']");
const settled = page => page.evaluate(() => new Promise(resolve => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
async function session(role, timezone = "America/Lima") {
  const context = await browser.newContext({ viewport: { width: 1800, height: 1100 }, timezoneId: timezone });
  const page = await context.newPage(); observeGanttCollections(page);
  page.setDefaultTimeout(20000);
  const client = { context, page, role, timezone };
  clients.push(client); active = client;
  page.on("pageerror", error => errors.push({ role, timezone, message: error.message.slice(0, 400) }));
  page.on("request", request => {
    const pathname = new URL(request.url()).pathname;
    if (request.method() === "PATCH" && /\/tasks\/\d+\/$/.test(pathname)) requests.push({ role, timezone, path: pathname, payload: request.postDataJSON() });
  });
  page.on("response", response => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith("/api/")) traffic.push({ role, timezone, path: pathname, method: response.request().method(), status: response.status() });
  });
  await page.goto(origin);
  await page.getByLabel("Correo electrónico", { exact: true }).fill(secrets[role].email);
  await page.getByLabel("Contraseña", { exact: true }).fill(secrets[role].password);
  const waiting = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/login/" && response.request().method() === "POST");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  const response = await waiting;
  assert.equal(response.status(), 200);
  client.token = (await response.json()).access;
  await page.getByRole("button", { name: "Abrir menú de perfil", exact: true }).waitFor();
  return client;
}
async function api(client, pathname, method = "GET", payload) {
  const csrf = (await client.context.cookies()).find(cookie => cookie.name === "csrftoken")?.value;
  const reply = await client.context.request.fetch(origin + pathname, {
    method, data: payload, maxRetries: 0,
    headers: { Authorization: "Bearer " + client.token, Origin: origin, ...(csrf ? { "X-CSRFToken": csrf } : {}) },
  });
  return { status: reply.status(), body: await reply.json() };
}
async function snapshot(client, project, id) {
  const response = await api(client, resource(project, id));
  assert.equal(response.status, 200);
  return response.body.task;
}
async function open(client, project) {
  await client.page.goto(origin + "/proyectos/" + project.id + "?vista=gantt");
  await waitGantt(client.page);
  await row(client, project.cases[0].id).waitFor();
}
async function navigate(client, project) {
  const expand = client.page.getByRole("button", { name: "Expandir proyecto " + project.name, exact: true });
  if (await expand.count()) await expand.click();
  await client.page.getByRole("link", { name: "Lista de tareas de " + project.name, exact: true }).click();
  await client.page.getByRole("link", { name: "Gantt", exact: true }).click();
  await waitGantt(client.page);
  await row(client, project.cases[0].id).waitFor();
}
async function locate(client, id) {
  await selectGanttTask(client.page, String(id));

  await row(client, id).waitFor();
  await settled(client.page);
}
async function begin(client, id, mode, dx = 40) {
  await locate(client, id);
  const target = mode === "move" ? bar(client, id) : bar(client, id).locator("[data-gantt-calendar-mode='" + mode + "']");
  const box = await target.boundingBox();
  assert.ok(box && box.width > 0, "The actual pointer target must be visible");
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await client.page.mouse.move(x, y);
  await client.page.mouse.down();
  await client.page.mouse.move(x + dx, y, { steps: 12 });
}
async function check(name, run) {
  current = name;
  const details = await run();
  records.push({ name, status: "Aprobado", details });
  console.log("OK " + name);
}
try {
  const main = await session("admin"); reader = main;
  await check("Direct Gantt opening and SPA project change discard an older collection response", async () => {
    const first = projects[0], second = projects[1];
    const before = requests.length;
    await open(main, first);
    const idsA = await api(main, resource(first.id));
    assert.equal(idsA.status, 200);
    const gate = deferred(), entered = deferred();
    const pattern = "**" + resource(first.id);
    const delayed = async route => {
      const response = await route.fetch(); assert.equal(response.status(), 200);
      entered.resolve(); await gate.promise; await route.fulfill({ response }).catch(() => {});
    };
    await main.page.route(pattern, delayed, { times: 1 });
    await main.page.getByRole("button", { name: "Actualizar Gantt", exact: true }).click();
    await entered.promise;
    await navigate(main, second);
    const delivered = main.page.waitForResponse(response => new URL(response.url()).pathname === resource(first.id));
    gate.resolve(); await delivered; await settled(main.page);
    await main.page.getByRole("heading", { level: 1, name: second.name, exact: true }).waitFor();
    const values = currentGanttTasks(main.page).map(task => task.id);
    assert.ok(values.includes(second.cases[0].id));
    assert.ok(values.every(id => !idsA.body.some(task => task.id === id)));
    assert.equal(await row(main, first.cases[0].id).count(), 0);
    for (const project of [first, second, first]) await navigate(main, project);
    assert.equal(requests.length, before);
    await main.page.screenshot({ path: path.join(output, "01_spa_project.png"), fullPage: true });
    return { direct_url: true, delayed_collection_discarded: true, spa_changes: 4, task_writes: 0 };
  });
  await check("Seven levels, independent states, null and informative dependency survive reload", async () => {
    const project = projects[0];
    const original = (await api(main, resource(project.id))).body;
    await locate(main, project.chain.at(-1));
    for (const id of project.chain) await row(main, id).waitFor();
    const order = await main.page.locator(".gm-task-gantt .wx-row[data-id]").evaluateAll(nodes => nodes.map(node => Number(node.dataset.id)));
    const indices = project.chain.map(id => order.indexOf(id));
    assert.ok(indices.every((value, index) => value >= 0 && (!index || value > indices[index - 1])));
    await locate(main, project.null);
    assert.equal(await bar(main, project.null).locator(":visible").count(), 0);
    await row(main, project.null).getByText("Sin fecha límite", { exact: true }).waitFor();
    await main.page.reload();
    await waitGantt(main.page);
    await locate(main, project.chain.at(-1));
    for (const id of project.chain) {
      const task = original.find(task => task.id === id);
      await row(main, id).getByText(task.state_name, { exact: true }).waitFor();
    }
    assert.deepEqual((await api(main, resource(project.id))).body, original);
    await locate(main, project.cases[1].id);
    await main.page.getByRole("button", { name: "Localizar predecesora " + project.cases[0].name, exact: true }).waitFor();
    assert.equal(await main.page.locator(".gm-task-gantt .wx-link").count(), 0);
    return { levels: 7, own_states: true, parent_ids_preserved: true, null_kept: true, no_native_semantic_invention: true };
  });
  await check("Direct API enforces project scope and read-only worker permissions", async () => {
    const first = projects[0], second = projects[1], target = first.cases[0].id;
    const base = await snapshot(main, first.id, target);
    const payload = { start_date: base.start_date, expected_calendar_revision: base.calendar_revision, calendar_intent_id: randomUUID() };
    const denied = [];
    for (const method of ["GET", "PATCH"]) {
      const response = await api(main, resource(second.id, target), method, method === "PATCH" ? payload : undefined);
      assert.equal(response.status, 404);
      denied.push({ actor: "admin_wrong_project", method, status: response.status });
    }
    const worker = await session("worker");
    const readonly = await snapshot(worker, data.readonly_project, data.readonly_task);
    for (const [pathname, body] of [
      [resource(data.readonly_project, data.readonly_task), { due_date: null, expected_calendar_revision: readonly.calendar_revision, calendar_intent_id: randomUUID() }],
      [resource(data.readonly_project, data.readonly_task) + "state/", { state_code: "EN_CURSO" }],
    ]) {
      const response = await api(worker, pathname, pathname.endsWith("state/") ? "POST" : "PATCH", body);
      assert.equal(response.status, 403);
      denied.push({ actor: "worker_readonly", path: pathname, status: response.status });
    }
    const outsiders = await session("outsider");
    for (const method of ["GET", "PATCH"]) {
      const response = await api(outsiders, resource(first.id, target), method, method === "PATCH" ? payload : undefined);
      assert.equal(response.status, 404);
      denied.push({ actor: "outsider", method, status: response.status });
    }
    await outsiders.page.goto(origin + "/proyectos/" + first.id + "?vista=gantt");
    await outsiders.page.getByText("No se pudo cargar el proyecto", { exact: true }).first().waitFor();
    assert.equal(await outsiders.page.locator(".gm-task-gantt").count(), 0);
    assert.deepEqual(await snapshot(main, first.id, target), base);
    assert.deepEqual(await snapshot(worker, data.readonly_project, data.readonly_task), readonly);
    await worker.context.close(); await outsiders.context.close();
    return { denied, denied_requests_wrote_nothing: true };
  });
  await main.context.close();
  for (const project of projects) {
    const client = await session("admin", project.zone); reader = client;
    await open(client, project);
    await check("Calendar pointer matrix in " + project.zone, async () => {
      const changes = [];
      for (const example of project.cases) {
        const base = await snapshot(client, project.id, example.id), before = requests.length;
        await begin(client, example.id, example.mode);
        assert.equal(requests.length, before);
        const waiting = client.page.waitForResponse(response => new URL(response.url()).pathname === resource(project.id, example.id) && response.request().method() === "PATCH");
        await client.page.mouse.up();
        const response = await waiting;
        assert.equal(response.status(), 200, JSON.stringify(await response.json()));
        const sent = response.request().postDataJSON(), saved = await response.json();
        assert.equal(requests.length, before + 1);
        assert.equal(typeof sent.expected_calendar_revision, "string");
        assert.equal(sent.expected_calendar_revision, base.calendar_revision);
        assert.match(sent.calendar_intent_id, /^[a-f0-9-]{36}$/);
        const fields = example.mode === "move" ? ["due_date", "start_date"] : [example.mode === "start" ? "start_date" : "due_date"];
        assert.deepEqual(Object.keys(sent).filter(key => !["expected_calendar_revision", "calendar_intent_id"].includes(key)).sort(), fields);
        assert.equal(saved.start_date, example.expected_start, project.zone + " " + example.key);
        assert.equal(saved.due_date, example.expected_due, project.zone + " " + example.key);
        assert.equal(BigInt(saved.calendar_revision), BigInt(base.calendar_revision) + 1n);
        for (const field of ["name", "state_code", "parent_id", "priority", "responsible_id", "description", "estimated_minutes", "labels", "dependencies"]) assert.deepEqual(saved[field], base[field], field);
        accepted.set(example.id + ":" + sent.calendar_intent_id, { task_id: example.id, intent_id: sent.calendar_intent_id, fields });
        await client.page.locator("[aria-label='Calendario de " + example.name + "']").getByRole("status").filter({ hasText: "Calendario confirmado:" }).waitFor();
        if (example.key === "month") {
          const replay = await api(client, resource(project.id, example.id), "PATCH", sent);
          assert.equal(replay.status, 200);
          assert.equal(replay.body.calendar_receipt.replayed, true);
          assert.equal(replay.body.calendar_revision, saved.calendar_revision);
        }
        const persisted = await snapshot(client, project.id, example.id);
        assert.equal(persisted.start_date, example.expected_start);
        assert.equal(persisted.due_date, example.expected_due);
        changes.push({ key: example.key, mode: example.mode, start: persisted.start_date, due: persisted.due_date, revision: persisted.calendar_revision, logical_writes: 1 });
      }
      const before = requests.length;
      for (let iteration = 0; iteration < 3; iteration++) {
        await begin(client, project.cases[0].id, "move"); await client.page.keyboard.press("Escape"); await client.page.mouse.up();
      }
      assert.equal(requests.length, before);
      assert.equal(await client.page.locator("dialog[open]").count(), 0);
      await client.page.reload();
      await waitGantt(client.page);
      const final = (await api(client, resource(project.id))).body;
      for (const example of project.cases) {
        const task = final.find(task => task.id === example.id);
        assert.equal(task.start_date, example.expected_start);
        assert.equal(task.due_date, example.expected_due);
      }
      await locate(client, project.null);
      await row(client, project.null).getByText("Sin fecha límite", { exact: true }).waitFor();
      assert.equal(await bar(client, project.null).isVisible().catch(() => false), false);
      await client.page.screenshot({ path: path.join(output, "calendar-" + project.zone.replaceAll("/", "-") + ".png"), fullPage: true });
      return { changes, consecutive_cancels: 3, canceled_writes: 0, replay_did_not_increment: true, reload_preserved: true };
    });
    if (project !== projects.at(-1)) await client.context.close();
  }
  assert.deepEqual(errors, []);
} catch (error) {
  records.push({ name: current, status: "Fallido", error: error.stack?.slice(0, 1800) ?? String(error) });
  process.exitCode = 1; console.error(error);
  if (active) await active.page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
} finally {
  const final = {};
  if (reader) for (const id of new Set([...accepted.values()].map(entry => entry.task_id))) {
    const entry = projects.find(project => project.cases.some(example => example.id === id));
    try {
      const task = await snapshot(reader, entry.id, id);
      final[id] = { start_date: task.start_date, due_date: task.due_date, calendar_revision: task.calendar_revision };
    } catch (error) {
      errors.push({ name: "ledger", message: error.message }); process.exitCode = 1;
    }
  }
  await writeFile(path.join(output, "closure-ledger.json"), JSON.stringify({ accepted_intents: [...accepted.values()], final_calendars: final }, null, 2));
  await writeFile(path.join(output, "closure-browser.json"), JSON.stringify({ date: "2026-10-31 America/Lima", chrome: browser.version(), records, traffic, requests, errors }, null, 2));
  for (const client of clients) await client.context.close().catch(() => {});
  await browser.close();
}
