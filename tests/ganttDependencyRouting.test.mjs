import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as vendor from "@svar-ui/gantt-store";
const cache = new Map();
async function load(url) {
  if (cache.has(url.href)) return cache.get(url.href);
  const source = ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = new vm.SourceTextModule(source);
  cache.set(url.href, module);
  await module.link((name) =>
    name === "@svar-ui/gantt-store"
      ? new vm.SyntheticModule(Object.keys(vendor), function () {
          for (const [key, value] of Object.entries(vendor))
            this.setExport(key, value);
        })
      : load(new URL(name + ".ts", url)),
  );
  return module;
}
async function ns(name) {
  const module = await load(
    new URL(
      "../src/features/home/views/TaskGantt/" + name + ".ts",
      import.meta.url,
    ),
  );
  if (module.status === "linked") await module.evaluate();
  return module.namespace;
}
const { routeGanttDependencies, crossesObstacle } = await ns(
  "ganttDependencyRouting",
);
const viewport = await ns("ganttViewport"),
  geometry = await ns("ganttGeometry"),
  { ganttBarGeometry } = await ns("ganttSceneGeometry");
function row(id, left, right, y, label = right + 40) {
  return {
    task: { id, name: "Tarea " + id },
    geometry: { real: true, left, right, y, labelLeft: label },
  };
}
function edge(a, b, type) {
  return {
    id: a + ":" + b,
    predecessor: { id: a, name: "T" + a },
    successor: { id: b, name: "T" + b },
    type,
  };
}
function inspect(result, expected) {
  assert.equal(result.unrouted, 0);
  assert.equal(result.routes.length, expected);
  for (const route of result.routes) {
    assert.ok(route.path.includes("L"));
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1],
        b = route.points[i];
      assert.ok(a.x === b.x || a.y === b.y, "only orthogonal segments");
      if (i === 1 || i === route.points.length - 1) continue;
      for (const r of result.obstacles)
        assert.equal(
          crossesObstacle(a, b, r),
          false,
          JSON.stringify({ a, b, r }),
        );
    }
  }
}
for (const type of ["FS", "SS", "FF", "SF"])
  for (const reverse of [false, true])
    test(`${type} routes true endpoints in either row order around bars and labels`, () => {
      const rows = [
        row(1, 200, 290, 20),
        row(2, 100, 330, 60),
        row(3, 170, 250, 100),
        row(4, 80, 210, 140),
      ];
      const relation = reverse ? edge(4, 1, type) : edge(1, 4, type);
      const result = routeGanttDependencies(rows, [relation], 800, 180);
      inspect(result, 1);
      const route = result.routes[0],
        source = rows.find(
          (row) => row.task.id === relation.predecessor.id,
        ).geometry,
        target = rows.find(
          (row) => row.task.id === relation.successor.id,
        ).geometry;
      assert.equal(
        route.points[0].x,
        type[0] === "F" ? source.right : source.left,
      );
      assert.equal(
        route.points.at(-1).x,
        type[1] === "F" ? target.right : target.left,
      );
    });
test("one-to-many and many-to-one keep individual paths, arrow lanes, stable IDs and deterministic obstacle routing", () => {
  const rows = Array.from({ length: 9 }, (_, i) =>
    row(i + 1, 170 + i * 10, 290 + i * 10, i * 40 + 20),
  );
  const edges = [
    edge(1, 3, "FS"),
    edge(1, 4, "FS"),
    edge(1, 5, "FS"),
    edge(3, 8, "FS"),
    edge(4, 8, "FS"),
    edge(5, 8, "FS"),
  ];
  const result = routeGanttDependencies(rows, edges, 900, 380);
  inspect(result, edges.length);
  assert.equal(new Set(result.routes.map((r) => r.path)).size, edges.length);
  const endings = result.routes
    .filter((r) => r.edge.successor.id === 8)
    .map((r) => r.points.at(-1).y);
  assert.equal(new Set(endings).size, 3);
  assert.deepEqual(
    result,
    routeGanttDependencies(rows, [...edges].reverse(), 900, 380),
  );
  assert.ok(result.nodes < 20000);
});
test("hidden rows and offscreen endpoints do not invent edges, alter the graph, or affect viewport cost", () => {
  const rows = [
    row(1, -500, -200, 20),
    row(2, 200, 300, 60),
    row(3, 350, 450, 100),
  ];
  const edges = [edge(1, 2, "FS"), edge(2, 3, "FS"), edge(2, 99, "SS")],
    before = JSON.stringify(edges);
  const result = routeGanttDependencies(rows, edges, 900, 160);
  inspect(result, 2);
  assert.equal(
    result.routes.find((route) => route.edge.id === "1:2").points[0].x,
    -200,
  );
  assert.equal(
    result.routes.some((route) => route.edge.id === "2:99"),
    false,
  );
  assert.equal(JSON.stringify(edges), before);
  assert.equal(result.routes[1].edge.id, "2:3");
});
for (const scale of ["day", "week", "month", "quarter", "year"])
  for (let level = 1; level <= 9; level++)
    test(`real MIT ${scale} zoom ${level}: node, bar and arrow coordinates share the calendar geometry`, () => {
      const anchor = new Date(2026, 10, 16, 12),
        store = new vendor.DataStore(),
        view = viewport.centeredViewport(anchor, scale, level, 1000);
      store.init({
        tasks: [],
        links: [],
        columns: [{ id: "text" }],
        durationUnit: "day",
        lengthUnit: "day",
        inclusiveEnd: true,
        autoScale: false,
        cellHeight: 40,
        scaleHeight: 28,
        _weekStart: 1,
        ...view,
        scales: viewport.viewportScales(view),
        cellWidth: viewport.viewportCellWidth(view),
      });
      const state = store.getState(),
        scrollLeft = geometry.datePosition(anchor, state) - 500;
      const rows = [0, 1].map((i) => {
        const start = new Date(2026, 10, 16, 9 + i * 2),
          end = new Date(2026, 10, 16, 10 + i * 2);
        const task = {
          id: i + 1,
          name: "Hora " + i,
          parent_id: null,
          permissions: { dependencies: true },
          start_date: "2026-11-16",
          due_date: "2026-11-16",
          schedule: {
            precision: "hour",
            start: start.toISOString(),
            end: end.toISOString(),
          },
        };
        const x = geometry.datePosition(start, state),
          width = geometry.datePosition(end, state) - x;
        return {
          task,
          geometry: ganttBarGeometry(
            task,
            { $x: x, $w: width, $y: i * 40 },
            {
              scrollLeft,
              scrollTop: 0,
              width: 1000,
              height: 200,
              cellHeight: 40,
            },
          ),
        };
      });
      for (const type of ["FS", "SS", "FF", "SF"]) {
        const result = routeGanttDependencies(
          rows,
          [edge(1, 2, type)],
          1000,
          200,
        );
        inspect(result, 1);
        const route = result.routes[0];
        assert.equal(
          route.points[0].x,
          type[0] === "F" ? rows[0].geometry.right : rows[0].geometry.left,
        );
        assert.equal(
          route.points.at(-1).x,
          type[1] === "F" ? rows[1].geometry.right : rows[1].geometry.left,
        );
        assert.ok(
          rows.every(
            (row) =>
              row.geometry.startConnector !== null &&
              row.geometry.endConnector !== null,
          ),
        );
      }
    });
test("a label placed before a right-edge bar leaves the incoming endpoint reachable", () => {
  const rows = [
    row(1, 503.14, 588.86, 20, 616.86),
    row(2, 646, 731.71, 60, 298),
  ];
  rows[1].geometry.labelSide = "before";
  rows[1].geometry.labelRight = 618;
  const relation = edge(1, 2, "FS"),
    before = JSON.stringify(relation);
  const result = routeGanttDependencies(rows, [relation], 834, 200);
  inspect(result, 1);
  assert.equal(result.routes[0].points[0].x, rows[0].geometry.right);
  assert.equal(result.routes[0].points.at(-1).x, rows[1].geometry.left);
  assert.equal(JSON.stringify(relation), before);
  assert.ok(
    result.obstacles.some(
      (obstacle) => obstacle.left === 293 && obstacle.right === 623,
    ),
  );
});

test("compact labels leave room for every port in a fan-out without hiding confirmed links", () => {
  const rows = Array.from({ length: 8 }, (_, index) =>
    row(
      index + 1,
      160 + index * 10,
      250 + index * 10,
      index * 40 + 20,
      278 + index * 10,
    ),
  );
  const relations = rows
    .slice(1)
    .map((target) => edge(1, target.task.id, "FS"));
  const result = routeGanttDependencies(rows, relations, 900, 360);
  inspect(result, relations.length);
  assert.equal(
    new Set(result.routes.map((route) => route.edge.id)).size,
    relations.length,
  );
});
