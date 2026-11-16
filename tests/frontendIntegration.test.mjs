import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import postcss from "postcss";

async function load(file, dependencies) {
  const source = readFileSync(new URL("../" + file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = new vm.SourceTextModule(code);
  await module.link(name => {
    const exports = dependencies[name];
    assert.ok(exports, "Unmapped dependency " + name);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    });
  });
  await module.evaluate();
  return module.namespace;
}

test("one project workspace supplies the same coordinator to views and dialogs and disposes it", async () => {
  const context = React.createContext(null), effects = [], instances = [];
  let epoch = 7;
  const { default: Workspace } = await load("src/features/home/components/ProjectTaskWorkspace.tsx", {
    react: { ...React, useEffect: effect => effects.push(effect) },
    "react/jsx-runtime": jsx,
    "../../auth/api": { sessionVersion: () => epoch },
    "../utils/useTaskSync": { TaskSyncContext: context, createTaskSync: (projectId, version) => {
      const value = { projectId, version, active: false, activate() { this.active = true; }, dispose() { this.active = false; } };
      instances.push(value); return value;
    } },
  });
  const seen = [];
  function Consumer() { const sync = React.useContext(context); seen.push(sync); return React.createElement("span", null, sync.projectId); }
  const render = id => renderToStaticMarkup(React.createElement(Workspace, { projectId: id }, React.createElement(Consumer), React.createElement(Consumer)));
  assert.match(render(42), /42/);
  assert.equal(instances.length, 1);
  assert.equal(seen[0], seen[1]);
  const dispose = effects[0]();
  assert.equal(instances[0].active, true);
  dispose();
  assert.equal(instances[0].active, false);
  epoch++;
  render(99);
  assert.equal(instances[1].projectId, 99);
  assert.equal(instances[1].version, 8);
  assert.notEqual(instances[0], instances[1]);
});

const dropModule = await load("src/features/home/utils/taskDropPosition.ts", {});
const { listDropDestination } = await load("src/features/home/views/List/utils/listDropDestination.ts", { "../../../utils/taskDropPosition": dropModule });
const bounds = (top, bottom) => ({ left: 10, right: 810, top, bottom, width: 800 });
function listContext() {
  const tasks = [
    { id: 1, parent_id: null, state_code: "PENDING" },
    { id: 2, parent_id: 1, state_code: "ACTIVE" },
    { id: 3, parent_id: null, state_code: "PENDING" },
    { id: 4, parent_id: null, state_code: "ACTIVE" },
  ];
  function section(code, top, bottom, ids) {
    const rows = ids.map((id, i) => ({ dataset: { taskId: String(id) }, getClientRects: () => [1], getBoundingClientRect: () => bounds(top + 40 + i * 40, top + 80 + i * 40) }));
    const table = { getBoundingClientRect: () => bounds(top + 30, bottom), getClientRects: () => [1], querySelectorAll: () => rows };
    return { dataset: { groupKey: "state:" + code }, offsetWidth: 800, getBoundingClientRect: () => bounds(top, bottom), querySelector: query => query === "table" ? table : { getBoundingClientRect: () => bounds(top, top + 30) } };
  }
  const sections = [section("PENDING", 110, 300, [1, 2, 3]), section("ACTIVE", 330, 450, [4])];
  return { tasks, byId: new Map(tasks.map(task => [task.id, task])), rootById: new Map([[2, tasks[0]]]), groups: ["PENDING", "ACTIVE"].map(stateCode => ({ key: "state:" + stateCode, stateCode })), region: { scrollTop: 20, scrollLeft: 0, getBoundingClientRect: () => bounds(100, 800), querySelectorAll: () => sections } };
}

test("List drop geometry rejects outside targets and keeps state changes under the original parent", () => {
  const context = listContext(), child = context.tasks[1];
  assert.equal(listDropDestination(context, 5, 390, child), null);
  const result = listDropDestination(context, 200, 390, child);
  assert.equal(result.state, "ACTIVE");
  assert.equal(result.before, null);
  assert.equal(result.parent, undefined);
  assert.equal(result.top, 110);
  assert.equal(context.byId.get(2).parent_id, 1);
});

test("List root insertion follows the actual destination state and visible sibling order", () => {
  const context = listContext();
  const result = listDropDestination(context, 200, 375, context.tasks[2]);
  assert.equal(result.state, "ACTIVE");
  assert.equal(result.before, 4);
  assert.equal(result.left, 0);
  assert.equal(result.width, 800);
});

test("Gantt styles are owned by the lazy module and global styles retain no Gantt selectors", () => {
  const global = postcss.parse(readFileSync(new URL("../src/index.css", import.meta.url), "utf8"));
  global.walkRules(rule => assert.doesNotMatch(rule.selector, /gm-gantt|gm-task-gantt/));
  const css = readFileSync(new URL("../src/features/home/views/TaskGantt/taskGantt.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /strokewidth\s*:/);
  assert.doesNotMatch(css, /@font-face|\.gm-task-detail/);
  assert.match(css, /\.dark \.gm-task-gantt/);
  const module = readFileSync(new URL("../src/features/home/views/TaskGantt/TaskGantt.tsx", import.meta.url), "utf8");
  assert.match(module, /import "\.\/taskGantt\.css"/);
});


test("shared invitation areas wait for an administrator and reject an old session before sending", async () => {
  let admin = false, epoch = 3, calls = 0;
  const { useActiveAreas } = await load("src/features/organizations/accounts/useAccounts.ts", {
    react: { useMemo: React.useMemo },
    "@tanstack/react-query": { useQuery: options => options, useMutation() {}, useQueryClient() {} },
    "../../../core/services/organizationService": { getActiveAreaOptions: async signal => { calls++; assert.ok(signal); return [{ id: 1, name: "QA" }]; } },
    "../../../hooks/useAuth": { useAuth: () => ({ isAdmin: admin }) },
    "../../auth/api": { apiRequest() {}, errorText: String, sessionVersion: () => epoch, checkSession: before => { if (before !== epoch) throw new Error("Session changed"); } },
    "../../../hooks/useToast": { useToast() {} },
  });
  assert.equal(useActiveAreas().enabled, false);
  assert.equal(calls, 0);
  admin = true;
  const query = useActiveAreas();
  assert.equal(query.enabled, true);
  assert.deepEqual(Array.from(query.queryKey), ["admin-areas", 3]);
  const result = await query.queryFn({ signal: new AbortController().signal });
  assert.equal(result[0].id, 1);
  epoch++;
  assert.throws(() => query.queryFn({ signal: new AbortController().signal }), /Session changed/);
  assert.equal(calls, 1);
});


test("shared task queries cannot replace a confirmed calendar or publish another session", async () => {
  const collection = await load("src/features/home/utils/taskCollection.ts", {});
  let epoch = 5, resolve;
  let current = [{ id: 7, name: "Confirmed", parent_id: null, calendar_revision: "9007199254740993", updated_at: "2026-11-14T01:00:00Z", start_date: "2026-11-14", due_date: null }];
  const { projectTaskQuery } = await load("src/features/home/hooks/projectTaskQuery.ts", {
    "@tanstack/react-query": { queryOptions: options => options },
    "../../../core/services/taskService": { getTasks: () => new Promise(done => { resolve = done; }) },
    "../../auth/api": { sessionVersion: () => epoch },
    "../utils/useTaskSync": { StaleTaskResponse: class extends Error {} },
    "../utils/taskCollection": collection,
  });
  const client = { getQueryData: () => current };
  const query = projectTaskQuery(42, client);
  const reading = query.queryFn();
  current = [{ ...current[0], name: "Later confirmed", calendar_revision: "9007199254740994", updated_at: "2026-11-14T02:00:00Z", due_date: "2026-11-20" }];
  resolve([{ ...current[0], name: "Old snapshot", calendar_revision: "9007199254740993", updated_at: "2026-11-14T01:00:00Z", due_date: null }]);
  const result = await reading;
  assert.equal(result[0].calendar_revision, "9007199254740994");
  assert.equal(result[0].due_date, "2026-11-20");
  assert.equal(result[0].name, "Later confirmed");
  const next = query.queryFn();
  epoch++;
  resolve([]);
  await assert.rejects(next);
});


test("List state cells render backend hex colors and Tailwind tokens through the shared theme resolver", async () => {
  const theme = await load("src/features/home/utils/themePresentation.ts", {});
  const { default: Cell } = await load("src/features/home/views/List/components/TaskTable/columns/TaskStateCell.tsx", {
    react: React, "react/jsx-runtime": jsx,
    "../../../../../utils/themePresentation": theme,
    "../../../../../../../shared/icons/icon-catalog": { DynamicIcon: ({ name }) => React.createElement("svg", { "data-icon": name }), getIcon: () => () => React.createElement("svg", { "data-icon": "circle-dot" }) },
  });
  for (const [color, expected] of [["sky-600", "var(--color-sky-600)"], ["#16a34a", "#16a34a"]]) {
    const markup = renderToStaticMarkup(React.createElement("table", null, React.createElement("tbody", null, React.createElement("tr", null, React.createElement(Cell, { view: { task: { state_name: "Current", state_tema: { color, icono: "CircleDotIcon" } }, project: { task_states: { states: [] } } } })))));
    assert.ok(markup.includes("background-color:" + expected));
    assert.match(markup, /data-icon="circle-dot"/);
  }
});


test("refactored detail keeps paginated reads, one pending write, exact calendar intent and session isolation", async () => {
  const queries = [], pages = [], writes = [], accepted = [], notifications = [];
  let active = true, finish;
  const task = { id: 7, project_id: 42, name: "Confirmed", parent_id: null, state_code: "PENDING", calendar_revision: "9007199254740997", start_date: "2026-11-14", due_date: null };
  const sync = {
    subscribe() {}, getVersion: () => 1, isCurrent: () => active,
    current: value => value, observe: value => value, observeMany: items => items,
    confirm: value => value,
    read: async read => { if (!active) throw new Error("Old session"); return read(); },
    patch: (id, payload) => { writes.push({ id, payload }); return new Promise(resolve => { finish = resolve; }); },
  };
  const client = { setQueryData() {}, invalidateQueries: async () => {} };
  const infinite = options => {
    pages.push(options);
    return { data: { pages: [{ items: [], completed: 0, total: 0, next_cursor: null }] }, refetch: async () => {}, fetchNextPage: async () => {}, hasNextPage: false, isPending: false };
  };
  const { useTaskDetail } = await load("src/features/home/shared/task-detail/useTaskDetail.ts", {
    react: { useRef: value => ({ current: value }), useSyncExternalStore: (_subscribe, get) => get() },
    "@tanstack/react-query": {
      useQueryClient: () => client,
      useQuery: options => { queries.push(options); return { data: { task, parent: null }, isPending: false, refetch: async () => {} }; },
      useInfiniteQuery: infinite,
      useMutation: options => ({ isPending: false, mutateAsync: async input => { try { return await options.mutationFn(input); } catch (error) { options.onError(error); throw error; } } }),
    },
    "../../../auth/api": { sessionVersion: () => 13, errorText: error => error.message },
    "../../../../hooks/useToast": { useToast: () => ({ addToast: value => notifications.push(value) }) },
    "../../utils/useTaskSync": { useTaskSync: () => sync },
    "../../services": { getTaskDetail: async () => ({ task, parent: null }), getTaskSubtasks: async (_target, cursor) => ({ items: [], next_cursor: cursor ? null : 20 }), getTaskActivity: async () => ({ items: [], next_cursor: null }), getTaskRelations: async () => ({ items: [], next_cursor: null }), changeTaskState: async (_project, id, payload) => ({ ...task, id, ...payload }) },
  });
  const detail = useTaskDetail({ projectId: 42, taskId: 7 }, value => accepted.push(value));
  assert.deepEqual(Array.from(queries[0].queryKey), ["task", 13, 42, 7]);
  assert.equal(queries[0].retry, false);
  assert.equal(pages.length, 3);
  assert.equal(pages[0].getNextPageParam({ next_cursor: 20 }), 20);
  assert.equal(pages[0].getNextPageParam({ next_cursor: null }), undefined);
  active = false;
  const initialReading = queries[0].queryFn();
  active = true;
  assert.equal((await initialReading).task.calendar_revision, "9007199254740997");
  const payload = { expected_calendar_revision: task.calendar_revision, calendar_intent_id: "3a058eb2-557f-4c25-ab82-88223331b091", due_date: "2026-11-20" };
  const saving = detail.onPatch(task, payload);
  await assert.rejects(detail.patchTask({ name: "Concurrent" }), /termine el guardado/);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].payload, payload);
  finish({ ...task, due_date: payload.due_date, calendar_revision: "9007199254740998" });
  await saving;
  assert.equal(accepted[0].calendar_revision, "9007199254740998");
  assert.equal(accepted[0].parent_id, null);
  assert.equal(accepted[0].state_code, "PENDING");
  const late = detail.patchTask({ name: "Old session" });
  active = false;
  finish({ ...task, name: "Old session" });
  await late;
  assert.equal(accepted.length, 1);
  assert.equal(writes.length, 2);
});


test("new detail renders an initial pending response without a task or draft", async () => {
  const empty = { default: () => null };
  const { default: Detail } = await load("src/features/home/shared/task-detail/TaskDetailModal.tsx", {
    react: React, "react/jsx-runtime": jsx,
    "../../../../shared/components/Modal/Modal": { default: ({ children }) => React.createElement("div", null, children) },
    "./TaskDetailFrame": { default: ({ children }) => React.createElement("div", null, children) },
    "./TaskHeader": empty,
    "./TaskActivityFeed": empty, "./TaskRelations": empty, "./TaskPropertiesGrid": empty, "./TaskSubtasksList": empty, "./TaskTitle": empty,
  });
  const markup = renderToStaticMarkup(React.createElement(Detail, { model: { target: { projectId: 42, taskId: 7 }, project: { name: "QA" }, catalogs: {}, task: undefined, parent: null, subtasks: [], subtasksSummary: { total: 0, completed: 0 }, activities: [], loading: true, error: "", onClose() {} } }));
  assert.match(markup, /role="status"/);
  assert.match(markup, /Consultando tarea/);
  assert.doesNotMatch(markup, /textarea/);
});


test("sidebar projects wait for authentication and discard stale session responses without false toasts", async () => {
  let authenticated = false, epoch = 1, calls = 0, complete;
  const toasts = [];
  let query;
  const { useProjects: queryOptions } = await load("src/features/home/hooks/useProjects.ts", {
    "@tanstack/react-query": { useQuery: options => { query = options; return {}; } },
    "../../../core/services/projectService": { getProjects: () => { calls++; return new Promise(resolve => { complete = resolve; }); } },
    "../../../hooks/useToast": { useToast: () => ({ addToast: toast => toasts.push(toast) }) },
    "../../../hooks/useAuth": { useAuth: () => ({ isAuthenticated: authenticated }) },
    "../../auth/api": { errorText: error => error.message, sessionVersion: () => epoch, checkSession: before => { if (before !== epoch) throw new Error("Session changed"); } },
  });
  queryOptions();
  assert.equal(query.enabled, false);
  assert.equal(calls, 0);
  authenticated = true;
  queryOptions();
  assert.equal(query.enabled, true);
  assert.deepEqual(Array.from(query.queryKey), ["projects"]);
  const pending = query.queryFn();
  epoch++;
  complete([{ id: 1 }]);
  await assert.rejects(pending, /Session changed/);
  assert.deepEqual(toasts, []);
  queryOptions();
  const current = query.queryFn();
  complete([{ id: 2 }]);
  assert.equal((await current)[0].id, 2);
});


test("the colleague's blocked/cancelled creation reason survives the scheduling form contract", async () => {
  const states = [], refs = [], writes = [];
  let stateIndex = 0, refIndex = 0;
  const { useTaskForm } = await load("src/features/home/shared/task-form/useTaskForm.ts", {
    react: {
      useState(initial) {
        const index = stateIndex++;
        if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
        return [states[index], value => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
      },
      useRef(initial) { const index = refIndex++; return refs[index] ??= { current: initial }; },
      useLayoutEffect() {},
    },
    "../../utils/useTaskScheduleForm": { useTaskScheduleForm: () => ({ value: () => undefined }) },
    "../../utils/useTaskCalendarEdit": { calendarProblem: () => "validation" },
    "../../../auth/api": { errorText: String },
    "../../utils/formErrors": { apiFieldErrors: () => ({}) },
    "../../utils/labelSelection": { labelSelection: () => ({}) },
    "../../utils/taskAssignees": { taskAssignees: () => [] },
    "../task-fields/taskDates": { taskCreationStart: () => "2026-11-14" },
    "../../../../hooks/useToast": { useToast: () => ({ addToast() {} }) },
  });
  const params = {
    project: { start_date: "2026-11-01", end_date: "2026-12-15", permissions: { manage: true }, task_states: { states: [{ code: "BLOQUEADA" }], can_configure: true } },
    catalogs: { priorities: [{ code: 3 }] }, initialState: "BLOQUEADA",
    onSubmit: async data => writes.push(data), onConfigured() {},
  };
  const render = () => { stateIndex = 0; refIndex = 0; return useTaskForm(params); };
  let form = render();
  form.setName("Blocked task");
  form = render();
  await form.submit({ preventDefault() {} });
  assert.equal(writes.length, 0);
  assert.match(render().fieldErrors["task-reason"], /motivo/);
  form.setReason("  Falta de acceso  ");
  form = render();
  await form.submit({ preventDefault() {} });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].reason, "Falta de acceso");
  assert.equal(writes[0].state_code, "BLOQUEADA");
  assert.equal(writes[0].start_date, "2026-11-14");
});
