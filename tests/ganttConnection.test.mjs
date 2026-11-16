import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
class Surface extends EventTarget {
  addEventListener(type, handler, options) {
    super.addEventListener(
      type,
      handler,
      typeof options === "boolean" ? { capture: options } : options,
    );
  }
  removeEventListener(type, handler, options) {
    super.removeEventListener(
      type,
      handler,
      typeof options === "boolean" ? { capture: options } : options,
    );
  }
}
async function harness() {
  const document = new Surface(),
    window = new Surface(),
    node = new Surface(),
    frames = new Map(),
    effects = [],
    links = [],
    scrolls = [],
    captures = new Set();
  node.getBoundingClientRect = () => ({
    x: 100,
    y: 100,
    width: 500,
    height: 400,
  });
  node.setPointerCapture = (id) => captures.add(id);
  node.hasPointerCapture = (id) => captures.has(id);
  node.releasePointerCapture = (id) => captures.delete(id);
  const context = vm.createContext({
    document,
    window,
    requestAnimationFrame: (fn) => {
      const id = Symbol();
      frames.set(id, fn);
      return id;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
  });
  const code = ts.transpileModule(
    readFileSync(
      new URL(
        "../src/features/home/views/TaskGantt/useGanttConnection.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.ES2022 } },
  ).outputText;
  const module = new vm.SourceTextModule(code, {
    context,
    identifier: new URL(
      "../src/features/home/views/TaskGantt/useGanttConnection.ts",
      import.meta.url,
    ).href,
  });
  const helpers = new Map();
  async function load(name, referencingModule) {
    if (name === "react")
      return new vm.SyntheticModule(
        ["useState", "useRef", "useEffect", "useLayoutEffect"],
        function () {
          this.setExport("useState", (initial) => [initial, () => {}]);
          this.setExport("useRef", (current) => ({ current }));
          this.setExport("useEffect", (effect) => effects.push(effect()));
          this.setExport("useLayoutEffect", (effect) => effects.push(effect()));
        },
        { context },
      );
    const url = new URL(name + ".ts", referencingModule.identifier);
    if (helpers.has(url.href)) return helpers.get(url.href);
    const source = ts.transpileModule(readFileSync(url, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ES2022 },
    }).outputText;
    const helper = new vm.SourceTextModule(source, {
      context,
      identifier: url.href,
    });
    helpers.set(url.href, helper);
    await helper.link(load);
    return helper;
  }
  await module.link(load);
  await module.evaluate();
  const api = {
    getState: () => ({
      scrollLeft: 0,
      _scales: { height: 56, width: 1000 },
      _chartHeight: 400,
      _tasks: Array.from({ length: 100 }, (_, id) => ({ id })),
      cellHeight: 40,
      scrollTop: 0,
    }),
    exec(action, data) {
      if (action === "scroll-chart") scrolls.push(data);
    },
  };
  const target = {
    task: { id: 2, parent_id: null, permissions: { dependencies: true } },
    geometry: {
      real: true,
      connectable: true,
      left: 100,
      right: 200,
      y: 60,
      startConnector: 90,
      endConnector: 210,
    },
  };
  let hit = {
    closest: (selector) =>
      selector === "[data-gantt-calendar-task]"
        ? { dataset: { ganttCalendarTask: "2" } }
        : null,
  };
  document.elementFromPoint = () => hit;
  const hook = module.namespace.useGanttConnection(
    api,
    true,
    { current: node },
    () => [{ ...target, task: { ...target.task, id: 1 } }, target],
    (...ids) => links.push(ids),
    () => {},
  );
  const event = (type, values = {}) =>
    Object.assign(new Event(type, { cancelable: true }), {
      pointerId: 1,
      clientX: 250,
      clientY: 216,
      buttons: 1,
      ...values,
    });
  return {
    hook,
    setHit: (value) => {
      hit = value;
    },
    document,
    node,
    links,
    frames,
    event,
    target,
    scrolls,
    start() {
      hook.start(
        {
          button: 0,
          isPrimary: true,
          pointerId: 1,
          clientX: 150,
          clientY: 180,
          preventDefault() {},
          stopPropagation() {},
        },
        1,
        "end",
      );
    },
    dispose() {
      effects.forEach((cleanup) => cleanup?.());
    },
  };
}
test("Escape frees connection capture and the same task immediately connects in a fresh gesture", async () => {
  const h = await harness();
  h.start();
  h.document.dispatchEvent(h.event("pointermove"));
  h.document.dispatchEvent(h.event("keydown", { key: "Escape" }));
  assert.equal(h.node.hasPointerCapture(1), false);
  assert.equal(h.frames.size, 0);
  assert.equal(h.links.length, 0);
  h.document.dispatchEvent(h.event("pointerdown"));
  h.start();
  h.document.dispatchEvent(h.event("pointermove"));
  h.document.dispatchEvent(h.event("pointerup"));
  assert.deepEqual(h.links, [[1, 2, "FS"]]);
  assert.equal(h.frames.size, 0);
  h.dispose();
});
test("pointercancel and lost capture terminate only their gesture and dispose removes its click guard", async () => {
  const h = await harness();
  h.start();
  h.document.dispatchEvent(h.event("pointercancel", { pointerId: 99 }));
  assert.equal(h.node.hasPointerCapture(1), true);
  h.document.dispatchEvent(h.event("pointercancel"));
  assert.equal(h.node.hasPointerCapture(1), false);
  h.document.dispatchEvent(h.event("pointerdown"));
  h.start();
  h.node.dispatchEvent(h.event("lostpointercapture"));
  assert.equal(h.frames.size, 0);
  assert.equal(h.links.length, 0);
  h.dispose();
  const click = h.event("click", { detail: 1 });
  h.document.dispatchEvent(click);
  assert.equal(click.defaultPrevented, false);
});

test("connection suppresses only its residual click and a new pointerdown restores normal clicks", async () => {
  const h = await harness();
  h.start();
  h.document.dispatchEvent(h.event("pointermove"));
  h.document.dispatchEvent(h.event("keydown", { key: "Escape" }));
  const residual = h.event("click", { detail: 1 });
  h.document.dispatchEvent(residual);
  assert.equal(residual.defaultPrevented, true);
  h.document.dispatchEvent(h.event("pointerdown"));
  const fresh = h.event("click", { detail: 1 });
  h.document.dispatchEvent(fresh);
  assert.equal(fresh.defaultPrevented, false);
  h.dispose();
});

test("ineligible bars cannot receive a connector drop", async () => {
  const h = await harness();
  h.target.geometry.connectable = false;
  h.start();
  h.document.dispatchEvent(h.event("pointerup"));
  assert.equal(h.links.length, 0);
  h.dispose();
});

test("connection edge navigation scrolls horizontally and vertically and cancels outside drops", async () => {
  const h = await harness();
  h.start();
  h.document.dispatchEvent(
    h.event("pointermove", { clientX: 595, clientY: 548 }),
  );
  const [id, frame] = h.frames.entries().next().value;
  h.frames.delete(id);
  frame();
  assert.ok(h.scrolls.some((s) => s.left > 0));
  assert.ok(h.scrolls.some((s) => s.top > 0));
  h.document.dispatchEvent(
    h.event("pointerup", { clientX: 700, clientY: 548 }),
  );
  assert.equal(h.links.length, 0);
  h.dispose();
});

test("a click without crossing the threshold does not create or suppress a normal click", async () => {
  const h = await harness();
  h.start();
  h.document.dispatchEvent(h.event("pointerup"));
  const click = h.event("click", { detail: 1 });
  h.document.dispatchEvent(click);
  assert.equal(h.links.length, 0);
  assert.equal(click.defaultPrevented, false);
  h.dispose();
});
test("text and avatar overlays cancel a drop even at a valid bar coordinate", async () => {
  const h = await harness();
  h.setHit({
    closest: (selector) =>
      selector.startsWith(".gm-gantt-exterior") ? {} : null,
  });
  h.start();
  h.document.dispatchEvent(h.event("pointermove"));
  h.document.dispatchEvent(h.event("pointerup"));
  assert.equal(h.links.length, 0);
  h.dispose();
});
test("explicit start connector determines FS even when a small bar body is closer to its finish", async () => {
  const h = await harness();
  h.target.geometry.startConnector = 205;
  h.setHit({
    closest: (selector) =>
      selector === "[data-connector-task]"
        ? { dataset: { connectorTask: "2", connectorSide: "start" } }
        : null,
  });
  h.start();
  h.document.dispatchEvent(h.event("pointermove", { clientX: 305 }));
  h.document.dispatchEvent(h.event("pointerup", { clientX: 305 }));
  assert.deepEqual(h.links, [[1, 2, "FS"]]);
  h.dispose();
});

async function connectionPolicy() {
  const cache = new Map();
  async function load(url) {
    if (cache.has(url.href)) return cache.get(url.href);
    const code = ts.transpileModule(readFileSync(url, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ES2022 },
    }).outputText;
    const module = new vm.SourceTextModule(code, { identifier: url.href });
    cache.set(url.href, module);
    await module.link((name, parent) =>
      load(new URL(name + ".ts", parent.identifier)),
    );
    return module;
  }
  const module = await load(
    new URL(
      "../src/features/home/views/TaskGantt/ganttConnectionTarget.ts",
      import.meta.url,
    ),
  );
  await module.evaluate();
  return module.namespace;
}

test("explicit endpoints remain stable for all four types and only temporal incompatibility tries the other endpoint", async () => {
  const { compatibleGanttTarget } = await connectionPolicy();
  const source = { start_date: "2026-01-03", due_date: "2026-01-05" };
  const later = { start_date: "2026-01-08", due_date: "2026-01-10" };
  for (const origin of ["start", "end"])
    for (const destination of ["start", "end"]) {
      assert.equal(
        compatibleGanttTarget(source, later, origin, destination),
        destination,
      );
    }
  const overlap = {
    start_date: "2026-01-01",
    due_date: "2026-01-08",
    state_code: "COMPLETADA",
    parent_id: 20,
  };
  assert.equal(compatibleGanttTarget(source, overlap, "end", "start"), "end");
  assert.equal(compatibleGanttTarget(source, overlap, "end", "end"), "end");
  const earlier = { start_date: "2026-01-01", due_date: "2026-01-02" };
  assert.equal(compatibleGanttTarget(source, earlier, "end", "end"), "end");
  assert.equal(compatibleGanttTarget(source, earlier, "end", "start"), "start");
  assert.equal(
    compatibleGanttTarget(
      { ...source, state_code: "COMPLETADA", actual_finished_at: null },
      later,
      "end",
      "end",
    ),
    "end",
  );
});

test("explicit finish port wins over body and body start uses the same temporal adjustment", async () => {
  const { ganttConnectionTarget } = await connectionPolicy();
  const source = {
    task: { id: 1, start_date: "2026-01-03", due_date: "2026-01-05" },
  };
  const target = {
    task: { id: 2, start_date: "2026-01-01", due_date: "2026-01-08" },
    geometry: {
      connectable: true,
      y: 40,
      left: 100,
      right: 180,
      startConnector: 80,
      endConnector: 200,
    },
  };
  const body = { dataset: { ganttCalendarTask: "2" } };
  const hit = {
    closest: (selector) =>
      selector === "[data-connector-task]"
        ? { dataset: { connectorTask: "2", connectorSide: "end" } }
        : selector === "[data-gantt-calendar-task]"
          ? body
          : null,
  };
  assert.equal(
    ganttConnectionTarget(hit, [source, target], 1, 200, 40, "end").side,
    "end",
  );
  const bodyHit = {
    closest: (selector) =>
      selector === "[data-gantt-calendar-task]" ? body : null,
  };
  assert.equal(
    ganttConnectionTarget(bodyHit, [source, target], 1, 170, 40, "end").side,
    "end",
  );
  target.task.start_date = "2026-01-08";
  target.task.due_date = "2026-01-10";
  assert.equal(
    ganttConnectionTarget(bodyHit, [source, target], 1, 170, 40, "end").side,
    "start",
  );
});

test("graph eligibility excludes self, existing edges, ancestors and tasks outside the loaded project scope", async () => {
  const { ganttConnectionTargets, ganttConnectionTarget } =
    await connectionPolicy();
  const task = (id, dependencies = []) => ({
    id,
    dependencies,
    permissions: { dependencies: true },
    state_code: "COMPLETADA",
    parent_id: 99,
  });
  const tasks = [
    task(1, [3]),
    task(2, [1]),
    task(3, [4]),
    task(4),
    task(5),
    { ...task(6), permissions: { dependencies: false } },
  ];
  assert.deepEqual([...ganttConnectionTargets(tasks, 1)], [5]);
  const foreign = {
    task: task(777),
    geometry: { connectable: true, y: 40, left: 100, right: 180 },
  };
  const hit = {
    closest: (selector) =>
      selector === "[data-gantt-calendar-task]"
        ? { dataset: { ganttCalendarTask: "777" } }
        : null,
  };
  assert.equal(
    ganttConnectionTarget(hit, [foreign], 1, 120, 40, "start", {
      tasks,
      allowed: ganttConnectionTargets(tasks, 1),
    }),
    null,
  );
});
