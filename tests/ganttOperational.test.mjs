import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { DataStore, getAdder, getDiffer, getUnitStart } from "@svar-ui/gantt-store";

const context = vm.createContext({ Date, console });
const modules = new Map();
async function load(relative) {
  const url = relative instanceof URL ? relative : new URL(relative, import.meta.url);
  if (modules.has(url.href)) return modules.get(url.href);
  const code = ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  const module = new vm.SourceTextModule(code, { context });
  modules.set(url.href, module);
  await module.link(async (name) => {
    if (name === "@svar-ui/gantt-store") {
      const imported = new vm.SyntheticModule(["getAdder", "getDiffer", "getUnitStart"], function() {
        this.setExport("getAdder", getAdder); this.setExport("getDiffer", getDiffer); this.setExport("getUnitStart", getUnitStart);
      }, { context });
      await imported.link(() => {});
      return imported;
    }
    return load(new URL(name + ".ts", url));
  });
  return module;
}
const queryModule = await load("../src/features/projects/TaskGantt/ganttQuery.ts");
await queryModule.evaluate();
const viewportModule = await load("../src/features/projects/TaskGantt/ganttViewport.ts");
await viewportModule.evaluate();
const calendarModule = await load("../src/features/projects/TaskGantt/ganttCalendar.ts");
await calendarModule.evaluate();
const { ganttProjection, ganttDependencies, emptyGanttFilters } = queryModule.namespace;
const { centeredViewport, fitProjectViewport, fitTimelineViewport, taskTimelineBounds, ganttDay, pageViewport, viewportAnchor, viewportCellWidth, viewportScales, viewportContains } = viewportModule.namespace;
const { toGanttRows } = calendarModule.namespace;
const plain = (value) => JSON.parse(JSON.stringify(value));
const task = (id, changes = {}) => ({
  id, parent_id: null, name: "Tarea " + id, state_code: "PENDIENTE", state_name: "Pendiente", state_category: "not_started",
  start_date: "2026-10-30", due_date: "2026-11-10", created_at: "2026-10-30T12:00:00Z",
  responsible_id: null, responsible_name: null, labels: [], dependencies: [], ...changes,
});
const filter = (changes = {}) => ({ ...emptyGanttFilters, ...changes });
const config = {
  links: [], autoScale: false, durationUnit: "day", inclusiveEnd: true, cellWidth: 40, cellHeight: 40, scaleHeight: 28,
  columns: [{ id: "text", header: "Tarea" }], scales: [{ unit: "day", step: 1, format: "%j" }],
};

test("search keeps every authorized ancestor across four levels without grouping by child state or changing dates", () => {
  const tasks = [
    task(40, { parent_id: 30, name: "Coincidencia profunda", state_code: "BLOQUEADA", state_name: "Bloqueada", due_date: null }),
    task(20, { parent_id: 10, state_code: "EN_CURSO", state_name: "En curso" }), task(10),
    task(30, { parent_id: 20, due_date: null }), task(50),
  ];
  const before = JSON.stringify(tasks);
  const projected = ganttProjection(tasks, filter({ search: "profunda" }), "2026-10-30");
  assert.deepEqual([...projected.matches], [40]);
  assert.deepEqual(projected.tasks.map((entry) => entry.id), [40, 20, 10, 30]);
  const store = new DataStore();
  store.init({ ...config, ...centeredViewport(ganttDay("2026-10-30")), tasks: toGanttRows(projected.tasks) });
  assert.deepEqual(store.getState()._tasks.map((entry) => entry.id), [10, 20, 30, 40]);
  assert.equal(store.getTask(40).gmStateName, "Bloqueada");
  assert.equal(store.getTask(40).end, undefined);
  assert.equal(store.getTask(10).type, "task");
  assert.equal(store.getTask(10).end.getDate(), 11);
  assert.equal(JSON.stringify(tasks), before);
});

test("combined filters reuse multi-person assignments, legacy responsible, label search and calendar due groups", () => {
  const tasks = [
    task(1), task(2, { parent_id: 1, assignees: [{ id: 7, name: "Segunda persona" }], labels: [{ name: "Entrega" }], state_code: "EN_CURSO", due_date: null }),
    task(3, { responsible_id: 7, responsible_name: "Segunda persona", start_date: "2026-10-29", due_date: "2026-10-29" }),
    task(4, { state_category: "done", start_date: "2026-10-29", due_date: "2026-10-29" }),
  ];
  assert.deepEqual([...ganttProjection(tasks, filter({ search: "Entrega", state: "EN_CURSO", assignee: "7", due: "undated" }), "2026-10-30").matches], [2]);
  assert.deepEqual([...ganttProjection(tasks, filter({ assignee: "7", due: "overdue" }), "2026-10-30").matches], [3]);
  assert.deepEqual([...ganttProjection(tasks, filter({ due: "completed" }), "2026-10-30").matches], [4]);
  assert.deepEqual([...ganttProjection(tasks, filter({ assignee: "none" }), "2026-10-30").matches], [1, 4]);
  assert.equal(toGanttRows(tasks)[1].gmResponsible, "Segunda persona");
  assert.equal(toGanttRows(tasks)[2].gmResponsible, "Segunda persona");
});

test("missing unauthorized ancestors and dependency endpoints are never fetched, counted or exposed", () => {
  const tasks = [task(2, { parent_id: 99, dependencies: [99, 1, 1, 2] }), task(1)];
  const projection = ganttProjection(tasks, filter({ search: "Tarea 2" }), "2026-10-30");
  assert.deepEqual(projection.tasks.map((entry) => entry.id), [2]);
  assert.equal(toGanttRows(projection.tasks)[0].parent, 0);
  assert.equal(toGanttRows(projection.tasks)[0].gmParentId, 99);
  const edges = ganttDependencies(tasks);
  assert.equal(edges.length, 1);
  assert.equal(edges[0].id, "1:2");
  assert.equal(edges[0].predecessor.id, 1);
  assert.equal(edges[0].successor.id, 2);
  assert.equal(edges[0].type, undefined);
  assert.equal(edges[0].lag, undefined);
});

test("dependency IDs and direction survive reorder, filtering and nullable task windows", () => {
  const tasks = [task(1, { due_date: null }), task(2, { dependencies: [1] }), task(3, { dependencies: [2] })];
  assert.deepEqual(plain(ganttDependencies(tasks).map((edge) => edge.id)), ["1:2", "2:3"]);
  assert.deepEqual(plain(ganttDependencies([...tasks].reverse()).map((edge) => edge.id)), ["2:3", "1:2"]);
  assert.deepEqual(plain(ganttDependencies([tasks[0], tasks[2]])), []);
  assert.equal(toGanttRows(tasks)[0].end, undefined);
});

test("empty matches remain distinct from a populated shared collection and context is not counted as a match", () => {
  const tasks = [task(1), task(2, { parent_id: 1, name: "Objetivo" })];
  const matches = ganttProjection(tasks, filter({ search: "Objetivo" }), "2026-10-30");
  assert.equal(matches.matches.size, 1);
  assert.equal(matches.tasks.length, 2);
  assert.equal(ganttProjection(tasks, filter({ search: "inexistente" }), "2026-10-30").tasks.length, 0);
  assert.equal(tasks.length, 2);
});

test("extreme dates do not expand the initial real MIT viewport or rewrite task windows", () => {
  const view = centeredViewport(ganttDay("2026-10-30"));
  const rows = toGanttRows([task(1, { start_date: "1901-01-01", due_date: "1901-01-01" }), task(2, { start_date: "2099-01-01", due_date: "2099-01-01" }), task(3, { due_date: null })]);
  const store = new DataStore();
  store.init({ ...config, tasks: rows, start: view.start, end: view.end });
  assert.equal(store.getState()._start.getFullYear(), 2026);
  assert.equal(store.getState()._end.getFullYear(), 2026);
  assert.equal(store.getTask(1).start.getFullYear(), 1901);
  assert.equal(store.getTask(2).end.getFullYear(), 2099);
  assert.equal(store.getTask(3).end, undefined);
  assert.equal(store.getState().tasks.toArray().length, 3);
});

test("ordinary real store refresh retains controlled selection, collapse, viewport and both scroll axes", async () => {
  const view = centeredViewport(ganttDay("2026-10-30"));
  const tasks = [task(1), task(2, { parent_id: 1 }), ...Array.from({ length: 80 }, (_, n) => task(n + 3))];
  const rows = toGanttRows(tasks);
  const store = new DataStore();
  store.init({ ...config, tasks: rows, start: view.start, end: view.end, selected: [60] });
  await store.in.exec("open-task", { id: 1, mode: false });
  await store.in.exec("scroll-chart", { left: 200, top: 320 });
  const before = store.getState();
  const updated = toGanttRows(tasks.map((entry) => entry.id === 60 ? { ...entry, name: "Nombre actualizado" } : entry));
  updated[0].open = false;
  store.init({ ...config, tasks: updated, start: view.start, end: view.end, selected: [60] });
  const after = store.getState();
  assert.equal(after.scrollLeft, before.scrollLeft);
  assert.equal(after.scrollTop, before.scrollTop);
  assert.deepEqual(after.selected, [60]);
  assert.equal(store.getTask(1).open, false);
  assert.equal(after._tasks.some((entry) => entry.id === 2), false);
  assert.equal(after._start.getTime(), before._start.getTime());
  assert.equal(store.getTask(60).text, "Nombre actualizado");
});

test("fit uses the complete authorized task collection and fits centuries inside the actual timeline width", () => {
  const tasks = [task(1, { start_date: "1901-01-01", due_date: "2099-01-01" })];
  const expanded = fitProjectViewport(tasks, "2026-10-30", 640);
  assert.equal(expanded.scale, "year");
  assert.ok(expanded.step > 1);
  assert.equal(viewportScales(expanded)[0].step, expanded.step);
  assert.equal(viewportContains(expanded, "2099-01-01"), true);
  const store = new DataStore();
  store.init({ ...config, ...expanded, tasks: toGanttRows(tasks), scales: viewportScales(expanded), cellWidth: viewportCellWidth(expanded) });
  assert.ok(store.getState()._scales.width <= 640.01);
  assert.ok(store.getState()._scales.rows[0].cells.length < 12);
  assert.equal(store.getTask(1).start.getFullYear(), 1901);
  const anchor = viewportAnchor(centeredViewport(ganttDay("2026-10-30"), "week"), 280);
  assert.equal(anchor.getDate(), 5);
});

test("fit includes unbounded starts without inventing ends, ignores active matches and handles empty or single-day projects", () => {
  const tasks = [task(1, { start_date: "2026-01-01", due_date: "2026-01-02" }), task(2, { start_date: "2027-12-31", due_date: null })];
  const bounds = taskTimelineBounds(tasks, "2026-11-03");
  assert.deepEqual(plain(bounds), { first: "2026-01-01", last: "2027-12-31" });
  const matching = ganttProjection(tasks, filter({ search: "Tarea 1" }), "2026-11-03");
  assert.equal(matching.matches.size, 1);
  assert.equal(fitProjectViewport(tasks, "2026-11-03", 500).frame.last, "2027-12-31");
  for (const source of [[], [task(1, { start_date: "2026-11-03", due_date: "2026-11-03" })], [task(1, { start_date: "2026-11-03", due_date: null })]]) {
    const fit = fitProjectViewport(source, "2026-11-03", 500);
    const store = new DataStore();
    store.init({ ...config, ...fit, tasks: toGanttRows(source), scales: viewportScales(fit), cellWidth: viewportCellWidth(fit) });
    assert.equal(fit.scale, "day");
    assert.equal(store.getState()._scales.width, 500);
    assert.equal(store.getState()._scales.rows[1].cells.length, 1);
    if (source[0]?.due_date === null) assert.equal(store.getTask(1).end, undefined);
  }
});

test("all six period choices use real calendar units; custom ranges are inclusive, validated and responsive", () => {
  for (const scale of ["day", "week", "month", "quarter", "year"]) {
    const view = centeredViewport(ganttDay("2026-11-03"), scale);
    const scales = viewportScales(view);
    assert.equal(scales.at(-1).unit, scale === "week" ? "day" : scale);
    const store = new DataStore();
    store.init({ ...config, ...view, tasks: [], scales });
    assert.equal(store.getState()._scales.minUnit, scale === "week" ? "day" : scale);
    assert.ok(scales.at(-1).format(view.start).length > 0);
  }
  for (const [first, last] of [["2024-02-29", "2024-03-01"], ["2026-12-31", "2027-01-01"], ["1901-01-01", "2099-12-31"]]) {
    for (const width of [240, 500, 1100]) {
      const fit = fitTimelineViewport(first, last, width, true);
      assert.equal(fit.scale, "flexible");
      assert.equal(viewportContains(fit, first), true);
      assert.equal(viewportContains(fit, last), true);
      const store = new DataStore();
      store.init({ ...config, ...fit, tasks: [], scales: viewportScales(fit), cellWidth: viewportCellWidth(fit) });
      assert.ok(store.getState()._scales.width <= width + 0.01);
      assert.ok(store.getState()._scales.rows.at(-1).cells.length < 32);
    }
  }
  assert.throws(() => fitTimelineViewport("2026-11-03", "2026-11-02", 500), /posterior/);
  assert.throws(() => fitTimelineViewport("2026-02-30", "2026-03-01", 500), /válida/);
});

test("diagram paging preserves density and window size after a custom or centuries-long fit", () => {
  for (const source of [fitTimelineViewport("2026-11-03", "2026-11-14", 600, true), fitTimelineViewport("1901-01-01", "2099-12-31", 600)]) {
    const next = pageViewport(source, 1, 600).viewport;
    assert.equal(next.cellWidth, source.cellWidth);
    assert.equal(next.scale, source.scale);
    assert.equal(next.step, source.step);
    assert.equal(next.frame, undefined);
    const previous = pageViewport(next, -1, 600).viewport;
    assert.equal(previous.start.getTime(), source.start.getTime());
    assert.equal(previous.end.getTime(), source.end.getTime());
  }
});

test("automatic framing keeps a fourteen-month schedule at legible quarters without an empty year margin", () => {
  const view = fitTimelineViewport("2026-10-14", "2027-12-08", 450);
  assert.equal(view.unit, "quarter");
  assert.equal(view.start.getMonth(), 9);
  assert.equal(view.start.getFullYear(), 2026);
  assert.ok(view.cellWidth >= 64);
});

test("all authorized records remain addressable beyond previous listing limits with stable sibling order", () => {
  const tasks = Array.from({ length: 1200 }, (_, n) => task(1200 - n, { parent_id: n % 5 ? 1200 - n + n % 5 : null }));
  const before = tasks.map((entry) => entry.id);
  const projection = ganttProjection(tasks, filter(), "2026-10-30");
  assert.deepEqual(projection.tasks.map((entry) => entry.id), before);
  assert.equal(projection.matches.size, 1200);
  assert.equal(ganttProjection(tasks, filter({ search: "Tarea 1" }), "2026-10-30").matches.has(1), true);
});

test("public grid resizing preserves hierarchy, calendar and independent states", async () => {
  const tasks = [task(1), task(2, { parent_id: 1, state_code: "EN_CURSO", state_name: "En curso" })];
  const store = new DataStore();
  store.init({ ...config, ...centeredViewport(ganttDay("2026-10-30")), tasks: toGanttRows(tasks), gridWidth: 840 });
  const window = store.getTask(1).start.getTime();
  await store.in.exec("resize-grid", { width: 250 });
  assert.equal(store.getState().gridWidth, 250);
  assert.equal(store.getTask(1).start.getTime(), window);
  assert.equal(store.getTask(2).parent, 1);
  assert.equal(store.getTask(2).gmStateName, "En curso");
  assert.equal(store.getTask(1).type, "task");
  await store.in.exec("resize-grid", { width: 840 });
  assert.equal(store.getState().gridWidth, 840);
  assert.equal(store.getTask(2).parent, 1);
});
