import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { DataStore } from "@svar-ui/gantt-store";

const source = ts.transpileModule(
  readFileSync(
    new URL(
      "../src/features/projects/TaskGantt/ganttGeometry.ts",
      import.meta.url,
    ),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const module = new vm.SourceTextModule(source);
await module.link(() => {
  throw Error("Geometry must not depend on a renderer or HTTP");
});
await module.evaluate();
const { datePosition, calendarScrollLeft, isoWeekLabel, dependencyPath } =
  module.namespace;
const config = {
  links: [],
  columns: [{ id: "text" }],
  durationUnit: "day",
  lengthUnit: "day",
  inclusiveEnd: true,
  autoScale: false,
  cellHeight: 40,
  scaleHeight: 28,
  _weekStart: 1,
};

test("overlay geometry equals real MIT bar endpoints across units, DST and nullable task metadata", () => {
  const original = process.env.TZ;
  try {
    for (const zone of [
      "America/Lima",
      "America/New_York",
      "Europe/Berlin",
      "Pacific/Auckland",
    ]) {
      process.env.TZ = zone;
      for (const unit of ["day", "month", "quarter", "year"]) {
        const start = new Date(2026, 0, 1),
          end = new Date(2028, 0, 1);
        const first = new Date(2026, 2, 7),
          last = new Date(2026, 2, 11);
        const store = new DataStore();
        store.init({
          ...config,
          cellWidth: 100,
          start,
          end,
          scales: [{ unit, step: 1, format: "%Y" }],
          tasks: [
            { id: 1, text: "Real", type: "task", start: first, end: last },
            {
              id: 2,
              text: "Null",
              type: "gm-open-ended",
              gmStartDate: "2026-03-08",
              gmDueDate: null,
            },
          ],
        });
        assert.ok(
          Math.abs(
            datePosition(first, store.getState()) - store.getTask(1).$x,
          ) <= 1,
          `${zone} ${unit}`,
        );
        assert.ok(
          Math.abs(
            datePosition(last, store.getState()) -
              store.getTask(1).$x -
              store.getTask(1).$w,
          ) <= 2,
        );
        assert.equal(store.getTask(2).end, undefined);
        assert.equal(store.getTask(2).start, undefined);
        assert.equal(store.getTask(2).duration, undefined);
        assert.equal(store.getState()._links.length, 0);
      }
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("calendar navigation aligns with actual MIT bars across DST instead of native elapsed-hour scroll drift", async () => {
  const original = process.env.TZ;
  try {
    for (const zone of [
      "America/Lima",
      "America/New_York",
      "Europe/Berlin",
      "Pacific/Auckland",
    ]) {
      process.env.TZ = zone;
      for (const [month, day] of [
        [2, 9],
        [8, 28],
        [10, 3],
      ]) {
        const date = new Date(2026, month, day),
          start = new Date(date),
          end = new Date(date);
        start.setDate(start.getDate() - 7);
        end.setDate(end.getDate() + 50);
        const through = new Date(date);
        through.setDate(through.getDate() + 1);
        const store = new DataStore();
        store.init({
          ...config,
          start,
          end,
          cellWidth: 40,
          scales: [{ unit: "day", step: 1, format: "%j" }],
          tasks: [
            { id: 1, text: "Known calendar day", start: date, end: through },
          ],
        });
        await store.in.exec("resize-chart", { width: 784, height: 500 });
        await store.in.exec("scroll-chart", {
          left: calendarScrollLeft(date, store.getState()),
        });
        assert.equal(
          datePosition(date, store.getState()) - store.getState().scrollLeft,
          0,
          zone,
        );
        assert.equal(store.getTask(1).$x, store.getState().scrollLeft);
        assert.equal(
          calendarScrollLeft(date, store.getState(), true),
          Math.max(0, store.getTask(1).$x - 392),
        );
      }
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("ISO weekly captions reflect the actual Monday through Sunday across leap and year boundaries", () => {
  for (const [date, week, first, last] of [
    [new Date(2026, 11, 28), "S53", "28 dic", "3 ene"],
    [new Date(2027, 0, 4), "S01", "4 ene", "10 ene"],
    [new Date(2024, 1, 26), "S09", "26 feb", "3 mar"],
  ]) {
    const label = isoWeekLabel(date);
    assert.ok(label.includes(week));
    assert.ok(label.includes(first));
    assert.ok(label.includes(last));
  }
});

test("informative connectors route forwards and backwards without applying scheduling or touching input", () => {
  assert.equal(dependencyPath(20, 20, 150, 60), "M20,20H85V60H150");
  const backward = dependencyPath(150, 20, 20, 60);
  assert.match(backward, /^M150,20H162V40H8V60H20$/);
});

test("today schedules one GM midnight update, handles focus and removes timers and listeners", async () => {
  let now = Date.UTC(2026, 10, 4, 4, 59),
    timer,
    cleanup,
    value;
  class ClockDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  }
  const events = new Map();
  const target = {
    addEventListener(name, fn) {
      events.set(name, fn);
    },
    removeEventListener(name) {
      events.delete(name);
    },
  };
  const context = vm.createContext({
    Date: ClockDate,
    window: target,
    document: target,
    setTimeout(fn, delay) {
      timer = { fn, delay };
      return 1;
    },
    clearTimeout() {
      timer = null;
    },
  });
  const code = ts.transpileModule(
    readFileSync(
      new URL(
        "../src/features/projects/TaskGantt/useGanttToday.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const hook = new vm.SourceTextModule(code, { context });
  await hook.link((name) => {
    const exports =
      name === "react"
        ? {
            useState(initial) {
              value = initial();
              return [
                value,
                (next) => {
                  value = next;
                },
              ];
            },
            useEffect(fn) {
              cleanup = fn();
            },
          }
        : {
            projectToday() {
              return new Intl.DateTimeFormat("en-CA", {
                timeZone: "America/Lima",
                dateStyle: "short",
              }).format(new Date(now));
            },
          };
    return new vm.SyntheticModule(
      Object.keys(exports),
      function () {
        for (const [key, v] of Object.entries(exports)) this.setExport(key, v);
      },
      { context },
    );
  });
  await hook.evaluate();
  hook.namespace.useGanttToday();
  const first = value;
  assert.ok(timer.delay >= 60000 && timer.delay < 61000);
  now += timer.delay;
  timer.fn();
  assert.notEqual(value, first);
  assert.ok(timer.delay > 23 * 60 * 60 * 1000);
  now += 2 * 86400000;
  events.get("focus")();
  assert.notEqual(value, first);
  cleanup();
  assert.equal(timer, null);
  assert.equal(events.size, 0);
});

test("diagram subscriptions coalesce public geometry changes and fully detach on unmount", async () => {
  let next = 0,
    painted = 0;
  const frames = new Map(),
    subscribed = new Set(),
    actions = new Map(),
    cleanups = [];
  const context = vm.createContext({
    requestAnimationFrame(fn) {
      const id = ++next;
      frames.set(id, fn);
      return id;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
  });
  const reactive = new Proxy(
    {},
    {
      get() {
        return {
          subscribe(fn) {
            subscribed.add(fn);
            return () => subscribed.delete(fn);
          },
        };
      },
    },
  );
  const api = {
    getState: () => ({
      _tasks: [],
      _scales: null,
      scrollTop: 0,
      scrollLeft: 0,
      gridWidth: 400,
    }),
    getReactiveState: () => reactive,
    on(action, fn) {
      actions.set(action, fn);
    },
    detach() {
      actions.clear();
    },
  };
  const code = ts.transpileModule(
    readFileSync(
      new URL(
        "../src/features/projects/TaskGantt/TaskGanttScene.tsx",
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
  const scene = new vm.SourceTextModule(code, { context });
  await scene.link((name) => {
    const dependencies = {
      react: {
        useMemo: (fn) => fn(),
        useRef: (initial) => ({ current: initial }),
        useState: (initial) => [initial, () => painted++],
        useEffect: (fn) => cleanups.push(fn()),
        useId: () => "scene",
      },
      "react/jsx-runtime": {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }),
      },
      "./ganttGeometry": { datePosition: () => NaN, dependencyPath },
      "./ganttViewport": { ganttDay: (date) => new Date(date) },
    };
    const values = dependencies[name];
    assert.ok(values, name);
    return new vm.SyntheticModule(
      Object.keys(values),
      function () {
        for (const [key, v] of Object.entries(values)) this.setExport(key, v);
      },
      { context },
    );
  });
  await scene.evaluate();
  scene.namespace.default({
    api,
    tasks: [],
    dependencies: [],
    today: "2026-11-04",
    selected: null,
  });
  assert.ok(actions.size > 0 && subscribed.size > 0);
  for (const action of actions.values()) {
    action();
    action();
  }
  assert.equal(frames.size, 1);
  const draw = [...frames.values()][0];
  frames.clear();
  draw();
  assert.equal(painted, 1);
  for (const fn of subscribed) fn();
  assert.equal(frames.size, 1);
  for (const cleanup of cleanups) cleanup?.();
  assert.equal(frames.size, 0);
  assert.equal(actions.size, 0);
  assert.equal(subscribed.size, 0);
});
