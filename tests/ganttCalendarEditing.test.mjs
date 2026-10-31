import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import { DataStore, calcScaleCellDate, getAdder, getDiffer } from "@svar-ui/gantt-store";

class ApiError extends Error {}
class Surface extends EventTarget {
  listeners = new Map();
  captures = new Set();
  addEventListener(type, handler, options) {
    const handlers = this.listeners.get(type) ?? new Set();
    handlers.add(handler); this.listeners.set(type, handlers);
    super.addEventListener(type, handler, typeof options === "boolean" ? { capture: options } : options);
  }
  removeEventListener(type, handler, options) {
    this.listeners.get(type)?.delete(handler);
    super.removeEventListener(type, handler, typeof options === "boolean" ? { capture: options } : options);
  }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
  count(type) { return this.listeners.get(type)?.size ?? 0; }
}
const plain = (value) => JSON.parse(JSON.stringify(value));
const flush = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const task = (id = 7, changes = {}) => ({
  id, parent_id: null, name: "Calendario QA " + id, description: "Conservar", state_code: "EN_CURSO", state_name: "En curso",
  start_date: "2026-10-30", due_date: "2026-11-03", calendar_revision: "9007199254740999",
  updated_at: "2026-10-30T12:00:00.000001Z", labels: [], dependencies: [], responsible_id: null, assignees: [],
  permissions: { edit: true, state: true }, ...changes,
});
async function setup(options = {}) {
  const document = new Surface(), window = new Surface();
  document.getSelection = () => ({ removeAllRanges() {} });
  let epoch = 1;
  const context = vm.createContext({ Date, document, window, crypto: { randomUUID }, console });
  const modules = new Map(), calls = [];
  const transport = {
    updateTask(project, id, payload) {
      calls.push({ project, id, payload: plain(payload) });
      return options.send?.(id, payload) ?? Promise.resolve(task(id, { ...payload, calendar_revision: "9007199254741000" }));
    },
    getTaskDetail(identity) { return options.detail?.(identity) ?? Promise.resolve({ task: task(identity.taskId, { calendar_revision: "9007199254741001" }), parent: null }); },
  };
  const auth = { ApiError, sessionVersion: () => epoch, errorText: (failure) => failure.message };
  const external = {
    react: React, "../auth/api": auth, "../../auth/api": auth,
    "./services": transport, "../services": transport,
    "@svar-ui/gantt-store": { calcScaleCellDate, getAdder, getDiffer },
  };
  async function load(relative) {
    const url = relative instanceof URL ? relative : new URL("../src/features/projects/" + relative, import.meta.url);
    if (modules.has(url.href)) return modules.get(url.href);
    const code = ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
    const module = new vm.SourceTextModule(code, { context }); modules.set(url.href, module);
    await module.link((name) => {
      if (!external[name]) return load(new URL(name + ".ts", url));
      const values = external[name];
      return new vm.SyntheticModule(Object.keys(values), function () { for (const [key, value] of Object.entries(values)) this.setExport(key, value); }, { context });
    });
    return module;
  }
  async function namespace(name) { const module = await load(name); if (module.status === "linked") await module.evaluate(); return module.namespace; }
  const sync = (await namespace("useTaskSync.ts")).createTaskSync(4, 1);
  const operations = (await namespace("TaskGantt/ganttCalendarOperations.ts")).createGanttCalendarOperations(sync);
  return { document, window, namespace, sync, operations, calls, setEpoch: (value) => { epoch = value; } };
}
async function pointerHarness(mode = "move", changes = {}, viewport = {}) {
  const env = await setup();
  const base = task(7, changes), other = task(8);
  let tasks = [base, other], paint = 0;
  const calendar = await env.namespace("TaskGantt/ganttCalendar.ts");
  const store = new DataStore();
  const config = { tasks: calendar.toGanttRows(tasks), links: [], start: new Date(2026, 9, 1), end: new Date(2026, 11, 1),
    autoScale: false, durationUnit: "day", inclusiveEnd: true, lengthUnit: "day", cellWidth: 40, cellHeight: 40, scaleHeight: 28,
    columns: [{ id: "text", header: "Tarea" }], scales: [{ unit: "day", step: 1, format: "%j" }], ...viewport };
  store.init(config);
  const api = { getState: store.getState.bind(store), getTask: store.getTask.bind(store), exec: store.in.exec,
    intercept: store.in.intercept.bind(store.in), detach: store.in.detach.bind(store.in) };
  const node = new Surface(), commits = [], previews = [];
  const reset = () => { paint++; store.init({ ...config, tasks: calendar.toGanttRows(tasks).map((row) => ({ ...row, paint })) }); };
  const gesture = (await env.namespace("TaskGantt/ganttPointerGesture.ts")).createGanttPointerGesture({
    canStart: (entry) => entry.permissions.edit && entry.due_date !== null,
    commit: (...args) => { commits.push(plain(args)); return true; }, reset, preview: (value) => previews.push(plain(value)),
  });
  const detach = (await env.namespace("TaskGantt/ganttReadOnly.ts")).bindGanttReadOnly(api, gesture.allowPreview);
  const down = (overrides = {}) => {
    env.document.dispatchEvent(Object.assign(new Event("pointerdown"), { pointerId: 1 }));
    return gesture.start({ button: 0, isPrimary: true, pointerType: "mouse", pointerId: 1, clientX: 50, ...overrides }, node, base, store.getTask(base.id), api, mode);
  };
  const dispatch = (type, properties = {}, target = env.document) => {
    const event = Object.assign(new Event(type, { cancelable: true }), { pointerId: 1, buttons: type === "pointerup" ? 0 : 1, clientX: 90, ...properties });
    target.dispatchEvent(event); return event;
  };
  return { ...env, base, node, commits, previews, store, api, gesture, down, dispatch, detach,
    latest: (entry) => { tasks = [entry, other]; reset(); } };
}

test("a confirmed move uses one shared intention, exact decimal revision, and no unrelated attributes", async () => {
  const wait = deferred(), env = await setup({ send: () => wait.promise });
  const base = task(); env.sync.observe(base);
  assert.equal(env.operations.commit(base, { start_date: "2026-10-31", due_date: "2026-11-04" }), true);
  assert.equal(env.operations.commit(base, { start_date: "2026-11-01" }), false);
  await flush();
  assert.equal(env.calls.length, 1);
  assert.equal(env.calls[0].payload.expected_calendar_revision, "9007199254740999");
  assert.match(env.calls[0].payload.calendar_intent_id, /^[0-9a-f-]{36}$/);
  assert.deepEqual(Object.keys(env.calls[0].payload).sort(), ["calendar_intent_id", "due_date", "expected_calendar_revision", "start_date"]);
  assert.equal(env.operations.canStart(task(8)), true);
  wait.resolve(task(7, { start_date: "2026-10-31", due_date: "2026-11-04", calendar_revision: "9007199254741000" }));
  await flush();
  assert.equal(env.operations.canStart(base), true);
  assert.equal(env.sync.current(base).parent_id, null);
});

test("an ambiguous retry preserves UUID payload and revision even after consulting a newer confirmation", async () => {
  let sends = 0;
  const env = await setup({ send: (_id, payload) => ++sends === 1
    ? Promise.reject(Object.assign(new ApiError("Respuesta perdida"), { status: 503 }))
    : Promise.resolve(task(7, { ...payload, calendar_revision: "9007199254741002", calendar_receipt: { replayed: true, applied_revision: "9007199254741000" } })) });
  const base = task(); env.sync.observe(base);
  env.operations.commit(base, { due_date: "2026-11-05" }); await flush();
  assert.equal(env.calls.length, 1);
  assert.equal(env.operations.getSnapshot().get(7).problem, "ambiguous");
  env.operations.discard(7);
  assert.equal(env.operations.getSnapshot().has(7), true);
  await env.operations.consult(7);
  env.operations.retry(7); await flush();
  assert.deepEqual(env.calls[0].payload, env.calls[1].payload);
  assert.equal(env.operations.getSnapshot().get(7).status, "success");
});

test("409 preserves the proposal and requires consult, explicit preparation and another explicit save", async () => {
  let sends = 0;
  const env = await setup({ send: (_id, payload) => ++sends === 1
    ? Promise.reject(Object.assign(new ApiError("Conflicto"), { status: 409, payload: { code: "calendar_revision_conflict" } }))
    : Promise.resolve(task(7, { ...payload, calendar_revision: "9007199254741002" })) });
  env.operations.commit(task(), { start_date: "2026-11-01" }); await flush();
  env.operations.retry(7); await flush(); assert.equal(env.calls.length, 1);
  const first = env.operations.getSnapshot().get(7);
  assert.equal(first.proposal.start_date, "2026-11-01");
  assert.equal(first.base.calendar_revision, "9007199254740999");
  await env.operations.consult(7);
  assert.equal(env.sync.current(task()).calendar_revision, "9007199254741001");
  env.operations.prepare(7); await flush();
  assert.equal(env.calls.length, 1);
  assert.equal(env.operations.getSnapshot().get(7).status, "prepared");
  env.operations.savePrepared(7); await flush();
  assert.equal(env.calls[1].payload.expected_calendar_revision, "9007199254741001");
  assert.notEqual(env.calls[0].payload.calendar_intent_id, env.calls[1].payload.calendar_intent_id);
  assert.equal("due_date" in env.calls[1].payload, false);
});

test("per-task pending writes, failed permissions and disposal cannot erase a later confirmed calendar", async () => {
  const wait = deferred(), env = await setup({ send: (id) => id === 7 ? wait.promise : Promise.reject(Object.assign(new ApiError("Sin permiso"), { status: 403 })) });
  const base = task(); env.sync.observe(base);
  env.operations.commit(base, { due_date: "2026-11-05" });
  env.operations.commit(task(8), { due_date: "2026-11-06" });
  await flush();
  assert.equal(env.operations.getSnapshot().get(7).status, "pending");
  assert.equal(env.operations.getSnapshot().get(8).status, "error");
  assert.equal(env.operations.getSnapshot().get(8).problem, null);
  env.sync.confirm(task(7, { start_date: "2026-11-01", due_date: "2026-11-10", calendar_revision: "9007199254741002" }));
  env.operations.dispose();
  wait.resolve(task(7, { due_date: "2026-11-05", calendar_revision: "9007199254741000" }));
  await flush();
  assert.equal(env.sync.current(base).due_date, "2026-11-10");
  assert.equal(env.operations.getSnapshot().size, 0);
  env.setEpoch(2);
  assert.equal(env.operations.commit(task(), { due_date: "2026-11-07" }), false);
});

test("native preview is geometric only, never persists, and moving one day preserves its inclusive span", async () => {
  const env = await pointerHarness("move", { due_date: "2026-10-30" });
  const previous = env.store.getTask(7).$x, other = env.store.getTask(8).$x;
  env.down(); env.dispatch("pointermove", { clientX: 90 }); await flush();
  assert.equal(env.store.getTask(7).$x, previous + 40);
  assert.equal(env.store.getTask(7).start.getDate(), 30);
  assert.equal(env.store.getTask(8).$x, other);
  assert.equal(env.commits.length, 0);
  env.dispatch("pointerup", { clientX: 90 }); await flush();
  assert.equal(env.commits.length, 1);
  assert.deepEqual(env.commits[0][1], { start_date: "2026-10-31", due_date: "2026-10-31" });
  assert.equal(env.store.getTask(7).$x, previous);
  env.gesture.dispose(); env.detach();
});

test("resize sends only its endpoint and cannot create a zero-day task", async () => {
  for (const mode of ["start", "end"]) {
    const env = await pointerHarness(mode);
    env.down(); env.dispatch("pointermove", { clientX: 90 }); env.dispatch("pointerup", { clientX: 90 }); await flush();
    assert.deepEqual(env.commits[0][1], mode === "start" ? { start_date: "2026-10-31" } : { due_date: "2026-11-04" });
    env.gesture.dispose(); env.detach();
  }
  const one = await pointerHarness("end", { due_date: "2026-10-30" });
  one.down(); one.dispatch("pointermove", { clientX: 10 }); one.dispatch("pointerup", { clientX: 10 }); await flush();
  assert.equal(one.commits.length, 0);
  one.gesture.dispose();
});

test("Escape, pointercancel, lost capture, blur and disposal release immediately and never write", async () => {
  for (const finish of ["Escape", "pointercancel", "lostpointercapture", "blur", "dispose"]) {
    const env = await pointerHarness();
    env.down(); env.dispatch("pointermove", { clientX: 130 });
    if (finish === "Escape") env.dispatch("keydown", { key: "Escape" });
    else if (finish === "dispose") env.gesture.dispose();
    else env.dispatch(finish, {}, finish === "blur" ? env.window : finish === "lostpointercapture" ? env.node : env.document);
    assert.equal(env.commits.length, 0, finish);
    assert.equal(env.node.hasPointerCapture(1), false, finish);
    assert.equal(env.document.count("pointermove"), 0, finish);
    if (finish !== "dispose") {
      env.down(); env.dispatch("pointermove", { clientX: 90 }); env.dispatch("pointerup", { clientX: 90 });
      assert.equal(env.commits.length, 1, finish);
    }
    env.gesture.dispose(); env.detach();
  }
});

test("stationary clicks, residual click suppression and old gesture callbacks do not block the next press", async () => {
  const env = await pointerHarness();
  env.down(); env.dispatch("pointerup", { clientX: 50 });
  assert.equal(env.commits.length, 0);
  assert.equal(env.dispatch("click", { detail: 1 }).defaultPrevented, false);
  for (let index = 0; index < 10; index++) {
    env.down(); env.dispatch("pointermove", { clientX: 90 });
    const old = [...env.document.listeners.get("pointercancel")][0];
    env.dispatch("keydown", { key: "Escape" });
    env.down(); old(Object.assign(new Event("pointercancel"), { pointerId: 1 }));
    env.dispatch("pointermove", { clientX: 90 }); env.dispatch("pointerup", { clientX: 90 });
    assert.equal(env.commits.length, index + 1);
    assert.equal(env.dispatch("click", { detail: 1 }).defaultPrevented, true);
  }
  env.down(); env.dispatch("pointerup", { clientX: 50 });
  assert.equal(env.dispatch("click", { detail: 1 }).defaultPrevented, false);
  env.gesture.dispose(); env.detach();
});

test("reversing a preview uses the latest confirmed row, and untrusted widget updates never save", async () => {
  const env = await pointerHarness();
  env.down(); env.dispatch("pointermove", { clientX: 90 });
  env.latest(task(7, { start_date: "2026-11-04", due_date: "2026-11-08" }));
  env.gesture.refresh(); env.dispatch("keydown", { key: "Escape" }); await flush();
  assert.equal(env.store.getTask(7).start.getDate(), 4);
  await env.api.exec("drag-task", { id: 7, left: 0, width: 1, inProgress: true });
  await env.api.exec("update-task", { id: 7, task: { start: new Date(2020, 1, 1) } });
  assert.equal(env.store.getTask(7).start.getFullYear(), 2026);
  assert.equal(env.commits.length, 0);
  env.gesture.dispose(); env.detach();
});


test("calendar gestures cross leap days, year boundaries and DST using calendar days", async () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ["America/Lima", "America/New_York", "Europe/Madrid", "Pacific/Auckland"]) {
      process.env.TZ = zone;
      for (const [start, expected] of [["2024-02-28", "2024-02-29"], ["2026-12-31", "2027-01-01"], ["2026-03-08", "2026-03-09"], ["2026-11-01", "2026-11-02"]]) {
        const [year, month] = start.split("-").map(Number);
        const env = await pointerHarness("move", { start_date: start, due_date: start }, { start: new Date(year, month - 1, 1), end: new Date(year, month + 1, 1) });
        env.down(); env.dispatch("pointermove", { clientX: 90 }); env.dispatch("pointerup", { clientX: 90 });
        assert.deepEqual(env.commits[0][1], { start_date: expected, due_date: expected }, zone + " " + start);
        env.gesture.dispose(); env.detach();
      }
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test("week scale movement retains the five inclusive days across a month boundary", async () => {
  const env = await pointerHarness("move", {}, { cellWidth: 96, scales: [{ unit: "week", step: 1, format: "%j" }] });
  env.down(); env.dispatch("pointermove", { clientX: 146 }); env.dispatch("pointerup", { clientX: 146 });
  assert.deepEqual(env.commits[0][1], { start_date: "2026-11-06", due_date: "2026-11-10" });
  env.gesture.dispose(); env.detach();
});

test("pending shared calendar writes remain explicit across a Gantt remount and notify release", async () => {
  const wait = deferred(), env = await setup({ send: () => wait.promise });
  const base = task(); env.sync.observe(base);
  const pending = env.sync.patch(7, { due_date: "2026-11-05", expected_calendar_revision: base.calendar_revision, calendar_intent_id: randomUUID() });
  const remount = (await env.namespace("TaskGantt/ganttCalendarOperations.ts")).createGanttCalendarOperations(env.sync);
  assert.equal(env.sync.hasPendingCalendar(7), true);
  assert.equal(remount.canStart(base), false);
  assert.equal(remount.canStart(task(8)), true);
  const before = env.sync.getVersion();
  wait.resolve(task(7, { due_date: "2026-11-05", calendar_revision: "9007199254741000" }));
  await pending;
  assert.equal(env.sync.hasPendingCalendar(7), false);
  assert.ok(env.sync.getVersion() > before);
  assert.equal(remount.canStart(base), true);
});

test("continuous geometric preview publishes only changed calendar days and cancellation immediately clears it", async () => {
  const h = await pointerHarness();
  const exec = h.api.exec;
  let frames = 0;
  h.api.exec = (action, payload) => { if (action === "drag-task") frames++; return exec(action, payload); };
  assert.equal(h.down(), true);
  for (let clientX = 57; clientX <= 65; clientX++) h.dispatch("pointermove", { clientX });
  assert.equal(frames, 9);
  assert.equal(h.previews.length, 1);
  assert.equal(h.previews[0].start_date, h.base.start_date);
  h.dispatch("pointermove", { clientX: 95 });
  assert.equal(frames, 10);
  assert.equal(h.previews.length, 2);
  assert.equal(h.previews[1].start_date, "2026-10-31");
  h.dispatch("keydown", { key: "Escape" });
  assert.equal(h.previews.at(-1), null);
  assert.equal(h.document.count("pointermove"), 0);
  assert.equal(h.node.captures.size, 0);
  assert.equal(h.commits.length, 0);
  assert.equal(h.down(), true);
  h.dispatch("pointermove", { clientX: 95 });
  assert.equal(h.previews.at(-1).start_date, "2026-10-31");
  h.dispatch("pointerup", { clientX: 95 });
  assert.equal(h.commits.length, 1);
  h.gesture.dispose();
  assert.equal(h.document.count("pointerdown"), 0);
});
