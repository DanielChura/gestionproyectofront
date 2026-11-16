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
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const module = new vm.SourceTextModule(compiled);
  await module.link((name) => {
    const exports = {
      "../TaskSyncProvider": { default: ({ children }) => children },
      "../useTaskSync": { useTaskSync: () => syncFixture },
      react: React,
      "react/jsx-runtime": jsxRuntime,
      ...dependencies,
    }[name];
    assert.ok(exports, `Unexpected import: ${name}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports))
        this.setExport(key, value);
    });
  });
  await module.evaluate();
  return module.namespace;
}

const hierarchy = await load("../src/features/home/utils/taskHierarchy.ts");
const assignees = await load("../src/features/home/utils/taskAssignees.ts");
const themePresentation = await load(
  "../src/features/home/utils/themePresentation.ts",
);
const grouping = await load("../src/features/home/utils/taskGrouping.ts", {
  "./themePresentation": themePresentation,
  "./taskAssignees": assignees,
  "../taskAssignees": assignees,
});
const groupingHook = await load(
  "../src/features/home/hooks/useTaskGrouping.ts",
  {
    "../utils/taskGrouping": grouping,
    "../utils/taskHierarchy": hierarchy,
  },
);
const Icon = ({ name }) =>
  React.createElement("svg", { "data-icon": name, "aria-hidden": true });
const Toolbar = ({ children, action }) =>
  React.createElement(
    "div",
    { role: "toolbar", "aria-label": "Herramientas del proyecto" },
    children,
    action,
  );
const expansion = await load(
  "../src/features/home/components/filters/TaskGroupExpansionFilter.tsx",
  {
    "../../../../shared/icons/VectorIcon": { default: Icon },
    "../../hooks/useTaskMove": {
      useTaskMove: () => ({
        dragging: null,
        drop: null,
        permitted: () => true,
      }),
    },
    "../../hooks/useTaskPointerDrag": { useTaskPointerDrag: () => ({}) },
    "../../utils/taskDragSurface": { taskDragSurface: () => null },
    "../../utils/taskDropPosition": { taskDropPosition: () => null },
    "../../utils/themePresentation": themePresentation,
    "../../../../shared/icons/ChevronIcon": { default: Icon },
    "../../../shared/icons/ChevronDownIcon": { default: Icon },
  },
);
const { default: ProjectTitle } = await load(
  "../src/features/home/components/ProjectTitle.tsx",
  {
    "../../../shared/icons/CalendarIcon": { default: Icon },
    "../utils/taskHierarchy": hierarchy,
  },
);
let favoriteState = {};
const { default: ProjectHeader } = await load(
  "../src/features/home/components/ProjectHeader.tsx",
  {
    "react-router": {
      Link: ({ to, children, ...props }) =>
        React.createElement("a", { href: to, ...props }, children),
    },
    "../../../routes": { projectPath: (id) => `/proyectos/${id}` },
    "./ProjectTitle": { default: ProjectTitle },
    "../../../shared/icons/FolderIcon": { default: Icon },
    "../../../shared/icons/BuildingIcon": { default: Icon },
    "../../../shared/icons/ChevronRightIcon": { default: Icon },
    "../../../shared/icons/ChevronIcon": { default: Icon },
    "../../../shared/icons/StarIcon": { default: Icon },
    "../../../shared/icons/CalendarIcon": { default: Icon },
    "../../../shared/icons/ActivityIcon": { default: Icon },
    "../../../shared/icons/FileIcon": { default: Icon },
    "../../../shared/icons/StackIcon": { default: Icon },
    "../../../shared/icons/Dashboard": { default: Icon },
    "../utils/taskHierarchy": hierarchy,
    "../hooks/useProjectFavorite": {
      useProjectFavorite: (_id, initial) => ({
        favorite: initial,
        pending: false,
        error: "",
        toggle() {},
        ...favoriteState,
      }),
    },
  },
);

let mockTasks = [];
let listDraftGroup = null,
  quickRow,
  movementError = "";
const listEffects = [],
  acceptedTasks = [];

const { default: TaskList } = await load(
  "../src/features/home/views/List/ListView.tsx",
  {
    react: {
      ...React,
      useEffect(effect) {
        listEffects.push(effect);
      },
      useState(initial) {
        return React.useState(initial === null ? listDraftGroup : initial);
      },
    },
    "../../hooks/useTaskMove": {
      useTaskMove: () => ({
        dragging: null,
        drop: null,
        permitted: () => true,
        error: movementError,
        refresh: async () => {},
      }),
    },
    "../../hooks/useTaskPointerDrag": { useTaskPointerDrag: () => ({}) },
    "../../utils/taskDragSurface": { taskDragSurface: () => null },
    "../../utils/taskDropPosition": { taskDropPosition: () => null },
    "../../utils/themePresentation": themePresentation,
    "../../../../shared/icons/ChevronIcon": { default: Icon },
    "../../../../shared/icons/PlusIcon": { default: Icon },
    "../../shared/ProjectToolbar": { default: Toolbar },
    "../../shared/task-form/TaskDialog": { default: () => null },
    "../../shared/task-status/TaskStatusConfiguration/TaskStatusConfiguration":
      {
        default: () => null,
      },
    "../../shared/task-status/TaskStatusSettingsControl": {
      default: () => null,
    },
    "../../components/filters/TaskGroupExpansionFilter": expansion,
    "../../components/filters/TaskGroupingFilter": { default: () => null },
    "../../components/filters/TaskSearchFilter": { default: () => null },
    "../../shared/QuickTaskRow": {
      default: (props) => {
        quickRow = props;
        return null;
      },
    },
    "./components/TaskGroupLabel": {
      default: ({ group }) => React.createElement("span", null, group.name),
    },
    "./components/TaskTable/TaskRow": { default: () => null },
    "./components/TaskTable/TaskTable": {
      default: ({ children }) => React.createElement("table", null, children),
    },
    "../../hooks/useTaskGrouping": groupingHook,
    "./hooks/useListMovement": {
      useListMovement: () => ({
        movement: {
          dragging: null,
          drop: null,
          busy: false,
          error: movementError,
          refresh() {},
          permitted: () => true,
        },
        pointerDrag: {},
      }),
    },
    "../../shared/MyTasksToggle": { default: () => null },
    "../../hooks/useMyTasksFilter": {
      useMyTasksFilter: (tasks) => ({ tasks, mine: false, toggleMine() {} }),
    },
    "./hooks/useList": {
      useList: (project) => ({
        tasks: mockTasks,
        error: movementError,
        refetch() {},
        catalogs: { priorities: [] },
        search: "",
        preferences: {
          mode: "state",
          order: "asc",
          separatePeople: false,
          separateLabels: false,
        },
        setGroupControls() {},
        setAction() {},
        acceptTask(task) {
          acceptedTasks.push(task);
        },
        patchTask() {},
        changeState() {},
        action: null,
        busy: false,
        saveTask: async () => {},
        changeDependency: async () => {},
        configuringStates: false,
        setConfiguringStates() {},
        configuredStates: project.task_states?.states ?? [],
        setSearch() {},
        setPreferences() {},
        groupControls: null,
      }),
    },
  },
);

const project = (changes = {}) => ({
  id: 42,
  name: "Proyecto sintético",
  areas: [{ id: 7, name: "Sistemas y Software" }],
  start_date: "2026-10-07",
  end_date: "2026-12-07",
  is_favorite: false,
  permissions: { manage: true, create_tasks: true },
  task_states: {
    states: [
      { code: "PENDIENTE", name: "Pendiente" },
      { code: "EN_CURSO", name: "En curso" },
    ],
  },
  ...changes,
});

function header(view = "lista", changes = {}, props = {}) {
  return renderToStaticMarkup(
    React.createElement(ProjectHeader, {
      project: project(changes),
      view,
      busy: false,
      onToggleFavorite() {},
      viewKey: view,
      status: { taskCount: 2, ...favoriteState },
      taskCount: 2,
      onCreateTask() {},
      ...props,
    }),
  );
}

test("favorite is after the last breadcrumb level in every existing view", () => {
  for (const [key, label] of [
    ["lista", "Lista"],
    ["tablero", "Tablero"],
    ["gantt", "Gantt"],
  ]) {
    const markup = header(key);
    const breadcrumb = markup.match(
      /<nav aria-label="Ruta de navegación"[\s\S]*?<\/nav>/,
    )[0];
    assert.match(
      breadcrumb,
      new RegExp(`aria-current="page"[^>]*>[\\s\\S]*?${label}<\\/span><\\/li>`),
    );
    assert.ok(
      breadcrumb.indexOf('aria-current="page"') <
        breadcrumb.indexOf('aria-pressed="false"'),
    );
    assert.match(
      breadcrumb,
      /<button[^>]*aria-pressed="false"[\s\S]*?<\/button><\/li><\/ol><\/nav>$/,
    );
    assert.equal(
      (markup.match(/<h1\b/g) ?? []).length,
      key === "gantt" ? 1 : 0,
    );
    assert.match(breadcrumb, /href="\/proyectos\/42"/);
    assert.doesNotMatch(breadcrumb, /href="[^"]*area/);
  }
});

test("long names remain complete in titles while the current view and favorite do not shrink", () => {
  const name = "Proyecto con nombre muy largo ".repeat(6).trim();
  const markup = header("gantt", { name });
  assert.ok(markup.includes(`title="${name}"`));
  assert.match(markup, /aria-current="page" class="flex[^"]*shrink-0/);
  assert.match(markup, /class="shrink-0"><button/);
});

test("dates preserve date-only values and missing dates are never invented", () => {
  assert.match(header("gantt"), /<time dateTime="2026-10-07"/);
  assert.match(header("gantt"), /<time dateTime="2026-12-07"/);
  const missing = header("gantt", { start_date: null, end_date: null });
  assert.match(missing, /Sin fecha de inicio/);
  assert.match(missing, /Sin fecha de fin/);
  assert.doesNotMatch(missing, /<time/);
  assert.match(missing, /data-task-count="true"[^>]*>2 tareas<\/span>/);
});

test("Gantt title and period precede breadcrumbs while other views preserve the colleague header", () => {
  for (const view of ["lista", "tablero", "gantt"]) {
    const markup = header(view);
    assert.ok(
      view === "gantt"
        ? markup.indexOf("<h1") <
            markup.indexOf('aria-label="Ruta de navegación"')
        : !markup.includes("<h1"),
    );
    assert.equal(
      (markup.match(/aria-label="Periodo del proyecto"/g) ?? []).length,
      view === "gantt" ? 1 : 0,
    );
    assert.doesNotMatch(markup, /Crear nueva tarea/);
  }
});

test("favorite pressed, pending and error semantics remain available", () => {
  favoriteState = { pending: true, error: "Error sintético" };
  try {
    const markup = header("lista", { is_favorite: true });
    assert.match(markup, /aria-label="Quitar proyecto de favoritos"/);
    assert.match(markup, /aria-pressed="true" aria-busy="true" disabled=""/);
    assert.match(
      markup,
      /role="alert"[^>]*>No se pudo actualizar el favorito. Error sintético/,
    );
  } finally {
    favoriteState = {};
  }
});

test("List has no duplicate primary action and preserves contextual creation permissions", () => {
  const render = (permissions) => {
    mockTasks = ["PENDIENTE", "EN_CURSO"].map((state_code, id) => ({
      id,
      parent_id: null,
      name: `Tarea ${id}`,
      state_code,
      state_name: state_code,
      labels: [],
      responsible_id: null,
      responsible_name: null,
      permissions: {},
    }));
    return renderToStaticMarkup(
      React.createElement(TaskList, {
        project: project({ permissions }),
        onProjectChange() {},
      }),
    );
  };
  const admin = render({ manage: true, create_tasks: true });
  assert.doesNotMatch(admin, /\+ Tarea/);
  assert.equal((admin.match(/Añadir tarea/g) ?? []).length, 2);
  assert.doesNotMatch(admin, /aria-label="Buscar tareas"/);
  assert.equal(
    (render({ manage: false, create_tasks: true }).match(/Añadir tarea/g) ?? [])
      .length,
    1,
  );
  assert.doesNotMatch(
    render({ manage: false, create_tasks: false }),
    /Añadir tarea/,
  );
});

test("empty List preserves the colleague empty view through Workspace without extra states, requests or permission changes", async () => {
  let view = "lista",
    requests = 0;
  let permissions = { manage: true, create_tasks: true };
  const currentProject = () =>
    project({
      permissions,
      requirements: [],
      task_states: {
        states: [
          { code: "PENDIENTE", name: "Por hacer" },
          { code: "EN_CURSO", name: "En marcha" },
        ],
        available_states: [
          { code: "PENDIENTE", name: "Pendiente general" },
          { code: "EN_CURSO", name: "En curso general" },
          { code: "BLOQUEADA", name: "No configurado" },
        ],
      },
    });
  const request = async () => {
    requests++;
  };
  const Empty = () => null;
  const { default: Workspace } = await load(
    "../src/features/home/ProjectPage.tsx",
    {
      "react-router": {
        useParams: () => ({ projectId: "42" }),
        useNavigate: () => () => undefined,
        useLocation: () => ({ search: `?vista=${view}` }),
        Link: ({ to, children }) =>
          React.createElement("a", { href: to }, children),
      },
      "./hooks/useProject": {
        useProject: () => ({ project: currentProject(), setProject() {} }),
      },
      "./hooks/useProjectCatalogs": {
        useProjectCatalogs: () => ({ catalogs: { priorities: [] } }),
      },
      "./hooks/useProjectTasks": {
        useProjectTaskCount: () => 0,
        useProjectTasks: () => ({
          tasks: [],
          acceptTask() {},
          refetch: request,
        }),
      },
      "./components/ProjectHeader": { default: Empty },
      "./views/Overview/OverviewView": { default: Empty },
      "./views/TaskGantt/GanttView": { default: Empty },
      "./components/ProjectTaskWorkspace": {
        default: ({ children }) => children,
      },
      "../auth/api": { sessionVersion: () => 0 },
      "./views/Board/BoardView": {
        default: () =>
          React.createElement(
            Toolbar,
            {
              action: React.createElement("input", {
                type: "search",
                "aria-label": "Buscar tareas",
              }),
            },
            null,
          ),
      },
      "./views/List/ListView": await load(
        "../src/features/home/views/List/ListView.tsx",
        {
          "../../hooks/useTaskMove": {
            useTaskMove: () => ({
              dragging: null,
              drop: null,
              permitted: () => true,
            }),
          },
          "../../hooks/useTaskPointerDrag": { useTaskPointerDrag: () => ({}) },
          "../../utils/taskDragSurface": { taskDragSurface: () => null },
          "../../utils/taskDropPosition": { taskDropPosition: () => null },
          "../../utils/themePresentation": themePresentation,
          "../../../../shared/icons/ChevronIcon": { default: Icon },
          "../../../../shared/icons/PlusIcon": { default: Icon },
          "../../shared/ProjectToolbar": { default: Toolbar },
          "../../shared/task-form/TaskDialog": { default: () => null },
          "../../shared/task-status/TaskStatusConfiguration/TaskStatusConfiguration":
            {
              default: () => null,
            },
          "../../shared/task-status/TaskStatusSettingsControl": {
            default: () => null,
          },
          "../../components/filters/TaskGroupExpansionFilter": expansion,
          "../../components/filters/TaskGroupingFilter": {
            default: () => null,
          },
          "../../components/filters/TaskSearchFilter": {
            default: () =>
              React.createElement("input", {
                type: "search",
                "aria-label": "Buscar tareas",
              }),
          },
          "../../shared/QuickTaskRow": { default: () => null },
          "./components/TaskGroupLabel": {
            default: ({ group }) =>
              React.createElement("span", null, group.name),
          },
          "./components/TaskTable/TaskRow": { default: () => null },
          "./components/TaskTable/TaskTable": {
            default: ({ children }) =>
              React.createElement("table", null, children),
          },
          "../../hooks/useTaskGrouping": groupingHook,
          "./hooks/useListMovement": {
            useListMovement: () => ({
              movement: {
                dragging: null,
                drop: null,
                busy: false,
                error: movementError,
                refresh() {},
                permitted: () => true,
              },
              pointerDrag: {},
            }),
          },
          "../../shared/MyTasksToggle": { default: () => null },
          "../../hooks/useMyTasksFilter": {
            useMyTasksFilter: (tasks) => ({
              tasks,
              mine: false,
              toggleMine() {},
            }),
          },
          "./hooks/useList": {
            useList: () => ({
              tasks: [],
              catalogs: { priorities: [] },
              search: "",
              preferences: {
                mode: "state",
                order: "asc",
                separatePeople: false,
                separateLabels: false,
              },
              setGroupControls() {},
              setAction() {},
              acceptTask() {},
              patchTask() {},
              changeState() {},
              action: null,
              busy: false,
              saveTask: async () => {},
              changeDependency: async () => {},
              configuringStates: false,
              setConfiguringStates() {},
              configuredStates: currentProject().task_states.states,
              setSearch() {},
              setPreferences() {},
              groupControls: {
                expanded: true,
                disabled: false,
                controls: "",
                toggle() {},
              },
            }),
          },
        },
      ),
    },
  );
  const render = () => {
    return renderToStaticMarkup(React.createElement(Workspace));
  };
  const markup = render();
  assert.equal((markup.match(/data-group-key="state:/g) ?? []).length, 0);
  assert.equal((markup.match(/>0 tareas<\/span>/g) ?? []).length, 0);
  assert.match(markup, /No hay tareas visibles/);
  assert.doesNotMatch(markup, /Por hacer|En marcha/);
  assert.doesNotMatch(markup, /No configurado|Pendiente general/);
  assert.equal((markup.match(/Añadir tarea/g) ?? []).length, 0);
  assert.equal(
    (markup.match(/aria-label="Crear nueva tarea"/g) ?? []).length,
    1,
  );
  assert.match(markup, /aria-label="Contraer grupos"/);
  assert.equal((markup.match(/aria-label="Buscar tareas"/g) ?? []).length, 1);
  assert.equal(
    (markup.match(/aria-label="Herramientas del proyecto"/g) ?? []).length,
    1,
  );
  permissions = { manage: false, create_tasks: true };
  assert.equal((render().match(/Añadir tarea/g) ?? []).length, 0);
  permissions = { manage: false, create_tasks: false };
  assert.doesNotMatch(render(), /Añadir tarea/);
  assert.doesNotMatch(render(), /Crear nueva tarea/);
  view = "tablero";
  const board = render();
  assert.doesNotMatch(board, /data-group-key/);
  assert.equal((board.match(/aria-label="Buscar tareas"/g) ?? []).length, 1);
  assert.equal(
    (board.match(/aria-label="Herramientas del proyecto"/g) ?? []).length,
    1,
  );
  assert.equal(requests, 0);
});

test("state grouping retains all levels below their root without changing each task state", () => {
  const tasks = [
    {
      id: 1,
      parent_id: null,
      name: "Root",
      state_code: "PENDIENTE",
      labels: [],
    },
    { id: 2, parent_id: 1, name: "Child", state_code: "EN_CURSO", labels: [] },
    {
      id: 3,
      parent_id: 2,
      name: "Grandchild",
      state_code: "BLOQUEADA",
      labels: [],
    },
  ];
  const before = JSON.stringify(tasks),
    tree = hierarchy.taskHierarchy(tasks),
    preferences = { mode: "state", order: "asc" };
  const groups = grouping.groupTasks(
    tasks,
    tree,
    preferences,
    [
      { code: "PENDIENTE", name: "Pending" },
      { code: "EN_CURSO", name: "Active" },
      { code: "BLOQUEADA", name: "Blocked" },
    ],
    [],
    "2026-11-07",
  );
  assert.deepEqual(
    [...groups.find((g) => g.stateCode === "PENDIENTE").members],
    [1, 2, 3],
  );
  assert.equal(groups.find((g) => g.stateCode === "EN_CURSO").members.size, 0);
  assert.equal(tree.rootById.get(3).id, 1);
  assert.equal(JSON.stringify(tasks), before);
  const filtered = hierarchy.taskHierarchy(tasks, "Grandchild");
  assert.deepEqual([...filtered.visible], [3, 2, 1]);
  assert.equal(filtered.roots[0].id, 1);
});

test("historical dates use creation-day warnings without turning every past date red", async () => {
  const dates = await load(
    "../src/features/home/shared/task-fields/taskDates.ts",
    { "../../utils/taskGrouping": grouping },
  );
  const { default: DateValue } = await load(
    "../src/features/home/shared/task-fields/TaskDateValue.tsx",
    { "../../utils/taskHierarchy": hierarchy, "./taskDates": dates },
  );
  const render = (value) =>
    renderToStaticMarkup(
      React.createElement(DateValue, {
        value,
        createdAt: "2020-01-01T15:00:00Z",
      }),
    );
  assert.doesNotMatch(render("2020-01-02"), /text-red|Fecha anterior a hoy/);
  assert.match(render("2019-12-31"), /data-before-creation="true"/);
  assert.match(render(null), /Sin fecha/);
});

test("List keeps save feedback out of the rows and ignores detached creation after unmount", () => {
  mockTasks = [
    {
      id: 1,
      name: "Task",
      parent_id: null,
      state_code: "PENDIENTE",
      labels: [],
    },
  ];
  listDraftGroup = "state:PENDIENTE";
  listEffects.length = 0;
  acceptedTasks.length = 0;
  const markup = renderToStaticMarkup(
    React.createElement(TaskList, { project: project(), onProjectChange() {} }),
  );
  const cleanup = listEffects
    .map((effect) => effect())
    .filter((effect) => typeof effect === "function");
  try {
    assert.doesNotMatch(markup, /Guardado:|role="status"[^>]*>Guardado/);
    assert.ok(
      quickRow,
      "the current quick creation flow is mounted in its real group",
    );
    quickRow.onDetachedCreated({ id: 9, name: "Tarea confirmada" });
    assert.equal(acceptedTasks.length, 1);
    cleanup.forEach((effect) => effect());
    quickRow.onDetachedCreated({ id: 10, name: "Respuesta tardía" });
    assert.equal(acceptedTasks.length, 1);
  } finally {
    cleanup.forEach((effect) => effect());
    listDraftGroup = null;
  }
});

test("List refresh failures preserve visible retry feedback through the shared query", () => {
  movementError = "No se pudo actualizar la lista";
  try {
    const failed = renderToStaticMarkup(
      React.createElement(TaskList, {
        project: project(),
        onProjectChange() {},
      }),
    );
    assert.match(failed, /role="alert"[^>]*>No se pudo actualizar la lista/);
    assert.match(failed, /Actualizar lista/);
  } finally {
    movementError = "";
  }
});
