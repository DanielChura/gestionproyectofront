import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as JSX from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

async function load(name, dependencies, globals = {}) {
  const context = vm.createContext({ Date, ...globals });
  const compiled = ts.transpileModule(
    readFileSync(
      new URL(
        "../src/features/home/views/TaskGantt/" + name,
        import.meta.url,
      ),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  const module = new vm.SourceTextModule(compiled, { context });
  await module.link((name) => {
    const exports = { react: React, "react/jsx-runtime": JSX, ...dependencies }[
      name
    ];
    assert.ok(exports, name);
    return new vm.SyntheticModule(
      Object.keys(exports),
      function () {
        for (const [k, v] of Object.entries(exports)) this.setExport(k, v);
      },
      { context },
    );
  });
  await module.evaluate();
  return module.namespace;
}

test("upper creation uses the shared task controller and stays available independently of canvas protection", async () => {
  let entry, dialog;
  const view = {
    tasks: [{ id: 12 }],
    action: null,
    catalogs: {},
    acceptTask() {},
    setAction(action) {
      view.action = action;
    },
  };
  const { default: View } = await load("GanttView.tsx", {
    "../../../auth/api": { sessionVersion: () => 1 },
    "../../utils/useTaskSync": { createTaskSync: () => ({}), TaskSyncContext: React.createContext(null) },
    "../../hooks/useTaskView": { useTaskView: () => view },
    "./GanttTaskDialog": {
      default: (props) => {
        dialog = props;
        return null;
      },
    },
    "./TaskGanttEntry": {
      default: (props) => {
        entry = props;
        return null;
      },
    },
  });
  const project = { id: 42, permissions: { create_tasks: true } };
  const render = () =>
    renderToStaticMarkup(
      React.createElement(View, { project, onProjectChange() {} }),
    );
  render();
  assert.equal(entry.createAction.type, "button");
  entry.createAction.props.onClick();
  assert.equal(view.action.kind, "create");
  assert.equal("taskId" in view.action, false);
  render();
  assert.equal(dialog.project, project);
  assert.equal(dialog.view, view);
  assert.equal(entry.tasks, view.tasks);
  assert.equal(entry.onCreated, view.acceptTask);
  project.permissions.create_tasks = false;
  render();
  assert.equal(entry.createAction, false);
});

test("protection gates gestures and native previews without disposing pending saves or disabling form operations", async () => {
  const slots = [],
    effects = [];
  let index = 0,
    options,
    cancellations = 0,
    writes = 0;
  let writable = true;
  const operations = {
    setOnConfirmed() {},
    getVersion: () => 1,
    subscribe() {},
    getSnapshot: () => new Map(),
    canStart: () => true,
    commit() {
      writes++;
    },
    activate() {},
    dispose() {},
  };
  const gesture = {
    start(task) {
      return writable && options.canStart(task);
    },
    setWritable(value) {
      writable = value;
      if (!value) cancellations++;
    },
    activate() {},
    dispose() {},
    cancel() {
      cancellations++;
    },
    allowPreview: () => writable,
  };
  const react = {
    ...React,
    useCallback: (fn) => fn,
    useRef(initial) {
      const i = index++;
      return (slots[i] ??= { current: initial });
    },
    useState(initial) {
      const i = index++;
      if (!(i in slots))
        slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], () => {}];
    },
    useEffect(fn) {
      effects.push(fn);
    },
    useLayoutEffect: (fn) => fn(),
    useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
  };
  const { useGanttCalendar } = await load("useGanttCalendar.ts", {
    react,
    "@svar-ui/react-gantt": { locateTask() {} },
    "../../utils/useTaskSync": {
      useTaskSync: () => ({ subscribe() {}, getVersion: () => 1 }),
    },
    "./ganttCalendarOperations": {
      createGanttCalendarOperations: () => operations,
    },
    "./ganttPointerGesture": {
      createGanttPointerGesture(opts) {
        options = opts;
        return gesture;
      },
    },
  });
  const render = (enabled) => {
    index = 0;
    return useGanttCalendar([], () => {}, enabled);
  };
  const before = render(true);
  assert.equal(before.gesture.start({}), true);
  assert.equal(before.allowPreview({}), true);
  const protectedCalendar = render(false);
  assert.equal(cancellations, 1);
  assert.equal(protectedCalendar.gesture.start({}), false);
  assert.equal(protectedCalendar.allowPreview({}), false);
  assert.equal(protectedCalendar.operations, before.operations);
  protectedCalendar.operations.commit({});
  assert.equal(writes, 1, "the operation shared by forms remains usable");
  assert.equal(render(true).gesture.start({}), true);
});

class Surface {
  listeners = new Map();
  capture = new Set();
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) {
    this.listeners.get(type)?.delete(fn);
  }
  emit(type, extra = {}) {
    const event = {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      pointerType: "mouse",
      buttons: 1,
      clientX: 300,
      clientY: 100,
      detail: 1,
      preventDefault() {
        this.prevented = true;
      },
      stopPropagation() {},
      stopImmediatePropagation() {
        this.stopped = true;
      },
      ...extra,
    };
    for (const fn of [...(this.listeners.get(type) ?? [])]) fn(event);
    return event;
  }
  closest() {
    return null;
  }
  querySelector() { return null; }
  getBoundingClientRect() {
    return { left: 0, top: 0 };
  }
  setPointerCapture(id) {
    this.capture.add(id);
  }
  hasPointerCapture(id) {
    return this.capture.has(id);
  }
  releasePointerCapture(id) {
    this.capture.delete(id);
  }
}
async function panHarness() {
  const document = new Surface(),
    window = new Surface(),
    node = new Surface(),
    actions = [],
    cleanups = [];
  document.getSelection = () => ({ removeAllRanges() {} });
  const { useGanttPan } = await load(
    "useGanttPan.ts",
    {
      "./ganttSceneGeometry": await load("ganttSceneGeometry.ts", {}),
      "./useGanttVerticalScroll": { useGanttVerticalScroll: () => ({ height: 400, top: 0, maximum: 0, step() {} }) },
      "./ganttGeometry": { positionDate() { throw new Error("unexpected navigation adapter call"); } },
      react: {
        ...React,
        useCallback: (fn) => fn,
        useRef: (current) => ({ current }),
        useState: (value) => [value, () => {}],
        useEffect(fn) {
          const cleanup = fn();
          if (cleanup) cleanups.push(cleanup);
        },
      },
    },
    { document, window, Element: Surface },
  );
  const api = {
    getState: () => ({
      gridWidth: 200,
      scrollLeft: 300,
      _scales: { height: 56 },
    }),
    exec: (kind, data) => actions.push({ kind, data }),
  };
  const pan = useGanttPan(api, true, () => {});
  const down = () => {
    const event = node.emit("unused", { currentTarget: node, target: node });
    pan.down(event);
    return event;
  };
  return {
    pan,
    down,
    document,
    node,
    actions,
    unmount: () => cleanups.forEach((fn) => fn()),
  };
}
test("protected pan preserves clicks and captures only beyond the movement threshold", async () => {
  const h = await panHarness();
  assert.equal(h.down().prevented, undefined);
  h.document.emit("pointerup");
  assert.equal(h.document.emit("click").prevented, undefined);
  assert.equal(h.actions.length, 0);
  h.down();
  h.document.emit("pointermove", { clientX: 303 });
  assert.equal(h.node.capture.size, 0);
  h.document.emit("pointermove", { clientX: 330 });
  assert.equal(h.node.capture.size, 1);
  assert.equal(h.actions[0].kind, "scroll-chart");
  assert.equal(h.actions[0].data.left, 270);
  h.document.emit("pointerup");
  assert.equal(h.document.emit("click").prevented, true);
  h.down();
  h.document.emit("pointerup");
  assert.equal(h.document.emit("click").prevented, undefined);
  h.unmount();
});
test("cancelled protected pan restarts immediately and stale termination cannot cancel a new gesture", async () => {
  const h = await panHarness();
  for (const ending of ["Escape", "pointercancel", "lostpointercapture"]) {
    h.down();
    h.document.emit("pointermove", { clientX: 330 });
    const stale = [...h.document.listeners.get("pointerup")][0];
    if (ending === "Escape") h.document.emit("keydown", { key: ending });
    else if (ending === "lostpointercapture") h.node.emit(ending);
    else h.document.emit(ending);
    assert.equal(h.node.capture.size, 0);
    h.down();
    stale({ pointerId: 1 });
    h.document.emit("pointermove", { clientX: 280 });
    assert.equal(h.node.capture.size, 1);
    h.document.emit("pointerup");
  }
  h.unmount();
  assert.equal(h.document.listeners.get("pointermove").size, 0);
});
