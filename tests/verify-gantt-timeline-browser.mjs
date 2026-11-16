import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  waitGantt,
  showGanttRange,
  chooseGanttPeriod,
  ganttFilter,
} from "./ganttBrowserControls.mjs";
const { chromium } = await import(
  pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE).href
);
const secrets = JSON.parse(
  await readFile(process.env.GM_QA_SECRETS_PATH, "utf8"),
);
const qa = secrets.context.timeline,
  output = process.env.GM_BROWSER_REPORT_DIR,
  origin = "http://localhost:5189";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 1100 },
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
const checks = [],
  writes = [],
  errors = [],
  ledger = { created: [], calendars: {}, intent_ids: [], links: [] };
let token;
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  if (
    new URL(request.url()).pathname.startsWith("/api/projects/") &&
    request.method() !== "GET"
  )
    writes.push({
      method: request.method(),
      path: new URL(request.url()).pathname,
      payload: request.postDataJSON(),
    });
});
const bar = (id) => page.locator(`[data-gantt-calendar-task='${id}']`);
const marker = (id) => page.locator(`[data-gantt-missing-dates='${id}']`);
const connector = (id, side = "end") =>
  page.locator(`[data-connector-task='${id}'][data-connector-side='${side}']`);
const modal = () => page.locator("dialog[open]");
const pathFor = (id) => `/api/projects/${qa.project}/tasks/${id}/`;
async function check(name, action) {
  await action();
  checks.push({ name, result: "Aprobado" });
  console.log("OK " + name);
}
async function load() {
  await page.goto(origin + `/proyectos/${qa.project}?vista=gantt`);
  await waitGantt(page);
  await showGanttRange(page, qa.day, qa.day30);
}
async function current(id) {
  const response = await context.request.get(origin + pathFor(id), {
    headers: { Authorization: "Bearer " + token },
  });
  assert.equal(response.status(), 200);
  return (await response.json()).task;
}
function savedCalendar(id, saved, payload) {
  ledger.calendars[id] = saved;
  if (!ledger.intent_ids.includes(payload.calendar_intent_id))
    ledger.intent_ids.push(payload.calendar_intent_id);
}
async function saveDates(id, first, last) {
  await modal().getByLabel("Fecha de inicio", { exact: true }).fill(first);
  await modal().getByLabel("Fecha límite", { exact: true }).fill(last);
  const response = page.waitForResponse(
    (reply) =>
      new URL(reply.url()).pathname === pathFor(id) &&
      reply.request().method() === "PATCH",
  );
  await modal().getByRole("button", { name: "Guardar", exact: true }).click();
  const reply = await response;
  assert.equal(reply.status(), 200, await reply.text());
  savedCalendar(id, await reply.json(), reply.request().postDataJSON());
  await modal().waitFor({ state: "detached" });
}
async function connect(
  source,
  target,
  { side = "end", cancel = false, scroll = false } = {},
) {
  const start = connector(source, side);
  await start.waitFor();
  await start.focus();
  const a = await start.boundingBox();
  assert.ok(a);
  await page.mouse.move(a.x + 12, a.y + 12);
  await page.mouse.down();
  if (scroll) {
    const box = await page.locator(".gm-gantt-scene").boundingBox(),
      before = await page
        .locator(".wx-chart")
        .evaluate((node) => node.scrollLeft);
    await page.mouse.move(box.x + box.width - 2, a.y + 12, { steps: 8 });
    await page.waitForFunction(
      (before) =>
        globalThis.document.querySelector(".gm-task-gantt .wx-chart")
          .scrollLeft >
        before + 150,
      before,
    );
  }
  const targetBox = await bar(target).boundingBox(),
    box = await page.locator(".gm-gantt-scene").boundingBox();
  assert.ok(targetBox);
  const x = Math.max(
    box.x + 8,
    Math.min(
      box.x + box.width - 8,
      targetBox.x + Math.min(30, targetBox.width / 2),
    ),
  );
  await page.mouse.move(x, targetBox.y + targetBox.height / 2, { steps: 10 });
  await page.locator(".gm-gantt-link-preview").waitFor();
  if (cancel) await page.keyboard.press("Escape");
  await page.mouse.up();
  if (!cancel)
    await page
      .getByRole("region", { name: "Operación de dependencia", exact: true })
      .waitFor();
}
async function confirmLink(source, target) {
  const response = page.waitForResponse(
    (reply) =>
      new URL(reply.url()).pathname === pathFor(target) + "dependencies/" &&
      reply.request().method() === "POST",
  );
  await modal()
    .getByRole("button", { name: "Confirmar vínculo", exact: true })
    .click();
  const reply = await response;
  assert.equal(reply.status(), 201, await reply.text());
  ledger.links.push({ project: qa.project, source, target, method: "POST" });
  await modal().waitFor({ state: "detached" });
}
async function remove(source, target) {
  const arrow = page.locator(`[data-gantt-link='${source}:${target}']`);
  await arrow.focus();
  await page.locator(`[data-remove-link='${source}:${target}']`).click();
  const response = page.waitForResponse(
    (reply) =>
      new URL(reply.url()).pathname === pathFor(target) + "dependencies/" &&
      reply.request().method() === "DELETE",
  );
  await modal()
    .getByRole("button", { name: "Retirar dependencia", exact: true })
    .click();
  const reply = await response;
  assert.equal(reply.status(), 204);
  ledger.links.push({ project: qa.project, source, target, method: "DELETE" });
  await modal().waitFor({ state: "detached" });
  return page
    .getByRole("status", { name: "Dependencia retirada", exact: true })
    .last();
}
try {
  await page.goto(origin);
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill(secrets.admin.email);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(secrets.admin.password);
  const login = page.waitForResponse(
    (reply) =>
      new URL(reply.url()).pathname === "/api/auth/login/" &&
      reply.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  token = (await (await login).json()).access;
  await page.getByRole("link", { name: "Inicio", exact: true }).waitFor();
  await load();
  await check(
    "Only real eligible endpoints receive two connectors; outside dated rows remain dated",
    async () => {
      assert.equal(await connector(qa.a, "end").count(), 1);
      assert.equal(
        await page.locator(`[data-connector-task='${qa.child}']`).count(),
        0,
      );
      assert.equal(
        await page.locator(`[data-connector-task='${qa.missing}']`).count(),
        0,
      );
      assert.equal(await marker(qa.outside).count(), 0);
      assert.equal(
        await page.locator(`[data-connector-task='${qa.outside}']`).count(),
        0,
      );
      assert.equal(await page.locator("[data-neutral-anchor]").count(), 0);
      const fixed = await marker(qa.missing).boundingBox();
      const chart = await page.locator(".gm-gantt-scene").boundingBox();
      assert.ok(Math.abs(fixed.x - chart.x) < 2);
      assert.equal(
        await page
          .locator(
            `.gm-gantt-exterior button[title='Sucesora temporal con responsable QA']`,
          )
          .count(),
        1,
      );
      assert.equal(
        (await page.locator(".gm-gantt-exterior [aria-label]").count()) > 0,
        true,
      );
      await connector(qa.a).focus();
      await page.screenshot({
        path: path.join(output, "timeline-connectors.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "Range opens with existing endpoint only, cancels without writes and persists one inclusive day",
    async () => {
      const count = writes.length;
      await marker(qa.child).click();
      assert.equal(
        await modal()
          .getByLabel("Fecha de inicio", { exact: true })
          .inputValue(),
        qa.day,
      );
      assert.equal(
        await modal().getByLabel("Fecha límite", { exact: true }).inputValue(),
        "",
      );
      await page.screenshot({
        path: path.join(output, "timeline-range.png"),
        fullPage: true,
      });
      await page.keyboard.press("Escape");
      assert.equal(writes.length, count);
      await marker(qa.child).click();
      await saveDates(qa.child, qa.day1, qa.day1);
      await marker(qa.child).waitFor({ state: "detached" });
      await page.reload();
      await waitGantt(page);
      assert.equal((await current(qa.child)).due_date, qa.day1);
      assert.equal(
        await page.locator(`[data-connector-task='${qa.child}']`).count(),
        0,
      );
    },
  );
  await check(
    "Calendar conflict preserves proposal, consults and reapplies only by explicit decision",
    async () => {
      await marker(qa.missing).click();
      const base = await current(qa.missing);
      const payload = {
        start_date: qa.day2,
        due_date: qa.day2,
        expected_calendar_revision: base.calendar_revision,
        calendar_intent_id: crypto.randomUUID(),
      };
      const external = await context.request.patch(
        origin + pathFor(qa.missing),
        { headers: { Authorization: "Bearer " + token }, data: payload },
      );
      assert.equal(external.status(), 200);
      savedCalendar(qa.missing, await external.json(), payload);
      await modal().getByLabel("Fecha límite", { exact: true }).fill(qa.day3);
      const rejected = page.waitForResponse(
        (reply) =>
          reply.status() === 409 &&
          new URL(reply.url()).pathname === pathFor(qa.missing),
      );
      await modal()
        .getByRole("button", { name: "Guardar", exact: true })
        .click();
      await rejected;
      assert.equal(
        await modal().getByLabel("Fecha límite", { exact: true }).inputValue(),
        qa.day3,
      );
      await modal()
        .getByRole("button", { name: "Consultar fechas vigentes", exact: true })
        .click();
      await modal()
        .getByRole("button", {
          name: "Preparar nueva intención sobre esta revisión",
          exact: true,
        })
        .click();
      await saveDates(qa.missing, qa.day2, qa.day3);
    },
  );
  await check(
    "Bidirectional connection preview cancels, autoscrolls and confirms exactly one dependency",
    async () => {
      await load();
      const count = writes.length;
      await connect(qa.b, qa.a, { side: "start", cancel: true });
      assert.equal(writes.length, count);
      const start = await connector(qa.a).boundingBox();
      await page.mouse.move(start.x + 12, start.y + 12);
      await page.mouse.down();
      await page.mouse.move(start.x + 30, start.y + 12);
      await page
        .locator(".gm-gantt-link-preview")
        .waitFor({ state: "attached" });
      assert.ok(
        await page
          .locator(".gm-gantt-scene")
          .evaluate((node) => node.hasPointerCapture(1)),
      );
      await page
        .locator(".gm-gantt-scene")
        .evaluate((node) => node.releasePointerCapture(1));
      await page.mouse.move(start.x + 31, start.y + 12);
      await page
        .locator(".gm-gantt-link-preview")
        .waitFor({ state: "detached" });
      await page.mouse.up();
      assert.equal(writes.length, count);
      await chooseGanttPeriod(page, "day");
      await connect(qa.b, qa.c, { scroll: true });
      await confirmLink(qa.b, qa.c);
      assert.ok((await current(qa.c)).dependencies.includes(qa.b));
      await load();
    },
  );
  await check(
    "Backward long connection persists from origin predecessor and removal preserves calendars",
    async () => {
      await connect(qa.c, qa.missing, { side: "start" });
      await confirmLink(qa.c, qa.missing);
      assert.ok((await current(qa.missing)).dependencies.includes(qa.c));
      const notice = await remove(qa.c, qa.missing);
      await page.screenshot({
        path: path.join(output, "timeline-undo.png"),
        fullPage: true,
      });
      await notice
        .getByRole("button", {
          name: "Cerrar aviso de dependencia",
          exact: true,
        })
        .click();
    },
  );
  await check(
    "Arrow removal and undo restore exact link; expired undo cannot write",
    async () => {
      await page.locator(`[data-gantt-link='${qa.a}:${qa.b}']`).focus();
      assert.equal(
        await page
          .locator(`[data-gantt-link='${qa.a}:${qa.b}']`)
          .evaluate((node) => globalThis.getComputedStyle(node).outlineStyle),
        "none",
      );
      await page.screenshot({
        path: path.join(output, "timeline-remove-control.png"),
        fullPage: true,
      });
      let notice = await remove(qa.a, qa.b);
      const restored = page.waitForResponse(
        (reply) =>
          reply.request().method() === "POST" &&
          new URL(reply.url()).pathname === pathFor(qa.b) + "dependencies/",
      );
      await notice
        .getByRole("button", { name: "Deshacer", exact: true })
        .dblclick();
      assert.equal((await restored).status(), 201);
      ledger.links.push({
        project: qa.project,
        source: qa.a,
        target: qa.b,
        method: "POST",
      });
      await notice.waitFor({ state: "detached" });
      notice = await remove(qa.a, qa.b);
      const count = writes.length;
      await notice
        .getByText("El plazo para deshacer finalizó.", { exact: true })
        .waitFor({ timeout: 15000 });
      assert.equal(
        await notice
          .getByRole("button", { name: "Deshacer", exact: true })
          .count(),
        0,
      );
      assert.equal(writes.length, count);
      await notice
        .getByRole("button", {
          name: "Cerrar aviso de dependencia",
          exact: true,
        })
        .click();
    },
  );
  await check(
    "Lost deletion response is consulted before success and undo remains idempotent at UI level",
    async () => {
      const routePattern = `**${pathFor(qa.c)}dependencies/`;
      await page.route(routePattern, async (route) => {
        if (route.request().method() !== "DELETE") return route.continue();
        const reply = await route.fetch();
        assert.equal(reply.status(), 204);
        ledger.links.push({
          project: qa.project,
          source: qa.b,
          target: qa.c,
          method: "DELETE",
        });
        await route.abort("failed");
      });
      await page.locator(`[data-gantt-link='${qa.b}:${qa.c}']`).focus();
      await page.locator(`[data-remove-link='${qa.b}:${qa.c}']`).click();
      await modal()
        .getByRole("button", { name: "Retirar dependencia", exact: true })
        .click();
      await modal()
        .getByRole("button", { name: "Consultar resultado", exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByRole("status", { name: "Dependencia retirada", exact: true })
          .count(),
        0,
      );
      await page.unroute(routePattern);
      await modal()
        .getByRole("button", { name: "Consultar resultado", exact: true })
        .click();
      const notice = page.getByRole("status", {
        name: "Dependencia retirada",
        exact: true,
      });
      await notice.waitFor();
      const post = page.waitForResponse(
        (reply) =>
          reply.request().method() === "POST" &&
          new URL(reply.url()).pathname === pathFor(qa.c) + "dependencies/",
      );
      await notice
        .getByRole("button", { name: "Deshacer", exact: true })
        .click();
      assert.equal((await post).status(), 201);
      ledger.links.push({
        project: qa.project,
        source: qa.b,
        target: qa.c,
        method: "POST",
      });
      await notice.waitFor({ state: "detached" });
    },
  );
  await check(
    "Lost restoration response is queried before reporting restoration",
    async () => {
      const notice = await remove(qa.b, qa.c),
        pattern = `**${pathFor(qa.c)}dependencies/`;
      await page.route(pattern, async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        const reply = await route.fetch();
        assert.equal(reply.status(), 201);
        ledger.links.push({
          project: qa.project,
          source: qa.b,
          target: qa.c,
          method: "POST",
        });
        await route.abort("failed");
      });
      await notice
        .getByRole("button", { name: "Deshacer", exact: true })
        .click();
      await notice
        .getByRole("button", { name: "Consultar restauración", exact: true })
        .waitFor();
      await page.unroute(pattern);
      await notice
        .getByRole("button", { name: "Consultar restauración", exact: true })
        .click();
      await notice.waitFor({ state: "detached" });
    },
  );
  await check(
    "Project navigation discards undo from the previous project without restoring it",
    async () => {
      await remove(qa.b, qa.c);
      const count = writes.length;
      await page.goto(origin + `/proyectos/${qa.readonly_project}?vista=gantt`);
      await waitGantt(page);
      assert.equal(
        await page
          .getByRole("status", { name: "Dependencia retirada", exact: true })
          .count(),
        0,
      );
      await load();
      assert.equal(writes.length, count);
      assert.ok(!(await current(qa.c)).dependencies.includes(qa.b));
    },
  );
  await check(
    "Protection and missing-date indicators never start canvas mutations",
    async () => {
      await page
        .getByRole("button", { name: "Proteger vista", exact: true })
        .click();
      const count = writes.length;
      assert.equal(await page.locator("[data-connector-task]").count(), 0);
      assert.ok(await marker(qa.unbound).isDisabled());
      const bounds = await page.locator(".gm-gantt-scene").boundingBox();
      await page.mouse.move(bounds.x + 100, bounds.y + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.x + 40, bounds.y + 100, { steps: 8 });
      await page.mouse.up();
      await page.mouse.wheel(0, 100);
      assert.equal(writes.length, count);
      await page
        .getByRole("button", { name: "Proteger vista", exact: true })
        .click();
      await load();
    },
  );
  await check(
    "Themes, zoom, filters and collapse leave no orphan controls",
    async () => {
      for (const theme of ["light", "dark"]) {
        await page.evaluate(
          (theme) => localStorage.setItem("theme", theme),
          theme,
        );
        await page.reload();
        await waitGantt(page);
        await showGanttRange(page, qa.day, qa.day30);
        for (const width of [1600, 768]) {
          await page.setViewportSize({ width, height: 1100 });
          await page.screenshot({
            path: path.join(output, `timeline-${theme}-${width}.png`),
            fullPage: true,
          });
        }
      }
      await page.setViewportSize({ width: 1600, height: 1100 });
      await ganttFilter(page, "Estado", "EN_CURSO");
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator(`[data-connector-task='${qa.a}']`).count(),
        0,
      );
      await page.getByRole("button", { name: /^Filtros de Gantt/ }).click();
      await page
        .getByRole("button", { name: "Limpiar filtros", exact: true })
        .click();
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", {
          name: "Contraer subtareas de Predecesora temporal QA",
          exact: true,
        })
        .click();
      assert.equal(await marker(qa.child).count(), 0);
    },
  );
  await check(
    "Short bars keep detail access while precise handles and connectors stay unavailable",
    async () => {
      await chooseGanttPeriod(page, "month");
      const small = await bar(qa.single).boundingBox();
      assert.ok(small && small.width < 32);
      assert.equal(
        await page.locator(`[data-connector-task='${qa.single}']`).count(),
        0,
      );
      assert.ok(
        await bar(qa.single)
          .locator(".gm-gantt-resize")
          .first()
          .evaluate(
            (node) => globalThis.getComputedStyle(node).display === "none",
          ),
      );
      assert.equal(
        await page
          .getByRole("button", {
            name: "Abrir detalle de Un solo día temporal QA",
            exact: true,
          })
          .count(),
        1,
      );
    },
  );
  await check(
    "Worker read-only view retains informative square and cannot edit dates or links",
    async () => {
      const ctx = await browser.newContext({
          viewport: { width: 1600, height: 1100 },
        }),
        tab = await ctx.newPage();
      try {
        await tab.goto(origin);
        await tab
          .getByLabel("Correo electrónico", { exact: true })
          .fill(secrets.worker.email);
        await tab
          .getByLabel("Contraseña", { exact: true })
          .fill(secrets.worker.password);
        await tab
          .getByRole("button", { name: "Ingresar", exact: true })
          .click();
        await tab.getByRole("link", { name: "Inicio", exact: true }).waitFor();
        await tab.goto(
          origin + `/proyectos/${qa.readonly_project}?vista=gantt`,
        );
        await waitGantt(tab);
        assert.ok(
          await tab
            .locator(`[data-gantt-missing-dates='${qa.readonly_task}']`)
            .isDisabled(),
        );
        assert.equal(await tab.locator("[data-connector-task]").count(), 0);
      } finally {
        await ctx.close();
      }
    },
  );
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(output, "content-ledger.json"),
    JSON.stringify(ledger, null, 2),
  );
  await writeFile(
    path.join(output, "timeline-browser.json"),
    JSON.stringify(
      {
        checks,
        writes,
        errors,
        browser: browser.version(),
        date: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({
    path: path.join(output, "timeline-failure.png"),
    fullPage: true,
  });
  throw error;
} finally {
  await context.close();
  await browser.close();
}
