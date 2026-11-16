import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const modules = new Map();
async function load(url) {
  if (modules.has(url.href)) return modules.get(url.href);
  const code = ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ES2022 },
  }).outputText;
  const mod = new vm.SourceTextModule(code);
  modules.set(url.href, mod);
  await mod.link((name) => load(new URL(name + ".ts", url)));
  return mod;
}
const presentation = await load(
  new URL(
    "../src/features/home/utils/themePresentation.ts",
    import.meta.url,
  ),
);
await presentation.evaluate();
const state = await load(
  new URL(
    "../src/features/home/views/TaskGantt/ganttTaskState.ts",
    import.meta.url,
  ),
);
await state.evaluate();
const { themeColor, themeIcon } = presentation.namespace,
  { ganttTaskState } = state.namespace;
test("backend Tailwind theme tokens become CSS variables and stored icon names resolve in the current catalog", () => {
  assert.equal(themeColor("emerald-500"), "var(--color-emerald-500)");
  assert.equal(themeColor("sky-500"), "var(--color-sky-500)");
  assert.equal(themeColor("#1678bd"), "#1678bd");
  assert.equal(themeColor(null), undefined);
  assert.equal(themeIcon("CheckIcon"), "check");
  assert.equal(themeIcon("CircleDotIcon"), "circle-dot");
  assert.equal(themeIcon("circle-minus"), "circle-minus");
});
test("task theme overrides stale legacy colors, catalog metadata fills missing themes and legacy responses retain their real color", () => {
  const task = {
    state_code: "QA",
    state_name: "Nombre real",
    state_category: "active",
    state_color: "#ff0000",
    state_tema: { id: 9, color: "sky-500", icono: "CheckIcon" },
  };
  const snapshot = JSON.stringify(task),
    resolved = ganttTaskState(task);
  assert.equal(resolved.color, "var(--color-sky-500)");
  assert.equal(resolved.name, "Nombre real");
  assert.equal(JSON.stringify(task), snapshot);
  assert.equal(
    ganttTaskState({ ...task, state_tema: null }, [
      { code: "QA", tema: { color: "emerald-500" } },
    ]).color,
    "var(--color-emerald-500)",
  );
  assert.equal(ganttTaskState({ ...task, state_tema: null }).color, "#ff0000");
  assert.equal(
    ganttTaskState({ ...task, state_tema: null, state_color: undefined }).color,
    "#737373",
  );
});
