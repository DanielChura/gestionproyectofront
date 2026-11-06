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
  "../src/features/projects/TaskList/QuickTaskRow.tsx",
  {
    "./useQuickTask": { useQuickTask: () => draft },
    "./useQuickTaskAlignment": { useQuickTaskAlignment() {} },
    "./TaskCell": {
      StateIcon: () => React.createElement("svg", { "aria-hidden": true }),
      StateLabel: ({ name }) => React.createElement("span", null, name),
    },
    "../../../shared/Tooltip": {
      default: ({ label, children }) =>
        React.createElement("span", { title: label }, children("hint")),
    },
    "../TaskForm/TaskOptionalProperties": {
      default: () =>
        React.createElement("span", null, "Propiedades opcionales"),
    },
    "../TaskForm/taskDates": { taskCreationStart: () => "2026-10-21" },
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
  assert.match(markup, /border-0 border-b-2 border-transparent bg-transparent/);
  assert.match(markup, /focus-visible:border-neutral-700/);
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

test("Workspace saves announce through the shared overlay and refresh failures remain retryable alerts", async () => {
  const Empty = () => null;
  const effects = [],
    notifications = [];
  let slot = 0,
    refreshError = "",
    list;
  const { default: Workspace } = await load(
    "../src/features/projects/ProjectWorkspace/ProjectWorkspace.tsx",
    {
      react: {
        ...React,
        useEffect(effect) {
          effects.push(effect);
        },
        useState(initial) {
          const index = slot++;
          return React.useState(
            index === 0
              ? project
              : index === 1
                ? []
                : index === 4
                  ? false
                  : index === 8
                    ? refreshError
                    : initial,
          );
        },
      },
      "react-router": {
        useSearchParams: () => [new URLSearchParams("vista=lista")],
        Link: Empty,
      },
      "../../auth/api": { errorText: String },
      "../services": Object.fromEntries(
        [
          "changeDependency",
          "changeTaskState",
          "createTask",
          "getProject",
          "getTasks",
          "updateTask",
        ].map((name) => [name, async () => {}]),
      ),
      "../DependencyForm/DependencyForm": { default: Empty },
      "../LabelList/LabelList": { default: Empty },
      "../Modal/Modal": { default: Empty },
      "../TaskForm/TaskForm": { default: Empty },
      "../TaskList/TaskList": {
        default: (props) => {
          list = props;
          return null;
        },
      },
      "../TaskGantt/TaskGanttEntry": { default: Empty },
      "../TaskBoard/TaskBoard": { default: Empty },
      "../../../hooks/useToast": {
        useToast: () => ({
          addToast(value) {
            notifications.push(value);
          },
        }),
      },
      "../TaskList/TaskGroupingControl": { default: Empty },
      "../TaskList/TaskGroupExpansionControl": { default: Empty },
      "../TaskList/TaskSearch": { default: Empty },
      "../TaskList/TaskStatusSettingsControl": { default: Empty },
      "../TaskList/taskHierarchy": {
        taskHierarchy: () => ({ visible: new Set() }),
      },
      "../TaskStateForm/TaskStateForm": { default: Empty },
      "./ProjectHeader": { default: Empty },
      "../taskAssignees": { taskAssignees: () => [] },
      "./ProjectToolbar": { default: Empty },
      "../../../shared/icons/PlusIcon": { default: Empty },
      "../TaskStatusConfiguration/TaskStatusConfiguration": { default: Empty },
      "../TaskDetail/TaskDetailDialog": { default: Empty },
      "../TaskDetail/useTaskDetail": {
        useTaskDetailNavigation: () => ({
          target: null,
          openTaskDetail() {},
          closeTaskDetail() {},
        }),
      },
      "../taskCollection": await load(
        "../src/features/projects/taskCollection.ts",
      ),
    },
  );
  const render = () => {
    slot = 0;
    effects.length = 0;
    return renderToStaticMarkup(
      React.createElement(Workspace, {
        projectId: 42,
        catalogs: { priorities: [] },
      }),
    );
  };
  const markup = render();
  const unmount = effects[0]();
  list.onCreated({ id: 9, name: "Tarea confirmada" });
  assert.deepEqual(notifications, [
    { icon: "success", title: "Guardado", message: "Tarea confirmada" },
  ]);
  assert.doesNotMatch(markup, /Guardado:|role="status"[^>]*>Guardado/);
  const { Toast } = await load("../src/shared/Toast/Toast.tsx", {
    "../../hooks/useToast": {
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
        (name) => ["../icons/" + name, { default: Empty }],
      ),
    ),
  });
  const overlay = renderToStaticMarkup(React.createElement(Toast));
  assert.match(overlay, /class="fixed /);
  assert.match(overlay, /role="status"/);
  assert.match(overlay, /Guardado/);
  assert.match(overlay, /Tarea confirmada/);
  unmount();
  list.onCreated({ id: 10, name: "Respuesta tardía" });
  assert.equal(notifications.length, 1);
  refreshError = "No se pudo actualizar la lista";
  const failed = render();
  assert.match(
    failed,
    /role="alert"[^>]*><span>No se pudo actualizar la lista<\/span>/,
  );
  assert.match(failed, /Actualizar lista/);
});
