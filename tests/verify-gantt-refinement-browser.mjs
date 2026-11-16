import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { waitGantt, ganttFilter } from "./ganttBrowserControls.mjs";

const { chromium } = await import(pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE).href);
const credentials = JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH, "utf8"));
const qa = credentials.context.controls, output = process.env.GM_BROWSER_REPORT_DIR, origin = "http://localhost:5189";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
const page = await context.newPage(); page.setDefaultTimeout(20000);
const writes = [], checks = [], errors = [];
page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/projects/") && request.method() !== "GET") writes.push({ method: request.method(), path: new URL(request.url()).pathname }); });
page.on("pageerror", error => errors.push(error.message));
async function check(name, action) { await action(); checks.push({ name, result: "Aprobado" }); console.log("OK " + name); }
const settle = () => page.evaluate(() => new Promise(resolve => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
const shield = () => page.getByRole("button", { name: "Proteger vista", exact: true });
const bar = () => page.locator(`[data-gantt-calendar-task='${qa.subject}']`);
async function load(project = qa.project) { await page.goto(origin + `/proyectos/${project}?vista=gantt`); await waitGantt(page); await page.locator(".gm-gantt-project-row").waitFor(); await settle(); }
async function drag(node, delta, escape = false) {
  const box = await node.boundingBox(); assert.ok(box);
  const chart = await page.locator(".gm-task-gantt .wx-chart").boundingBox();
  const x = Math.max(box.x, chart.x) + Math.min(120, Math.min(box.x + box.width, chart.x + chart.width) - Math.max(box.x, chart.x)) / 2;
  await page.mouse.move(x, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(x + delta, box.y + box.height / 2, { steps: 12 });
  if (escape === "capture") await page.locator(".gm-task-gantt").evaluate(node => { if (node.hasPointerCapture(1)) node.releasePointerCapture(1); });
  else if (escape) await page.keyboard.press("Escape");
  await page.mouse.up(); await settle();
}
try {
  await page.goto(origin); await page.getByLabel("Correo electrónico", { exact: true }).fill(credentials.admin.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(credentials.admin.password);
  const login = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/login/" && response.request().method() === "POST");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click(); const token = (await (await login).json()).access;
  await load();
  await check("Project row equals official authorized Summary and selection opens shared detail", async () => {
    const response = await context.request.get(origin + `/api/projects/${qa.project}/charts/?view=all`, { headers: { Authorization: "Bearer " + token } });
    assert.equal(response.status(), 200); const official = await response.json();
    assert.ok((await page.locator(".gm-gantt-project-row").innerText()).includes(String(official.summary.completion_percent) + "%"));
    await page.getByRole("button", { name: "Abrir tarea Calendario controles QA", exact: true }).click();
    const dialog = page.locator("dialog[open]"); await dialog.locator('section[aria-label="Propiedades de la tarea"]').waitFor();
    await dialog.locator("button[id$='-state_code']").waitFor();
    await dialog.getByRole("region", { name: "Relaciones", exact: true }).waitFor();
    await dialog.getByRole("button", { name: "Cerrar modal", exact: true }).click();
    assert.equal(await page.getByRole("region", { name: "Acciones de la tarea seleccionada" }).count(), 0);
  });
  await check("Compact combined filters preserve project progress and clear independently of search", async () => {
    const initial = await page.locator(".gm-gantt-project-row").innerText();
    await ganttFilter(page, "Estado", "EN_CURSO"); await page.keyboard.press("Escape");
    assert.equal(await page.locator(".gm-gantt-project-row").innerText(), initial);
    await page.getByRole("button", { name: /^Filtros de Gantt/ }).click();
    await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click(); await page.keyboard.press("Escape");
  });
  await check("Shield pans from bars both ways, cancels immediately and blocks all diagram writes", async () => {
    await shield().click(); assert.equal(await shield().getAttribute("aria-pressed"), "true");
    const chart = page.locator(".gm-task-gantt .wx-chart"); const original = await chart.evaluate(node => node.scrollLeft);
    await drag(bar(), -80); const moved = await chart.evaluate(node => node.scrollLeft); assert.ok(moved > original);
    await drag(bar(), 40); assert.ok(await chart.evaluate(node => node.scrollLeft) < moved);
    for (let repeat = 0; repeat < 3; repeat++) await drag(bar(), -20, true);
    await drag(bar(), -20, "capture");
    assert.equal(await page.locator("[data-panning]").count(), 0);
    assert.equal(await page.locator("dialog[open]").count(), 0);
    assert.equal(await page.locator("[data-link-source]").count(), 0);
    await drag(bar().locator("[data-gantt-calendar-mode='start']"), -20);
    assert.equal(writes.length, 0);
    const outlines = await page.locator(".gm-task-gantt").evaluate(root => [...root.querySelectorAll(".wx-selected, .wx-chart, .wx-table")].map(node => {
      const style = globalThis.getComputedStyle(node);
      return { outline: style.outlineStyle, border: node.matches(".wx-selected") ? style.borderWidth : "0px" };
    }));
    assert.ok(outlines.length > 0);
    assert.ok(outlines.every(style => style.outline === "none" && style.border === "0px"));
    await page.screenshot({ path: path.join(output, "shield-active.png"), fullPage: true });
    await shield().click(); assert.equal(await shield().getAttribute("aria-pressed"), "false");
    const box = await bar().boundingBox(); await page.mouse.move(box.x + 20, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + 60, box.y + box.height / 2, { steps: 8 });
    await page.locator('[data-calendar-dragging="true"]').waitFor(); await page.keyboard.press("Escape"); await page.mouse.up();
    assert.equal(writes.length, 0);
  });
  await check("Protected wheel synchronizes deep rows and project navigation resets local shield", async () => {
    await load(qa.large); await shield().click();
    const chartBox = await page.locator(".gm-task-gantt .wx-chart").boundingBox(); await page.mouse.move(chartBox.x + 40, chartBox.y + 100); await page.mouse.wheel(0, 600);
    await page.waitForFunction(() => globalThis.document.querySelector(".gm-task-gantt .wx-gantt").scrollTop > 0);
    await page.waitForFunction(() => {
      for (const row of globalThis.document.querySelectorAll(".gm-task-gantt .wx-row[data-id]")) {
        const bar = globalThis.document.querySelector(`[data-gantt-calendar-task='${row.dataset.id}']`);
        if (!bar || !bar.getBoundingClientRect().width) continue;
        const a = row.getBoundingClientRect(), b = bar.getBoundingClientRect();
        return Math.abs(a.y + a.height / 2 - b.y - b.height / 2) < 2;
      }
      return false;
    });
    await load(); assert.equal(await shield().getAttribute("aria-pressed"), "false");
  });
  await check("Light dark and narrow layouts retain aligned project row and keyboard focus", async () => {
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => localStorage.setItem("theme", theme), theme); await page.reload(); await waitGantt(page);
      for (const width of [1600, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 1100 }); await settle();
        assert.ok(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1));
        await shield().focus(); await page.screenshot({ path: path.join(output, `${theme}-${width}.png`), fullPage: true });
      }
    }
  });
  assert.deepEqual(writes, []); assert.deepEqual(errors, []);
  await writeFile(path.join(output, "content-ledger.json"), JSON.stringify({ created: [], calendars: {}, intent_ids: [], links: [] }));
  await writeFile(path.join(output, "refinement-browser.json"), JSON.stringify({ date: new Date().toISOString(), checks, writes, errors, browser: browser.version() }, null, 2));
} catch (error) { await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }); throw error; }
finally { await context.close(); await browser.close(); }
