import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";

async function load(path, dependencies = {}) {
  const compiled = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  const module = new vm.SourceTextModule(compiled);
  await module.link((name) => {
    const exports = { "react/jsx-runtime": jsxRuntime, ...dependencies }[name];
    assert.ok(exports, `Unexpected import ${name}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports))
        this.setExport(key, value);
    });
  });
  await module.evaluate();
  return module.namespace;
}
const avatar = await load("../src/shared/avatarInitials.ts");
const { stateInk } = await load(
  "../src/features/projects/TaskList/stateInk.ts",
);
const state = await load("../src/features/projects/TaskList/quickTaskState.ts");
const labelSelection = await load("../src/features/projects/labelSelection.ts");
const project = {
  id: 42,
  permissions: { manage: true, create_tasks: true },
  task_states: {
    states: [
      { code: "CUSTOM_OPEN", category: "not_started", name: "Libre" },
      { code: "CUSTOM_ACTIVE", category: "active", name: "Activo" },
      { code: "BLOQUEADA", category: "active", name: "Bloqueada" },
    ],
  },
};

test("shared session initials support single names, whitespace, accents and empty input", () => {
  for (const [name, expected] of [
    ["Daniel Antony Chura", "DA"],
    ["  Ángela   Ñúñez  ", "ÁÑ"],
    ["José", "J"],
    ["", ""],
    ["   ", ""],
  ])
    assert.equal(avatar.avatarFor(name), expected);
});

test("configured state colors keep readable text even for very light and dark choices", () => {
  const luminance = (hex) =>
    hex
      .slice(1)
      .match(/../g)
      .map((part) => parseInt(part, 16) / 255)
      .map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      )
      .reduce(
        (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
        0,
      );
  for (const color of [
    "#ffffff",
    "#ffff00",
    "#000000",
    "#2563eb",
    "#737373",
    "#ef4444",
    "#00ff00",
  ])
    assert.ok(
      (Math.max(luminance(color), luminance(stateInk(color))) + 0.05) /
        (Math.min(luminance(color), luminance(stateInk(color))) + 0.05) >=
        4.5,
    );
});

test("quick state uses configured identity, falls back without weakening required state attributes", () => {
  assert.equal(
    state.quickTaskState(project, "CUSTOM_ACTIVE", false).code,
    "CUSTOM_OPEN",
  );
  assert.equal(
    state.quickTaskState(project, "CUSTOM_ACTIVE", true).code,
    "CUSTOM_ACTIVE",
  );
  assert.equal(
    state.quickTaskState(project, "BLOQUEADA", true).code,
    "CUSTOM_OPEN",
  );
  assert.equal(
    state.quickTaskState(project, undefined, true).code,
    "CUSTOM_OPEN",
  );
  assert.equal(
    state.quickTaskState(
      { ...project, permissions: { manage: false } },
      "CUSTOM_ACTIVE",
      true,
    ).code,
    "CUSTOM_OPEN",
  );
  assert.equal(
    state.quickTaskState({ ...project, task_states: { states: [] } }),
    undefined,
  );
});

async function harness(context = project, onDetachedCreated) {
  const slots = [],
    requests = [],
    accepted = [];
  let index = 0,
    cleanup;
  const react = {
    useState(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = initial;
      return [
        slots[slot],
        (next) => {
          slots[slot] = typeof next === "function" ? next(slots[slot]) : next;
        },
      ];
    },
    useRef(initial) {
      const slot = index++;
      return (slots[slot] ??= { current: initial });
    },
    useEffect(effect) {
      cleanup ??= effect();
    },
  };
  const { useQuickTask } = await load(
    "../src/features/projects/TaskList/useQuickTask.ts",
    {
      react,
      "../useTaskCalendarEdit": {
        calendarProblem: (error) => (error.ambiguous ? "ambiguous" : null),
      },
      "../../auth/api": { errorText: (error) => error.message },
      "../formErrors": {
        apiFieldErrors: () => ({ "task-due": "Fuera del periodo" }),
      },
      "./quickTaskState": state,
      "../labelSelection": labelSelection,
      "../services": {
        createTask(id, payload) {
          return new Promise((resolve, reject) =>
            requests.push({ id, payload, resolve, reject }),
          );
        },
      },
    },
  );
  return {
    requests,
    accepted,
    render() {
      index = 0;
      return useQuickTask(
        context,
        undefined,
        (task) => accepted.push(task),
        onDetachedCreated,
      );
    },
    unmount() {
      cleanup();
    },
  };
}

test("name-only creation is trimmed, genuinely nullable and guarded against duplicate submits", async () => {
  const hook = await harness();
  assert.equal(await hook.render().save(), false);
  assert.equal(hook.requests.length, 0);
  hook.render().setName("  Solo nombre  ");
  const current = hook.render(),
    saving = current.save();
  assert.equal(await current.save(), false);
  assert.equal(hook.requests.length, 1);
  const { payload } = hook.requests[0];
  assert.equal(payload.name, "Solo nombre");
  assert.equal(payload.due_date, null);
  assert.equal(payload.priority, null);
  assert.equal(payload.responsible_ids.length, 0);
  assert.equal(payload.state_code, "CUSTOM_OPEN");
  hook.requests[0].resolve({ id: 123 });
  assert.equal(await saving, true);
  assert.equal(hook.accepted[0].id, 123);
});

test("optional choices and failed requests retain the draft and permit retry", async () => {
  const hook = await harness();
  hook.render().setName("Borrador");
  hook.render().setPriority(2);
  hook.render().setDueDate("2026-10-20");
  hook.render().setResponsible([7, 8]);
  hook
    .render()
    .setLabels([{ name: "Ensayo", kind: "specialty", specialty_id: 7 }]);
  const failed = hook.render().save();
  hook.requests[0].reject(new Error("Sin conexión"));
  assert.equal(await failed, false);
  assert.equal(hook.render().name, "Borrador");
  assert.equal(hook.render().error, "Sin conexión");
  assert.equal(hook.render().errors["task-due"], "Fuera del periodo");
  assert.equal(hook.render().busy, false);
  const retry = hook.render().save();
  assert.deepEqual(
    JSON.parse(JSON.stringify(hook.requests[1].payload.responsible_ids)),
    [7, 8],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(hook.requests[1].payload.specialty_ids)),
    [7],
  );
  hook.requests[1].resolve({ id: 1 });
  assert.equal(await retry, true);
});

test("unmounted drafts cannot start writes or deliver results into another project", async () => {
  const hook = await harness();
  hook.render().setName("Anterior");
  const saving = hook.render().save();
  hook.unmount();
  hook.requests[0].resolve({ id: 1 });
  assert.equal(await saving, false);
  assert.equal(hook.accepted.length, 0);
  assert.equal(await hook.render().save(), false);
  assert.equal(hook.requests.length, 1);
  assert.equal(hook.requests[0].id, 42);
});

test("effective creation permission is independent of edit and worker assignment stays server-owned", async () => {
  const denied = await harness({
    ...project,
    permissions: { manage: true, edit: true, create_tasks: false },
  });
  denied.render().setName("No autorizada");
  assert.equal(await denied.render().save(), false);
  assert.equal(denied.requests.length, 0);
  const worker = await harness({
    ...project,
    permissions: { manage: false, create_tasks: true },
  });
  worker.render().setName("Propia");
  const saving = worker.render().save();
  assert.equal("responsible_ids" in worker.requests[0].payload, false);
  worker.requests[0].resolve({ id: 2 });
  await saving;
});

test("an already sent request can deliver to its still-mounted List after regrouping, never to a different project", async () => {
  let listActive = true;
  const accepted = [];
  const deliver = (task) => {
    if (listActive) accepted.push(task);
  };
  const hook = await harness(project, deliver);
  hook.render().setName("Reagrupada");
  const saving = hook.render().save();
  hook.unmount();
  hook.requests[0].resolve({ id: 7 });
  assert.equal(await saving, false);
  assert.equal(accepted[0].id, 7);
  const previous = await harness(project, deliver);
  previous.render().setName("Proyecto anterior");
  const late = previous.render().save();
  previous.unmount();
  listActive = false;
  previous.requests[0].resolve({ id: 8 });
  await late;
  assert.equal(accepted.length, 1);
});

test("ambiguous quick creation retains its draft and blocks any second POST even after content changes", async () => {
  const hook = await harness();
  hook.render().setName("Borrador incierto");
  const first = hook.render().save();
  hook.requests[0].reject(
    Object.assign(new Error("Red interrumpida"), { ambiguous: true }),
  );
  await first;
  assert.equal(hook.render().uncertain, true);
  assert.equal(hook.render().name, "Borrador incierto");
  hook.render().setName("Otra edición");
  assert.equal(await hook.render().save(), false);
  assert.equal(hook.requests.length, 1);
});
