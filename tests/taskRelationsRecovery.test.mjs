import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
async function fixture(send = async () => undefined) {
  let revision = 0,
    current = true,
    writes = 0,
    changed = 0;
  const cleanups = [];
  const react = {
    useState: (value) => [value, () => undefined],
    useRef: (value) => ({ current: value }),
    useEffect: (effect) => {
      cleanups.push(effect());
    },
    useCallback: (fn) => fn,
  };
  const sync = { token: () => revision, isCurrent: () => current };
  const services = {
    convertDependency: async () => undefined,
    changeDependency: async (...args) => {
      writes++;
      return send(...args);
    },
    createTaskRelation: async () => undefined,
    removeTaskRelation: async () => undefined,
    searchRelatedTasks: async () => undefined,
  };
  const source = readFileSync(
    new URL(
      "../src/features/home/hooks/useTaskRelations.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const module = new vm.SourceTextModule(
    ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    }).outputText,
  );
  const dependencies = {
    react,
    "../services": services,
    "../utils/useTaskCalendarEdit": {
      calendarProblem: (error) => (error.ambiguous ? "ambiguous" : null),
    },
    "../../auth/api": { errorText: (error) => error.message },
    "../utils/useTaskSync": { useTaskSync: () => sync },
    "./useTaskDetail": { useTaskPage: () => undefined },
  };
  await module.link((name) => {
    const exports = dependencies[name];
    assert.ok(exports, name);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports))
        this.setExport(key, value);
    });
  });
  await module.evaluate();
  const mutation = module.namespace.useRelationMutation(
    { projectId: 1, taskId: 7 },
    async () => {
      changed++;
      revision++;
    },
  );
  return {
    mutation,
    get writes() {
      return writes;
    },
    get changed() {
      return changed;
    },
    expire() {
      current = false;
    },
    unmount() {
      cleanups.forEach((cleanup) => cleanup?.());
    },
  };
}
test("a persisted relation is acknowledged after its own task reconciliation advances the version", async () => {
  const env = await fixture();
  assert.equal(await env.mutation.link("blocked_by", 3, "", "SS"), true);
  assert.equal(env.writes, 1);
  assert.equal(env.changed, 1);
  assert.equal(await env.mutation.link("blocks", 4, "", "SS"), true);
  assert.equal(env.writes, 2);
});
test("pending and ambiguous relations never send duplicates; unmount rejects late confirmation", async () => {
  let resolve;
  const wait = new Promise((yes) => {
    resolve = yes;
  });
  const env = await fixture(() => wait);
  const first = env.mutation.link("blocked_by", 3, "", "SS");
  assert.equal(await env.mutation.link("blocked_by", 3, "", "SS"), false);
  assert.equal(env.writes, 1);
  env.unmount();
  resolve();
  assert.equal(await first, false);
  assert.equal(env.changed, 0);
  const failed = await fixture(() =>
    Promise.reject(Object.assign(new Error("Network QA"), { ambiguous: true })),
  );
  assert.equal(await failed.mutation.link("blocked_by", 3, "", "SS"), false);
  assert.equal(await failed.mutation.link("blocked_by", 3, "", "SS"), false);
  assert.equal(failed.writes, 1);
});

test("delete captures the server receipt and restore sends it once without substituting a type", async () => {
  const calls = [];
  const env = await fixture(async (...args) => { calls.push(args); return { token: "signed-deletion", expires: 10000 }; });
  assert.equal(await env.mutation.unlink({ kind: "blocks", target_id: 9, predecessor_id: 7, successor_id: 9 }), true);
  assert.equal(env.mutation.undoReceipt.current.token, "signed-deletion");
  assert.equal(await env.mutation.restore(9, env.mutation.undoReceipt.current.token), true);
  assert.deepEqual(calls, [[1, 9, 7, true], [1, 9, 7, false, undefined, "signed-deletion"]]);
  assert.equal(env.changed, 2);
});
