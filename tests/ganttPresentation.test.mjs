import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

async function load(name, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(new URL('../src/features/home/views/TaskGantt/' + name, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const context = vm.createContext({}), module = new vm.SourceTextModule(code, { context });
  await module.link(name => {
    const values = dependencies[name]; assert.ok(values, name);
    return new vm.SyntheticModule(Object.keys(values), function () { for (const [key, value] of Object.entries(values)) this.setExport(key, value); }, { context });
  });
  await module.evaluate(); return module.namespace;
}
const jsx = (type, props) => ({ type, props });
const runtime = { jsx, jsxs: jsx };
const cells = [{ key: 1, left: 0, width: 1, label: 'Q1', start: 23, end: 24 }, { key: 2, left: 1, width: 49, label: 'Q2', start: 24, end: 73 }];
const rows = [{ height: 28, top: 28, cells }];

test('partial header columns keep padding inside their clipped labels', async () => {
  const m = await load('GanttTimeHeader.tsx', { 'react/jsx-runtime': runtime, './ganttGeometry': { headerGeometry: () => rows } });
  const tree = m.default({ state: {} }), headers = tree.props.children[0].props.children;
  assert.equal(headers[0].props.style.width, 1);
  for (const cell of headers) {
    assert.doesNotMatch(cell.props.className, /\bpx-/);
    assert.match(cell.props.children.props.className, /\bpx-1\b/);
    assert.match(cell.props.className, /overflow-hidden/);
  }
});

test('body grid shares header boundaries and translates physical scroll exactly once', async () => {
  const m = await load('GanttTimeGrid.tsx', { 'react/jsx-runtime': runtime, 'react-dom': { createPortal: (tree, host) => ({ tree, host }) }, './ganttGeometry': { headerGeometry: () => rows } });
  const host = {}, result = m.default({ host, state: { scrollLeft: 23.75, scrollTop: 41, cellHeight: 40, _chartHeight: 200 } });
  assert.equal(result.host, host);
  const columns = result.tree.props.children[0], horizontal = result.tree.props.children[1];
  for (let i = 0; i < cells.length; i++) {
    assert.equal(columns[i].props.style.left, cells[i].left + 23.75);
    assert.equal(columns[i].props.style.width, cells[i].width);
    assert.equal(columns[i].props['data-gantt-grid-start'], cells[i].start);
  }
  assert.equal(horizontal[0].props.style.top, 80); assert.ok(horizontal.length <= 7);
  assert.equal(m.default({ host: null, state: {} }), null);
});

test('visual bar presentation only adjusts DOM dimensions and clears expansion when inactive', async () => {
  const m = await load('ganttBarPresentation.ts'), values = new Map(), attributes = new Set();
  const node = { dataset: { ganttCalendarTask: '7' }, toggleAttribute: (key, value) => value ? attributes.add(key) : attributes.delete(key), style: { setProperty: (key, value) => values.set(key, value) } };
  const root = { querySelectorAll: () => [node] }, task = { id: 7, start_date: '2026-01-01', due_date: '2026-01-01' }, before = structuredClone(task);
  m.applyGanttBarPresentation(root, [{ task, geometry: { expanded: true, left: 100, displayLeft: 65, displayRight: 137 } }]);
  assert.equal(values.get('--gm-present-shift'), '-35px'); assert.equal(values.get('--gm-present-width'), '72px'); assert.ok(attributes.has('data-gantt-expanded'));
  m.applyGanttBarPresentation(root, [{ task, geometry: { expanded: false } }]);
  assert.equal(values.get('--gm-present-shift'), '0px'); assert.equal(values.get('--gm-present-width'), '100%'); assert.equal(attributes.size, 0); assert.deepEqual(task, before);
});
