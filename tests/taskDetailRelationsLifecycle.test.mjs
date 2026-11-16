import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
async function harness() {
  let current = true,
    hold = false,
    disposed = false,
    lateUpdates = 0;
  const cleanups = [],
    pending = [],
    published = [],
    received = [];
  const react = {
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useRef: (value) => ({ current: value }),
    useSyncExternalStore: () => 0,
    useState: (initial) => [
      typeof initial === "function" ? initial() : initial,
      () => {
        if (disposed) lateUpdates++;
      },
    ],
    useEffect: (fn) => cleanups.push(fn()),
  };
  const sync = {
    isCurrent: () => current,
    read: (load) => load(),
    observe: (task) => task,
    observeMany: (tasks) => tasks,
    current: (task) => task,
    confirmMany: (tasks) => {
      published.push(...tasks);
      return tasks;
    },
    subscribe: () => () => {},
    getVersion: () => 0,
  };
  const services = {
    getTaskDetail: ({ taskId }) =>
      hold
        ? new Promise((resolve) =>
            pending.push(() =>
              resolve({
                task: {
                  id: taskId,
                  dependency_links: [{ predecessor_id: 1, type: "SS" }],
                },
              }),
            ),
          )
        : Promise.resolve({ task: { id: taskId } }),
    getTaskRelations: async () => ({ items: [], next_cursor: null }),
    getTaskActivity: async () => ({ items: [], next_cursor: null }),
    getTaskSubtasks: async () => ({ items: [], next_cursor: null }),
    changeTaskState: async () => {},
  };
  const module = new vm.SourceTextModule(
    ts.transpileModule(
      readFileSync(
        new URL("../src/features/home/hooks/useTaskDetail.ts", import.meta.url),
        "utf8",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
  );
  await module.link((name) => {
    const values = {
      react,
      "../services": services,
      "../../auth/api": { errorText: (error) => error.message },
      "../utils/useTaskSync": { useTaskSync: () => sync },
    }[name];
    assert.ok(values, name);
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values))
        this.setExport(name, value);
    });
  });
  await module.evaluate();
  const model = module.namespace.useTaskDetail(
    { projectId: 4, taskId: 2 },
    (task) => received.push(task),
  );
  for (let i = 0; i < 6; i++) await Promise.resolve();
  return {
    model,
    published,
    received,
    pending,
    hold: () => {
      hold = true;
    },
    expire: () => {
      current = false;
    },
    unmount: () => {
      cleanups.forEach((fn) => fn?.());
      disposed = true;
    },
    get lateUpdates() {
      return lateUpdates;
    },
  };
}
test("closing detail during post-commit reconciliation still publishes both confirmed endpoints without updating the closed component", async () => {
  const h = await harness();
  h.hold();
  const saving = h.model.relationsChanged(1);
  for (let i = 0; i < 6; i++) await Promise.resolve();
  assert.equal(h.pending.length, 2);
  h.unmount();
  h.pending.forEach((resolve) => resolve());
  await saving;
  assert.deepEqual(h.published.map((t) => t.id).sort(), [1, 2]);
  assert.equal(h.received.length, 2);
  assert.equal(h.lateUpdates, 0);
});
test("expired project or session never publishes a late relation snapshot", async () => {
  const h = await harness();
  h.hold();
  const saving = h.model.relationsChanged(1);
  h.expire();
  h.pending.forEach((resolve) => resolve());
  await saving;
  assert.equal(h.published.length, 0);
  assert.equal(h.received.length, 0);
  h.unmount();
});
