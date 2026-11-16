import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(
  readFileSync(
    new URL(
      "../src/features/home/views/TaskGantt/ganttProjectSummary.ts",
      import.meta.url,
    ),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.ES2022 } },
).outputText;
const module = new vm.SourceTextModule(source);
await module.link(() => {
  throw Error("Summary is local presentation");
});
await module.evaluate();
const summary = module.namespace.ganttProjectSummary;
const project = {
  start_date: "2026-01-01",
  end_date: "2026-12-31",
  task_states: { states: [{ code: "CUSTOM", category: "done" }] },
};
test("official summary counts authorized parents and children by category, without modifying tasks", () => {
  const tasks = [
    {
      id: 1,
      parent_id: null,
      state_code: "CUSTOM",
      start_date: "2026-02-01",
      due_date: null,
    },
    {
      id: 2,
      parent_id: 1,
      state_category: "active",
      start_date: "2026-03-01",
      due_date: "2026-04-01",
    },
  ];
  const before = JSON.stringify(tasks),
    result = summary(project, tasks);
  assert.equal(result.percent, 50);
  assert.equal(result.start, project.start_date);
  assert.equal(result.end, project.end_date);
  assert.equal(JSON.stringify(tasks), before);
});
test("empty, nullable and inverted ranges never create a fictional interval", () => {
  assert.equal(summary(project, []).percent, null);
  const missing = { ...project, start_date: null, end_date: null };
  assert.equal(summary(missing, []).reliable, false);
  const tasks = [{ start_date: "2026-01-01", due_date: null }];
  assert.equal(summary(missing, tasks).reliable, false);
  assert.equal(
    summary({ ...project, start_date: "2027-01-01" }, tasks).reliable,
    false,
  );
  assert.equal(
    summary(missing, [{ ...tasks[0], due_date: "2026-04-01" }]).reliable,
    true,
  );
});
