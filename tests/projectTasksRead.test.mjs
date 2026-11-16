import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
async function harness() {
  let query,
    cache = [],
    epoch = 1,
    resolve;
  const load = new Promise((r) => (resolve = r)),
    context = vm.createContext({});
  const taskCode = ts.transpileModule(
    readFileSync(
      new URL(
        "../src/features/home/utils/taskCollection.ts",
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
  const collection = new vm.SourceTextModule(taskCode, { context });
  await collection.link(() => {
    throw Error("No external dependency");
  });
  await collection.evaluate();
  const deps = {
    react: { useCallback: (fn) => fn },
    "@tanstack/react-query": {
      useQuery: (options) => {
        query = options;
        return {};
      },
      useQueryClient: () => ({ getQueryData: () => cache }),
    },
    "../../../core/services/taskService": { getTasks: () => load },
    "../../auth/api": {
      sessionVersion: () => epoch,
      errorText: (e) => e.message,
    },
    "../../../hooks/useToast": { useToast: () => ({ addToast() {} }) },
    "../utils/useTaskSync": { StaleTaskResponse: class extends Error {} },
    "../utils/taskCollection": collection.namespace,
  };
  deps["@tanstack/react-query"].queryOptions = options => options;
  const queryCode = ts.transpileModule(
    readFileSync(new URL("../src/features/home/hooks/projectTaskQuery.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const queryModule = new vm.SourceTextModule(queryCode, { context });
  await queryModule.link(name => {
    const values = deps[name];
    assert.ok(values, name);
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    }, { context });
  });
  await queryModule.evaluate();
  deps["./projectTaskQuery"] = queryModule.namespace;
  const code = ts.transpileModule(
    readFileSync(
      new URL(
        "../src/features/home/hooks/useProjectTasks.ts",
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
  const m = new vm.SourceTextModule(code, { context });
  await m.link((name) => {
    const values = deps[name];
    assert.ok(values, name);
    return new vm.SyntheticModule(
      Object.keys(values),
      function () {
        for (const [k, v] of Object.entries(values)) this.setExport(k, v);
      },
      { context },
    );
  });
  await m.evaluate();
  m.namespace.useProjectTasks(7);
  return {
    query,
    resolve,
    setCache: (data) => (cache = data),
    setEpoch: (value) => (epoch = value),
  };
}
const task = (id, revision, extra = {}) => ({
  id,
  name: "QA",
  start_date: "2026-11-01",
  due_date: null,
  calendar_revision: revision,
  updated_at: `2026-11-08T01:00:0${revision}Z`,
  ...extra,
});
test("an older collection arriving after confirmation keeps confirmed calendar and newly created tasks", async () => {
  const h = await harness();
  h.setCache([task(1, "1")]);
  const pending = h.query.queryFn();
  h.setCache([task(1, "2", { due_date: "2026-11-03" }), task(2, "1")]);
  h.resolve([task(1, "1")]);
  const result = await pending;
  assert.equal(result.length, 2);
  assert.equal(result[0].calendar_revision, "2");
  assert.equal(result[0].due_date, "2026-11-03");
});
test("an ordinary authorized empty collection replaces old data; a previous session cannot publish", async () => {
  const h = await harness();
  h.setCache([task(1, "1")]);
  const pending = h.query.queryFn();
  h.resolve([]);
  assert.equal((await pending).length, 0);
  const other = await harness();
  const stale = other.query.queryFn();
  other.setEpoch(2);
  other.resolve([task(2, "1")]);
  await assert.rejects(stale);
});
