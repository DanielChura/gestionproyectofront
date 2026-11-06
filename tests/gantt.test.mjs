import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { DataStore, toInclusiveTask } from "@svar-ui/gantt-store";
import ts from "typescript";

const context = vm.createContext({ Date, console });
const modules = new Map();
async function load(relative) {
  const url =
    relative instanceof URL ? relative : new URL(relative, import.meta.url);
  if (modules.has(url.href)) return modules.get(url.href);
  const source = ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const module = new vm.SourceTextModule(source, { context });
  modules.set(url.href, module);
  await module.link(async (name) => {
    const external =
      name === "react" ? React : name === "react/jsx-runtime" ? jsx : null;
    if (external)
      return new vm.SyntheticModule(
        Object.keys(external),
        function () {
          for (const [key, value] of Object.entries(external))
            this.setExport(key, value);
        },
        { context },
      );
    assert.ok(name.startsWith("."), name);
    return load(new URL(name + ".ts", url));
  });
  return module;
}
const calendarModule = await load(
  "../src/features/projects/TaskGantt/ganttCalendar.ts",
);
await calendarModule.evaluate();
const adapter = calendarModule.namespace;
const readOnlyModule = await load(
  "../src/features/projects/TaskGantt/ganttReadOnly.ts",
);
await readOnlyModule.evaluate();
const { bindGanttReadOnly } = readOnlyModule.namespace;
const entryModule = await load(
  "../src/features/projects/TaskGantt/TaskGanttEntry.tsx",
);
await entryModule.evaluate();
const Entry = entryModule.namespace.default;
const plain = (value) => JSON.parse(JSON.stringify(value));
const task = (changes = {}) => ({
  id: 1,
  parent_id: null,
  name: "Tarea QA",
  state_name: "Pendiente",
  state_code: "PENDIENTE",
  start_date: "2026-10-07",
  due_date: "2026-10-07",
  calendar_revision: "9007199254740999",
  estimated_minutes: 98000,
  labels: [],
  dependencies: [],
  ...changes,
});
const config = {
  links: [],
  durationUnit: "day",
  inclusiveEnd: true,
  cellWidth: 40,
  cellHeight: 40,
  scaleHeight: 28,
  columns: [{ id: "text", header: "Tarea" }],
  scales: [{ unit: "day", step: 1, format: "%j" }],
};
function storeFor(tasks) {
  const rows = adapter.toGanttRows(tasks);
  const store = new DataStore();
  store.init({ ...config, tasks: rows, ...adapter.ganttRange(rows) });
  return store;
}

test("Gantt calendar round trips calendar days in five zones including DST, leap and year boundaries", () => {
  const transpile = (file) =>
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    }).outputText;
  const dateCode = transpile("../src/features/projects/calendarDate.ts");
  const ganttCode = transpile(
    "../src/features/projects/TaskGantt/ganttCalendar.ts",
  );
  const program =
    "const d={};new Function('exports'," +
    JSON.stringify(dateCode) +
    ")(d);" +
    "const a={};new Function('exports','require'," +
    JSON.stringify(ganttCode) +
    ")(a,()=>d);" +
    "const assert=require('node:assert/strict');" +
    "for(const [start_date,due_date] of [['2026-10-07','2026-10-07'],['2028-02-28','2028-02-29'],['2026-12-31','2026-12-31'],['0099-01-01','0099-01-01'],['9999-12-31','9999-12-31'],['2026-03-07','2026-03-09'],['2026-10-31','2026-11-02'],['2026-10-07',null]]){" +
    "const w=a.toGanttWindow({start_date,due_date});assert.deepEqual(a.fromGanttWindow(w),{start_date,due_date});" +
    "if(due_date===null){assert.equal(w.start,undefined);assert.equal(w.end,undefined);assert.equal(w.duration,undefined)}" +
    "else{assert.equal(w.start.getHours(),0);assert.equal(w.end.getHours(),0)}}" +
    "assert.throws(()=>a.toGanttWindow({start_date:'2026-10-07',due_date:'2026-10-06'}));" +
    "assert.throws(()=>a.toGanttWindow({start_date:'2026-02-29',due_date:null}));";
  for (const TZ of [
    "UTC",
    "America/Lima",
    "America/New_York",
    "Pacific/Kiritimati",
    "Asia/Kolkata",
  ])
    execFileSync(process.execPath, ["-e", program], {
      env: { ...process.env, TZ },
    });
});

test("real MIT store preserves one-day exclusive end and inclusiveEnd does not mutate storage", () => {
  const store = storeFor([task()]);
  const row = store.getTask(1);
  assert.equal(row.duration, 1);
  assert.equal(row.end.getDate(), 8);
  assert.equal(toInclusiveTask(row).end.getDate(), 7);
  assert.equal(row.end.getDate(), 8);
  assert.deepEqual(plain(adapter.fromGanttWindow(row)), {
    start_date: "2026-10-07",
    due_date: "2026-10-07",
  });
});

test("real MIT runtime would invent an end if only native start were supplied", () => {
  const store = new DataStore();
  store.init({
    ...config,
    tasks: [
      { id: 1, type: "task", start: new Date(2026, 9, 7), unscheduled: true },
    ],
    unscheduledTasks: true,
    start: new Date(2026, 9, 1),
    end: new Date(2026, 10, 1),
  });
  assert.equal(store.getState().unscheduledTasks, false);
  assert.equal(store.getTask(1).duration, 1);
  assert.equal(store.getTask(1).end.getDate(), 8);
});

test("null deadline remains a visible real MIT tree row without computed start end or duration", () => {
  const original = task({ due_date: null, estimated_minutes: 1 });
  const store = storeFor([original]);
  const row = store.getTask(1);
  assert.equal(row.type, "gm-open-ended");
  assert.equal(row.gmStartDate, original.start_date);
  assert.equal(row.gmDueDate, null);
  assert.equal(row.start, undefined);
  assert.equal(row.end, undefined);
  assert.equal(row.duration, undefined);
  assert.equal(
    store.getState()._tasks.some((item) => item.id === 1),
    true,
  );
  assert.deepEqual(plain(adapter.fromGanttWindow(row)), {
    start_date: original.start_date,
    due_date: null,
  });
});

test("an entirely unbounded project has a viewport without inventing task windows", () => {
  const store = storeFor([
    task({ due_date: null }),
    task({ id: 2, parent_id: 1, due_date: null }),
  ]);
  for (const id of [1, 2]) {
    const row = store.getTask(id);
    assert.equal(row.end, undefined);
    assert.equal(row.duration, undefined);
    assert.equal(row.gmDueDate, null);
  }
  assert.equal(store.getTask(2).parent, 1);
  assert.equal(store.getState()._tasks.length, 2);
});

test("parents stay tasks and retain independent calendars even with dated and undated descendants", () => {
  const tasks = [
    task({ due_date: null }),
    task({
      id: 2,
      parent_id: 1,
      due_date: "2026-10-09",
      state_name: "En curso",
    }),
    task({ id: 3, parent_id: 2, due_date: null }),
  ];
  const before = structuredClone(tasks),
    store = storeFor(tasks);
  assert.deepEqual(tasks, before);
  assert.equal(store.getTask(1).type, "gm-open-ended");
  assert.equal(store.getTask(1).start, undefined);
  assert.equal(store.getTask(1).end, undefined);
  assert.equal(store.getTask(2).parent, 1);
  assert.equal(store.getTask(2).gmStateName, "En curso");
  assert.equal(store.getTask(3).parent, 2);
  assert.equal(store.getTask(3).end, undefined);
});

test("bounded parent keeps its own dates instead of deriving a summary from children", () => {
  const store = storeFor([
    task({ start_date: "2026-10-01", due_date: "2026-10-31" }),
    task({ id: 2, parent_id: 1 }),
  ]);
  assert.equal(store.getTask(1).type, "task");
  assert.deepEqual(plain(adapter.fromGanttWindow(store.getTask(1))), {
    start_date: "2026-10-01",
    due_date: "2026-10-31",
  });
});

test("bad dates duplicate IDs and fabricated null intervals fail visibly", () => {
  assert.throws(() => adapter.toGanttRows([task(), task()]), /duplicadas/);
  assert.throws(
    () => adapter.toGanttRows([task({ start_date: "not-a-date" })]),
    /válida/,
  );
  assert.throws(
    () =>
      adapter.fromGanttWindow({
        ...adapter.toGanttWindow(task({ due_date: null })),
        end: new Date(),
      }),
    /calculado/,
  );
});

test("read-only intercepts actual MIT data actions while allowing selection and expansion", async () => {
  const store = storeFor([
    task(),
    task({ id: 2, parent_id: 1, due_date: null }),
  ]);
  const api = {
    intercept: store.in.intercept.bind(store.in),
    detach: store.in.detach.bind(store.in),
  };
  const release = bindGanttReadOnly(api);
  const before = JSON.stringify(store.serialize());
  for (const [action, payload] of [
    [
      "update-task",
      { id: 1, task: { text: "Changed", start: new Date(2026, 9, 8) } },
    ],
    ["drag-task", { id: 1, left: 400, top: 80 }],
    ["move-task", { id: 2, target: 1, mode: "before" }],
    ["indent-task", { id: 2, mode: false }],
    ["add-task", { task: { id: 7, text: "Added" } }],
    ["copy-task", { id: 1 }],
    ["delete-task", { id: 1 }],
    ["add-link", { link: { id: 8, source: 1, target: 2, type: "e2s" } }],
    ["update-task", { id: 2, task: { start: new Date(), duration: 1 } }],
    ["show-editor", { id: 1 }],
  ]) {
    await store.in.exec(action, payload);
    assert.equal(JSON.stringify(store.serialize()), before, action);
  }
  await store.in.exec("open-task", { id: 1, mode: false });
  assert.equal(store.getTask(1).open, false);
  await store.in.exec("select-task", { id: 1 });
  assert.ok(store.getState().selected.includes(1));
  release();
});

test("cleanup detaches only its own gesture guards and cannot remove a later binding", async () => {
  const store = storeFor([task()]);
  const api = {
    intercept: store.in.intercept.bind(store.in),
    detach: store.in.detach.bind(store.in),
  };
  const first = bindGanttReadOnly(api),
    second = bindGanttReadOnly(api);
  first();
  await store.in.exec("update-task", { id: 1, task: { text: "blocked" } });
  assert.equal(store.getTask(1).text, "Tarea QA");
  second();
  await store.in.exec("update-task", { id: 1, task: { text: "released" } });
  assert.equal(store.getTask(1).text, "released");
});

test("loading empty and retryable resource error remain distinct before the deferred view is ready", () => {
  const props = {
    tasks: [],
    loading: false,
    error: "",
    onRetry() {},
    onOpenTask() {},
  };
  const markup = (changes) =>
    renderToStaticMarkup(React.createElement(Entry, { ...props, ...changes }));
  assert.match(markup({}), /todavía no tiene tareas/);
  assert.match(markup({ loading: true }), /Actualizando tareas/);
  assert.doesNotMatch(markup({ loading: true }), /todavía no tiene tareas/);
  assert.match(markup({ error: "Error QA" }), /role="alert"/);
  assert.match(markup({ error: "Error QA" }), /Reintentar tareas/);
  assert.doesNotMatch(markup({ error: "Error QA" }), /todavía no tiene tareas/);
});

test("worker-filtered children remain visible without fetching or exposing an unauthorized parent", () => {
  const original = task({ parent_id: 99, due_date: null });
  const store = storeFor([original]);
  const row = store.getTask(1);
  assert.equal(row.parent, 0);
  assert.equal(row.gmParentId, 99);
  assert.equal(row.text, original.name);
  assert.equal(row.end, undefined);
  assert.equal(original.parent_id, 99);
  assert.equal(store.getState()._tasks.length, 1);
});

test("real MIT calendar durations use calendar days across DST in independent timezone processes", () => {
  const program =
    "const {DataStore}=require('@svar-ui/gantt-store');const a=require('node:assert/strict');" +
    "for(const [year,month,day,length] of [[2026,2,7,3],[2026,9,31,3],[2028,1,28,2],[2026,11,31,1]]){" +
    "const start=new Date(year,month,day),end=new Date(year,month,day+length),s=new DataStore();" +
    "s.init({tasks:[{id:1,type:'task',start,end}],links:[],durationUnit:'day',inclusiveEnd:true,columns:[{id:'text'}]," +
    "scales:[{unit:'day',step:1,format:'%j'}],start:new Date(year,month,day-1),end:new Date(year,month,day+length+1),cellWidth:40,cellHeight:40,scaleHeight:28});" +
    "const task=s.getTask(1);a.equal(task.duration,length);a.equal(task.end.getFullYear(),end.getFullYear());" +
    "a.equal(task.end.getMonth(),end.getMonth());a.equal(task.end.getDate(),end.getDate());}";
  for (const TZ of [
    "UTC",
    "America/Lima",
    "America/New_York",
    "Pacific/Kiritimati",
    "Asia/Kolkata",
  ])
    execFileSync(process.execPath, ["-e", program], {
      env: { ...process.env, TZ },
    });
});
