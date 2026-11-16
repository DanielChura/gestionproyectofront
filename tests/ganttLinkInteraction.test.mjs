import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
async function load(name) {
  const code = ts.transpileModule(readFileSync(new URL('../src/features/home/views/TaskGantt/' + name + '.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = new vm.SourceTextModule(code); await module.link(() => { throw Error('Interaction geometry must remain independent of UI and services'); }); await module.evaluate(); return module.namespace;
}
const { ganttRouteSegments } = await load('ganttRouteSegments');
const { nearestGanttRoutePoint, closestGanttLink, ganttLinkActionPoint } = await load('ganttLinkInteraction');
const route = (id, points) => ({ edge: { id }, points, segments: ganttRouteSegments(points) });

test('nearest point follows horizontal, vertical and actual rounded corners', () => {
  const segments = ganttRouteSegments([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }]);
  const horizontal = nearestGanttRoutePoint(segments, { x: 20, y: 5 });
  assert.equal(horizontal.point.x, 20); assert.equal(horizontal.point.y, 0); assert.equal(horizontal.distance, 5);
  const vertical = nearestGanttRoutePoint(segments, { x: 55, y: 25 });
  assert.equal(vertical.point.x, 50); assert.equal(vertical.point.y, 25); assert.equal(vertical.distance, 5);
  const curve = nearestGanttRoutePoint(segments, { x: 49.25, y: .75 });
  assert.ok(curve.distance < .0001); assert.ok(Math.abs(curve.point.x - 49.25) < .0001);
});

test('full-path target is wider than the visible stroke and crossing selection has hysteresis', () => {
  const a = route('1:2', [{ x: 0, y: 20 }, { x: 100, y: 20 }]), b = route('1:3', [{ x: 50, y: 0 }, { x: 50, y: 100 }]);
  assert.equal(closestGanttLink([a, b], { x: 50, y: 20 }).route.edge.id, '1:2');
  assert.equal(closestGanttLink([a, b], { x: 51, y: 20 }, '1:3').route.edge.id, '1:3');
  assert.equal(closestGanttLink([a, b], { x: 55, y: 20 }, '1:3').route.edge.id, '1:2');
  assert.equal(closestGanttLink([a], { x: 20, y: 26.5 }).route.edge.id, '1:2');
  assert.equal(closestGanttLink([a], { x: 20, y: 27.5 }), null);
});

test('delete target stays in the viewport and clears bar, label and control hit areas', () => {
  const obstacles = [{ left: 100, right: 150, top: 10, bottom: 34 }, { left: 178, right: 400, top: 10, bottom: 34 }];
  const result = ganttLinkActionPoint({ x: 151, y: 22 }, obstacles, 500, 200);
  assert.ok(result); assert.ok(Math.hypot(result.x - 151, result.y - 22) <= 12);
  for (const rect of obstacles) assert.equal(result.x + 12 > rect.left && result.x - 12 < rect.right && result.y + 12 > rect.top && result.y - 12 < rect.bottom, false);
  const corner = ganttLinkActionPoint({ x: 0, y: 0 }, [], 500, 200); assert.equal(corner.x, 12); assert.equal(corner.y, 12);
  assert.equal(ganttLinkActionPoint({ x: 100, y: 100 }, [{ left: 0, right: 500, top: 0, bottom: 200 }], 500, 200), null);
});

test('entering the delete button or leaving the Gantt cancels a queued pointer frame', async () => {
  const listeners = new Map(), frames = new Map();
  let frame = 0, active = null, dispose;
  class Target {
    constructor(kind) { this.kind = kind; }
    closest(selector) {
      if (this.kind === 'action' && selector === '[data-remove-link="1:2"]') return this;
      if (this.kind === 'line' && selector === '[data-gantt-link-hit],[data-gantt-link]') return this;
      return null;
    }
  }
  const host = {
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: name => listeners.delete(name),
  };
  const svg = { current: { closest: () => host, getBoundingClientRect: () => ({ left: 0, top: 0 }) } };
  const react = {
    useMemo: create => create(),
    useRef: current => ({ current }),
    useState: () => [null, value => { active = value; }],
    useLayoutEffect: effect => effect(),
    useEffect: effect => { dispose = effect(); },
  };
  const context = vm.createContext({
    Element: Target,
    requestAnimationFrame: action => { frames.set(++frame, action); return frame; },
    cancelAnimationFrame: id => frames.delete(id),
  });
  const code = ts.transpileModule(readFileSync(new URL('../src/features/home/views/TaskGantt/useGanttLinkInteraction.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = new vm.SourceTextModule(code, { context });
  const exports = { react, './ganttRouteSegments': { ganttRouteSegments }, './ganttLinkInteraction': { closestGanttLink, ganttLinkActionPoint } };
  await module.link(name => new vm.SyntheticModule(Object.keys(exports[name]), function () {
    for (const [key, value] of Object.entries(exports[name])) this.setExport(key, value);
  }, { context }));
  await module.evaluate();
  module.namespace.useGanttLinkInteraction([route('1:2', [{ x: 0, y: 20 }, { x: 100, y: 20 }])], svg, [], 500, 200);
  const move = x => listeners.get('pointermove')({ target: new Target('line'), clientX: x, clientY: 23 });
  move(20);
  assert.equal(frames.size, 1);
  for (const [id, action] of frames) { frames.delete(id); action(); }
  assert.equal(active.id, '1:2'); assert.equal(active.point.x, 20);
  move(60);
  listeners.get('pointermove')({ target: new Target('action') });
  assert.equal(frames.size, 0); assert.equal(active.point.x, 20);
  move(70);
  listeners.get('pointerleave')();
  assert.equal(frames.size, 0); assert.equal(active, null);
  move(80);
  dispose();
  assert.equal(frames.size, 0); assert.equal(listeners.size, 0);
});
