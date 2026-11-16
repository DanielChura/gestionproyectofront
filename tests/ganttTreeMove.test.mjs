import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source = ts.transpileModule(
  readFileSync(
    new URL(
      "../src/features/home/views/TaskGantt/ganttTreeMove.ts",
      import.meta.url,
    ),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.ES2022 } },
).outputText;
const module = new vm.SourceTextModule(source);
await module.link(() => {
  throw Error("Unexpected runtime dependency");
});
await module.evaluate();
const destination = module.namespace.ganttTreeDestination;
const task = (id, parent_id = null, state_category = "active") => ({
  id,
  parent_id,
  state_category,
  permissions: { edit: true },
});
const tasks = [task(1), task(2), task(3, 1), task(4, 1), task(5, 3)];
const visible = new Set(tasks.map((task) => task.id));
test("Gantt orders roots across states and sisters without changing the source", () => {
  const snapshot = JSON.stringify(tasks);
  assert.equal(
    destination(tasks, visible, tasks[0], tasks[1], "before", false).before,
    2,
  );
  assert.equal(
    destination(tasks, visible, tasks[2], tasks[3], "after", false).parent,
    1,
  );
  assert.equal(JSON.stringify(tasks), snapshot);
});
test("A nested branch moves only to a root or reorders under its existing parent", () => {
  assert.equal(
    destination(tasks, visible, tasks[2], tasks[1], "inside", false).parent,
    2,
  );
  assert.equal(
    destination(tasks, visible, tasks[0], tasks[1], "inside", false),
    null,
  );
  assert.equal(
    destination(tasks, visible, tasks[2], tasks[4], "inside", false),
    null,
  );
  assert.equal(
    destination(tasks, visible, tasks[4], tasks[0], "before", false),
    null,
  );
  assert.equal(
    destination(
      tasks,
      visible,
      tasks[2],
      { ...tasks[1], state_category: "done" },
      "inside",
      false,
    ),
    null,
  );
});
test("Filtered destinations require every authorized sibling and reject hidden positions", () => {
  assert.equal(
    destination(tasks, new Set([1, 2, 3]), tasks[2], tasks[0], "inside", true),
    null,
  );
  assert.ok(destination(tasks, visible, tasks[2], tasks[3], "before", true));
});
