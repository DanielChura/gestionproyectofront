import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const code = ts.transpileModule(readFileSync(new URL("../src/features/home/views/TaskGantt/ganttSceneGeometry.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const module = new vm.SourceTextModule(code); await module.link(() => { throw Error("Geometry must remain pure"); }); await module.evaluate();
const { ganttBarGeometry, missingGanttDates, hasGanttInterval } = module.namespace;
const task = { id: 1, parent_id: null, start_date: "2026-01-01", due_date: "2026-01-03", permissions: { dependencies: true } };
const row = { $x: 100, $w: 90, $y: 40 }, view = { scrollLeft: 0, scrollTop: 0, width: 500, height: 400, cellHeight: 40 };
test("connectors use real endpoints and never clamp to a viewport edge", () => {
  const position = ganttBarGeometry(task, row, view);
  assert.ok(position.startConnector + 12 <= position.left); assert.ok(position.endConnector - 12 >= position.right); assert.equal(position.y, 60);
  const clipped = ganttBarGeometry(task, row, { ...view, scrollLeft: 150 });
  assert.equal(clipped.startConnector, null); assert.ok(clipped.endConnector - 12 >= clipped.right);
  const outside = ganttBarGeometry(task, row, { ...view, scrollLeft: 400 });
  assert.equal(ganttBarGeometry(task, { $y: 40 }, view).real, true);
  assert.equal(outside.real, true); assert.equal(outside.startConnector, null); assert.equal(outside.endConnector, null);
});
test("missing windows and denied permissions never become connectors; completed subtasks retain authorized ports", () => {
  for (const changed of [{ ...task, start_date: null }, { ...task, due_date: null }, { ...task, permissions: { dependencies: false } }]) {
    const position = ganttBarGeometry(changed, row, view);
    assert.equal(position.startConnector, null); assert.equal(position.endConnector, null);
  }
  const child = ganttBarGeometry({ ...task, parent_id: 2, state_code: "COMPLETADA" }, row, view);
  assert.equal(child.connectable, true);
  assert.notEqual(child.startConnector, null);
  const short = ganttBarGeometry(task, { ...row, $w: 4 }, view, true);
  assert.ok(short.endConnector !== null);
  assert.ok(short.startConnector + 12 <= short.resizeStart - 12);
  assert.equal(short.moveControl, undefined);
  assert.ok(short.resizeStart + 12 <= short.resizeEnd - 12);
  assert.ok(short.resizeEnd + 12 <= short.endConnector - 12);
  assert.equal(ganttBarGeometry(task, row, { ...view, scrollTop: 300 }), null);
});
test("missing date labels distinguish all missing endpoints without inventing one", () => {
  assert.equal(missingGanttDates({ start_date: null, due_date: null }), "Definir fechas");
  assert.equal(missingGanttDates({ start_date: null, due_date: "2026-01-03" }), "Falta fecha de inicio");
  assert.equal(missingGanttDates({ start_date: "2026-01-01", due_date: null }), "Falta fecha límite");
  assert.equal(hasGanttInterval(task), true);
  assert.equal(hasGanttInterval({ ...task, start_date: "2027-01-01" }), false);
});

test("visual expansion preserves logical dates, keeps reachable controls inside the viewport and flips labels near the right edge", () => {
  for (const x of [0, 2, 150, 490]) {
    const logical = { $x: x, $w: 3, $y: 40 }, active = ganttBarGeometry(task, logical, view, true);
    assert.equal(active.left, x); assert.equal(active.right, x + 3);
    assert.equal(active.expanded, true); assert.ok(active.displayLeft <= x); assert.ok(active.displayRight >= x + 3);
    if (active.startConnector !== null) assert.ok(active.startConnector >= 12);
    if (active.endConnector !== null) assert.ok(active.endConnector <= view.width - 12);
    if (active.resizeStart !== null && active.resizeEnd !== null) assert.ok(active.resizeStart + 24 <= active.resizeEnd);
    assert.ok(active.resizeStart !== null || active.resizeEnd !== null);
    if (x > 400) { assert.equal(active.labelSide, "before"); assert.ok(active.labelRight <= active.displayLeft - 24); }
  }
  const wide = ganttBarGeometry(task, row, view, true);
  assert.equal(wide.expanded, false); assert.equal(wide.displayLeft, row.$x); assert.equal(wide.displayRight, row.$x + row.$w);
  const clipped = ganttBarGeometry(task, { ...row, $x: -10, $w: 15 }, view, true);
  assert.equal(clipped.expanded, false); assert.equal(clipped.startConnector, null);
});
