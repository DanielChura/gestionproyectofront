import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { chooseGanttPeriod } from "./ganttBrowserControls.mjs";
const { chromium } = await import(pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE));
const qa = JSON.parse(fs.readFileSync(process.env.GM_QA_SECRETS_PATH, "utf8")), c = qa.regressions;
assert.ok(c && process.env.GM_BROWSER_REPORT_DIR);
const out = process.env.GM_BROWSER_REPORT_DIR;
const browser = await chromium.launch({ channel: "chrome", headless: true, ignoreDefaultArgs: ["--hide-scrollbars"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 900 }, timezoneId: "America/Lima", colorScheme: "dark" });
page.setDefaultTimeout(12000);
const checks = [], writes = [], errors = [], measurements = [];
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => {
    if (new URL(request.url()).pathname.startsWith("/api/projects/") && !["GET", "OPTIONS"].includes(request.method()))
        writes.push({ path: new URL(request.url()).pathname, method: request.method(), data: request.postDataJSON() });
});
const endpoint = id => `projects/${c.project}/tasks/${id}/`;
const bar = id => page.locator(`[data-gantt-calendar-task="${id}"]`).first();
const settle = () => page.evaluate(() => new Promise(resolve => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
async function api(method, url, data) {
    return page.evaluate(async (args) => {
        const { httpClient } = await import("/src/core/api/httpClient.ts");
        try {
            const r = await httpClient.request(args);
            return { status: r.status, data: r.data };
        }
        catch (e) {
            return { status: e.status, data: e.payload };
        }
    }, { method, url, data });
}
async function task(id) { const r = await api("get", endpoint(id)); assert.equal(r.status, 200); return r.data.task; }
async function ready() { await page.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor(); await chooseGanttPeriod(page, "month"); await settle(); }
async function step(name, action) {
    if (process.env.GM_GRID_CASE && !name.startsWith(process.env.GM_GRID_CASE))
        return;
    await action();
    checks.push(name);
    console.log("PASS " + name);
}
async function wheel(panel, delta) {
    const box = await page.locator(".gm-task-gantt " + panel).boundingBox();
    await page.mouse.move(box.x + 100, box.y + 150);
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(80);
    await settle();
}
async function top() { await wheel(".wx-chart", -10000); }
async function alignment(label) {
    const result = await page.evaluate(() => {
        const root = globalThis.document.querySelector(".gm-task-gantt"), scene = root.querySelector(".gm-gantt-scene").getBoundingClientRect();
        const chart = root.querySelector(".wx-chart"), header = root.querySelector(".gm-gantt-time-header").getBoundingClientRect();
        const rows = [...root.querySelectorAll("[data-gantt-tree-id]")].flatMap(n => {
            const id = Number(n.dataset.ganttTreeId), name = n.getBoundingClientRect(), y = name.y + name.height / 2;
            if (y < header.bottom || y >= scene.bottom)
                return [];
            const b = [...root.querySelectorAll(`[data-gantt-calendar-task="${id}"]`)].map(n => n.getBoundingClientRect()).find(r => r.height > 0);
            const ports = [...root.querySelectorAll(`[data-connector-task="${id}"]`)].map(n => { const r = n.getBoundingClientRect(); return r.y + r.height / 2; });
            const external = [...root.querySelectorAll(".gm-gantt-exterior button")].find(b => b.getAttribute("aria-label") === "Abrir detalle de " + n.innerText)?.getBoundingClientRect();
            return [{ id, y, bar: b ? b.y + b.height / 2 : null, ports, label: external ? external.y + external.height / 2 : null }];
        });
        const edges = [...root.querySelectorAll("[data-gantt-link]")].map(n => { const box = n.closest("svg").getBoundingClientRect(), first = n.getPointAtLength(0), last = n.getPointAtLength(n.getTotalLength()); return { id: n.dataset.ganttLink, from: box.y + first.y, to: box.y + last.y }; });
        return { top: chart.scrollTop, gutter: root.querySelector(".wx-gantt").offsetWidth - root.querySelector(".wx-gantt").clientWidth, overflow: globalThis.getComputedStyle(root.querySelector(".wx-gantt")).overflow, rows, edges };
    });
    for (const row of result.rows)
        for (const y of [row.bar, row.label, ...row.ports].filter(y => y !== null))
            assert.ok(Math.abs(y - row.y) <= 1, JSON.stringify({ label, row }));
    for (const edge of result.edges) {
        const [source, target] = edge.id.split(":").map(Number), a = result.rows.find(r => r.id === source), b = result.rows.find(r => r.id === target);
        if (a && b) {
            assert.ok(Math.abs(edge.from - a.y) <= 1);
            assert.ok(Math.abs(edge.to - b.y) <= 1);
        }
    }
    assert.equal(result.gutter, 0);
    assert.equal(result.overflow, "clip");
    measurements.push({ label, ...result });
    return result;
}
async function level(value) {
    for (let n = 0; n < 9; n++) {
        const current = Number(await page.locator(".gm-task-gantt").getAttribute("data-gantt-zoom"));
        if (current === value)
            return;
        await page.getByRole("button", { name: current < value ? "Acercar cronograma" : "Alejar cronograma", exact: true }).click();
    }
}
async function expose() {
    await page.evaluate(() => {
        let f = globalThis.document.querySelector('.gm-task-gantt');
        f = f[Object.keys(f).find(k => k.startsWith('__reactFiber'))];
        for (; f; f = f.return)
            for (let h = f.memoizedState; h; h = h.next)
                if (h.memoizedState?.getState && h.memoizedState?.exec)
                    globalThis.qaApi = h.memoizedState;
        f = globalThis.document.querySelector('.gm-gantt-scene');
        f = f[Object.keys(f).find(k => k.startsWith('__reactFiber'))];
        for (; f; f = f.return)
            if (f.type?.name === 'TaskGanttScene') {
                globalThis.qaNavigation = f.memoizedProps.navigation;
                break;
            }
    });
}
async function frame(date = '2026-10-01', offset = 60) { await page.evaluate(({ date, offset }) => globalThis.qaNavigation.toDate(new Date(date + 'T00:00:00-05:00'), offset), { date, offset }); await settle(); }
async function theme(dark) { await page.evaluate(dark => globalThis.document.documentElement.classList.toggle('dark', dark), dark); }
async function grid(label) {
    const value = await page.evaluate(async () => {
        const { datePosition } = await import('/src/features/home/views/TaskGantt/ganttGeometry.ts');
        const root = globalThis.document.querySelector('.gm-task-gantt'), chart = root.querySelector('.wx-chart'), bounds = chart.getBoundingClientRect(), rows = root.querySelectorAll('.gm-gantt-time-header [role=row]'), cells = [...rows[rows.length - 1].querySelectorAll('[data-gantt-header-start]')];
        const body = [...root.querySelectorAll('[data-gantt-grid-start]')], full = cells.filter(n => n.dataset.ganttHeaderFull === 'true'), rail = root.querySelector('[aria-label="Desplazamiento vertical del Gantt"]')?.getBoundingClientRect();
        const state = globalThis.qaApi.getState();
        const groups = [...rows].slice(0, -1).flatMap(row => [...row.querySelectorAll('[data-gantt-header-full="true"]')]).map(node => Math.abs(node.getBoundingClientRect().right - (bounds.left + datePosition(new Date(Number(node.dataset.ganttHeaderEnd)), state) - state.scrollLeft)));
        return { groups, label: root.dataset.ganttScale, zoom: Number(root.dataset.ganttZoom), expected: globalThis.qaApi.getState().cellWidth, widths: full.map(n => n.getBoundingClientRect().width), columns: cells.length, body: body.length, limits: cells.map(n => { const b = body.find(b => b.dataset.ganttGridEnd === n.dataset.ganttHeaderEnd); if (!b)
                throw Error('Missing base boundary'); return Math.abs(n.getBoundingClientRect().right - b.getBoundingClientRect().right); }), rail: rail?.width ?? 0, rightGap: root.getBoundingClientRect().right - bounds.right, lowerHorizontal: root.querySelectorAll('[aria-label^="Desplazar cronograma"]').length, outerOverflow: root.closest('.gm-gantt-canvas').scrollWidth - root.closest('.gm-gantt-canvas').clientWidth, scrollbar: chart.offsetHeight - chart.clientHeight };
    });
    assert.ok(value.widths.length);
    assert.ok(Math.max(...value.widths) - Math.min(...value.widths) <= .02, JSON.stringify({ label, ...value }));
    assert.ok(value.widths.every(w => Math.abs(w - value.expected) <= .02));
    assert.equal(value.columns, value.body);
    assert.ok(value.groups.every(delta => delta <= .02));
    assert.ok(Math.max(...value.limits) <= .02, JSON.stringify({ label, ...value }));
    assert.equal(value.lowerHorizontal, 0);
    assert.equal(value.outerOverflow, 0);
    assert.equal(value.scrollbar, 0);
    assert.ok(Math.abs(value.rightGap - value.rail) <= 1);
    measurements.push({ label, ...value });
}
async function ensureLink() {
    if (!(await task(c.green)).dependencies.includes(c.purple))
        assert.equal((await api('post', endpoint(c.green) + 'dependencies/', { predecessor_id: c.purple, dependency_type: 'SS' })).status, 201);
    await page.reload();
    await ready();
    await level(2);
    await expose();
    await frame();
    await top();
}
async function linePoint(part) {
    return page.evaluate(async ({ id, part }) => {
        let f = globalThis.document.querySelector('.gm-gantt-links');
        f = f[Object.keys(f).find(k => k.startsWith('__reactFiber'))];
        while (f && f.type?.name !== 'GanttDependencyLayer') {
            f = f.return;
        }
        const route = f.memoizedProps.model.routes.find(r => r.edge.id === id), { ganttRouteSegments } = await import('/src/features/home/views/TaskGantt/ganttRouteSegments.ts'), box = globalThis.document.querySelector('.gm-gantt-links').getBoundingClientRect();
        const segment = ganttRouteSegments(route.points).filter(s => part === 'curve' ? s.control : !s.control && (part === 'horizontal' ? s.from.y === s.to.y : s.from.x === s.to.x)).sort((a, b) => Math.hypot(b.to.x - b.from.x, b.to.y - b.from.y) - Math.hypot(a.to.x - a.from.x, a.to.y - a.from.y))[0];
        if (!segment)
            throw Error('No segment for ' + part);
        const x = segment.control ? (segment.from.x + 2 * segment.control.x + segment.to.x) / 4 : (segment.from.x + segment.to.x) / 2, y = segment.control ? (segment.from.y + 2 * segment.control.y + segment.to.y) / 4 : (segment.from.y + segment.to.y) / 2;
        return { x: box.x + x, y: box.y + y };
    }, { id: `${c.purple}:${c.green}`, part });
}
async function deleteAt(part, undo = true) {
    const p = await linePoint(part), id = `${c.purple}:${c.green}`, count = writes.length;
    await page.mouse.move(900, 180);
    await settle();
    await page.mouse.move(p.x, p.y);
    await settle();
    const action = page.locator(`[data-remove-link="${id}"]`);
    await action.waitFor();
    assert.equal(await page.locator(`[data-gantt-link="${id}"]`).getAttribute('data-related'), 'true');
    const a = await action.boundingBox();
    assert.ok(Math.hypot(a.x + a.width / 2 - p.x, a.y + a.height / 2 - p.y) <= 48);
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2, { steps: 5 });
    await settle();
    const b = await action.boundingBox();
    assert.ok(Math.abs(a.x - b.x) < .1 && Math.abs(a.y - b.y) < .1);
    await page.screenshot({ path: out + `/after-active-${part}.png` });
    const pending = page.waitForResponse(r => new URL(r.url()).pathname === '/api/' + endpoint(c.green) + 'dependencies/' && r.request().method() === 'DELETE');
    await action.click();
    assert.equal((await pending).status(), 204);
    assert.equal(writes.length, count + 1);
    assert.equal((await task(c.green)).dependencies.includes(c.purple), false);
    if (undo) {
        await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
        await page.locator(`[data-gantt-link="${id}"]`).waitFor();
        assert.equal((await task(c.green)).dependency_links.find(l => l.predecessor_id === c.purple).type, 'SS');
        await page.reload();
        await ready();
        await level(2);
        await expose();
        await frame();
        assert.equal((await task(c.green)).dependency_links.find(l => l.predecessor_id === c.purple).type, 'SS');
    }
}
async function patch(id, changes) { const current = await task(id); const r = await api('patch', endpoint(id), { ...changes, expected_calendar_revision: current.calendar_revision, calendar_intent_id: crypto.randomUUID() }); assert.equal(r.status, 200, JSON.stringify(r.data)); }
async function dragDelta(id, mode, dx) { await bar(id).hover(); await settle(); const target = mode === 'move' ? bar(id) : page.locator(`[data-gantt-edit-task="${id}"][data-gantt-calendar-mode="${mode}"]`), b = await target.boundingBox(), count = writes.length; await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await settle(); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2, { steps: 8 }); assert.equal(writes.length, count); const pending = page.waitForResponse(r => new URL(r.url()).pathname === '/api/' + endpoint(id) && r.request().method() === 'PATCH'); await page.mouse.up(); const r = await pending; assert.equal(r.status(), 200, await r.text()); assert.equal(writes.length, count + 1); assert.equal(await page.getByRole('dialog').count(), 0); }
async function delta(first, last) { return page.evaluate(async ({ first, last }) => { const { datePosition } = await import('/src/features/home/views/TaskGantt/ganttGeometry.ts'), s = globalThis.qaApi.getState(); return datePosition(new Date(last + 'T00:00:00-05:00'), s) - datePosition(new Date(first + 'T00:00:00-05:00'), s); }, { first, last }); }
try {
    await page.goto(`http://localhost:5189/proyectos/${c.project}?vista=gantt`);
    await page.getByLabel('Correo electrónico').fill(qa.admin.email);
    await page.getByLabel('Contraseña', { exact: true }).fill(qa.admin.password);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await ready();
    await expose();
    const child = await task(c.child);
    if (child.due_date)
        await patch(c.child, { due_date: null });
    const parent = await task(c.hello);
    if (parent.due_date)
        await patch(c.hello, { due_date: null });
    await page.reload();
    await ready();
    await expose();
    await step('45 combinaciones por tema mantienen anchos completos uniformes y límites de unidad base al desplazar', async () => {
        const count = writes.length;
        for (const dark of [false, true]) {
            await theme(dark);
            for (const period of ['day', 'week', 'month', 'quarter', 'year']) {
                await chooseGanttPeriod(page, period);
                for (let zoom = 1; zoom <= 9; zoom++) {
                    await level(zoom);
                    await frame('2027-01-01', 70);
                    await grid(`${dark ? 'dark' : 'light'} ${period} ${zoom}`);
                    const b = await page.locator('.wx-chart').boundingBox();
                    await page.mouse.move(b.x + 100, b.y + 100);
                    await page.mouse.wheel(137.5, 0);
                    await settle();
                    await grid(`${dark ? 'dark' : 'light'} ${period} ${zoom} pan`);
                }
            }
        }
        assert.equal(writes.length, count);
    });
    await step('La misma relación se elimina desde horizontal, vertical y curva, con Deshacer exacto y persistencia', async () => {
        await ensureLink();
        for (const part of ['horizontal', 'vertical', 'curve']) {
            await deleteAt(part);
            await page.screenshot({ path: out + `/after-link-${part}.png` });
        }
    });
    await step('Protección conserva navegación y bloquea la eliminación con puntero y teclado', async () => {
        await ensureLink();
        const id = `${c.purple}:${c.green}`, count = writes.length;
        await page.getByRole('button', { name: /^Proteger vista:/ }).click();
        const point = await linePoint('vertical');
        await page.mouse.move(point.x, point.y);
        await settle();
        assert.equal(await page.locator('[data-remove-link]').count(), 0);
        await page.locator(`[data-gantt-link="${id}"]`).focus();
        await page.keyboard.press('Delete');
        await settle();
        assert.equal((await task(c.green)).dependencies.includes(c.purple), true);
        await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
        await settle();
        assert.equal(writes.length, count);
        await page.getByRole('button', { name: /^Vista protegida:/ }).click();
        await frame();
    });
    await step('Líneas próximas conservan la selección y la X elimina únicamente la relación activa', async () => {
        if (!(await task(c.pending)).dependencies.includes(c.purple))
            assert.equal((await api('post', endpoint(c.pending) + 'dependencies/', { predecessor_id: c.purple, dependency_type: 'SS' })).status, 201);
        await ensureLink();
        const p = await linePoint('vertical');
        await page.mouse.move(900, 180);
        await page.mouse.move(p.x, p.y);
        await settle();
        const action = page.locator(`[data-remove-link="${c.purple}:${c.green}"]`);
        await action.waitFor();
        const b = await action.boundingBox();
        await page.mouse.move(b.x + b.width / 2 + 2, b.y + b.height / 2 + 2);
        await settle();
        assert.equal(await action.count(), 1);
        await deleteAt('vertical');
        assert.equal((await task(c.pending)).dependencies.includes(c.purple), true);
        await page.locator(`[data-gantt-link="${c.purple}:${c.green}"]`).focus();
        await page.keyboard.press('Delete');
        await page.getByRole('button', { name: 'Deshacer', exact: true }).waitFor();
        assert.equal((await task(c.green)).dependencies.includes(c.purple), false);
        await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
        await page.locator(`[data-gantt-link="${c.purple}:${c.green}"]`).waitFor();
        await deleteAt('curve', false);
        await page.getByRole('status', { name: 'Dependencia retirada' }).waitFor({ state: 'detached', timeout: 11000 });
        await page.reload();
        await ready();
        await expose();
        assert.equal((await task(c.green)).dependencies.includes(c.purple), false);
        assert.equal((await api('delete', endpoint(c.pending) + 'dependencies/', { predecessor_id: c.purple })).status, 204);
        await page.reload();
        await ready();
        await expose();
    });
    await step('Dibujar, mover y redimensionar en límites semanales y mensuales conserva las fechas exactas', async () => {
        await chooseGanttPeriod(page, 'month');
        await level(5);
        await frame('2026-11-16', 120);
        await top();
        const point = await page.evaluate(async (id) => { const { datePosition } = await import('/src/features/home/views/TaskGantt/ganttGeometry.ts'), s = globalThis.qaApi.getState(), box = globalThis.document.querySelector('.gm-gantt-scene').getBoundingClientRect(), row = globalThis.document.querySelector(`[data-gantt-tree-id="${id}"]`).getBoundingClientRect(); return { x: box.x + datePosition(new Date('2026-11-30T00:00:00-05:00'), s) - s.scrollLeft, y: row.y + row.height / 2 }; }, c.child);
        const dx = await delta('2026-11-30', '2026-12-02');
        await page.mouse.move(point.x, point.y);
        await page.mouse.down();
        await page.mouse.move(point.x + dx, point.y, { steps: 8 });
        const pending = page.waitForResponse(r => new URL(r.url()).pathname === '/api/' + endpoint(c.child) && r.request().method() === 'PATCH');
        await page.mouse.up();
        const created = await pending;
        assert.equal(created.status(), 200, await created.text());
        assert.equal((await task(c.child)).start_date, '2026-11-30');
        assert.equal((await task(c.child)).due_date, '2026-12-01');
        await patch(c.green, { start_date: '2026-11-23', due_date: '2026-11-24' });
        await page.reload();
        await ready();
        await level(5);
        await expose();
        await frame('2026-11-16', 120);
        await dragDelta(c.green, 'move', await delta('2026-11-23', '2026-11-30'));
        assert.equal((await task(c.green)).start_date, '2026-11-30');
        assert.equal((await task(c.green)).due_date, '2026-12-01');
        await chooseGanttPeriod(page, 'quarter');
        await level(5);
        await frame('2026-11-01', 150);
        await patch(c.green, { start_date: '2026-11-01', due_date: '2026-11-03' });
        await page.reload();
        await ready();
        await chooseGanttPeriod(page, 'quarter');
        await level(5);
        await expose();
        await frame('2026-11-01', 150);
        await dragDelta(c.green, 'move', await delta('2026-11-01', '2026-12-01'));
        assert.equal((await task(c.green)).start_date, '2026-12-01');
        assert.equal((await task(c.green)).due_date, '2026-12-03');
        await dragDelta(c.green, 'end', await delta('2026-12-04', '2026-12-06'));
        assert.equal((await task(c.green)).due_date, '2026-12-05');
        await page.reload();
        await ready();
        await expose();
        assert.equal((await task(c.green)).due_date, '2026-12-05');
    });
    await step('Controles superiores y verticales funcionan sin cubrir la última fila ni el borde derecho', async () => {
        await page.setViewportSize({ width: 1920, height: 760 });
        await chooseGanttPeriod(page, 'month');
        await level(2);
        await frame();
        const count = writes.length;
        for (const dark of [false, true]) {
            await theme(dark);
            for (const panel of ['.wx-table', '.wx-chart']) {
                await wheel(panel, -10000);
                await alignment(panel + ' arriba');
                await wheel(panel, 80);
                await alignment(panel + ' medio');
                await wheel(panel, 10000);
                await alignment(panel + ' abajo');
            }
            await grid(dark ? 'dark rail' : 'light rail');
            const rail = await page.getByRole('navigation', { name: 'Desplazamiento vertical del Gantt' }).boundingBox(), chart = await page.locator('.wx-chart').boundingBox();
            assert.ok(rail.x >= chart.x + chart.width - 1);
            assert.equal(rail.width, 24);
            await page.getByRole('button', { name: 'Subir filas de Gantt', exact: true }).click();
            await page.getByRole('button', { name: 'Bajar filas de Gantt', exact: true }).click();
            await page.getByRole('region', { name: 'Calendario de tareas; tabla y línea de tiempo', exact: true }).focus();
            await page.keyboard.press('PageUp');
            await page.keyboard.press('PageDown');
            await settle();
            await alignment('teclado');
            await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
            await settle();
            await grid('flecha superior');
            await frame();
            await page.screenshot({ path: out + `/after-${dark ? 'dark' : 'light'}-month.png` });
        }
        assert.equal(writes.length, count);
        assert.equal(await page.getByRole('navigation', { name: 'Desplazamiento horizontal del cronograma' }).count(), 0);
    });
    assert.deepEqual(errors, []);
}
finally {
    fs.writeFileSync(out + '/grid-links-browser.json', JSON.stringify({ checks, writes, errors, measurements }, null, 2));
    await page.screenshot({ path: out + '/last.png' }).catch(() => { });
    await browser.close();
}
