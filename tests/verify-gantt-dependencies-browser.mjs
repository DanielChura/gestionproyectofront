import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { chooseGanttPeriod } from "./ganttBrowserControls.mjs";
const { chromium } = await import(pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE));
const origin = "http://localhost:5189";
const qa = JSON.parse(fs.readFileSync(process.env.GM_QA_SECRETS_PATH, "utf8")), c = qa.p4;
assert.ok(c && process.env.GM_BROWSER_REPORT_DIR);
const out = process.env.GM_BROWSER_REPORT_DIR;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1700, height: 1050 }, timezoneId: "America/Lima" });
const page = await context.newPage();
page.setDefaultTimeout(12000);
const checks = [], writes = [], errors = [];
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/api/projects/") && !["GET", "OPTIONS"].includes(request.method()))
    writes.push({ path, method: request.method(), body: request.postDataJSON() }); });
const path = id => `/api/projects/${c.project}/tasks/${id}/dependencies/`;
const taskPath = id => `projects/${c.project}/tasks/${id}/`;
const bar = id => page.locator(`[data-gantt-calendar-task="${id}"]`).first();
const connector = (id, side) => page.locator(`[data-connector-task="${id}"][data-connector-side="${side}"]`);
async function settle() { await page.evaluate(() => new Promise(resolve => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve)))); }
async function api(method, url, data) { return page.evaluate(async ({ method, url, data }) => { const { httpClient } = await import("/src/core/api/httpClient.ts"); try {
    const response = await httpClient.request({ method, url, data });
    return { status: response.status, data: response.data };
}
catch (error) {
    return { status: error.status, data: error.payload };
} }, { method, url, data }); }
async function task(id) { const response = await api("get", taskPath(id)); assert.equal(response.status, 200); return response.data.task; }
async function step(name, action) { if (process.env.GM_P4_CASE && !name.startsWith(process.env.GM_P4_CASE))
    return; await action(); checks.push(name); console.log("PASS " + name); }
async function ready() { await page.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor(); await settle(); }
async function level(value) { for (let i = 0; i < 10; i++) {
    const current = Number(await page.locator(".gm-task-gantt").getAttribute("data-gantt-zoom"));
    if (current === value)
        return;
    await page.getByRole("button", { name: value > current ? "Acercar cronograma" : "Alejar cronograma", exact: true }).click();
} assert.fail("Requested zoom"); }
async function locate(id) { const arrow = page.locator(`[data-gantt-offscreen="${id}"]`); if (await arrow.count())
    await arrow.click(); await settle(); }
async function point(id, side, hover = false) {
    if (hover) {
        const box = await bar(id).boundingBox();
        assert.ok(box);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await settle();
    }
    const node = connector(id, side), bounds = await node.boundingBox();
    assert.ok(bounds, `Real ${side} connector ${id}`);
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}
async function drag(source, target, type, options = {}) {
    const targetSide = type[1] === "S" ? "start" : "end";
    for (let attempt = 0; !await connector(target, targetSide).count() && attempt < 8; attempt++) {
        const zoom = Number(await page.locator(".gm-task-gantt").getAttribute("data-gantt-zoom"));
        if (zoom <= 1) break;
        await level(zoom - 1);
    }
    const start = await point(source, type[0] === "S" ? "start" : "end", true);
    const b = await point(target, targetSide);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 8, start.y + 2);
    await page.locator(".gm-gantt-link-preview").waitFor();
    const count = writes.length;
    await page.mouse.move(b.x, b.y, { steps: 8 });
    await settle();
    assert.equal(writes.length, count, "Preview never writes");
    if (options.cancel) {
        await page.keyboard.press("Escape");
        await page.mouse.up();
        return;
    }
    const response = page.waitForResponse(response => new URL(response.url()).pathname === path(target) && response.request().method() === "POST");
    await page.mouse.up();
    const result = await response;
    assert.equal(result.status(), options.status ?? 201, await result.text());
    if ((options.status ?? 201) === 201) {
        await page.locator(`[data-gantt-link="${source}:${target}"]`).waitFor();
        assert.equal((await task(target)).dependency_links.find(link => link.predecessor_id === source)?.type, type);
    }
    await settle();
}
async function closeNotice() { const close = page.getByRole("button", { name: "Cerrar aviso", exact: true }); if (await close.count())
    await close.click(); }
try {
    await page.goto(origin + `/proyectos/${c.project}?vista=gantt`);
    await page.getByLabel("Correo electrónico").fill(qa.admin.email);
    await page.getByLabel("Contraseña", { exact: true }).fill(qa.admin.password);
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await ready();
    for (const id of [c.fs, c.ss, c.ff, c.sf, c.joint, c.source, c.reverse]) {
        const current = await task(id);
        for (const source of current.dependencies)
            await api("delete", taskPath(id) + "dependencies/", { predecessor_id: source });
    }
    await page.reload();
    await ready();
    await chooseGanttPeriod(page, "day");
    await level(5);
    await locate(c.source);
    await step("Nodos reales, hover continuo, teclado, resize separado y cancelaciones inmediatas", async () => {
        await page.mouse.move(5, 5);
        await settle();
        assert.equal(await connector(c.source, "end").evaluate(node => globalThis.getComputedStyle(node).opacity), "0");
        const p = await point(c.source, "end", true);
        await page.mouse.move(p.x, p.y);
        await settle();
        assert.equal(await connector(c.source, "end").evaluate(node => globalThis.getComputedStyle(node).opacity), "1");
        await connector(c.source, "start").focus();
        assert.equal(await connector(c.source, "start").evaluate(node => globalThis.getComputedStyle(node).opacity), "1");
        await page.getByRole("button", { name: "Hoy", exact: true }).focus(); await settle();
        assert.equal(await connector(c.source, "start").evaluate(node => globalThis.getComputedStyle(node).opacity), "0");
        const count = writes.length;
        for (let i = 0; i < 3; i++)
            await drag(c.source, c.fs, "FS", { cancel: true });
        assert.equal(writes.length, count);
        assert.equal(await page.locator(".gm-gantt-link-preview").count(), 0);
        await page.screenshot({ path: out + "/p4-nodos.png" });
    });
    await step("FS, SS, FF y SF se guardan directamente una vez sin modal ni propagacion", async () => {
        const before = await task(c.source);
        for (const [type, target] of [["FS", c.fs], ["SS", c.ss], ["FF", c.ff], ["SF", c.sf]]) {
            const old = await task(target), count = writes.length;
            await drag(c.source, target, type);
            assert.equal(writes.slice(count).filter(item => item.method === "POST").length, 1);
            assert.equal(await page.getByRole("dialog", { name: "Dependencia", exact: true }).count(), 0);
            const saved = await task(target);
            for (const key of ["start_date", "due_date", "schedule", "calendar_revision", "state_code", "parent_id"])
                assert.deepEqual(saved[key], old[key], key);
        }
        const after = await task(c.source);
        for (const key of ["start_date", "due_date", "schedule", "calendar_revision", "state_code", "parent_id"])
            assert.deepEqual(after[key], before[key], key);
    });
    await step("Orden inverso de filas, uno a varios, varios a uno y persistencia", async () => {
        await drag(c.reverse, c.fs, "FS");
        await drag(c.source, c.joint, "FS");
        await drag(c.reverse, c.joint, "FS");
        assert.equal((await task(c.joint)).dependencies.length, 2);
        await page.reload();
        await ready();
        await chooseGanttPeriod(page, "day");
        await locate(c.source);
        assert.equal(await page.locator("[data-gantt-link]").count(), 7);
        await page.screenshot({ path: out + "/p4-red-confirmada.png" });
    });
    await step("Destinos invalidos cancelan sin clic residual ni escrituras", async () => {
        const count = writes.length;
        const targets = [
            () => page.locator(".gm-gantt-time-header").boundingBox(),
            () => page.locator(".gm-gantt-exterior").filter({ has: page.getByRole("button", { name: "Abrir detalle de Condicionada FS P4", exact: true }) }).boundingBox(),
            () => page.locator(".gm-gantt-exterior").filter({ has: page.getByRole("button", { name: "Abrir detalle de Condicionada FS P4", exact: true }) }).locator("span").first().boundingBox(),
            () => bar(c.source).boundingBox(),
            () => page.locator(".gm-gantt-scene").boundingBox(),
        ];
        for (let i = 0; i < targets.length; i++) {
            const a = await point(c.source, "end", true);
            let box = await targets[i]().catch(() => null);
            assert.ok(box);
            const x = i === 4 ? box.x + box.width - 90 : box.x + box.width / 2;
            const y = i === 4 ? box.y + box.height - 70 : box.y + box.height / 2;
            await page.mouse.move(a.x, a.y);
            await page.mouse.down();
            await page.mouse.move(x, y, { steps: 7 });
            await page.mouse.up();
            await settle();
            assert.equal(writes.length, count);
            assert.equal(await page.locator(".gm-gantt-link-preview").count(), 0);
            assert.equal(await page.getByRole("button", { name: "Cerrar modal", exact: true }).count(), 0);
        }
    });
    await step("Duplicados, ciclos y permisos conservan el grafo confirmado", async () => {
        const count = (await task(c.fs)).dependencies.length;
        await drag(c.source, c.fs, "FS", { status: 400 });
        await closeNotice();
        assert.equal((await task(c.fs)).dependencies.length, count);
        await drag(c.source, c.reverse, "SS");
        await drag(c.reverse, c.source, "SS", { status: 400 });
        await page.getByText("La dependencia generaría un ciclo", { exact: true }).waitFor();
        await closeNotice();
        const self = await api("post", taskPath(c.source) + "dependencies/", { predecessor_id: c.source, dependency_type: "SS" });
        assert.equal(self.status, 400);
        const child = await api("post", taskPath(c.child) + "dependencies/", { predecessor_id: c.source, dependency_type: "SS" });
        assert.equal(child.status, 400);
        assert.equal(await connector(c.child, "end").count(), 0);
        const foreign = await api("post", taskPath(c.source) + "dependencies/", { predecessor_id: qa.scheduling.source, dependency_type: "SS" });
        assert.equal(foreign.status, 404);
    });
    await step("Eliminar y deshacer conservan tipo, identidad y persistencia", async () => {
        const link = page.locator(`[data-gantt-link="${c.source}:${c.ss}"]`);
        await link.focus();
        await page.keyboard.press("Enter");
        const modal = page.getByRole("dialog", { name: "Dependencia", exact: true });
        await modal.waitFor();
        const response = page.waitForResponse(r => new URL(r.url()).pathname === path(c.ss) && r.request().method() === "DELETE");
        await modal.getByRole("button", { name: "Retirar dependencia", exact: true }).click();
        assert.equal((await response).status(), 204);
        await link.waitFor({ state: "detached" });
        await page.getByRole("button", { name: "Deshacer", exact: true }).click();
        await link.waitFor();
        assert.equal((await task(c.ss)).dependency_links.find(l => l.predecessor_id === c.source)?.type, "SS");
    });
    await step("Respuesta perdida despues del commit consulta sin repetir POST", async () => {
        const url = "**" + path(c.ff), count = writes.length;
        await page.route(url, async (route) => { if (route.request().method() !== "POST")
            return route.continue(); const result = await route.fetch(); assert.equal(result.status(), 201); await route.abort("failed"); }, { times: 1 });
        const a = await point(c.reverse, "end", true), b = await point(c.ff, "start");
        await page.mouse.move(a.x, a.y);
        await page.mouse.down();
        await page.mouse.move(b.x, b.y, { steps: 7 });
        await page.mouse.up();
        const consult = page.getByRole("button", { name: "Consultar resultado", exact: true });
        await consult.waitFor();
        assert.equal(writes.slice(count).filter(w => w.method === "POST").length, 1);
        await consult.click();
        await page.locator(`[data-gantt-link="${c.reverse}:${c.ff}"]`).waitFor();
        assert.equal(writes.slice(count).filter(w => w.method === "POST").length, 1);
    });
    await step("Fallo de red antes del commit mantiene contexto y exige nueva intencion", async () => {
        const url = "**" + path(c.sf), count = writes.length;
        await page.route(url, route => route.abort("failed"), { times: 1 });
        const a = await point(c.reverse, "start", true), b = await point(c.sf, "end");
        await page.mouse.move(a.x, a.y);
        await page.mouse.down();
        await page.mouse.move(b.x, b.y, { steps: 7 });
        await page.mouse.up();
        const consult = page.getByRole("button", { name: "Consultar resultado", exact: true });
        await consult.waitFor();
        await consult.click();
        await page.getByText(/La consulta confirmó que el vínculo propuesto no está guardado/).waitFor();
        assert.equal((await task(c.sf)).dependencies.includes(c.reverse), false);
        assert.equal(writes.slice(count).filter(w => w.method === "POST").length, 1);
        await closeNotice();
        await drag(c.reverse, c.sf, "SF");
    });
    await step("Respuesta lenta muestra pendiente y conflicto 409 no reproduce la mutacion", async () => {
        await page.route("**" + path(c.ss), async (route) => { if (route.request().method() !== "POST")
            return route.continue(); const result = await route.fetch(); await new Promise(resolve => setTimeout(resolve, 700)); await route.fulfill({ response: result }); }, { times: 1 });
        const a = await point(c.reverse, "start", true), b = await point(c.ss, "start");
        await page.mouse.move(a.x, a.y);
        await page.mouse.down();
        await page.mouse.move(b.x, b.y, { steps: 7 });
        await page.mouse.up();
        await page.getByText("Guardando dependencia SS…", { exact: true }).waitFor();
        assert.ok(await page.getByLabel("Guardado de dependencia", { exact: true }).evaluate(node => { const r=node.getBoundingClientRect(); return r.top >= 0 && r.bottom <= globalThis.innerHeight; }));
        await page.locator(`[data-gantt-link="${c.reverse}:${c.ss}"]`).waitFor();
        const before = writes.length;
        await page.route("**" + path(c.joint), route => route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ code: "dependency_revision_conflict", detail: "Conflicto controlado QA" }) }), { times: 1 });
        await drag(c.fs, c.joint, "FS", { status: 409 });
        await page.getByText("Conflicto controlado QA", { exact: true }).waitFor();
        assert.equal(writes.slice(before).filter(w => w.method === "POST").length, 1);
        assert.equal((await task(c.joint)).dependencies.includes(c.fs), false);
        await closeNotice();
    });
    await step("Proteccion permite consulta y navegacion sin escrituras graficas", async () => {
        const count = writes.length, shield = page.getByRole("button", { name: /^Proteger vista:/ });
        await shield.click();
        assert.equal(await page.getByRole("button", { name: /^Vista protegida:/ }).getAttribute("aria-pressed"), "true");
        assert.equal(await page.locator("[data-connector-task]").count(), 0);
        const link = page.locator(`[data-gantt-link="${c.source}:${c.fs}"]`);
        await link.focus();
        await page.keyboard.press("Enter");
        const modal = page.getByRole("dialog", { name: "Dependencia", exact: true });
        await modal.waitFor();
        assert.equal(await modal.getByRole("button", { name: "Retirar dependencia", exact: true }).count(), 0);
        await modal.getByRole("button", { name: "Cerrar", exact: true }).click();
        const box = await bar(c.source).boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + 12);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 - 80, box.y + 12, { steps: 10 });
        await page.mouse.up();
        await page.mouse.wheel(0, 100);
        await page.mouse.wheel(0, -100);
        await settle();
        assert.equal(writes.length, count);
        await page.getByRole("button", { name: /^Vista protegida:/ }).click();
        await locate(c.source);
    });
    await step("Detalle, Lista y Tablero comparten la conversion de tipo confirmada", async () => {
        await page.getByRole("button", { name: "Abrir detalle de Condicionada FS P4", exact: true }).click();
        const relations = page.getByRole("region", { name: "Relaciones", exact: true });
        const item = relations.locator("li").filter({ has: page.getByRole("button", { name: "Requisito A P4", exact: true }) });
        await item.getByLabel("Tipo de dependencia").selectOption("SS");
        let releaseRead, markHeld;
        const holdRead = new Promise(resolve => { releaseRead = resolve; }), held = new Promise(resolve => { markHeld = resolve; });
        await page.route("**/api/" + taskPath(c.fs), async (route) => { const response = await route.fetch(); markHeld(); await holdRead; await route.fulfill({ response }); }, { times: 1 });
        const response = page.waitForResponse(r => new URL(r.url()).pathname === path(c.fs) && r.request().method() === "PATCH");
        await item.getByRole("button", { name: "Confirmar tipo", exact: true }).click();
        assert.equal((await response).status(), 200);
        await held;
        await page.getByRole("button", { name: "Cerrar modal", exact: true }).click();
        releaseRead();
        await page.locator(`[data-gantt-link="${c.source}:${c.fs}"][data-dependency-type="SS"]`).waitFor();
        for (const name of ["Lista", "Tablero", "Gantt"]) {
            await page.getByRole("link", { name, exact: true }).click();
            if (name === "Gantt")
                await ready();
            assert.equal((await task(c.fs)).dependency_links.find(l => l.predecessor_id === c.source)?.type, "SS");
        }
        await locate(c.source);
        await page.locator(`[data-gantt-link="${c.source}:${c.fs}"][data-dependency-type="SS"]`).waitFor();
        await page.reload();
        await ready();
        await chooseGanttPeriod(page, "day");
        await locate(c.source);
        await page.locator(`[data-gantt-link="${c.source}:${c.fs}"][data-dependency-type="SS"]`).waitFor();
    });
    await step("Autoscroll expande rango y mantiene previsualizacion hasta cancelar", async () => {
        const count = writes.length;
        await chooseGanttPeriod(page, "day");
        await level(1);
        await locate(c.source);
        const a = await point(c.source, "end", true), box = await page.locator(".gm-gantt-scene").boundingBox();
        await page.mouse.move(a.x, a.y);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width - 7, a.y + 4, { steps: 10 });
        for (let i = 0; i < 2; i++) {
            const previous = await page.locator(".gm-task-gantt").getAttribute("data-gantt-window-start");
            await page.waitForFunction(value => globalThis.document.querySelector(".gm-task-gantt").dataset.ganttWindowStart !== value, previous, { timeout: 20000 });
            assert.equal(await page.locator(".gm-gantt-link-preview").count(), 1);
        }
        await page.mouse.move(box.x + box.width / 2, box.y + box.height - 8, { steps: 8 });
        await page.waitForFunction(() => globalThis.document.querySelector(".gm-task-gantt .wx-chart").scrollTop > 30);
        assert.equal(await page.locator(".gm-gantt-link-preview").count(), 1);
        await page.keyboard.press("Escape");
        await page.mouse.up();
        await settle();
        assert.equal(writes.length, count);
        await page.reload();
        await ready();
        await chooseGanttPeriod(page, "day");
        await level(5);
        await locate(c.source);
        const p = await point(c.source, "end", true);
        await page.mouse.move(p.x, p.y);
        await page.mouse.down();
        await page.mouse.move(p.x + 20, p.y + 20);
        await page.locator(".gm-gantt-scene").evaluate(node => node.releasePointerCapture(1));
        await page.mouse.move(p.x + 21, p.y + 20);
        await settle();
        assert.equal(await page.locator(".gm-gantt-link-preview").count(), 0);
        await page.mouse.up();
        await drag(c.source, c.fs, "FS", { cancel: true });
        assert.equal(writes.length, count);
    });
    await step("Trabajador y acceso directo API respetan permisos de dependencias", async () => {
        const workerContext = await browser.newContext({ viewport: { width: 1500, height: 950 } }), worker = await workerContext.newPage();
        await worker.goto(origin + `/proyectos/${c.project}?vista=gantt`);
        await worker.getByLabel("Correo electrónico").fill(qa.worker.email);
        await worker.getByLabel("Contraseña", { exact: true }).fill(qa.worker.password);
        await worker.getByRole("button", { name: "Ingresar", exact: true }).click();
        await worker.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor();
        assert.equal(await worker.locator("[data-connector-task]").count(), 0);
        const status = await worker.evaluate(async ({ project, source, target }) => { const { httpClient } = await import("/src/core/api/httpClient.ts"); try {
            await httpClient.post(`projects/${project}/tasks/${target}/dependencies/`, { predecessor_id: source, dependency_type: "FS" });
            return 201;
        }
        catch (error) {
            return error.status;
        } }, { project: c.project, source: c.fs, target: c.joint });
        assert.equal(status, 403);
        await workerContext.close();
    });
    await step("Cuerpo de barra elige y resalta el extremo real mas cercano", async () => {
        for (const [source, fraction, type] of [[c.ff, .4, "SS"], [c.ss, .6, "SF"]]) {
            const a = await point(source, "start", true), b = await bar(c.sf).boundingBox();
            await page.mouse.move(a.x, a.y);
            await page.mouse.down();
            await page.mouse.move(b.x + b.width * fraction, b.y + b.height / 2, { steps: 8 });
            await settle();
            assert.equal(await connector(c.sf, type[1] === "S" ? "start" : "end").getAttribute("data-connection-endpoint"), "true");
            const response = page.waitForResponse(r => new URL(r.url()).pathname === path(c.sf) && r.request().method() === "POST");
            await page.mouse.up();
            assert.equal((await response).status(), 201);
            await page.locator(`[data-gantt-link="${source}:${c.sf}"]`).waitFor();
            assert.equal((await task(c.sf)).dependency_links.find(l => l.predecessor_id === source)?.type, type);
        }
    });
    await step("Respuesta confirmada tardia de otro proyecto no altera la nueva vista", async () => {
        let release, captured;
        const held = new Promise(resolve => { release = resolve; }), fetched = new Promise(resolve => { captured = resolve; });
        await page.route("**" + path(c.joint), async (route) => { const response = await route.fetch(); captured(); await held; await route.fulfill({ response }).catch(() => { }); }, { times: 1 });
        await level(1);
        await locate(c.source);
        const a = await point(c.ff, "end", true), b = await point(c.joint, "start");
        await page.mouse.move(a.x, a.y);
        await page.mouse.down();
        await page.mouse.move(b.x, b.y, { steps: 8 });
        await page.mouse.up();
        await fetched;
        await page.getByRole("link", { name: "Gantt vacío QA", exact: true }).click();
        await page.getByRole("link", { name: "Gantt", exact: true }).click();
        await ready();
        release();
        await settle();
        assert.ok(page.url().includes(`/proyectos/${qa.context.empty_project}`));
        assert.equal(await page.locator("[data-gantt-calendar-task]:visible").count(), 0);
        assert.equal(await page.locator("[data-gantt-link]").count(), 0);
        const count = writes.length;
        await page.getByRole("button", { name: "Hoy", exact: true }).click();
        await settle();
        assert.equal(writes.length, count);
    });
    await step("409 real entre dos clientes conserva propuesta sin replay", async () => {
        const existing = (await task(c.fs)).dependency_links.find(link => link.predecessor_id === c.source);
        if (existing) {
            const removed = await api("delete", taskPath(c.fs) + "dependencies/", { predecessor_id: c.source });
            assert.equal(removed.status, 204);
        }
        const seed = await api("post", taskPath(c.fs) + "dependencies/", { predecessor_id: c.source, dependency_type: "FS" });
        assert.equal(seed.status, 201);
        await page.goto(origin + `/proyectos/${c.project}?vista=gantt`);
        await ready();
        await chooseGanttPeriod(page, "day");
        await locate(c.source);
        const otherContext = await browser.newContext({ viewport: { width: 1700, height: 1050 }, timezoneId: "America/Lima" });
        const other = await otherContext.newPage();
        let patches = 0;
        other.on("request", request => {
            if (new URL(request.url()).pathname === path(c.fs) && request.method() === "PATCH")
                patches++;
        });
        await other.goto(origin + `/proyectos/${c.project}?vista=gantt`);
        await other.getByLabel("Correo electrónico").fill(qa.admin_delay.email);
        await other.getByLabel("Contraseña", { exact: true }).fill(qa.admin_delay.password);
        await other.getByRole("button", { name: "Ingresar", exact: true }).click();
        await other.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor();
        await chooseGanttPeriod(other, "day");
        const offscreen = other.locator(`[data-gantt-offscreen="${c.fs}"]`);
        if (await offscreen.count())
            await offscreen.click();
        async function openRelation(client) {
            await client.getByRole("button", { name: "Abrir detalle de Condicionada FS P4", exact: true }).click();
            const item = client.getByRole("region", { name: "Relaciones", exact: true }).locator("li").filter({
                has: client.getByRole("button", { name: "Requisito A P4", exact: true })
            });
            await item.getByLabel("Tipo de dependencia").waitFor();
            return item;
        }
        const firstDraft = await openRelation(page);
        const secondDraft = await openRelation(other);
        await firstDraft.getByLabel("Tipo de dependencia").selectOption("SS");
        await secondDraft.getByLabel("Tipo de dependencia").selectOption("FF");
        const firstResponse = page.waitForResponse(response => new URL(response.url()).pathname === path(c.fs) && response.request().method() === "PATCH");
        await firstDraft.getByRole("button", { name: "Confirmar tipo", exact: true }).click();
        assert.equal((await firstResponse).status(), 200);
        const secondResponse = other.waitForResponse(response => new URL(response.url()).pathname === path(c.fs) && response.request().method() === "PATCH");
        await secondDraft.getByRole("button", { name: "Confirmar tipo", exact: true }).click();
        const conflict = await secondResponse;
        assert.equal(conflict.status(), 409);
        assert.equal((await conflict.json()).code, "dependency_revision_conflict");
        await other.getByText(/El tipo de dependencia cambió/).waitFor();
        assert.equal(await secondDraft.getByLabel("Tipo de dependencia").inputValue(), "FF");
        assert.equal(patches, 1);
        assert.equal((await task(c.fs)).dependency_links.find(link => link.predecessor_id === c.source)?.type, "SS");
        await otherContext.close();
    });
    assert.equal(errors.length, 0, errors.join(" | "));
}
catch (error) {
    await page.screenshot({ path: out + "/p4-fallo.png" }).catch(() => { });
    throw error;
}
finally {
    fs.writeFileSync(out + "/p4-browser.json", JSON.stringify({ date: new Date().toISOString(), checks, writes, errors }, null, 2));
    await browser.close();
}
