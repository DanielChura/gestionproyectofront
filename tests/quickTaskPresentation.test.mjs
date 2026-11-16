import { taskSyncFixture } from "./taskSyncFixture.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const syncFixture = taskSyncFixture();

async function load(path, dependencies) {
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
    const exports = {
      "../TaskSyncProvider": { default: ({ children }) => children },
      "../useTaskSync": { useTaskSync: () => syncFixture },
      "../utils/useTaskSync": { useTaskSync: () => syncFixture },
      react: React,
      "react/jsx-runtime": jsxRuntime,
      ...dependencies,
    }[name];
    assert.ok(exports, name);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports))
        this.setExport(key, value);
    });
  });
  await module.evaluate();
  return module.namespace;
}

const project = {
  id: 42,
  permissions: { manage: true, create_tasks: true },
  requirements: [],
  task_states: {
    states: [
      { code: "PENDIENTE", name: "Pendiente", category: "not_started" },
      { code: "ACTIVO", name: "Activo", category: "active" },
    ],
  },
};
let draft;
const { default: QuickRow } = await load(
  "../src/features/home/shared/QuickTaskRow.tsx",
  {
    "../views/List/hooks/useQuickTask": { useQuickTask: () => draft },
    "../views/List/hooks/useQuickTaskAlignment": { useQuickTaskAlignment() {} },
    "../../../shared/icons/CheckIcon": { default: () => null },
    "./TaskCell": {
      StateIcon: () => React.createElement("svg", { "aria-hidden": true }),
      StateLabel: ({ name }) => React.createElement("span", null, name),
    },
    "../../../shared/Tooltip": {
      default: ({ label, children }) =>
        React.createElement("span", { title: label }, children("hint")),
    },
    "./task-form/TaskOptionalProperties": {
      default: () =>
        React.createElement("span", null, "Propiedades opcionales"),
    },
    "./task-fields/taskDates": {
      taskCreationStart: () => "2026-10-21",
    },
  },
);
const renderQuick = (groupCode = "PENDIENTE") =>
  renderToStaticMarkup(
    React.createElement(QuickRow, {
      project,
      catalogs: { priorities: [] },
      groupCode,
      onClose() {},
      onCreated() {},
    }),
  );

test("inline name has no permanent frame; repeated state does not create a visual status line", () => {
  draft = {
    name: "",
    state: project.task_states.states[0],
    busy: false,
    errors: {},
    error: "",
  };
  const markup = renderQuick();
  assert.match(markup, /border-0 bg-transparent outline-none/);
  assert.match(markup, /focus-visible:outline-2/);
  assert.doesNotMatch(markup, /Estado:|Se creará en/);
  assert.match(markup, /items-center/);
  assert.ok(markup.indexOf("Cancelar") < markup.indexOf(">Guardar<"));
});

test("fallback state is explicitly named inside the row with accessible help, never another permanent paragraph", () => {
  const markup = renderQuick("ACTIVO");
  assert.match(markup, /aria-label="Se creará en Pendiente/);
  assert.match(markup, /aria-describedby="hint"/);
  assert.doesNotMatch(markup, /<p[^>]*>Estado:/);
});

test("inline errors and pending actions remain visible while preserving draft content", () => {
  draft = {
    ...draft,
    name: "Borrador conservado",
    busy: true,
    errors: { "task-name": "Nombre inválido" },
    error: "No se pudo guardar",
  };
  const markup = renderQuick();
  assert.match(markup, /value="Borrador conservado"/);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /<fieldset[^>]*disabled/);
  assert.match(markup, /role="alert">Nombre inválido/);
  assert.match(markup, /role="alert"[^>]*>No se pudo guardar/);
  assert.match(markup, /Guardando…/);
});

test("task saves announce through the shared overlay", async () => {
  const Empty = () => null;
  const notifications = [];
  const { useTaskMutations } = await load(
    "../src/features/home/hooks/useTaskMutations.ts",
    {
      react: {
        ...React,
        useCallback: (fn) => fn,
        useState: (initial) => [initial, () => {}],
      },
      "../../../hooks/useToast": {
        useToast: () => ({
          addToast(value) {
            notifications.push(value);
          },
        }),
      },
      "../../auth/api": { errorText: String },
      "../../../core/services/taskService": {
        getTaskDetail: async () => ({}),
        createTask: async (_id, payload) => ({ id: 9, name: payload.name }),
        updateTask: async () => {},
        changeTaskState: async () => {},
        changeDependency: async () => {},
        moveTask: async () => {},
      },
    },
  );
  let savedTask;
  const mutations = useTaskMutations({
    projectId: 42,
    onTaskSaved: (task) => {
      savedTask = task;
    },
  });
  await mutations.saveTask(
    { name: "Tarea confirmada", state_code: "PENDIENTE" },
    "create",
  );
  assert.equal(savedTask.id, 9);
  assert.deepEqual(notifications, [
    { icon: "success", title: "Guardado", message: "Tarea confirmada" },
  ]);
  const { Toast } = await load("../src/shared/components/Toast/Toast.tsx", {
    "../../../hooks/useToast": {
      useToast: () => ({
        removeToast() {},
        toasts: notifications.map((value, index) => ({
          ...value,
          id: String(index),
        })),
      }),
    },
    ...Object.fromEntries(
      ["AlertIcon", "ErrorIcon", "InfoIcon", "SuccessIcon", "XIcon"].map(
        (name) => ["../../icons/" + name, { default: Empty }],
      ),
    ),
  });
  const overlay = renderToStaticMarkup(React.createElement(Toast));
  assert.match(overlay, /class="fixed /);
  assert.match(overlay, /role="status"/);
  assert.match(overlay, /Guardado/);
  assert.match(overlay, /Tarea confirmada/);
});

for (const phase of ["mutation", "read"])
  test(
    "dependency reconciliation discards a previous project/session after late " +
      phase,
    async () => {
      let active = true,
        resolve,
        reads = 0,
        saved = 0,
        writes = 0;
      const pending = new Promise((done) => {
        resolve = done;
      });
      const sync = {
        ...taskSyncFixture(),
        guard() {
          if (!active) throw new Error("stale");
        },
      };
      const { useTaskMutations } = await load(
        "../src/features/home/hooks/useTaskMutations.ts",
        {
          react: {
            ...React,
            useCallback: (fn) => fn,
            useState: (value) => [value, () => {}],
          },
          "../utils/useTaskSync": { useTaskSync: () => sync },
          "../../../hooks/useToast": { useToast: () => ({ addToast() {} }) },
          "../../auth/api": { errorText: String },
          "../../../core/services/taskService": {
            async changeDependency() {
              writes++;
              if (phase === "mutation") await pending;
            },
            async getTaskDetail() {
              reads++;
              if (phase === "read") await pending;
              return { task: { id: 9 } };
            },
            createTask() {},
            updateTask() {},
            changeTaskState() {},
            moveTask() {},
          },
        },
      );
      const mutations = useTaskMutations({
        projectId: 42,
        onTaskSaved: () => {
          saved++;
        },
      });
      const operation = mutations.changeDependency(9, 8, false, "SS");
      await Promise.resolve();
      await Promise.resolve();
      active = false;
      resolve();
      await assert.rejects(operation, /stale/);
      assert.equal(writes, 1);
      assert.equal(saved, 0);
      assert.equal(reads, phase === "read" ? 1 : 0);
    },
  );
