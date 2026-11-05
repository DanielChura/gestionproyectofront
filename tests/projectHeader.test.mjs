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

async function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = new vm.SourceTextModule(compiled);
  await module.link((name) => {
    const exports = { "../TaskSyncProvider": { default: ({ children }) => children }, "../useTaskSync": { useTaskSync: () => syncFixture }, react: React, "react/jsx-runtime": jsxRuntime, ...dependencies }[name];
    assert.ok(exports, `Unexpected import: ${name}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    });
  });
  await module.evaluate();
  return module.namespace;
}

const hierarchy = await load("../src/features/projects/TaskList/taskHierarchy.ts");
const assignees = await load("../src/features/projects/taskAssignees.ts");
const grouping = await load("../src/features/projects/TaskList/taskGrouping.ts", { "../taskAssignees": assignees });
const groupingHook = await load("../src/features/projects/TaskList/useTaskGrouping.ts", { "./taskGrouping": grouping, "./taskHierarchy": hierarchy });
const Icon = ({ name }) => React.createElement("svg", { "data-icon": name, "aria-hidden": true });
const Toolbar = ({ children, action }) => React.createElement("div", { "aria-label": "Herramientas del proyecto" }, children, action);
const expansion = await load("../src/features/projects/TaskList/TaskGroupExpansionControl.tsx", {
  "../../../shared/icons/ChevronDownIcon": { default: Icon },
});
let favoriteState = {};
const { default: ProjectHeader } = await load("../src/features/projects/ProjectWorkspace/ProjectHeader.tsx", {
  "react-router": { Link: ({ to, children, ...props }) => React.createElement("a", { href: to, ...props }, children) },
  "../../../routes": { projectPath: (id) => `/proyectos/${id}` },
  "../../../shared/icons/FolderIcon": { default: Icon },
  "../../../shared/icons/BuildingIcon": { default: Icon },
  "../../../shared/icons/ChevronRightIcon": { default: Icon },
  "../../../shared/icons/StarIcon": { default: Icon },
  "../../../shared/icons/CalendarIcon": { default: Icon },
  "../../../shared/icons/ActivityIcon": { default: Icon },
  "../../../shared/icons/FileIcon": { default: Icon },
  "../../../shared/icons/StackIcon": { default: Icon },
  "../TaskList/taskHierarchy": hierarchy,
  "../useProjectFavorite": { useProjectFavorite: (_id, initial) => ({ favorite: initial, pending: false, error: "", toggle() {}, ...favoriteState }) },
});
const { default: TaskList } = await load("../src/features/projects/TaskList/TaskList.tsx", {
  "./QuickTaskRow": { default: () => null },
  "./stateInk": { stateInk: () => "#000000" },
  "./TaskCell": { default: () => null, StateIcon: Icon, StateBadge: Icon, StateLabel: ({ name }) => React.createElement("span", null, name) },
  "./taskDragSurface": await load("../src/features/projects/TaskList/taskDragSurface.ts"),
  "../../../shared/icons/ChevronDownIcon": { default: Icon },
  "../../../shared/icons/PlusIcon": { default: Icon },
  "../../../shared/icons/RelationIcon": { default: Icon },
  "./useTaskPointerDrag": { useTaskPointerDrag: () => ({ onPointerDown() {}, onClickCapture() {}, onDragStart() {} }) },
  "./taskHierarchy": hierarchy,
  "./useTaskGrouping": groupingHook,
  "./TaskGroupingControl": { default: () => React.createElement("button", null, "Agrupar por: Estado") },
  "./TaskGroupExpansionControl": expansion,
  "./TaskStatusSettingsControl": { default: () => null },
  "./TaskGroupLabel": { default: ({ group }) => React.createElement("span", null, group.name) },
  "../ProjectWorkspace/ProjectToolbar": { default: Toolbar },
  "./TaskSearch": { default: () => React.createElement("button", { "aria-label": "Buscar tareas" }) },
  "./useTaskMove": { useTaskMove: () => ({ permitted: () => false }) },
  "../TaskStateForm/TaskStateForm": { default: () => null },
  "../Modal/Modal": { default: () => null },
  "./taskListInteractions.css": {},
  "./taskDropPosition": { taskDropPosition() {} },
});
const project = (changes = {}) => ({
  id: 42, name: "Proyecto sintético", areas: [{ id: 7, name: "Sistemas y Software" }],
  start_date: "2026-10-07", end_date: "2026-12-07", is_favorite: false,
  permissions: { manage: true, create_tasks: true },
  task_states: { states: [{ code: "PENDIENTE", name: "Pendiente" }, { code: "EN_CURSO", name: "En curso" }] },
  ...changes,
});
function header(view = "lista", changes = {}, props = {}) {
  return renderToStaticMarkup(React.createElement(ProjectHeader, { project: project(changes), view, busy: false, taskCount: 2, onCreateTask() {}, ...props }));
}

test("favorite is after the last breadcrumb level in every existing view", () => {
  for (const [key, label] of [["lista", "Lista"], ["tablero", "Tablero"], ["gantt", "Gantt"]]) {
    const markup = header(key);
    const breadcrumb = markup.match(/<nav aria-label="Ruta de navegación"[\s\S]*?<\/nav>/)[0];
    assert.match(breadcrumb, new RegExp(`aria-current="page"[^>]*>[\\s\\S]*?${label}<\\/li>`));
    assert.ok(breadcrumb.indexOf('aria-current="page"') < breadcrumb.indexOf('aria-pressed="false"'));
    assert.match(breadcrumb, /<button[^>]*aria-pressed="false"[\s\S]*?<\/button><\/li><\/ol><\/nav>$/);
    assert.equal((markup.match(/<h1\b/g) ?? []).length, 1);
    assert.match(breadcrumb, /href="\/proyectos\/42"/);
    assert.doesNotMatch(breadcrumb, /href="[^"]*area/);
  }
});

test("long names remain complete in titles while the current view and favorite do not shrink", () => {
  const name = "Proyecto con nombre muy largo ".repeat(6).trim();
  const markup = header("gantt", { name });
  assert.ok(markup.includes(`title="${name}"`));
  assert.match(markup, /aria-current="page" class="flex shrink-0/);
  assert.match(markup, /class="shrink-0"><button/);
});

test("dates preserve date-only values and missing dates are never invented", () => {
  assert.match(header(), /<time dateTime="2026-10-07"/);
  assert.match(header(), /<time dateTime="2026-12-07"/);
  const missing = header("lista", { start_date: null, end_date: null });
  assert.match(missing, /Sin fecha de inicio/);
  assert.match(missing, /Sin fecha de fin/);
  assert.doesNotMatch(missing, /<time/);
  assert.match(missing, /data-task-count="true"[^>]*>2 tareas<\/span>/);
});

test("shared title and period precede breadcrumbs; primary action is no longer duplicated in Header", () => {
  for (const view of ["lista", "tablero", "gantt"]) {
    const markup = header(view);
    assert.ok(markup.indexOf("<h1") < markup.indexOf('aria-label="Ruta de navegación"'));
    assert.equal((markup.match(/aria-label="Periodo del proyecto"/g) ?? []).length, 1);
    assert.doesNotMatch(markup, /Crear nueva tarea/);
  }
});

test("favorite pressed, pending and error semantics remain available", () => {
  favoriteState = { pending: true, error: "Error sintético" };
  try {
    const markup = header("lista", { is_favorite: true });
    assert.match(markup, /aria-label="Quitar proyecto de favoritos"/);
    assert.match(markup, /aria-pressed="true" aria-busy="true" disabled=""/);
    assert.match(markup, /role="alert"[^>]*>No se pudo actualizar el favorito. Error sintético/);
  } finally {
    favoriteState = {};
  }
});

test("List has no duplicate primary action and preserves contextual creation permissions", () => {
  const render = (permissions) => renderToStaticMarkup(React.createElement(TaskList, {
    project: project({ permissions }), tasks: ["PENDIENTE", "EN_CURSO"].map((state_code, id) => ({
      id, parent_id: null, name: `Tarea ${id}`, state_code, state_name: state_code, labels: [],
      responsible_id: null, responsible_name: null, permissions: {},
    })), catalogs: { priorities: [] }, search: "", preferences: { mode: "state", order: "asc", separatePeople: false, separateLabels: false }, onAction() {}, onCreated() {}, onPatch() {}, onState() {},
  }));
  const admin = render({ manage: true, create_tasks: true });
  assert.doesNotMatch(admin, /\+ Tarea/);
  assert.equal((admin.match(/Añadir tarea/g) ?? []).length, 2);
  assert.doesNotMatch(admin, /aria-label="Buscar tareas"/);
  assert.equal((render({ manage: false, create_tasks: true }).match(/Añadir tarea/g) ?? []).length, 1);
  assert.doesNotMatch(render({ manage: false, create_tasks: false }), /Añadir tarea/);
});

test("empty List renders configured states through Workspace without extra states, requests or permission changes", async () => {
  let hookIndex = 0, view = "lista", requests = 0;
  let permissions = { manage: true, create_tasks: true };
  const currentProject = () => project({ permissions, requirements: [], task_states: {
    states: [{ code: "PENDIENTE", name: "Por hacer" }, { code: "EN_CURSO", name: "En marcha" }],
    available_states: [{ code: "PENDIENTE", name: "Pendiente general" }, { code: "EN_CURSO", name: "En curso general" }, { code: "BLOQUEADA", name: "No configurado" }],
  } });
  const request = async () => { requests++; };
  const Empty = () => null;
  const { default: Workspace } = await load("../src/features/projects/ProjectWorkspace/ProjectWorkspace.tsx", {
    react: { ...React, useState(initial) {
      const index = hookIndex++;
      return React.useState(index === 0 ? currentProject() : index === 4 ? false : index === 11 ? { expanded: true, disabled: false, controls: "", toggle() {} } : initial);
    } },
    "react-router": { useSearchParams: () => [new URLSearchParams(`vista=${view}`)], Link: ({ to, children }) => React.createElement("a", { href: to }, children) },
    "../../auth/api": { errorText: String },
    "../services": { changeDependency: request, changeTaskState: request, createTask: request, getProject: request, getTasks: request, updateTask: request },
    "../DependencyForm/DependencyForm": { default: Empty },
    "../LabelList/LabelList": { default: Empty },
    "../Modal/Modal": { default: Empty },
    "../TaskForm/TaskForm": { default: Empty },
    "../TaskStatusConfiguration/TaskStatusConfiguration": { default: Empty },
    "../TaskDetail/TaskDetailDialog": { default: Empty },
    "../TaskDetail/useTaskDetail": { useTaskDetailNavigation: () => ({ target: null, openTaskDetail() {}, closeTaskDetail() {} }) },
    "../TaskList/TaskList": { default: TaskList },
    "../TaskGantt/TaskGanttEntry": { default: Empty },
    "../TaskBoard/TaskBoard": { default: () => null },
    "../../../hooks/useToast": { useToast: () => ({ addToast() {} }) },
    "../TaskList/TaskGroupingControl": { default: () => React.createElement("button", { "aria-label": "Agrupar por: Estado" }) },
    "../TaskList/TaskGroupExpansionControl": expansion,
    "../TaskList/TaskSearch": { default: () => React.createElement("button", { "aria-label": "Buscar tareas" }) },
    "../TaskList/TaskStatusSettingsControl": { default: Empty },
    "../TaskList/taskHierarchy": hierarchy,
    "../TaskStateForm/TaskStateForm": { default: Empty },
    "./ProjectHeader": { default: Empty },
    "./ProjectToolbar": { default: Toolbar },
    "../../../shared/icons/PlusIcon": { default: Icon },
    "../taskAssignees": assignees,
    "../taskCollection": await load("../src/features/projects/taskCollection.ts"),
  });
  const render = () => { hookIndex = 0; return renderToStaticMarkup(React.createElement(Workspace, {
    projectId: 42, catalogs: { priorities: [] }, catalogLoading: false, catalogError: "", onRetryCatalogs() {},
  })); };
  const markup = render();
  assert.equal((markup.match(/data-group-key="state:/g) ?? []).length, 2);
  assert.equal((markup.match(/>0 tareas<\/span>/g) ?? []).length, 2);
  assert.match(markup, /Por hacer/);
  assert.match(markup, /En marcha/);
  assert.doesNotMatch(markup, /No configurado|Pendiente general/);
  assert.equal((markup.match(/Añadir tarea/g) ?? []).length, 2);
  assert.equal((markup.match(/aria-label="Crear nueva tarea"/g) ?? []).length, 1);
  assert.match(markup, /aria-label="Contraer grupos"/);
  assert.equal((markup.match(/aria-label="Buscar tareas"/g) ?? []).length, 1);
  assert.equal((markup.match(/aria-label="Herramientas del proyecto"/g) ?? []).length, 1);
  permissions = { manage: false, create_tasks: true };
  assert.equal((render().match(/Añadir tarea/g) ?? []).length, 1);
  permissions = { manage: false, create_tasks: false };
  assert.doesNotMatch(render(), /Añadir tarea/);
  assert.doesNotMatch(render(), /Crear nueva tarea/);
  view = "tablero";
  const board = render();
  assert.doesNotMatch(board, /data-group-key/);
  assert.equal((board.match(/aria-label="Buscar tareas"/g) ?? []).length, 1);
  assert.equal((board.match(/aria-label="Herramientas del proyecto"/g) ?? []).length, 1);
  assert.equal(requests, 0);
});
