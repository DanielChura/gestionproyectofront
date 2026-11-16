import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

class Surface extends EventTarget {
  constructor(tag = "div", parent = null, attributes = {}) {
    super();
    Object.assign(this, { tag, parent, ...attributes });
    this.listeners = new Map();
    this.children = [];
    this.dataset ??= {};
    this.captures = new Set();
    this.rect ??= { left: 0, right: 200, top: 0, bottom: 40 };
    parent?.children.push(this);
  }
  addEventListener(type, handler, options) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(handler);
    this.listeners.set(type, listeners);
    super.addEventListener(
      type,
      handler,
      typeof options === "boolean" ? { capture: options } : options,
    );
  }
  removeEventListener(type, handler, options) {
    this.listeners.get(type)?.delete(handler);
    super.removeEventListener(
      type,
      handler,
      typeof options === "boolean" ? { capture: options } : options,
    );
  }
  get listenerCount() {
    return [...this.listeners.values()].reduce(
      (total, items) => total + items.size,
      0,
    );
  }
  closest(selector) {
    const selectors = selector.split(",").map((value) => value.trim());
    for (let node = this; node; node = node.parent) {
      if (
        selectors.includes(node.tag) ||
        (selectors.includes("tr[data-task-id]") &&
          node.tag === "tr" &&
          node.dataset.taskId) ||
        (selectors.includes("[popover]") && node.popover) ||
        (selector.includes("[contenteditable]") && node.editable) ||
        selectors.includes(`[role=${node.role}]`)
      )
        return node;
    }
    return null;
  }
  contains(element) {
    for (let node = element; node; node = node.parent)
      if (node === this) return true;
    return false;
  }
  getBoundingClientRect() {
    return this.rect;
  }
  getClientRects() {
    return this.hidden ? [] : [this.rect];
  }
  querySelectorAll() {
    return this.children.flatMap((child) => [
      ...(child.tag === "tr" && child.dataset.dragEnabled === "true"
        ? [child]
        : []),
      ...child.querySelectorAll(),
    ]);
  }
  setPointerCapture(id) {
    this.captures.add(id);
  }
  hasPointerCapture(id) {
    return this.captures.has(id);
  }
  releasePointerCapture(id) {
    this.captures.delete(id);
  }
}

async function harness(timers = {}) {
  const document = new Surface(),
    window = new Surface(),
    scroller = new Surface();
  document.getSelection = () => ({ removeAllRanges() {} });
  const region = { current: scroller },
    row = new Surface("tr", scroller);
  const slots = [];
  let index = 0,
    drop = { state: "ACTIVE", before: 9, top: 10, left: 0, width: 200 };
  const calls = {
    start: [],
    track: [],
    over: [],
    end: [],
    propose: [],
    refresh: [],
  };
  const previews = [];
  let movement = Object.fromEntries(
    Object.keys(calls).map((name) => [
      name,
      (...args) => calls[name].push(args),
    ]),
  );
  let locate = (x, y, task) => ({ ...drop, x, y, task: task.id });
  const react = {
    useRef(initial) {
      const slot = index++;
      return (slots[slot] ??= { current: initial });
    },
    useEffect(effect, deps) {
      const slot = index++;
      if (
        !slots[slot] ||
        !deps.every((value, key) => Object.is(value, slots[slot].deps[key]))
      ) {
        slots[slot]?.cleanup?.();
        slots[slot] = { deps, cleanup: effect() };
      }
    },
  };
  const source = ts.transpileModule(
    readFileSync(
      new URL(
        "../src/features/home/hooks/useTaskPointerDrag.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    },
  ).outputText;
  const context = vm.createContext({
    document,
    window,
    Element: Surface,
    setTimeout,
    clearTimeout,
    ...timers,
  });
  const module = new vm.SourceTextModule(source, { context });
  await module.link((name) => {
    if (name === "../utils/taskDragPreview")
      return new vm.SyntheticModule(
        ["taskDragPreview"],
        function () {
          this.setExport("taskDragPreview", (row, origin) => {
            const preview = { row, origin, moves: [], removed: 0 };
            previews.push(preview);
            return {
              move: (...point) => preview.moves.push(point),
              remove: () => preview.removed++,
            };
          });
        },
        { context },
      );
    assert.equal(name, "react");
    return new vm.SyntheticModule(
      Object.keys(react),
      function () {
        for (const [key, value] of Object.entries(react))
          this.setExport(key, value);
      },
      { context },
    );
  });
  await module.evaluate();
  const task = { id: 4, parent_id: 2 };
  const render = () => {
    index = 0;
    return module.namespace.useTaskPointerDrag({ movement, locate, region });
  };
  const down = (target = row, props = {}) =>
    render().onPointerDown(
      {
        target,
        currentTarget: row,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        clientX: 10,
        clientY: 10,
        ...props,
      },
      task,
      props.enabled ?? true,
      row,
    );
  const dispatch = (type, props = {}, target = document) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, {
      pointerId: 1,
      buttons: type === "pointerup" ? 0 : 1,
      clientX: 16,
      clientY: 10,
      ...props,
    });
    target.dispatchEvent(event);
    return event;
  };
  const click = (detail) => {
    const event = {
      detail,
      prevented: false,
      stopped: false,
      preventDefault() {
        this.prevented = true;
      },
      stopPropagation() {
        this.stopped = true;
      },
    };
    render().onClickCapture(event);
    return event;
  };
  return {
    calls,
    previews,
    row,
    document,
    window,
    scroller,
    task,
    render,
    down,
    dispatch,
    click,
    nativeClick(props = {}) {
      return dispatch("click", { detail: 1, ...props });
    },
    setDrop(value) {
      drop = value;
    },
    setMovement(value) {
      movement = value;
      render();
    },
    setLocate(value) {
      locate = value;
      render();
    },
    unmount() {
      for (const slot of slots) slot?.cleanup?.();
    },
  };
}

test("a normal click remains a click and six pixels activates one confirmed movement", async () => {
  const hook = await harness();
  hook.down();
  hook.dispatch("pointermove", { clientX: 15 });
  hook.dispatch("pointerup", { clientX: 15 });
  assert.equal(hook.calls.start.length, 0);
  assert.equal(hook.calls.propose.length, 0);
  assert.equal(hook.click(1).prevented, false);
  hook.down();
  hook.dispatch("pointermove");
  assert.equal(hook.calls.start.length, 1);
  assert.equal(hook.calls.track.length, 1);
  hook.dispatch("pointerup");
  hook.dispatch("pointerup");
  assert.equal(hook.calls.end.length, 1);
  assert.equal(hook.calls.propose.length, 1);
  assert.equal(hook.calls.propose[0][0], hook.task);
  assert.equal(hook.calls.propose[0][0].parent_id, 2);
  assert.deepEqual(hook.calls.propose[0].slice(1), ["ACTIVE", 9]);
  const draggedClick = hook.click(1);
  assert.equal(draggedClick.prevented, true);
  assert.equal(draggedClick.stopped, true);
  hook.down();
  hook.dispatch("pointerup");
  assert.equal(hook.click(1).prevented, false);
  hook.unmount();
});

test("preview is created only at the threshold, follows the original grab point and is removed with pointer capture", async () => {
  for (const finish of [
    "pointerup",
    "pointercancel",
    "lostpointercapture",
    "unmount",
  ]) {
    const hook = await harness();
    hook.down(new Surface("button", hook.row));
    hook.dispatch("pointermove", { clientX: 12 });
    assert.equal(hook.previews.length, 0);
    hook.dispatch("pointermove", { clientX: 18, clientY: 20 });
    assert.equal(hook.previews.length, 1);
    assert.equal(hook.previews[0].row, hook.row);
    assert.deepEqual({ ...hook.previews[0].origin }, { x: 10, y: 10 });
    assert.deepEqual(hook.previews[0].moves, [[18, 20]]);
    assert.ok(hook.scroller.hasPointerCapture(1));
    hook.dispatch("pointermove", { clientX: 200, clientY: 70 });
    assert.deepEqual(hook.previews[0].moves.at(-1), [200, 70]);
    if (finish === "unmount") hook.unmount();
    else {
      if (finish === "lostpointercapture")
        hook.scroller.releasePointerCapture(1);
      hook.dispatch(
        finish,
        {},
        finish === "lostpointercapture" ? hook.scroller : hook.document,
      );
    }
    assert.equal(hook.previews[0].removed, 1);
    assert.equal(hook.scroller.hasPointerCapture(1), false);
    assert.equal(hook.calls.propose.length, finish === "pointerup" ? 1 : 0);
    hook.unmount();
  }
});

test("buttons and property triggers distinguish ordinary clicks from threshold drags across the whole row", async () => {
  const hook = await harness();
  for (const tag of ["button", "a", "summary", "span"]) {
    const trigger = new Surface(tag, hook.row);
    hook.down(new Surface("svg", trigger));
    hook.dispatch("pointermove", { clientX: 14, clientY: 11 });
    hook.dispatch("pointerup", { clientX: 14, clientY: 11 });
    assert.equal(hook.nativeClick().defaultPrevented, false);
    hook.down(new Surface("svg", trigger));
    hook.dispatch("pointermove");
    hook.dispatch("pointerup");
    assert.equal(hook.nativeClick().defaultPrevented, true);
  }
  assert.equal(hook.calls.start.length, 4);
  assert.equal(hook.calls.propose.length, 4);
  hook.down();
  await new Promise((resolve) => setTimeout(resolve, 30));
  hook.dispatch("pointerup", { clientX: 10 });
  assert.equal(hook.calls.start.length, 4);
  assert.equal(hook.nativeClick().defaultPrevented, false);
  hook.unmount();
});

test("editing fields, open popup content, non-primary pointers and touch keep their own interactions", async () => {
  const hook = await harness();
  for (const tag of ["input", "textarea", "select", "dialog"]) {
    hook.down(new Surface(tag, hook.row));
    hook.dispatch("pointermove");
    hook.dispatch("pointerup");
  }
  for (const attributes of [
    { popover: true },
    { editable: true },
    { role: "dialog" },
    { role: "menu" },
  ]) {
    hook.down(new Surface("button", new Surface("span", hook.row, attributes)));
    hook.dispatch("pointermove");
    hook.dispatch("pointerup");
  }
  hook.down(new Surface("button"));
  hook.dispatch("pointermove");
  hook.dispatch("pointerup");
  for (const props of [
    { pointerType: "touch" },
    { button: 2 },
    { isPrimary: false },
    { enabled: false },
  ]) {
    hook.down(hook.row, props);
    hook.dispatch("pointermove");
    hook.dispatch("pointerup");
  }
  assert.equal(hook.calls.start.length, 0);
  assert.equal(hook.nativeClick().defaultPrevented, false);
  hook.unmount();
});

test("Escape, pointer cancellation and blur cancel without writing or blocking the next ordinary click", async () => {
  for (const kind of ["Escape", "pointercancel", "blur"]) {
    const hook = await harness();
    hook.down();
    hook.dispatch("pointermove");
    if (kind === "Escape")
      assert.equal(
        hook.dispatch("keydown", { key: "Escape" }).defaultPrevented,
        true,
      );
    else hook.dispatch(kind, {}, kind === "blur" ? hook.window : hook.document);
    hook.dispatch("pointerup");
    assert.equal(hook.calls.propose.length, 0);
    assert.equal(hook.calls.end.length, 1);
    assert.equal(hook.click(0).prevented, false);
    assert.equal(hook.nativeClick().defaultPrevented, kind !== "blur");
    assert.equal(
      hook.document.listenerCount +
        hook.window.listenerCount +
        hook.scroller.listenerCount,
      0,
    );
    hook.down();
    hook.dispatch("pointerup");
    assert.equal(hook.click(1).prevented, false);
    hook.unmount();
  }
});

test("stationary pointer scrolling and release recalculate position using current callbacks without duplicate listeners", async () => {
  const hook = await harness();
  hook.down();
  hook.dispatch("pointermove");
  const listeners = hook.document.listenerCount;
  hook.setDrop({ state: "EMPTY", before: null });
  hook.dispatch("scroll", {}, hook.scroller);
  assert.equal(hook.calls.over.at(-1)[0].state, "EMPTY");
  hook.setLocate((x, y, task) => ({
    state: "CLOSED",
    before: null,
    x,
    y,
    task: task.id,
  }));
  assert.equal(hook.document.listenerCount, listeners);
  hook.dispatch("pointerup", { clientX: 40, clientY: 100 });
  assert.deepEqual(hook.calls.propose[0].slice(1), ["CLOSED", null]);
  assert.equal(hook.nativeClick().defaultPrevented, true);
  assert.equal(hook.document.listenerCount, 0);
  hook.unmount();
});

test("unmount removes an active gesture; a denied proposal has no automatic refresh, replay or native drag", async () => {
  const hook = await harness();
  hook.down();
  hook.dispatch("pointermove");
  hook.unmount();
  hook.dispatch("pointerup");
  assert.equal(hook.calls.propose.length, 0);
  assert.equal(hook.document.listenerCount, 0);
  const second = await harness();
  let writes = 0;
  second.setMovement({
    start() {},
    track() {},
    over() {},
    end() {},
    propose() {
      writes++;
    },
    refresh() {
      throw Error("Unexpected replay");
    },
    error: "Conflicto 409",
  });
  second.down();
  second.dispatch("pointermove");
  second.dispatch("pointerup");
  second.dispatch("pointerup");
  assert.equal(writes, 1);
  let prevented = false;
  second.render().onDragStart({
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  second.unmount();
});

test("returning after a release outside the document cancels the gesture without saving", async () => {
  const hook = await harness();
  hook.down();
  hook.dispatch("pointermove");
  hook.dispatch("pointermove", { buttons: 0 });
  hook.dispatch("pointerup");
  assert.equal(hook.calls.propose.length, 0);
  assert.equal(hook.calls.end.length, 1);
  assert.equal(hook.nativeClick().defaultPrevented, true);
  assert.equal(
    hook.document.listenerCount +
      hook.window.listenerCount +
      hook.scroller.listenerCount,
    0,
  );
  hook.unmount();
});

test("residual click is blocked at document capture even outside the source row, without swallowing the next gesture", async () => {
  const hook = await harness();
  hook.down(new Surface("button", hook.row));
  hook.dispatch("pointermove");
  hook.dispatch("pointerup");
  assert.equal(hook.nativeClick({ detail: 0 }).defaultPrevented, false);
  assert.equal(hook.nativeClick().defaultPrevented, true);
  assert.equal(hook.nativeClick().defaultPrevented, false);
  hook.down();
  hook.dispatch("pointermove");
  hook.dispatch("keydown", { key: "Escape" });
  hook.dispatch("pointerdown");
  assert.equal(hook.nativeClick().defaultPrevented, false);
  hook.unmount();
});

test("late cancellation callbacks from a finished gesture cannot end or detach the next gesture", async () => {
  const hook = await harness();
  hook.down();
  hook.dispatch("pointermove");
  const lateKeydown = [...hook.document.listeners.get("keydown")][0];
  const lateCancel = [...hook.scroller.listeners.get("lostpointercapture")][0];
  hook.dispatch("keydown", { key: "Escape" });
  hook.dispatch("pointerup");
  hook.down();
  hook.dispatch("lostpointercapture", {}, hook.scroller);
  hook.dispatch("pointermove");
  assert.equal(hook.calls.start.length, 2);
  lateKeydown({ key: "Escape", preventDefault() {}, stopPropagation() {} });
  lateCancel({
    type: "lostpointercapture",
    pointerId: 1,
    target: hook.scroller,
  });
  assert.equal(hook.calls.end.length, 1);
  assert.equal(hook.previews[1].removed, 0);
  hook.dispatch("lostpointercapture", {}, hook.scroller);
  assert.equal(
    hook.previews[1].removed,
    0,
    "A stale loss cannot cancel currently owned capture",
  );
  hook.dispatch("pointerup");
  assert.equal(hook.calls.propose.length, 1);
  assert.equal(hook.nativeClick().defaultPrevented, true);
  hook.unmount();
});

test("many cancellations and releases restart immediately without accumulating listeners or swallowing clicks", async () => {
  const hook = await harness();
  for (let n = 0; n < 20; n++) {
    hook.down();
    hook.dispatch("pointermove");
    hook.dispatch("keydown", { key: "Escape" });
    hook.dispatch("pointerup");
    hook.down(new Surface("button", hook.row));
    hook.dispatch("pointermove");
    hook.dispatch("pointerup");
    assert.equal(hook.nativeClick().defaultPrevented, true);
    assert.equal(
      hook.document.listenerCount +
        hook.window.listenerCount +
        hook.scroller.listenerCount,
      0,
    );
  }
  hook.down();
  hook.dispatch("pointerup", { clientX: 10 });
  assert.equal(hook.nativeClick().defaultPrevented, false);
  assert.equal(hook.calls.start.length, 40);
  hook.unmount();
});

test("a queued click-guard cleanup belongs only to its ended gesture and cannot leak the next guard", async () => {
  const timers = [];
  const hook = await harness({
    setTimeout(callback) {
      timers.push(callback);
      return timers.length;
    },
    clearTimeout() {},
  });
  hook.down();
  hook.dispatch("pointermove");
  hook.dispatch("pointerup");
  const late = timers[0];
  hook.down();
  hook.dispatch("pointermove");
  late();
  assert.equal(hook.click(1).prevented, true);
  hook.unmount();
  assert.equal(
    hook.document.listenerCount +
      hook.window.listenerCount +
      hook.scroller.listenerCount,
    0,
  );
});
