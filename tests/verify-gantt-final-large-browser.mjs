import { chooseGanttPeriod } from "./ganttBrowserControls.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { homedir } from "node:os";
const { chromium } = await import(
  pathToFileURL(
    process.env.GM_PLAYWRIGHT_MODULE ||
      path.join(
        homedir(),
        ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
      ),
  )
);
const qa = JSON.parse(fs.readFileSync(process.env.GM_QA_SECRETS_PATH, "utf8"));
const origin = process.env.GM_FRONTEND_ORIGIN || "http://localhost:5189",
  output = process.env.GM_BROWSER_REPORT_DIR;
assert.ok(output);
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
    viewport: { width: 1600, height: 950 },
  }),
  page = await context.newPage();
page.setDefaultTimeout(12000);
const errors = [],
  requests = [],
  results = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.exposeFunction("recordWindowError", (message) =>
  errors.push(message),
);
await page.addInitScript(() => {
  globalThis.addEventListener("error", (event) => {
    void globalThis.recordWindowError(event.message);
  });
});
page.on("response", (response) => {
  const u = new URL(response.url());
  if (u.pathname.startsWith("/api/projects/"))
    requests.push({
      method: response.request().method(),
      path: u.pathname,
      status: response.status(),
      ...(["PATCH", "POST", "DELETE"].includes(response.request().method())
        ? { data: response.request().postDataJSON() }
        : {}),
    });
});
const url = (id) => origin + "/proyectos/" + id;
async function api(p, method = "get", data) {
  return page.evaluate(
    async ({ p, method, data }) => {
      const { httpClient } = await import("/src/core/api/httpClient.ts");
      try {
        const r = await httpClient.request({ url: p, method, data });
        return { status: r.status, data: r.data };
      } catch (e) {
        return { status: e.status, data: e.payload };
      }
    },
    { p, method, data },
  );
}
async function login(target, role) {
  await target.goto(url(qa.context.project));
  await target.getByLabel("Correo electrónico").fill(qa[role].email);
  await target
    .getByLabel("Contraseña", { exact: true })
    .fill(qa[role].password);
  await target.getByRole("button", { name: "Ingresar", exact: true }).click();
  await target
    .getByRole("status", { name: "Cargando", exact: true })
    .waitFor({ state: "hidden" });
  if (role === "outsider")
    await target
      .getByRole("navigation", { name: "Navegación principal", exact: true })
      .waitFor();
  else await target.getByRole("link", { name: "Gantt", exact: true }).waitFor();
}
async function snap(name) {
  await page.screenshot({
    path: path.join(output, name + ".png"),
    fullPage: true,
  });
}
async function check(name, run) {
  try {
    await run();
    results.push({ name, result: "Aprobado" });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, result: "Fallido", error: e.message });
    await snap("failure-" + results.length);
    throw e;
  } finally {
    fs.writeFileSync(
      path.join(output, "results.json"),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          browser: browser.version(),
          environment:
            "Current frontend + Django + isolated MySQL, no API mocks",
          results,
          requests,
          errors,
        },
        null,
        2,
      ),
    );
  }
}

const projectId = Number(process.env.GM_GANTT_QA_PROJECT);
assert.ok(projectId);
try {
  await login(page, "admin");
  const real = (await api(`projects/${projectId}/tasks/`)).data[0];
  const synthetic = Array.from({ length: 2000 }, (_, index) => ({
    ...real,
    id: 1000000 + index,
    parent_id: index % 4 ? 999999 + index : null,
    name: `Fila sintética Gantt ${index}`,
    start_date: "2026-11-10",
    due_date: index % 5 ? null : "2026-11-20",
    manual_position: String(index),
    dependencies: [],
    calendar_revision: "9007199254740999",
    permissions: {
      ...real.permissions,
      create_child: true,
      dependencies: index % 4 === 0,
    },
  }));
  await page.route(`**/api/projects/${projectId}/tasks/`, (route) =>
    route.request().method() === "GET"
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(synthetic),
        })
      : route.abort(),
  );
  await check(
    "2000 tareas sintéticas: virtualización, acciones, scroll alineado y filtros sin peticiones por fila",
    async () => {
      await page.goto(url(projectId) + "?vista=gantt");
      await page.locator(".gm-task-gantt .wx-gantt").waitFor();
      await chooseGanttPeriod(page, "month");
      const count = await page
        .locator(".gm-task-gantt .wx-row[data-id]")
        .count();
      assert.ok(count < 60 && count > 5);
      const chart = page.locator(".gm-task-gantt .wx-gantt");
      await chart.hover();
      for (let index = 0; index < 12; index++) {
        await page.mouse.wheel(0, 8000);
        await page.evaluate(
          () =>
            new Promise((r) =>
              globalThis.requestAnimationFrame(() =>
                globalThis.requestAnimationFrame(r),
              ),
            ),
        );
      }
      const last = page.locator('[data-gantt-tree-id="1001999"]');
      await last.waitFor();
      await last.hover();
      assert.equal(
        await last.locator(".gm-gantt-row-actions button").count(),
        2,
      );
      const footer = page
        .locator(".gm-task-gantt")
        .getByRole("button", { name: "+ Agregar tarea", exact: true });
      await footer.waitFor();
      const bounds = await footer.boundingBox(),
        lastBounds = await last.boundingBox();
      assert.ok(bounds.y >= lastBounds.y);
      assert.ok(
        (await page.locator(".gm-task-gantt .wx-row[data-id]").count()) < 60,
      );
      await snap("virtualized-2000-bottom");
      const readCount = requests.filter(
        (r) => r.method === "GET" && r.path.endsWith("/tasks/"),
      ).length;
      await page
        .getByRole("button", { name: "Buscar tareas", exact: true })
        .click();
      await page
        .getByRole("searchbox", { name: "Buscar tareas" })
        .fill("Fila sintética Gantt 1999");
      await last.waitFor();
      for (const id of [1001996, 1001997, 1001998, 1001999])
        await page.locator(`[data-gantt-tree-id="${id}"]`).waitFor();
      assert.equal(
        requests.filter((r) => r.method === "GET" && r.path.endsWith("/tasks/"))
          .length,
        readCount,
      );
      assert.equal(requests.filter((r) => r.method !== "GET").length, 0);
      await snap("virtualized-2000-filter");
    },
  );
  assert.deepEqual(errors, []);
} finally {
  fs.writeFileSync(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
          browser: browser.version(),
        environment:
          "Chrome + frontend actual; solo colección GET de 2000 tareas interceptada y sintética; no acredita persistencia ni permisos del servidor",
        results,
        requests,
        errors,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
