import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { waitGantt } from "./ganttBrowserControls.mjs";
const { chromium } = await import(pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE).href);
const credentials = JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH, "utf8"));
const qa = credentials.context.hierarchy, output = process.env.GM_BROWSER_REPORT_DIR, origin = "http://localhost:5189";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
const page = await context.newPage(); page.setDefaultTimeout(20000);
const checks = [], writes = [], errors = [], ledger = { created: [], changed: {} };
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/projects/") && request.method() !== "GET") writes.push({ method: request.method(), path: new URL(request.url()).pathname, payload: request.postDataJSON() }); });
async function check(name, action) { await action(); checks.push({ name, result: "Aprobado" }); console.log("OK " + name); }
async function load(project = qa.project) { await page.goto(origin + `/proyectos/${project}?vista=gantt`); await waitGantt(page); }
const taskNode = id => page.locator(`[data-gantt-tree-id='${id}']`);
async function create(button, name, parent, project = qa.project) {
  await button.click(); const modal = page.locator("dialog[open]");
  await modal.getByRole("textbox", { name: "Nombre", exact: true }).fill(name);
  assert.ok(await modal.getByRole("textbox", { name: "Nombre", exact: true }).evaluate(node => node === globalThis.document.activeElement));
  const response = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/projects/${project}/tasks/`);
  await modal.getByRole("button", { name: "Crear", exact: true }).click();
  const result = await response; assert.equal(result.status(), 201); const saved = await result.json(); assert.equal(saved.parent_id, parent);
  ledger.created.push(saved); await modal.waitFor({ state: "detached" }); await taskNode(saved.id).waitFor(); return saved;
}
async function rename(id, name) {
  await taskNode(id).getByRole("button", { name: /^Cambiar nombre de/ }).click();
  const modal = page.locator("dialog[open]"); await modal.getByRole("textbox", { name: "Nombre", exact: true }).fill(name);
  const response = page.waitForResponse(response => response.request().method() === "PATCH" && new URL(response.url()).pathname === `/api/projects/${qa.project}/tasks/${id}/`);
  await modal.getByRole("button", { name: "Guardar", exact: true }).click(); assert.equal((await response).status(), 200);
  assert.deepEqual(writes.at(-1).payload, { name }); ledger.changed[id] = { ...ledger.changed[id], name };
  await modal.waitFor({ state: "detached" });
}
async function drag(id, target, fraction = .5, cancel = false) {
  const a = await taskNode(id).boundingBox(), b = await taskNode(target).boundingBox(); assert.ok(a && b);
  const x = Math.max(a.x, b.x) + 45;
  await page.mouse.move(x, a.y + a.height / 2); await page.mouse.down(); await page.mouse.move(x, b.y + b.height * fraction, { steps: 12 });
  if (cancel) await page.keyboard.press("Escape");
  await page.mouse.up();
}
async function move(id, target, fraction) {
  const result = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/projects/${qa.project}/tasks/${id}/move/`);
  await drag(id, target, fraction); const response = await result; assert.equal(response.status(), 200, await response.text());
  const saved = (await response.json()).find(item => item.id === id); ledger.changed[id] = { ...ledger.changed[id], parent_id: saved.parent_id };
  await page.waitForFunction(() => !globalThis.document.querySelector(".gm-gantt-tree-insertion")); return saved;
}
try {
  await page.goto(origin); await page.getByLabel("Correo electrónico", { exact: true }).fill(credentials.admin.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(credentials.admin.password); const login = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/login/" && response.request().method() === "POST");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click(); assert.equal((await login).status(), 200); await page.getByRole("link", { name: "Inicio", exact: true }).waitFor(); await load();
  await check("Compact name modals create roots and nested children, rename only name, focus and Escape", async () => {
    const root = await create(page.getByRole("button", { name: "+ Agregar tarea", exact: true }), "Nueva raíz refinamiento QA", null);
    const child = await create(taskNode(root.id).getByRole("button", { name: /^Crear subtarea de/ }), "Nueva hija refinamiento QA", root.id);
    const leaf = await create(taskNode(child.id).getByRole("button", { name: /^Crear subtarea de/ }), "Nueva nieta refinamiento QA", child.id);
    await rename(qa.root, "Raíz A renombrada QA"); await rename(qa.leaf, "Hoja renombrada QA");
    await taskNode(leaf.id).getByRole("button", { name: /^Cambiar nombre de/ }).click(); await page.keyboard.press("Escape"); assert.equal(await page.locator("dialog[open]").count(), 0);
    await page.reload(); await waitGantt(page); await taskNode(leaf.id).waitFor();
    const footer = await page.getByRole("button", { name: "+ Agregar tarea", exact: true }).boundingBox(); const last = await taskNode(leaf.id).boundingBox(); assert.ok(footer.y > last.y);
  });
  await check("Real pointer reorders roots and sisters and moves a branch preserving descendants", async () => {
    await move(qa.last, qa.root, .05);
    await page.waitForFunction(({ last, root }) => globalThis.document.querySelector(`[data-gantt-tree-id='${last}']`).getBoundingClientRect().y < globalThis.document.querySelector(`[data-gantt-tree-id='${root}']`).getBoundingClientRect().y, qa);
    await move(qa.sibling, qa.child, .05);
    await page.waitForFunction(({ sibling, child }) => globalThis.document.querySelector(`[data-gantt-tree-id='${sibling}']`).getBoundingClientRect().y < globalThis.document.querySelector(`[data-gantt-tree-id='${child}']`).getBoundingClientRect().y, qa);
    const saved = await move(qa.child, qa.other, .5); assert.equal(saved.parent_id, qa.other);
    await page.reload(); await waitGantt(page);
    await page.waitForFunction(({ child, other }) => {
      const a = globalThis.document.querySelector(`[data-gantt-tree-id='${child}']`), b = globalThis.document.querySelector(`[data-gantt-tree-id='${other}']`);
      return a && b && a.getBoundingClientRect().y > b.getBoundingClientRect().y;
    }, qa);
    const leaf = await taskNode(qa.leaf).boundingBox(), child = await taskNode(qa.child).boundingBox(); assert.ok(leaf.y > child.y);
    for (let repeat = 0; repeat < 3; repeat++) await drag(qa.child, qa.root, .5, true);
    const count = writes.length; await drag(qa.root, qa.leaf, .5); assert.equal(writes.length, count);
  });
  await check("409 and ambiguous movement retain confirmed hierarchy and explicitly reconcile", async () => {
    const pattern = `**/api/projects/${qa.project}/tasks/${qa.last}/move/`;
    await page.route(pattern, route => route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ detail: "Conflicto QA" }) }));
    await drag(qa.last, qa.other, .05); await page.getByRole("status").filter({ hasText: "Conflicto QA" }).waitFor();
    await page.unroute(pattern); { const refresh = page.waitForResponse(response => response.request().method() === "GET" && new URL(response.url()).pathname === `/api/projects/${qa.project}/tasks/`); await page.getByRole("button", { name: "Consultar tareas", exact: true }).click(); await refresh; await page.getByRole("button", { name: "Consultar tareas", exact: true }).waitFor({ state: "detached" }); }
    await page.route(pattern, route => route.abort("failed"));
    await drag(qa.last, qa.other, .05); await page.getByRole("button", { name: "Consultar tareas", exact: true }).waitFor();
    await page.unroute(pattern); { const refresh = page.waitForResponse(response => response.request().method() === "GET" && new URL(response.url()).pathname === `/api/projects/${qa.project}/tasks/`); await page.getByRole("button", { name: "Consultar tareas", exact: true }).click(); await refresh; await page.getByRole("button", { name: "Consultar tareas", exact: true }).waitFor({ state: "detached" }); }
  });
  await check("Long names and deep controls remain visible, protected canvas and themes retained", async () => {
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => localStorage.setItem("theme", theme), theme); await page.reload(); await waitGantt(page);
      for (const width of [1600, 768]) {
        await page.setViewportSize({ width, height: 1100 });
        for (const id of [qa.child, qa.leaf]) { const node = taskNode(id); for (const name of [/^Crear subtarea de/, /^Cambiar nombre de/]) { const button = await node.getByRole("button", { name }).boundingBox(); assert.ok(button && button.width > 0);
          const cell = await node.evaluate(node => { const r = node.closest(".wx-cell").getBoundingClientRect(); const grid = node.closest(".wx-table").getBoundingClientRect(); return { x: Math.max(r.x, grid.x), right: Math.min(r.right, grid.right) }; });
          assert.ok(button.x >= cell.x && button.x + button.width <= cell.right + 1); } }
        await page.screenshot({ path: path.join(output, `hierarchy-${theme}-${width}.png`), fullPage: true });
      }
    }
  });
  await check("Level twenty retains both actions and supports keyboard rename", async () => {
    await load(qa.deep_project);
    const chart = await page.locator(".gm-task-gantt .wx-chart").boundingBox(); await page.mouse.move(chart.x + 100, chart.y + 100); await page.mouse.wheel(0, 3000);
    const node = taskNode(qa.deep_task); await node.waitFor();
    for (const width of [1600, 768]) {
      await page.setViewportSize({ width, height: 1100 });
      for (const name of [/^Crear subtarea de/, /^Cambiar nombre de/]) {
        const button = node.getByRole("button", { name }); const box = await button.boundingBox();
        const cell = await node.evaluate(node => { const r = node.closest(".wx-cell").getBoundingClientRect(); const grid = node.closest(".wx-table").getBoundingClientRect(); return { x: Math.max(r.x, grid.x), right: Math.min(r.right, grid.right) }; });
        assert.ok(box && box.x >= cell.x && box.x + box.width <= cell.right + 1);
        await button.focus(); assert.ok(await button.evaluate(node => node === globalThis.document.activeElement));
      }
    }
    await node.getByRole("button", { name: /^Cambiar nombre de/ }).press("Enter"); await page.locator("dialog[open]").getByRole("textbox", { name: "Nombre", exact: true }).waitFor(); await page.keyboard.press("Escape");
    const cellFocus = await page.locator(".gm-task-gantt .wx-cell:focus").evaluateAll(nodes => nodes.map(node => globalThis.getComputedStyle(node).outlineStyle));
    assert.ok(cellFocus.every(style => style === "none"));
    await page.screenshot({ path: path.join(output, "hierarchy-level20.png"), fullPage: true });
  });
  await check("Name errors retain drafts and ambiguous responses never replay", async () => {
    await page.setViewportSize({ width: 1600, height: 1100 }); await load();
    const pattern = `**/api/projects/${qa.project}/tasks/${qa.root}/`;
    await page.route(pattern, route => route.request().method() === "PATCH" ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Respuesta ambigua QA" }) }) : route.continue());
    await taskNode(qa.root).getByRole("button", { name: /^Cambiar nombre de/ }).click();
    const modal = page.locator("dialog[open]"); await modal.getByRole("textbox", { name: "Nombre", exact: true }).fill("Borrador conservado QA");
    const count = writes.length; await modal.getByRole("button", { name: "Guardar", exact: true }).click();
    await modal.getByRole("button", { name: "Consultar tareas", exact: true }).waitFor();
    assert.equal(await modal.getByRole("textbox", { name: "Nombre", exact: true }).inputValue(), "Borrador conservado QA");
    assert.equal(writes.length, count + 1); assert.ok(await modal.getByRole("button", { name: "Guardar", exact: true }).isDisabled());
    await page.unroute(pattern); await modal.getByRole("button", { name: "Consultar tareas", exact: true }).click();
    await modal.getByRole("alert").filter({ hasText: "Consulta el resultado" }).waitFor(); assert.equal(writes.length, count + 1);
    await page.keyboard.press("Escape");
  });
  await check("Virtual footer follows 2000 visible rows", async () => {
    await page.setViewportSize({ width: 1600, height: 1100 }); await load(credentials.context.controls.large);
    const chart = await page.locator(".gm-task-gantt .wx-chart").boundingBox(); await page.mouse.move(chart.x + 100, chart.y + 100); await page.mouse.wheel(0, 120000);
    const footer = page.getByRole("button", { name: "+ Agregar tarea", exact: true }); await footer.waitFor(); await footer.scrollIntoViewIfNeeded();
    await create(footer, "Raíz después de 2000 QA", null, credentials.context.controls.large);
  });
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, "hierarchy-ledger.json"), JSON.stringify(ledger, null, 2));
  await writeFile(path.join(output, "hierarchy-browser.json"), JSON.stringify({ checks, writes, errors, date: new Date().toISOString(), browser: browser.version() }, null, 2));
} catch (error) { await page.screenshot({ path: path.join(output, "hierarchy-failure.png"), fullPage: true }); throw error; }
finally { await context.close(); await browser.close(); }
