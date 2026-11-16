import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as vendor from "@svar-ui/gantt-store";
class Surface extends EventTarget {
  captures = new Set();
  addEventListener(type, listener, options) { super.addEventListener(type, listener, typeof options === "boolean" ? { capture: options } : options); }
  removeEventListener(type, listener, options) { super.removeEventListener(type, listener, typeof options === "boolean" ? { capture: options } : options); }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
  getBoundingClientRect() { return { left: 0, right: 800, width: 800 }; }
}
const document = new Surface(), window = new Surface();
document.getSelection = () => ({ removeAllRanges() {} });
let frameId = 0;
const frames = new Map();
const context = vm.createContext({ Date, document, window, console, queueMicrotask, requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId; }, cancelAnimationFrame: id => frames.delete(id) });
const cache = new Map();
async function load(url) {
  if (cache.has(url.href)) return cache.get(url.href);
  const code = ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = new vm.SourceTextModule(code, { context }); cache.set(url.href, module);
  await module.link(name => name === "@svar-ui/gantt-store" ? new vm.SyntheticModule(Object.keys(vendor), function () { for (const [key, value] of Object.entries(vendor)) this.setExport(key, value); }, { context }) : load(new URL(name + ".ts", url)));
  return module;
}
async function ns(name) { const m = await load(new URL("../src/features/home/views/TaskGantt/" + name + ".ts", import.meta.url)); if (m.status === "linked") await m.evaluate(); return m.namespace; }
const snap = await ns("ganttCalendarSnap"), geo = await ns("ganttGeometry"), viewport = await ns("ganttViewport"), zoom = await ns("ganttZoom"), scene = await ns("ganttSceneGeometry"), programming = await ns("ganttProgrammingGesture"), calendar = await ns("ganttCalendar");
function setup(scale = "week", level = 5) {
  const view = viewport.centeredViewport(new Date(2024, 1, 29, 12), scale, level, 800), store = new vendor.DataStore();
  store.init({ ...view, tasks: [], links: [], columns: [], autoScale: false, cellHeight: 40, scaleHeight: 28, _weekStart: 1, cellWidth: viewport.viewportCellWidth(view), scales: viewport.viewportScales(view) });
  return store.getState();
}
const key = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
for (const scale of Object.keys(zoom.ganttZoom)) for (let level = 1; level <= 9; level++) {
  test(`direct editing ${scale} zoom ${level}: subcell precision and preserved interval`, () => {
    const s = setup(scale, level), start = new Date(2024, 1, 29), end = new Date(2024, 2, 2), x = geo.datePosition(start, s), next = geo.datePosition(new Date(2024, 2, 1), s);
    const partial = { start_date: "2024-02-29", due_date: null, parent_id: 17, state_code: "CERRADO" };
    const range = snap.programRange(x + .1, x + .2, s, partial);
    if (scale === "day") { assert.equal(range.schedule.precision, "hour"); assert.equal(Date.parse(range.schedule.end) - Date.parse(range.schedule.start), 3600000); }
    else { assert.equal(range.start_date, "2024-02-29"); assert.equal(range.due_date, "2024-02-29"); }
    const moved = snap.gestureWindow(start, end, x, next - x, s, "move");
    assert.equal(key(moved.start), "2024-03-01"); assert.equal(key(moved.end), "2024-03-03");
    const resize = snap.gestureWindow(start, end, x, next - x, s, "start");
    assert.equal(key(resize.start), "2024-03-01"); assert.equal(resize.end, end);
    assert.equal(partial.parent_id, 17); assert.equal(partial.state_code, "CERRADO"); assert.equal(partial.due_date, null);
    const hourStart = new Date(2024, 1, 29, 9, 15), hourEnd = new Date(2024, 1, 29, 10, 15), hx = geo.datePosition(hourStart, s), target = geo.datePosition(new Date(2024, 1, 29, 11, 15), s);
    const hourly = snap.gestureWindow(hourStart, hourEnd, hx, target - hx, s, "move", "hour");
    assert.equal(hourly.start.getHours(), 11); assert.equal(hourly.start.getMinutes(), 15); assert.equal(hourly.end - hourly.start, 3600000);
  });
}
test("short, clipped, missing and offscreen bars retain distinct accessible geometry", () => {
  const task = { start_date: "2026-11-10", due_date: "2026-11-10", parent_id: null, permissions: { dependencies: true } }, view = { scrollLeft: 0, scrollTop: 0, width: 800, height: 200, cellHeight: 40 };
  const short = scene.ganttBarGeometry(task, { $x: 100, $w: 2, $y: 0 }, view);
  assert.equal(short.real, true); assert.equal(short.resizeStart, null); assert.equal(short.resizeEnd, null); assert.equal(short.moveControl, undefined); assert.ok(short.labelLeft > short.right);
  const active = scene.ganttBarGeometry(task, { $x: 100, $w: 2, $y: 0 }, view, true);
  assert.equal(active.left, short.left); assert.equal(active.right, short.right); assert.equal(active.displayRight - active.displayLeft, 72);
  assert.equal(active.resizeStart, active.displayLeft + 12); assert.equal(active.resizeEnd, active.displayRight - 12);
  assert.ok(active.labelLeft >= active.endConnector + 12);
  const clipped = scene.ganttBarGeometry(task, { $x: -100, $w: 950, $y: 0 }, view);
  assert.equal(clipped.resizeStart, null); assert.equal(clipped.resizeEnd, null); assert.equal(clipped.startConnector, null); assert.equal(clipped.endConnector, null);
  for (const [x, direction] of [[-40, "before"], [810, "after"]]) { const result = scene.ganttBarGeometry(task, { $x: x, $w: 10, $y: 0 }, view); assert.equal(result.real, true); assert.equal(result.outside, direction); }
  assert.equal(scene.hasGanttInterval({ ...task, due_date: null }), false);
  assert.equal(scene.hasGanttInterval({ ...task, schedule: { precision: "hour", start: "2026-11-10T09:00-05:00", end: null } }), false);
});
function event(target, type, properties = {}) { const e = Object.assign(new Event(type, { cancelable: true }), { pointerId: 2, buttons: 1, clientX: 300, clientY: 100, detail: 1, ...properties }); target.dispatchEvent(e); return e; }
function gestureEnv() {
  let state = setup(), previews = [], writes = [], opens = 0, clear;
  const node = new Surface(), task = { id: 1, name: "Parcial", start_date: "2024-02-29", due_date: null, calendar_revision: "9007199254740999" };
  state = { ...state, scrollLeft: 0, scrollTop: 0, _tasks: [{ id: 1 }] };
  const start = () => programming.startGanttProgramming({ pointerId: 2, clientX: 300, clientY: 100 }, { node, task, api: { getState: () => state }, canStart: () => true, preview: v => previews.push(v), commit: v => writes.push(v), open: () => opens++, navigate: px => { state.scrollLeft += px; }, suppress: fn => { clear?.(); clear = fn; } });
  return { node, start, previews, writes, state: () => state, replace: s => { state = s; }, opens: () => opens, dispose: () => clear?.() };
}
test("programming requires movement, commits once and cancels or restarts without a cooldown", () => {
  const h = gestureEnv();
  let cancel = h.start(); event(document, "pointerup"); assert.equal(h.opens(), 1); assert.equal(h.writes.length, 0);
  for (const mode of ["Escape", "pointercancel", "lostpointercapture", "dispose"]) {
    cancel = h.start(); event(document, "pointermove", { clientX: 330 }); assert.equal(h.node.captures.size, 1);
    if (mode === "Escape") event(document, "keydown", { key: "Escape" }); else if (mode === "dispose") cancel(); else event(mode === "lostpointercapture" ? h.node : document, mode);
    assert.equal(h.node.captures.size, 0); assert.equal(h.writes.length, 0); assert.equal(frames.size, 0);
  }
  cancel = h.start(); event(document, "pointermove", { clientX: 350 }); event(document, "pointerup", { clientX: 350 });
  assert.equal(h.writes.length, 1); assert.equal(h.node.captures.size, 0); assert.equal(frames.size, 0);
  assert.equal(event(document, "click").defaultPrevented, true);
  event(document, "pointerdown"); assert.equal(event(document, "click").defaultPrevented, false);
  cancel(); h.dispose();
});
test("range recycling keeps a programming anchor in calendar coordinates", () => {
  const h = gestureEnv(), cancel = h.start(); event(document, "pointermove", { clientX: 350 });
  const before = h.previews.filter(Boolean).at(-1).proposal;
  const old = h.state(), movedStart = vendor.getAdder("day")(old._scales.start, -7);
  h.replace({ ...old, scrollLeft: old.scrollLeft + old.cellWidth * 7, _scales: { ...old._scales, start: movedStart } });
  event(document, "pointermove", { clientX: 350 });
  const after = h.previews.filter(Boolean).at(-1).proposal;
  assert.equal(after.start_date, before.start_date); assert.equal(after.due_date, before.due_date);
  cancel(); h.dispose();
});
test("hourly proposals project the current Lima DATE, rather than stale adapter metadata", () => {
  const row = calendar.toGanttWindow({ id: 1, name: "Horario", start_date: "2026-11-10", due_date: "2026-11-10", schedule: { precision: "hour", start: "2026-11-10T23:00:00-05:00", end: "2026-11-11T00:00:00-05:00", timezone: "America/Lima" } });
  const next = calendar.fromGanttWindow({ ...row, start: new Date("2026-11-12T23:00:00-05:00"), end: new Date("2026-11-13T00:00:00-05:00") });
  assert.equal(next.start_date, "2026-11-12"); assert.equal(next.due_date, "2026-11-12");
});

const barLayout = await ns("ganttBarLayout"), gestures = await ns("ganttPointerGesture"), readOnly = await ns("ganttReadOnly");
for (const scale of Object.keys(zoom.ganttZoom)) for (let level = 1; level <= 9; level++) {
 test(`native hourly layout ${scale} zoom ${level}: exact endpoints without date mutation even when protected`,async()=>{
   const task={id:1,name:"Hora con minutos",start_date:"2024-02-29",due_date:"2024-02-29",schedule:{precision:"hour",start:"2024-02-29T09:15:00-05:00",end:"2024-02-29T10:15:00-05:00",timezone:"America/Lima"},parent_id:null,labels:[],assignees:[],permissions:{edit:true}};
   const row=calendar.toGanttRows([task])[0],view=viewport.centeredViewport(row.start,scale,level,800),store=new vendor.DataStore();
   store.init({...view,tasks:[row],links:[],columns:[],autoScale:false,durationUnit:"day",lengthUnit:"day",inclusiveEnd:true,cellWidth:viewport.viewportCellWidth(view),scales:viewport.viewportScales(view),cellHeight:40,scaleHeight:28});
   const api={getState:store.getState.bind(store),getTask:store.getTask.bind(store),getReactiveState:store.getReactive.bind(store),exec:store.in.exec,on:store.in.on.bind(store.in),intercept:store.in.intercept.bind(store.in),detach:store.in.detach.bind(store.in)};
   let writes=0;
   const gesture=gestures.createGanttPointerGesture({canStart:()=>true,commit:()=>{writes++;return true;},reset:()=>{},preview:()=>{}});
   gesture.setWritable(false);const off=readOnly.bindGanttReadOnly(api,gesture.allowPreview),stop=barLayout.bindGanttBarLayout(api,gesture.layout,gesture.dragging);
   await new Promise(setImmediate);await new Promise(setImmediate);
   const state=api.getState(),native=api.getTask(1),left=geo.datePosition(row.start,state),right=geo.datePosition(row.end,state);
   assert.ok(Math.abs(native.$x-left)<.001);assert.ok(Math.abs(native.$w-(right-left))<.001);
   assert.equal(native.start.getTime(),row.start.getTime());assert.equal(native.end.getTime(),row.end.getTime());assert.equal(writes,0);
   await api.exec("update-task",{id:1,task:{start:new Date(2030,1,1)}});assert.equal(api.getTask(1).start.getTime(),row.start.getTime());
   stop();off();gesture.dispose();
 });
}

test("programming follows its task ID after visible rows reorder and cancels if the row disappears", () => {
  const h = gestureEnv();
  const cancel = h.start();
  event(document, "pointermove", { clientX: 350 });
  h.replace({ ...h.state(), scrollTop: 20, _tasks: [{ id: 2 }, { id: -1, gmFooter: true }, { id: 1 }] });
  event(document, "pointermove", { clientX: 360 });
  assert.equal(h.previews.filter(Boolean).at(-1).id, 1);
  assert.equal(h.previews.filter(Boolean).at(-1).y, 136);
  h.replace({ ...h.state(), _tasks: [{ id: 2 }, { id: -1, gmFooter: true }] });
  event(document, "pointerup", { clientX: 370 });
  assert.equal(h.writes.length, 0); assert.equal(h.previews.at(-1), null); assert.equal(h.node.captures.size, 0);
  cancel(); h.dispose();
});

const bounds = await ns("ganttProgrammingBounds");
test("historical closed parent programming includes existing child dates and remains inside its own parent", () => {
  const parent = { id: 1, start_date: "2026-10-07", due_date: "2026-12-07" };
  const hello = { id: 3, parent_id: 1, start_date: "2026-10-07", due_date: null, state_code: "COMPLETADA" };
  const child = { id: 9, parent_id: 3, start_date: "2026-10-07", due_date: null, state_code: "BLOQUEADA" };
  const result = bounds.constrainGanttProgramming({ start_date: "2026-10-22", due_date: "2027-01-12" }, hello, [parent, hello, child], { start_date: "2026-10-07", end_date: "2026-12-07" });
  assert.equal(result.start_date, "2026-10-07"); assert.equal(result.due_date, "2026-12-07");
  assert.equal(hello.due_date, null); assert.equal(hello.state_code, "COMPLETADA"); assert.equal(child.due_date, null); assert.equal(child.parent_id, 3);
});
test("hourly family bounds retain explicit precision and reject a family without a valid interval", () => {
  const parent = { id: 1, start_date: "2026-11-10", due_date: "2026-11-10", schedule: { precision: "hour", start: "2026-11-10T09:30:00-05:00", end: "2026-11-10T12:30:00-05:00", timezone: "America/Lima" } };
  const task = { id: 2, parent_id: 1, start_date: "2026-11-10", due_date: null };
  const result = bounds.constrainGanttProgramming({ schedule: { precision: "hour", start: "2026-11-10T08:00:00-05:00", end: "2026-11-10T14:00:00-05:00", timezone: "America/Lima" } }, task, [parent, task], { start_date: null, end_date: null });
  assert.equal(result.schedule.precision, "hour"); assert.equal(result.schedule.start, "2026-11-10T14:30:00.000Z"); assert.equal(result.schedule.end, "2026-11-10T17:30:00.000Z");
  assert.equal(bounds.constrainGanttProgramming({ start_date: "2026-11-10", due_date: "2026-11-10" }, task, [parent, task], { start_date: null, end_date: null }), null);
});

for (const scale of Object.keys(zoom.ganttZoom)) for (let level = 1; level <= 9; level++) {
  test(`daily boundary rounding ${scale} zoom ${level}: exact calendar limits survive subpixel rounding`, () => {
    const state = setup(scale, level);
    for (const start of [new Date(2024, 1, 29), new Date(2024, 2, 31), new Date(2024, 11, 31)]) {
      const next = vendor.getAdder("day")(start, 1), end = vendor.getAdder("day")(start, 3);
      const x = geo.datePosition(start, state), target = geo.datePosition(next, state);
      const dailyWidth = Math.abs(target - x), noise = Math.min(.45, dailyWidth / 4);
      for (const error of [-noise, 0, noise]) {
        assert.equal(key(snap.nearestGanttDayBoundary(target + error, state)), key(next));
        const moved = snap.gestureWindow(start, end, x, target - x + error, state, "move");
        assert.equal(key(moved.start), key(next));
        assert.equal(key(moved.end), key(vendor.getAdder("day")(end, 1)));
        const resized = snap.gestureWindow(start, end, x, target - x + error, state, "start");
        assert.equal(key(resized.start), key(next)); assert.equal(resized.end, end);
        if (scale !== "day") {
          const forward = snap.programRange(x, target + error, state), reverse = snap.programRange(target + error, x, state);
          assert.equal(forward.start_date, key(start)); assert.equal(forward.due_date, key(start));
          assert.equal(reverse.start_date, forward.start_date); assert.equal(reverse.due_date, forward.due_date);
        }
      }
      const endX = geo.datePosition(end, state), extended = vendor.getAdder("day")(end, 1);
      const resize = snap.gestureWindow(start, end, endX, geo.datePosition(extended, state) - endX - noise, state, "end");
      assert.equal(key(resize.start), key(start)); assert.equal(key(resize.end), key(extended));
    }
  });
}
