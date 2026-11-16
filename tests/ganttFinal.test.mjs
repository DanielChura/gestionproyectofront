import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as Store from "@svar-ui/gantt-store";
const modules = new Map();
async function load(url) {
  if (modules.has(url.href)) return modules.get(url.href);
  const code = ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const m = new vm.SourceTextModule(code);
  modules.set(url.href, m);
  await m.link((name) =>
    name === "@svar-ui/gantt-store"
      ? new vm.SyntheticModule(Object.keys(Store), function () {
          for (const [k, v] of Object.entries(Store)) this.setExport(k, v);
        })
      : load(new URL(name + ".ts", url)),
  );
  return m;
}
async function namespace(name) {
  const m = await load(
    new URL(
      "../src/features/home/views/TaskGantt/" + name + ".ts",
      import.meta.url,
    ),
  );
  if (m.status === "linked") await m.evaluate();
  return m.namespace;
}
const viewport = await namespace("ganttViewport"),
  geometry = await namespace("ganttGeometry"),
  snap = await namespace("ganttCalendarSnap");
const key = (d) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
function state(scale, zone = "America/Lima") {
  process.env.TZ = zone;
  const view = viewport.centeredViewport(
      viewport.ganttDay("2024-02-29"),
      scale,
    ),
    store = new Store.DataStore();
  store.init({
    ...view,
    tasks: [],
    links: [],
    columns: [],
    durationUnit: "day",
    lengthUnit: "day",
    cellHeight: 40,
    scaleHeight: 28,
    _weekStart: 1,
    autoScale: false,
    cellWidth: viewport.viewportCellWidth(view),
    scales: viewport.viewportScales(view),
  });
  return store.getState();
}
test("five scale compositions keep stable ISO identity and hour labels are only visual", () => {
  const expected = {
    year: ["year", "quarter"],
    quarter: ["quarter", "month"],
    month: ["month", "week"],
    week: ["week", "day"],
    day: ["day", "hour"],
  };
  for (const [unit, rows] of Object.entries(expected))
    assert.deepEqual(
      Array.from(
        viewport.viewportScales(
          viewport.centeredViewport(viewport.ganttDay("2026-12-31"), unit),
        ),
        (r) => r.unit,
      ),
      rows,
    );
  assert.match(geometry.isoWeekLabel(new Date(2021, 0, 1)), /2020 · S53/);
  assert.match(geometry.isoWeekLabel(new Date(2020, 11, 31)), /2020 · S53/);
});
test("coordinate conversion is reversible at calendar boundaries across all five layouts and DST zones", () => {
  const original = process.env.TZ;
  try {
    for (const zone of [
      "America/Lima",
      "America/New_York",
      "Europe/Berlin",
      "Pacific/Auckland",
    ]) {
      for (const unit of ["year", "quarter", "month", "week", "day"]) {
        const s = state(unit, zone);
        for (const date of [
          "2024-02-29",
          "2024-03-01",
          "2024-03-10",
          "2024-11-03",
          "2025-01-01",
        ]) {
          const x = geometry.datePosition(viewport.ganttDay(date), s);
          assert.equal(
            key(geometry.positionDate(x + 0.001, s)),
            date,
            zone + " " + unit + " " + date,
          );
        }
      }
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
test("resize snaps the edited endpoint while preserving its opposite; inverse ranges reject", () => {
  const expected = {
    year: ["2024-02-29", "2024-02-29"],
    quarter: ["2024-02-29", "2024-02-29"],
    month: ["2024-02-29", "2024-02-29"],
    week: ["2024-02-29", "2024-02-29"],
    day: ["2024-02-29", "2024-02-29"],
  };
  for (const [unit, pair] of Object.entries(expected)) {
    const s = state(unit),
      date = viewport.ganttDay("2024-02-29");
    assert.equal(key(snap.snapBoundary(date, s)), pair[0]);
    assert.equal(
      key(viewport.shiftGanttDay(snap.snapBoundary(date, s, true), -1)),
      pair[1],
    );
    const start = viewport.ganttDay("2024-02-29"),
      end = viewport.ganttDay("2024-03-15");
    const edit = snap.gestureWindow(
      start,
      end,
      geometry.datePosition(start, s),
      -20,
      s,
      "start",
    );
    assert.equal(edit.end, end);
    const editEnd = snap.gestureWindow(
      start,
      end,
      geometry.datePosition(end, s),
      40,
      s,
      "end",
    );
    assert.equal(editEnd.start, start);
    assert.equal(
      snap.gestureWindow(
        start,
        end,
        geometry.datePosition(start, s),
        geometry.datePosition(viewport.ganttDay("2028-01-01"), s),
        s,
        "start",
      ),
      null,
    );
  }
});
test("programming normalizes reverse gestures with hourly Day precision and calendar-day macro precision", () => {
  for (const unit of ["year", "quarter", "month", "week", "day"]) {
    const s = state(unit);
    const a = geometry.datePosition(viewport.ganttDay("2024-02-29"), s),
      b = geometry.datePosition(viewport.ganttDay("2024-03-03"), s);
    const forward = JSON.parse(JSON.stringify(snap.programRange(a, b, s))),
      back = JSON.parse(JSON.stringify(snap.programRange(b, a, s)));
    assert.deepEqual(forward, back);
    const same = snap.programRange(a, a, s);
    if (unit === "day") {
      assert.equal(forward.schedule.precision, "hour");
      assert.ok(Date.parse(forward.schedule.end) > Date.parse(forward.schedule.start));
      assert.equal(Date.parse(same.schedule.end) - Date.parse(same.schedule.start), 3600000);
    } else {
      assert.ok(forward.start_date <= forward.due_date);
      assert.equal(same.start_date, same.due_date);
      assert.equal(same.start_date, "2024-02-29");
    }
  }
});

test("dependency hit targets never overlap resize handles or invent clipped endpoints", async () => {
  const { ganttBarGeometry } = await namespace("ganttSceneGeometry");
  const task = {
      start_date: "2026-11-01",
      due_date: "2026-11-05",
      parent_id: null,
      permissions: { dependencies: true },
    },
    view = {
      scrollLeft: 0,
      scrollTop: 0,
      width: 500,
      height: 400,
      cellHeight: 40,
    };
  const bar = ganttBarGeometry(task, { $x: 100, $w: 100, $y: 0 }, view);
  assert.ok(bar.startConnector + 12 <= bar.left);
  assert.ok(bar.endConnector - 12 >= bar.right);
  const clipped = ganttBarGeometry(task, { $x: -50, $w: 150, $y: 0 }, view);
  assert.equal(clipped.startConnector, null);
  assert.ok(clipped.endConnector > clipped.right);
  const missing = ganttBarGeometry(
    { ...task, due_date: null },
    { $x: 100, $w: 100, $y: 0 },
    view,
  );
  assert.equal(missing.startConnector, null);
  assert.equal(missing.endConnector, null);
});
