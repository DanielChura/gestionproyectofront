import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as vendor from "@svar-ui/gantt-store";
const cache = new Map();
async function load(url) {
  if (cache.has(url.href))
    return cache.get(url.href);
  const source = ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = new vm.SourceTextModule(source);
  cache.set(url.href, m);
  await m.link(name => name === "@svar-ui/gantt-store" ? new vm.SyntheticModule(Object.keys(vendor), function() {
    for (const [key, value] of Object.entries(vendor))
      this.setExport(key, value);
  }) : load(new URL(name + ".ts", url)));
  return m;
}
async function ns(name) {
  const m = await load(new URL("../src/features/home/views/TaskGantt/" + name + ".ts", import.meta.url)); if (m.status === "linked")
    await m.evaluate(); return m.namespace;
}
const viewport = await ns("ganttViewport"), geometry = await ns("ganttGeometry"), zoom = await ns("ganttZoom"), navigation = await ns("ganttNavigation");
const { DataStore, getAdder } = vendor;
const config = { tasks: [], links: [], columns: [{ id: "text" }], durationUnit: "day", lengthUnit: "day", inclusiveEnd: true, autoScale: false, cellHeight: 40, scaleHeight: 28, _weekStart: 1 };
const prepare = (view, tasks = []) => ({ ...config, ...view, tasks, scales: viewport.viewportScales(view), cellWidth: viewport.viewportCellWidth(view) });
const scales = Object.keys(zoom.ganttZoom);
for (const scale of scales)
  for (let level = 1;level <= 9;level++)
    test(`geometry ${scale} zoom ${level}: real MIT headers, bars and inverse in four zones`, () => {
      const original = process.env.TZ;
      try {
        for (const zone of ["America/Lima", "America/New_York", "Europe/Berlin", "Pacific/Auckland"]) {
          process.env.TZ = zone;
          for (const anchor of [new Date(2024, 1, 29, 12), new Date(2024, 2, 10, 12), new Date(2026, 11, 31, 12)]) {
            const view = viewport.centeredViewport(anchor, scale, level, 1000), store = new DataStore();
            const day = new Date(anchor);
            day.setHours(0, 0, 0, 0);
            const end = getAdder("day")(day, 1);
            store.init(prepare(view, [{ id: 1, text: "DATE", start: day, end, type: "task" }]));
            const state = store.getState(), geo = geometry.timelineGeometry(state);
            assert.equal(state._scales.minUnit, zoom.ganttZoom[scale].unit);
            assert.equal(state.cellWidth, zoom.ganttZoom[scale].widths[level - 1]);
            for (const row of geometry.headerGeometry(state)) {
              let x = 0;
              for (const cell of row.cells) {
                assert.ok(Math.abs(cell.left - x) < 0.01, `${zone} header ${scale}`);
                x = cell.left + cell.width;
              }
              assert.ok(Math.abs(x - state._scales.width) < 0.01);
            }
            for (const row of state._scales.rows) {
              for (const cell of row.cells) {
                assert.ok(Math.abs(geo.fromX(geo.toX(cell.date)).getTime() - cell.date.getTime()) <= 1);
              }
            }
            for (const date of [day, anchor, end]) {
              const x = geo.toX(date);
              assert.ok(Math.abs(geo.fromX(x).getTime() - date.getTime()) <= 1, zone + " inverse " + date);
            }
            const bar = store.getTask(1);
            assert.ok(Math.abs(bar.$x - geo.toX(day)) <= 1);
            assert.ok(Math.abs(bar.$x + bar.$w - geo.toX(end)) <= 2);
            assert.ok(state._scales.rows.at(-1).cells.length <= 2048);
            if (scale === "day")
              assert.equal(viewport.viewportScales(view).at(-1).step, 1);
          }
        }
      }
      finally {
        if (original === undefined)
          delete process.env.TZ;
        else
          process.env.TZ = original;
      }
    });
test("zoom tables are explicit, monotonic and proportional without changing the period", () => {
  for (const item of Object.values(zoom.ganttZoom)) {
    assert.equal(item.widths.length, 9);
    for (let n = 1;n < 9;n++) {
      assert.ok(item.widths[n] > item.widths[n - 1]);
      assert.equal(item.widths[n] - item.widths[n - 1], item.widths[1] - item.widths[0]);
    }
  }
});
function harness() {
  const initial = new Date(2026, 10, 9, 12, 34, 15), nav = navigation.createGanttNavigation(initial), store = new DataStore();
  let scalesChanged = () => { }, writes = 0, updates = 0;
  const render = () => { updates++; store.init(prepare(nav.getSnapshot())); scalesChanged(); };
  render();
  const off = nav.subscribe(render);
  const api = {
    getState: () => store.getState(), exec: (name, data) => {
      if (!["scroll-chart", "resize-chart"].includes(name))
        writes++; return store.in.exec(name, data);
    }, on: store.in.on.bind(store.in), detach: store.in.detach.bind(store.in), getReactiveState: () => ({ _scales: { subscribe(fn) { scalesChanged = fn; return () => { scalesChanged = () => { }; }; } } })
  };
  nav.attach(api);
  const resize = async (width) => { await api.exec("resize-chart", { width, height: 500 }); nav.flush(); };
  const center = () => geometry.positionDate(store.getState().scrollLeft + store.getState()._chartWidth / 2, store.getState());
  return { nav, store, api, resize, center, dispose() { off(); nav.dispose(); }, stats: () => ({ writes, updates }) };
}
test("five zoom cycles 1→9→1 preserve the exact center, dimensions and task-independent calendar", async () => {
  const h = harness();
  await h.resize(1000);
  for (const scale of scales) {
    h.nav.changeScale(scale);
    h.nav.flush();
    while (h.nav.getSnapshot().zoomLevel > 1) {
      h.nav.zoom(-1);
      h.nav.flush();
    }
    const date = h.center().getTime();
    for (let level = 2;level <= 9;level++) {
      h.nav.zoom(1);
      h.nav.flush();
      assert.equal(h.nav.getSnapshot().scale, scale);
      assert.equal(h.nav.getSnapshot().zoomLevel, level);
      assert.ok(Math.abs(h.center().getTime() - date) <= 2);
      assert.equal(h.store.getState().cellHeight, 40);
    }
    h.nav.zoom(1);
    h.nav.flush();
    assert.equal(h.nav.getSnapshot().zoomLevel, 9);
    for (let level = 8;level >= 1;level--) {
      h.nav.zoom(-1);
      h.nav.flush();
      assert.ok(Math.abs(h.center().getTime() - date) <= 2);
    }
    h.nav.zoom(-1);
    assert.equal(h.nav.getSnapshot().zoomLevel, 1);
  }
  assert.equal(h.stats().writes, 0);
  h.dispose();
});
test("successive range recycling is bounded and preserves the pointer date and scroll across months, years and resize", async () => {
  const h = harness();
  await h.resize(900);
  for (const scale of scales) {
    h.nav.changeScale(scale);
    h.nav.flush();
    for (const direction of [-1, 1]) {
      for (let n = 0;n < 80;n++) {
        const before = h.store.getState(), target = geometry.positionDate(before.scrollLeft + direction * 700, before);
        h.nav.scrollBy(direction * 700);
        h.nav.flush();
        const after = h.store.getState();
        assert.ok(Math.abs(geometry.datePosition(target, after) - after.scrollLeft) <= 0.01, `${scale} ${direction} ${n}`);
        assert.ok(after._scales.rows.at(-1).cells.length <= 2048);
      }
    }
    const center = h.center().getTime();
    await h.resize(620);
    assert.ok(Math.abs(h.center().getTime() - center) <= 2);
    await h.resize(900);
  }
  assert.equal(h.stats().writes, 0);
  assert.ok(h.stats().updates < 1000, "no expansion loop");
  h.dispose();
});
test("compact week captions keep ISO week identity across a month/year boundary", () => {
  const original = process.env.TZ;
  process.env.TZ = "America/Lima";
  try {
    const view = viewport.centeredViewport(new Date(2026, 11, 30), "month"), label = viewport.viewportScales(view).at(-1).format(new Date(2026, 11, 28));
    assert.equal(label, "S53 · 28–3");
    assert.equal(viewport.viewportScales(view)[0].format(new Date(2026, 11, 1)), "diciembre de 2026");
  }
  finally {
    if (original === undefined)
      delete process.env.TZ;
    else
      process.env.TZ = original;
  }
});
test("one held navigation intent keeps its original date under the cursor even outside recycled ranges", async () => {
  const h = harness();
  await h.resize(900);
  for (const scale of scales) {
    h.nav.changeScale(scale);
    h.nav.flush();
    const anchor = h.center();
    for (let n = 1;n <= 60;n++) {
      const offset = 450 - n * 700;
      h.nav.toDate(anchor, offset);
      h.nav.flush();
      const state = h.store.getState();
      assert.ok(Math.abs(geometry.datePosition(anchor, state) - state.scrollLeft - offset) < .01, scale + " held " + n);
      assert.ok(state._scales.rows.at(-1).cells.length <= 2048);
    }
  }
  assert.equal(h.stats().writes, 0);
  h.dispose();
});

test("ultrawide resize keeps fixed zoom density and avoids recycling loops",async()=>{const h=harness();await h.resize(7600);h.nav.changeScale("week");h.nav.flush();while(h.nav.getSnapshot().zoomLevel>1){h.nav.zoom(-1);h.nav.flush();}const start=h.stats().updates;for(let i=0;i<40;i++){h.nav.scrollBy(700);h.nav.flush();assert.equal(h.store.getState().cellWidth,32);assert.ok(h.store.getState()._scales.rows.at(-1).cells.length<=2048);}assert.ok(h.stats().updates-start<=40);h.dispose();});

test("late queued navigation after disposal cannot mutate the confirmed viewport or dispatch scroll",async()=>{const h=harness();await h.resize(900);const before=h.nav.getSnapshot();h.nav.dispose();h.nav.toDate(new Date(2027,0,1));h.nav.flush();await Promise.resolve();assert.equal(h.nav.getSnapshot(),before);assert.equal(h.stats().writes,0);h.dispose();});
