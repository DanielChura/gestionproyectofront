import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

class Surface {
  listeners = new Map();
  clientHeight = 250;
  scrollTop = 0;
  addEventListener(name, fn) { const items = this.listeners.get(name) ?? new Set(); items.add(fn); this.listeners.set(name, items); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  closest() { return null; }
  emit(name, values = {}) {
    const event = { target: this, deltaX: 0, deltaY: 0, deltaMode: 0, preventDefault() { this.prevented = true; }, stopImmediatePropagation() {}, ...values };
    this.listeners.get(name)?.forEach(fn => fn(event)); return event;
  }
}
async function fixture() {
  const frames = new Map(), root = new Surface(), chart = new Surface(), subscribers = new Set(), actions = [];
  root.querySelector = () => chart;
  const context = vm.createContext({ Element: Surface, ResizeObserver: class { observe() {} disconnect() {} }, requestAnimationFrame: fn => { const id = Symbol(); frames.set(id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id) });
  const code = ts.transpileModule(readFileSync(new URL("../src/features/home/views/TaskGantt/ganttScroll.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
  const module = new vm.SourceTextModule(code, { context }); await module.link(() => { throw Error("Scroll controller must stay independent of UI services"); }); await module.evaluate();
  const state = { _tasks: Array.from({ length: 10 }, (_, id) => ({ id })), cellHeight: 40, _scales: { height: 56 }, scrollTop: 0, scrollLeft: 0 };
  const interceptors = new Set(), listeners = new Set();
  const store = { subscribe: fn => { subscribers.add(fn); return () => subscribers.delete(fn); } };
  const api = { getState: () => state, getReactiveState: () => ({ _tasks: store, _chartHeight: store, _scales: store }), intercept: (_name, fn) => interceptors.add(fn), on: (_name, fn) => listeners.add(fn), detach: () => { listeners.clear(); interceptors.clear(); }, exec: (name, event) => { interceptors.forEach(fn => fn(event)); actions.push({ name, ...event }); if (event.top !== undefined) state.scrollTop = event.top; if (event.left !== undefined) state.scrollLeft = event.left; listeners.forEach(fn => fn()); } };
  const views = [], binding = module.namespace.bindGanttScroll(api, root, view => views.push(view));
  const flush = () => { for (const [key, fn] of [...frames]) { frames.delete(key); fn(); } };
  flush();
  return { root, chart, state, api, views, actions, binding, subscribers, flush, frames };
}

test("wheel on either panel, keyboard and indicators share one clamped position without data writes", async () => {
  const h = await fixture();
  assert.equal(h.views.at(-1).height, 194); assert.equal(h.views.at(-1).maximum, 206);
  assert.equal(h.root.emit("wheel", { target: new Surface(), deltaY: 30 }).prevented, true); h.flush();
  assert.equal(h.state.scrollTop, 30); assert.equal(h.chart.scrollTop, 30);
  h.root.emit("wheel", { target: h.chart, deltaY: 30 }); h.flush(); assert.equal(h.state.scrollTop, 60);
  h.binding.step(1); h.flush(); assert.equal(h.state.scrollTop, 100);
  h.root.emit("keydown", { key: "PageDown" }); h.flush(); assert.equal(h.state.scrollTop, 206);
  h.api.exec("scroll-chart", { top: 999 }); h.flush(); assert.equal(h.chart.scrollTop, 206);
  h.chart.scrollTop = 50; h.chart.emit("scroll"); h.flush(); assert.equal(h.state.scrollTop, 50);
  h.root.emit("wheel", { deltaY: 20, shiftKey: true }); h.flush(); assert.equal(h.state.scrollTop, 50); assert.equal(h.state.scrollLeft, 20);
  assert.ok(h.actions.every(action => action.name === "scroll-chart")); h.binding.dispose();
});

test("filtering clamps the offset and teardown removes every listener and scheduled frame", async () => {
  const h = await fixture(); h.binding.step(5); h.flush(); assert.equal(h.state.scrollTop, 200);
  h.state._tasks = [{ id: 4 }]; h.subscribers.forEach(fn => fn()); h.flush(); h.flush();
  assert.equal(h.state.scrollTop, 0); assert.equal(h.chart.scrollTop, 0); assert.equal(h.views.at(-1).maximum, 0);
  h.binding.dispose(); assert.equal(h.frames.size, 0); assert.equal(h.subscribers.size, 0);
  const count = h.actions.length; h.root.emit("wheel", { deltaY: 80 }); h.chart.emit("scroll"); assert.equal(h.actions.length, count);
});
