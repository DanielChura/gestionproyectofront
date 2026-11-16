import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
async function load(file, dependencies = {}) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const module = new vm.SourceTextModule(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ES2022 },
    }).outputText,
  );
  await module.link((name) => dependencies[name]);
  await module.evaluate();
  return module;
}
const dates = await load("../src/features/home/utils/calendarDate.ts");
const { projectCreationValidation: validate } = (
  await load(
    "../src/features/home/shared/project-create/projectCreationValidation.ts",
    { "../../utils/calendarDate": dates },
  )
).namespace;
const catalogs = {
  areas: [{ id: 3, name: "Área activa QA" }],
  creation_date: "2026-11-07",
};
const draft = {
  name: "Proyecto QA",
  description: "",
  endDate: "",
  areaIds: [3],
  mode: "available",
  workerIds: [],
  teamIds: [],
  participantSource: "workers",
  workerContribute: false,
};
test("optional end and available mode do not require participants or invent a date", () => {
  const copy = structuredClone(draft);
  assert.deepEqual(Object.keys(validate(draft, catalogs, 2)), []);
  assert.deepEqual(draft, copy);
});
test("name and a single active catalog area are required", () => {
  assert.ok(validate({ ...draft, name: "  " }, catalogs, 1).name);
  for (const areaIds of [[], [3, 4], [99]])
    assert.ok(validate({ ...draft, areaIds }, catalogs, 1).area_ids);
});
test("calendar validation accepts a coherent leap day and rejects impossible or earlier dates", () => {
  assert.deepEqual(
    Object.keys(validate({ ...draft, endDate: "2028-02-29" }, catalogs, 1)),
    [],
  );
  for (const endDate of ["2026-02-29", "2026-11-06", "not-a-date"])
    assert.ok(validate({ ...draft, endDate }, catalogs, 1).end_date);
});
test("only the selected participant source satisfies the assigned-mode final step", () => {
  assert.deepEqual(
    Object.keys(validate({ ...draft, mode: "assigned" }, catalogs, 1)),
    [],
  );
  assert.ok(validate({ ...draft, mode: "assigned" }, catalogs, 2).worker_ids);
  assert.ok(
    validate(
      {
        ...draft,
        mode: "assigned",
        participantSource: "teams",
        workerIds: [7],
      },
      catalogs,
      2,
    ).worker_ids,
  );
  assert.deepEqual(
    Object.keys(
      validate(
        {
          ...draft,
          mode: "assigned",
          participantSource: "teams",
          teamIds: [5],
        },
        catalogs,
        2,
      ),
    ),
    [],
  );
});
