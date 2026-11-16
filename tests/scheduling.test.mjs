import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as store from "@svar-ui/gantt-store";

const context = vm.createContext({
  Date,
  Intl,
  crypto: { randomUUID },
  console,
});
const modules = new Map();
const requests = [];
class ApiError extends Error {}
async function load(relative) {
  const url =
    relative instanceof URL ? relative : new URL(relative, import.meta.url);
  if (modules.has(url.href)) return modules.get(url.href);
  const module = new vm.SourceTextModule(
    ts.transpileModule(readFileSync(url, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    }).outputText,
    { context },
  );
  modules.set(url.href, module);
  await module.link(async (name) => {
    const external = name.endsWith("/httpClient")
      ? {
          httpClient: {
            async request(options) {
              requests.push(plain(options));
              return { data: task() };
            },
          },
        }
      : name.endsWith("/projectService")
        ? { getProjects() {}, getProjectAreas() {}, getProjectCatalogs() {} }
        : name === "react"
          ? React
          : name === "@svar-ui/gantt-store"
            ? store
            : name.endsWith("auth/api")
              ? { ApiError, errorText: String }
              : name.endsWith("/services")
                ? { getTaskDetail() {} }
                : name.endsWith("/useTaskSync")
                  ? { StaleTaskResponse: Error, useTaskSync() {} }
                  : null;
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
async function api(file) {
  const m = await load("../src/features/home/" + file);
  if (m.status !== "evaluated") await m.evaluate();
  return m.namespace;
}
const calendar = await api("views/TaskGantt/ganttCalendar.ts");
const geometry = await api("views/TaskGantt/ganttGeometry.ts");
const viewport = await api("views/TaskGantt/ganttViewport.ts");
const snap = await api("views/TaskGantt/ganttCalendarSnap.ts");
const query = await api("views/TaskGantt/ganttQuery.ts");
const editing = await api("utils/useTaskCalendarEdit.ts");
const reconcile = await api("utils/taskCollection.ts");
const task = (change = {}) => ({
  id: 7,
  parent_id: null,
  name: "Horario QA",
  state_code: "EN_CURSO",
  state_name: "En curso",
  labels: [],
  dependencies: [],
  permissions: { edit: true },
  start_date: "2026-11-10",
  due_date: "2026-11-10",
  calendar_revision: "9007199254741001",
  schedule: {
    precision: "hour",
    start: "2026-11-10T09:00:00-05:00",
    end: "2026-11-10T10:00:00-05:00",
    timezone: "America/Lima",
  },
  ...change,
});
const plain = (value) => JSON.parse(JSON.stringify(value));

for (const zone of [
  "America/Lima",
  "America/New_York",
  "Europe/Berlin",
  "Pacific/Auckland",
])
  test(
    "hourly canonical instants and one-hour interval survive adapter roundtrip in " +
      zone,
    () => {
      const old = process.env.TZ;
      process.env.TZ = zone;
      try {
        const original = task(),
          widget = calendar.toGanttWindow(original),
          back = calendar.fromGanttWindow(widget);
        assert.equal(widget.end.getTime() - widget.start.getTime(), 3600000);
        assert.equal(
          new Date(back.schedule.start).getTime(),
          new Date(original.schedule.start).getTime(),
        );
        assert.equal(
          new Date(back.schedule.end).getTime(),
          new Date(original.schedule.end).getTime(),
        );
        assert.equal(back.schedule.precision, "hour");
        assert.equal(back.start_date, original.start_date);
      } finally {
        if (old === undefined) delete process.env.TZ;
        else process.env.TZ = old;
      }
    },
  );

for (const scale of ["day", "week", "month", "quarter", "year"])
  test(
    "moving and resizing hourly tasks retains precision and own attributes in " +
      scale,
    () => {
      const original = task(),
        row = calendar.toGanttRows([original])[0];
      const view = viewport.centeredViewport(row.start, scale, 5, 900);
      const data = new store.DataStore();
      data.init({
        _weekStart: 1,
        tasks: [row],
        links: [],
        ...view,
        scales: viewport.viewportScales(view),
        cellWidth: viewport.viewportCellWidth(view),
        cellHeight: 40,
        scaleHeight: 28,
        autoScale: false,
        start: view.start,
        end: view.end,
      });
      const state = data.getState(),
        boundary = geometry.datePosition(row.start, state);
      const pixels =
        geometry.datePosition(new Date(row.start.getTime() + 3600000), state) -
        boundary;
      const moved = snap.gestureWindow(
        row.start,
        row.end,
        boundary,
        pixels,
        state,
        "move",
        "hour",
      );
      assert.equal(moved.end.getTime() - moved.start.getTime(), 3600000);
      assert.equal(moved.start.getTime(), row.start.getTime() + 3600000);
      const endAt = geometry.datePosition(row.end, state);
      const resized = snap.gestureWindow(
        row.start,
        row.end,
        endAt,
        pixels,
        state,
        "end",
        "hour",
      );
      assert.equal(resized.end.getTime() - resized.start.getTime(), 7200000);
      assert.equal(original.parent_id, null);
      assert.equal(original.state_code, "EN_CURSO");
    },
  );

test("nullable hourly and all-day tasks never acquire fictitious endpoints", () => {
  const unbounded = task({
    due_date: null,
    schedule: { ...task().schedule, end: null },
  });
  const widget = calendar.toGanttWindow(unbounded);
  assert.equal(widget.start, undefined);
  assert.equal(widget.end, undefined);
  assert.equal(widget.duration, undefined);
  assert.equal(calendar.fromGanttWindow(widget).schedule.end, null);
  const day = task({
    schedule: {
      precision: "day",
      start: "2024-02-29",
      end: "2024-02-29",
      timezone: "America/Lima",
    },
    start_date: "2024-02-29",
    due_date: "2024-02-29",
  });
  const bounded = calendar.toGanttWindow(day);
  assert.equal(bounded.start.getDate(), 29);
  assert.equal(bounded.end.getMonth(), 2);
  assert.equal(bounded.end.getDate(), 1);
  assert.equal(calendar.fromGanttWindow(bounded).due_date, "2024-02-29");
});

test("typed dependencies keep direction independent of order and preserve informational legacy", () => {
  const first = task({ id: 1 });
  for (const type of ["FS", "SS", "FF", "SF", null]) {
    const second = task({
      id: 2,
      dependencies: [1],
      dependency_links: [
        { predecessor_id: 1, successor_id: 2, type, legacy: type === null },
      ],
    });
    const edges = query.ganttDependencies([second, first]);
    assert.equal(edges[0].predecessor.id, 1);
    assert.equal(edges[0].successor.id, 2);
    assert.equal(edges[0].type, type);
    assert.equal(query.ganttDependencies([second]).length, 0);
  }
});

test("hourly double send shares UUID and revision; explicit ambiguous retry preserves its payload", async () => {
  const intent = editing.createCalendarIntention(),
    base = task(),
    changes = {
      schedule: { ...base.schedule, end: "2026-11-10T11:00:00-05:00" },
    };
  let release;
  const wait = new Promise((resolve) => (release = resolve));
  const sent = [];
  const send = (payload) => {
    sent.push(plain(payload));
    return wait;
  };
  const a = intent.save(base, changes, send),
    b = intent.save(base, changes, send);
  assert.equal(a, b);
  await Promise.resolve();
  assert.equal(sent.length, 1);
  release();
  await a;
  const original = sent[0];
  await intent.save(base, changes, async (payload) =>
    sent.push(plain(payload)),
  );
  assert.deepEqual(sent[1], original);
  assert.equal(original.expected_calendar_revision, base.calendar_revision);
  assert.ok(original.calendar_intent_id);
  assert.equal("start_date" in original, false);
  await intent.save(base, { schedule: base.schedule }, async (payload) =>
    sent.push(plain(payload)),
  );
  assert.notEqual(sent[2].calendar_intent_id, original.calendar_intent_id);
});

test("a late old success cannot replace a newer hourly schedule or independent attributes", () => {
  const previous = task({
    calendar_revision: "9007199254741010",
    name: "Vigente",
    updated_at: "2026-11-10T15:00:00Z",
  });
  const stale = task({
    calendar_revision: "9007199254741009",
    name: "Antiguo",
    schedule: { ...task().schedule, start: "2026-11-10T08:00:00-05:00" },
    calendar_receipt: { replayed: true },
    updated_at: "2026-11-10T14:00:00Z",
  });
  const saved = reconcile.reconcileTask(previous, stale);
  assert.deepEqual(plain(saved.schedule), previous.schedule);
  assert.equal(saved.calendar_revision, previous.calendar_revision);
  assert.equal(saved.name, previous.name);
});

const scheduleTools = await api("utils/taskSchedule.ts");
test("Lima clock input is converted reversibly without assuming a permanent historical UTC offset", () => {
  for (const input of [
    "2026-11-10T09:00",
    "2024-02-29T23:00",
    "1990-02-01T09:00",
  ]) {
    const value = scheduleTools.hourSchedule(input, "");
    assert.equal(scheduleTools.scheduleInput(value.start), input);
    assert.equal(value.end, null);
  }
});
test("equivalent aware timestamps do not turn an unrelated name edit into a calendar mutation", () => {
  const base = task();
  const changed = editing.changedTaskFields(base, {
    name: "Nuevo nombre",
    schedule: {
      ...base.schedule,
      start: new Date(base.schedule.start).toISOString(),
      end: new Date(base.schedule.end).toISOString(),
    },
  });
  assert.deepEqual(plain(changed), { name: "Nuevo nombre" });
});

const transport = await api("services.ts");
test("the actual project service treats schedule as a guarded calendar edit", async () => {
  const base = task(),
    payload = {
      schedule: base.schedule,
      expected_calendar_revision: base.calendar_revision,
      calendar_intent_id: randomUUID(),
    };
  assert.throws(
    () => transport.updateTask(3, base.id, { schedule: base.schedule }),
    /revisión/,
  );
  const before = requests.length;
  await transport.updateTask(3, base.id, payload);
  assert.equal(requests.length, before + 1);
  assert.deepEqual(requests.at(-1), {
    url: `projects/3/tasks/${base.id}/`,
    method: "PATCH",
    data: payload,
  });
});

const formErrors = await api("utils/formErrors.ts");
test("nested scheduling validation stays actionable in the shared form", () => {
  const failure = new ApiError("[object Object]");
  failure.payload = {
    schedule: { schedule: ["El intervalo mínimo es una hora."] },
  };
  assert.deepEqual(
    plain(formErrors.apiFieldErrors(failure, { schedule: "task-schedule" })),
    { "task-schedule": "El intervalo mínimo es una hora." },
  );
});
