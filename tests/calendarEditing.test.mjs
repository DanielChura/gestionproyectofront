import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

class ApiError extends Error {}
const failure = (status, code) =>
  Object.assign(new ApiError(code ?? "Error sintético"), {
    status,
    payload: code ? { code } : undefined,
  });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const flush = () => new Promise((resolve) => setImmediate(resolve));
const plain = (value) => JSON.parse(JSON.stringify(value));
const task = (changes = {}) => ({
  id: 7,
  parent_id: 2,
  name: "Tarea QA",
  description: "Conservar",
  state_code: "EN_CURSO",
  state_name: "En curso",
  priority: 3,
  created_at: "2026-10-07T15:00:00Z",
  updated_at: "2026-10-07T15:00:00.000001Z",
  start_date: "2026-10-07",
  due_date: "2026-11-30",
  calendar_revision: "1",
  labels: [],
  dependencies: [3],
  responsible_id: null,
  responsible_name: null,
  assignees: [],
  transitions: [],
  permissions: { edit: true, state: true, assign: true },
  ...changes,
});
const payload = (changes = {}) => ({
  start_date: "2026-10-08",
  expected_calendar_revision: "1",
  calendar_intent_id: randomUUID(),
  ...changes,
});

function hooks() {
  const slots = [];
  let index = 0,
    sync;
  return {
    react: {
      ...React,
      useLayoutEffect(effect) {
        const slot = index++;
        if (!(slot in slots)) slots[slot] = { cleanup: effect() };
      },
      useState(initial) {
        const slot = index++;
        if (!(slot in slots))
          slots[slot] = typeof initial === "function" ? initial() : initial;
        return [
          slots[slot],
          (next) => {
            slots[slot] = typeof next === "function" ? next(slots[slot]) : next;
          },
        ];
      },
      useRef(initial) {
        const slot = index++;
        return (slots[slot] ??= { current: initial });
      },
      useContext() {
        return sync;
      },
      useEffect(effect) {
        const slot = index++;
        if (!(slot in slots)) slots[slot] = { cleanup: effect() };
      },
    },
    render(fn) {
      index = 0;
      return fn();
    },
    provide(value) {
      sync = value;
    },
    unmount() {
      for (const slot of slots) slot?.cleanup?.();
    },
  };
}

async function setup(options = {}) {
  let epoch = 1;
  const context = vm.createContext({ crypto: { randomUUID }, console });
  const modules = new Map(),
    calls = [];
  const transport = {
    updateTask(projectId, taskId, data) {
      calls.push({ projectId, taskId, data: plain(data) });
      return (
        options.update?.(projectId, taskId, data) ??
        Promise.resolve(task({ ...data, calendar_revision: "2" }))
      );
    },
    getTaskDetail(identity) {
      return (
        options.detail?.(identity) ??
        Promise.resolve({
          task: task({ calendar_revision: "2" }),
          parent: null,
        })
      );
    },
  };
  const overrides = {
    react: options.react ?? React,
    "react/jsx-runtime": runtime,
    "../auth/api": {
      ApiError,
      sessionVersion: () => epoch,
      errorText: (error) => error.message,
    },
    "../../auth/api": {
      ApiError,
      sessionVersion: () => epoch,
      errorText: (error) => error.message,
    },
    "./services": transport,
    "../services": transport,
    ...options.mocks,
  };
  async function load(relative) {
    const url =
      relative instanceof URL ? relative : new URL(relative, import.meta.url);
    if (modules.has(url.href)) return modules.get(url.href);
    const code = ts.transpileModule(readFileSync(url, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText;
    const mod = new vm.SourceTextModule(code, { context });
    modules.set(url.href, mod);
    await mod.link(async (name) => {
      if (overrides[name]) {
        const values = overrides[name];
        return new vm.SyntheticModule(
          Object.keys(values),
          function () {
            for (const [key, value] of Object.entries(values))
              this.setExport(key, value);
          },
          { context },
        );
      }
      assert.ok(name.startsWith("."), name);
      const file = new URL(
        name + (name.endsWith("CalendarEditFeedback") ? ".tsx" : ".ts"),
        url,
      );
      return load(file);
    });
    return mod;
  }
  async function namespace(name) {
    const mapped =
      name === "CalendarEditFeedback.tsx"
        ? "shared/" + name
        : name.startsWith("views/")
          ? name
          : "utils/" + name;
    const mod = await load("../src/features/home/" + mapped);
    if (mod.status === "linked") await mod.evaluate();
    return mod.namespace;
  }
  const syncModule = await namespace("useTaskSync.ts");
  return {
    namespace,
    calls,
    transport,
    syncModule,
    setEpoch: (value) => {
      epoch = value;
    },
    sync: syncModule.createTaskSync(4, epoch),
    context,
  };
}

test("calendar components round trip in distinct zones, leap years, month/year boundaries and DST", () => {
  const code = ts.transpileModule(
    readFileSync(
      new URL("../src/features/home/utils/calendarDate.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    },
  ).outputText;
  for (const zone of [
    "UTC",
    "America/Lima",
    "America/New_York",
    "Pacific/Kiritimati",
    "Asia/Kolkata",
  ]) {
    const program = `${code}\nconst a = require('node:assert/strict');\nfor (const day of ['2026-10-29','2026-12-31','2028-02-29','0099-01-01','2026-03-08','2026-11-01']) a.equal(calendarDateKey(calendarDate(day)), day);\na.equal(addCalendarDays('2028-02-28',1),'2028-02-29');\na.equal(addCalendarDays('2028-02-29',1),'2028-03-01');\na.equal(addCalendarDays('2026-12-31',1),'2027-01-01');\na.equal(addCalendarDays('2026-03-08',1),'2026-03-09');\na.equal(addCalendarDays('2026-11-01',-1),'2026-10-31');\na.equal(addCalendarDays('2026-10-29',0),'2026-10-29');\na.throws(()=>calendarDate('2026-02-29'));\na.throws(()=>calendarDate('2026-04-31'));\na.throws(()=>calendarDate('0000-01-01'));`;
    execFileSync(process.execPath, ["-e", program], {
      env: { ...process.env, TZ: zone },
    });
  }
});

test("full-form differences omit untouched dates and attributes and retain null explicitly", async () => {
  const env = await setup(),
    { changedTaskFields } = await env.namespace("useTaskCalendarEdit.ts");
  const base = task();
  assert.deepEqual(
    plain(
      changedTaskFields(base, {
        name: base.name,
        priority: 3,
        start_date: base.start_date,
        due_date: null,
        responsible_ids: [],
      }),
    ),
    { due_date: null },
  );
  assert.deepEqual(
    plain(
      changedTaskFields(base, {
        name: "Nuevo",
        start_date: base.start_date,
        due_date: base.due_date,
      }),
    ),
    { name: "Nuevo" },
  );
  assert.deepEqual(plain(base), task());
});

test("double submission shares one intention, key, payload and pending operation", async () => {
  const env = await setup(),
    { createCalendarIntention } = await env.namespace("useTaskCalendarEdit.ts");
  const intention = createCalendarIntention(),
    wait = deferred(),
    calls = [];
  const values = {
    start_date: "2026-10-08",
    due_date: "2026-10-08",
    responsible_ids: [8],
  };
  const send = (data) => {
    calls.push(data);
    return wait.promise;
  };
  const first = intention.save(task(), values, send),
    second = intention.save(task(), values, send);
  assert.equal(first, second);
  await flush();
  assert.equal(calls.length, 1);
  values.responsible_ids.push(9);
  assert.deepEqual(plain(calls[0].responsible_ids), [8]);
  assert.equal(calls[0].expected_calendar_revision, "1");
  assert.match(calls[0].calendar_intent_id, /^[0-9a-f-]{36}$/);
  assert.equal(calls[0].start_date, calls[0].due_date);
  wait.resolve();
  await first;
});

test("explicit ambiguous retry retains the original key, revision and content without automatic sends", async () => {
  const env = await setup(),
    { createCalendarIntention } = await env.namespace("useTaskCalendarEdit.ts");
  const intention = createCalendarIntention(),
    calls = [];
  const send = async (data) => {
    calls.push(plain(data));
    if (calls.length === 1) throw failure(503);
  };
  const values = { due_date: null };
  await assert.rejects(intention.save(task(), values, send));
  await flush();
  assert.equal(calls.length, 1);
  await intention.save(task(), values, send);
  assert.deepEqual(calls[0], calls[1]);
  await intention.save(task(), { due_date: "2026-11-20" }, send);
  assert.notEqual(calls[2].calendar_intent_id, calls[0].calendar_intent_id);
  assert.equal(calls[2].expected_calendar_revision, "1");
});

test("error classification distinguishes calendar conflict, key reuse, expiry, pending, validation and SQL conflicts", async () => {
  const env = await setup(),
    { calendarProblem } = await env.namespace("useTaskCalendarEdit.ts");
  for (const [status, code, expected] of [
    [409, "calendar_revision_conflict", "revision"],
    [409, "calendar_intent_reused", "key"],
    [409, "calendar_intent_pending", "pending"],
    [410, "calendar_intent_expired", "expired"],
    [400, undefined, null],
    [409, undefined, null],
    [503, undefined, "ambiguous"],
    [undefined, undefined, "ambiguous"],
    [403, undefined, null],
  ])
    assert.equal(calendarProblem(failure(status, code)), expected);
});

test("coordinator deduplicates a pending calendar request and rejects changed content using the same key", async () => {
  const wait = deferred(),
    env = await setup({ update: () => wait.promise });
  env.sync.observe(task());
  const data = payload(),
    first = env.sync.patch(7, data),
    second = env.sync.patch(7, data);
  assert.equal(first, second);
  assert.equal(env.calls.length, 1);
  await assert.rejects(
    env.sync.patch(7, { ...data, due_date: null }),
    (error) => error.payload.code === "calendar_intent_reused",
  );
  wait.resolve(task({ start_date: data.start_date, calendar_revision: "2" }));
  await first;
  assert.equal(env.calls.length, 1);
});

test("calendar confirmation copies only affected fields and preserves hierarchy, state, labels and other attributes", async () => {
  const env = await setup({
    update: () =>
      Promise.resolve(
        task({
          name: "Nombre de snapshot viejo",
          parent_id: 88,
          state_code: "PENDIENTE",
          labels: [{ id: 99 }],
          start_date: "2026-10-08",
          calendar_revision: "2",
          updated_at: "2026-10-08T10:00:00Z",
        }),
      ),
  });
  const base = task({
    name: "Nombre válido",
    labels: [{ id: 4, name: "QA", kind: "technical" }],
  });
  env.sync.observe(base);
  const saved = await env.sync.patch(7, payload());
  for (const key of [
    "name",
    "parent_id",
    "state_code",
    "labels",
    "description",
    "dependencies",
    "responsible_id",
  ])
    assert.deepEqual(plain(saved[key]), plain(base[key]));
  assert.equal(saved.calendar_revision, "2");
  assert.equal(saved.start_date, "2026-10-08");
});

test("an old replay never restores calendar or unrelated fields even when its timestamp is later", async () => {
  const env = await setup({
    update: () =>
      Promise.resolve(
        task({
          name: "No restaurar",
          calendar_revision: "2",
          due_date: "2026-11-30",
          updated_at: "2026-12-01T00:00:00Z",
          calendar_receipt: {
            intent_id: "old",
            applied_revision: "2",
            replayed: true,
          },
        }),
      ),
  });
  env.sync.observe(
    task({ name: "Nombre actual", due_date: null, calendar_revision: "4" }),
  );
  const saved = await env.sync.patch(7, payload());
  assert.equal(saved.calendar_revision, "4");
  assert.equal(saved.due_date, null);
  assert.equal(saved.name, "Nombre actual");
});

test("a replay may acknowledge a newer current calendar without treating its revision as a general task version", async () => {
  const env = await setup({
    update: () =>
      Promise.resolve(
        task({
          name: "Ignorar",
          priority: 1,
          calendar_revision: "5",
          due_date: null,
          calendar_receipt: { replayed: true, applied_revision: "2" },
        }),
      ),
  });
  env.sync.observe(
    task({ name: "Actual", priority: 3, calendar_revision: "4" }),
  );
  const saved = await env.sync.patch(7, payload());
  assert.equal(saved.calendar_revision, "5");
  assert.equal(saved.due_date, null);
  assert.equal(saved.name, "Actual");
  assert.equal(saved.priority, 3);
});

test("non-calendar edits remain applicable with a lower calendar revision and do not restore dates", async () => {
  const env = await setup({
    update: () =>
      Promise.resolve(
        task({
          name: "Nombre nuevo",
          calendar_revision: "1",
          updated_at: "2026-12-01T00:00:00Z",
        }),
      ),
  });
  env.sync.observe(
    task({ calendar_revision: "9007199254740993", due_date: null }),
  );
  const result = await env.sync.patch(7, { name: "Nombre nuevo" });
  assert.equal(result.name, "Nombre nuevo");
  assert.equal(result.calendar_revision, "9007199254740993");
  assert.equal(result.due_date, null);
  assert.deepEqual(env.calls[0].data, { name: "Nombre nuevo" });
});

test("reads started before confirmation are discarded and refreshed as reads only", async () => {
  const wait = deferred(),
    env = await setup();
  let calls = 0;
  env.sync.observe(task());
  const reading = env.sync.read(() => {
    calls++;
    return calls === 1
      ? wait.promise
      : Promise.resolve(task({ calendar_revision: "2" }));
  });
  env.sync.confirm(task({ calendar_revision: "2" }));
  wait.resolve(task());
  assert.equal((await reading).calendar_revision, "2");
  assert.equal(calls, 2);
  assert.equal(env.calls.length, 0);
});

test("late read failures from before a confirmation do not replace valid content with an old error", async () => {
  const wait = deferred(),
    env = await setup();
  let calls = 0;
  const reading = env.sync.read(() =>
    ++calls === 1 ? wait.promise : Promise.resolve("vigente"),
  );
  env.sync.confirm(task({ calendar_revision: "2" }));
  wait.reject(failure(503));
  assert.equal(await reading, "vigente");
  assert.equal(calls, 2);
});

test("project disposal rejects late reads and mutations without affecting a new project's scope", async () => {
  const writing = deferred(),
    reading = deferred(),
    env = await setup({ update: () => writing.promise });
  const read = env.sync.read(() => reading.promise),
    write = env.sync.patch(7, payload());
  env.sync.dispose();
  const next = env.syncModule.createTaskSync(8, 1);
  next.observe(task({ name: "Otro proyecto" }));
  writing.resolve(task({ calendar_revision: "2" }));
  reading.resolve(task());
  await assert.rejects(read, env.syncModule.StaleTaskResponse);
  await assert.rejects(write, env.syncModule.StaleTaskResponse);
  assert.equal(next.current(task()).name, "Otro proyecto");
});

test("session changes reject both late reads and mutation responses", async () => {
  const writing = deferred(),
    reading = deferred(),
    env = await setup({ update: () => writing.promise });
  const read = env.sync.read(() => reading.promise),
    write = env.sync.patch(7, payload());
  env.setEpoch(2);
  writing.resolve(task());
  reading.resolve(task());
  await assert.rejects(read, env.syncModule.StaleTaskResponse);
  await assert.rejects(write, env.syncModule.StaleTaskResponse);
  assert.equal(env.calls.length, 1);
});

test("late cleanup from a disposed lifetime cannot remove a new pending operation", async () => {
  const first = deferred(),
    second = deferred();
  let count = 0;
  const env = await setup({
    update: () => (++count === 1 ? first.promise : second.promise),
  });
  const data = payload();
  const old = env.sync.patch(7, data);
  env.sync.dispose();
  env.sync.activate();
  const fresh = env.sync.patch(7, data);
  first.resolve(task());
  await assert.rejects(old, env.syncModule.StaleTaskResponse);
  assert.equal(env.sync.patch(7, data), fresh);
  second.resolve(task({ calendar_revision: "2" }));
  await fresh;
  assert.equal(env.calls.length, 2);
});

test("editor captures its initial revision and requires consultation plus an explicit new intention after conflict", async () => {
  const harness = hooks();
  let currentTask = task();
  const env = await setup({
    react: harness.react,
    detail: () =>
      Promise.resolve({
        task: task({ calendar_revision: "2", due_date: "2026-11-28" }),
        parent: null,
      }),
  });
  harness.provide(env.sync);
  env.sync.observe(task());
  const { useTaskCalendarEdit } = await env.namespace("useTaskCalendarEdit.ts");
  const render = () => harness.render(() => useTaskCalendarEdit(currentTask));
  const calls = [];
  const send = async (data) => {
    calls.push(plain(data));
    if (calls.length === 1) throw failure(409, "calendar_revision_conflict");
  };
  const opened = render();
  currentTask = task({ calendar_revision: "2", due_date: "2026-11-28" });
  await assert.rejects(render().save({ due_date: "2026-11-20" }, send));
  assert.equal(calls[0].expected_calendar_revision, "1");
  assert.equal(render().problem, "revision");
  await assert.rejects(render().save({ due_date: "2026-11-20" }, send));
  assert.equal(calls.length, 1);
  await render().consult();
  assert.equal(render().current.calendar_revision, "2");
  assert.equal(render().base, opened.base);
  assert.equal(env.sync.current(task()).calendar_revision, "1");
  assert.equal(calls.length, 1);
  render().useCurrent();
  await render().save({ due_date: "2026-11-20" }, send);
  assert.equal(calls[1].expected_calendar_revision, "2");
  assert.notEqual(calls[0].calendar_intent_id, calls[1].calendar_intent_id);
  assert.deepEqual(Object.keys(calls[1]).sort(), [
    "calendar_intent_id",
    "due_date",
    "expected_calendar_revision",
  ]);
});

test("a missing snapshot revision fails closed instead of guessing a version", async () => {
  const env = await setup(),
    { createCalendarIntention } = await env.namespace("useTaskCalendarEdit.ts");
  let sends = 0;
  await assert.rejects(
    createCalendarIntention().save(
      task({ calendar_revision: undefined }),
      { due_date: null },
      async () => {
        sends++;
      },
    ),
    /revisión/,
  );
  assert.equal(sends, 0);
});

test("calendar feedback exposes actual dates, retained draft and explicit actions without saving", async () => {
  const env = await setup(),
    mod = await env.namespace("CalendarEditFeedback.tsx");
  let writes = 0;
  const markup = renderToStaticMarkup(
    React.createElement(mod.default, {
      editor: {
        problem: "revision",
        current: task({ due_date: null, calendar_revision: "3" }),
        consultBusy: false,
        consultError: "",
        consult() {},
        useCurrent() {
          writes++;
        },
      },
    }),
  );
  assert.match(markup, /Tu borrador se conserva/);
  assert.match(markup, /Consultar fechas vigentes/);
  assert.match(markup, /Preparar nueva intención/);
  assert.match(markup, /Sin fecha/);
  assert.match(markup, /role="alert"/);
  assert.equal(writes, 0);
});

test("equivalent property order retains the same pending intention and calendar key", async () => {
  const env = await setup(),
    { createCalendarIntention } = await env.namespace("useTaskCalendarEdit.ts");
  const wait = deferred(),
    intention = createCalendarIntention();
  let calls = 0;
  const send = () => {
    calls++;
    return wait.promise;
  };
  const first = intention.save(
    task(),
    { start_date: "2026-10-08", due_date: null },
    send,
  );
  const second = intention.save(
    task(),
    { due_date: null, start_date: "2026-10-08" },
    send,
  );
  assert.equal(first, second);
  await flush();
  assert.equal(calls, 1);
  wait.resolve();
  await first;
});

test("Gantt shared dialog captures its opening revision and submits both changed dates once", async () => {
  const harness = hooks();
  const env = await setup({ react: harness.react });
  harness.provide(env.sync);
  const { useGanttDialog } = await env.namespace(
    "views/TaskGantt/useGanttDialog.ts",
  );
  let source = task(),
    closed = 0;
  const view = {
    action: { kind: "edit", taskId: 7 },
    tasks: [source],
    acceptTask() {},
    setAction() {
      closed++;
    },
    saveTask() {
      throw Error("Uncoordinated save");
    },
  };
  const render = () =>
    harness.render(() =>
      useGanttDialog({ id: 1 }, { ...view, tasks: [source] }),
    );
  render();
  source = task({ calendar_revision: "9", name: "Nombre remoto" });
  await render().controller.saveTask({
    name: "Tarea QA",
    description: "Conservar",
    start_date: "2026-10-08",
    due_date: "2026-10-08",
  });
  assert.equal(env.calls.length, 1);
  assert.equal(env.calls[0].data.expected_calendar_revision, "1");
  assert.deepEqual(Object.keys(env.calls[0].data).sort(), [
    "calendar_intent_id",
    "due_date",
    "expected_calendar_revision",
    "start_date",
  ]);
  assert.equal(closed, 1);
});

test("explicit reapplication keeps the original field selection and never resends an untouched old endpoint", async () => {
  const harness = hooks();
  const env = await setup({
    react: harness.react,
    detail: () =>
      Promise.resolve({
        task: task({ calendar_revision: "2", start_date: "2026-10-10" }),
        parent: null,
      }),
  });
  harness.provide(env.sync);
  const { useTaskCalendarEdit } = await env.namespace("useTaskCalendarEdit.ts");
  const render = () => harness.render(() => useTaskCalendarEdit(task()));
  render();
  const data = {
      name: "Tarea QA",
      start_date: "2026-10-07",
      due_date: "2026-11-20",
    },
    calls = [];
  const send = async (payload) => {
    calls.push(plain(payload));
    if (calls.length === 1) throw failure(409, "calendar_revision_conflict");
  };
  await assert.rejects(render().save(data, send));
  await render().consult();
  render().useCurrent();
  await render().save(data, send);
  assert.equal(calls[1].expected_calendar_revision, "2");
  assert.equal(calls[1].due_date, "2026-11-20");
  assert.equal("start_date" in calls[1], false);
  assert.equal("name" in calls[1], false);
});

test("calendar saves preserve the shared ordering revision for all rows without conflating it with calendar revisions", async () => {
  const env = await setup({
    update: () =>
      Promise.resolve(
        task({
          start_date: "2026-10-08",
          calendar_revision: "2",
          move_revision: "new-order",
          updated_at: "2026-10-08T10:00:00Z",
        }),
      ),
  });
  const one = task({ move_revision: "old-order" }),
    two = task({ id: 8, move_revision: "old-order" });
  env.sync.observeMany([one, two]);
  await env.sync.patch(7, payload());
  assert.equal(env.sync.current(one).move_revision, "new-order");
  assert.equal(env.sync.current(two).move_revision, "new-order");
  assert.equal(env.sync.current(two).calendar_revision, "1");
  env.sync.confirm(
    task({
      move_revision: "obsolete-order",
      calendar_revision: "1",
      calendar_receipt: { replayed: true, applied_revision: "1" },
    }),
  );
  assert.equal(env.sync.current(one).move_revision, "new-order");
  assert.equal(env.sync.current(two).move_revision, "new-order");
});

test("a completed save from an unmounted editor cannot close or act on its replacement", async () => {
  const harness = hooks(),
    env = await setup({ react: harness.react });
  harness.provide(env.sync);
  const { useTaskCalendarEdit } = await env.namespace("useTaskCalendarEdit.ts"),
    wait = deferred();
  const editor = harness.render(() => useTaskCalendarEdit(task()));
  const saving = editor.save({ due_date: null }, () => wait.promise);
  await flush();
  harness.unmount();
  wait.resolve();
  await assert.rejects(saving, env.syncModule.StaleTaskResponse);
});

test("Gantt dialog remains busy during its coordinated save and cannot close a replacement editor", async () => {
  const wait = deferred(),
    harness = hooks(),
    env = await setup({ react: harness.react, update: () => wait.promise });
  harness.provide(env.sync);
  const { useGanttDialog } = await env.namespace(
    "views/TaskGantt/useGanttDialog.ts",
  );
  let closed = 0;
  const view = {
    action: { kind: "edit", taskId: 7 },
    tasks: [task()],
    busy: false,
    acceptTask() {},
    setAction() {
      closed++;
    },
  };
  const render = () => harness.render(() => useGanttDialog({ id: 1 }, view));
  render();
  const saving = render().controller.saveTask({ due_date: null });
  await flush();
  assert.equal(render().controller.busy, true);
  assert.equal(env.calls.length, 1);
  harness.unmount();
  wait.resolve(task({ due_date: null, calendar_revision: "2" }));
  await assert.rejects(saving, env.syncModule.StaleTaskResponse);
  assert.equal(closed, 0);
});
