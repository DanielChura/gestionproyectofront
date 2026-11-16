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
const responseFor = (predicate) => {
  const promise = page.waitForResponse(predicate, { timeout: 30000 });
  void promise.catch(() => {});
  return promise;
};
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
  if (process.env.GM_GANTT_CASE && !name.includes(process.env.GM_GANTT_CASE))
    return;
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
const tree = (id) => page.locator(`[data-gantt-tree-id="${id}"]`);
const bar = (id) => page.locator(`[data-gantt-calendar-task="${id}"]`);
const settle = () =>
  page.evaluate(
    () =>
      new Promise((r) =>
        globalThis.requestAnimationFrame(() =>
          globalThis.requestAnimationFrame(r),
        ),
      ),
  );
async function open() {
  await page.goto(url(projectId) + "?vista=gantt");
  await page.locator(".gm-task-gantt .wx-gantt").waitFor();
  await chooseGanttPeriod(page, "week");
  await page
    .getByRole("button", { name: "Ajuste automático", exact: true })
    .click();
  await chooseGanttPeriod(page, "week");
  await settle();
}
async function detail(id) {
  return (await api(`projects/${projectId}/tasks/${id}/`)).data.task;
}
async function program(id, ratio = 0.35) {
  await tree(id).scrollIntoViewIfNeeded();
  await settle();
  const r = await tree(id).boundingBox(),
    p = await page.locator(".gm-gantt-scene").boundingBox();
  await page.mouse.move(p.x + p.width * ratio, r.y + r.height / 2);
  await page.mouse.down();
  await page.mouse.move(p.x + p.width * ratio + 85, r.y + r.height / 2, {
    steps: 5,
  });
  await page.mouse.up();
}
try {
  await login(page, "admin");
  const config = (await api(`projects/${projectId}/`)).data,
    state = config.task_states.states.find(
      (s) => s.category === "not_started",
    ).code;
  async function create(name, extra = {}) {
    const r = await api(`projects/${projectId}/tasks/`, "post", {
      name,
      state_code: state,
      start_date: "2026-11-10",
      due_date: null,
      parent_id: null,
      ...extra,
    });
    assert.equal(r.status, 201, JSON.stringify(r));
    return r.data;
  }
  await check(
    "Respuesta demorada de una tarea no bloquea otra ni revierte su calendario confirmado",
    async () => {
      const slow = await create("Respuesta lenta QA"),
        next = await create("Movimiento posterior QA");
      await open();
      const pattern = `**/api/projects/${projectId}/tasks/${slow.id}/`;
      let release, received;
      const held = new Promise((r) => (release = r)),
        server = new Promise((r) => (received = r));
      await page.route(pattern, async (route) => {
        if (route.request().method() !== "PATCH") return route.continue();
        const response = await route.fetch();
        received();
        await held;
        await route.fulfill({ response });
      });
      await program(slow.id);
      await server;
      const second = responseFor(
        (r) =>
          r.request().method() === "PATCH" &&
          r.url().endsWith(`/tasks/${next.id}/`),
      );
      await program(next.id);
      assert.equal((await second).status(), 200);
      await bar(next.id).waitFor();
      const after = await detail(next.id);
      const first = responseFor(
        (r) =>
          r.request().method() === "PATCH" &&
          r.url().endsWith(`/tasks/${slow.id}/`),
      );
      release();
      assert.equal((await first).status(), 200);
      await bar(slow.id).waitFor();
      await page.unroute(pattern);
      assert.deepEqual(
        (({ start_date, due_date, calendar_revision }) => ({
          start_date,
          due_date,
          calendar_revision,
        }))(await detail(next.id)),
        (({ start_date, due_date, calendar_revision }) => ({
          start_date,
          due_date,
          calendar_revision,
        }))(after),
      );
    },
  );
  await check(
    "Fallo de red antes de escribir conserva borrador; consulta previa y reintento explícito único",
    async () => {
      const t = await create("Error de red QA");
      await open();
      const pattern = `**/api/projects/${projectId}/tasks/${t.id}/`;
      await page.route(pattern, async (route) => {
        if (route.request().method() !== "PATCH") return route.continue();
        await route.abort("failed");
        await page.unroute(pattern);
      });
      await program(t.id);
      const feedback = page.getByRole("region", {
        name: "Operaciones de calendario",
        exact: true,
      });
      const consult = feedback.getByRole("button", {
        name: "Consultar fechas vigentes",
        exact: true,
      });
      await consult.waitFor();
      assert.equal((await detail(t.id)).due_date, null);
      await consult.click();
      const retry = feedback.getByRole("button", {
        name: "Reintentar misma intención",
        exact: true,
      });
      const saved = responseFor(
        (r) =>
          r.request().method() === "PATCH" &&
          r.url().endsWith(`/tasks/${t.id}/`),
      );
      await retry.click();
      assert.equal((await saved).status(), 200);
      await bar(t.id).waitFor();
    },
  );
  await check(
    "Límites reales de familia rechazan 400 sin cambiar estado, padre ni fechas",
    async () => {
      const root = (await api(`projects/${projectId}/tasks/`)).data.find(
        (t) => t.name === "Raíz del cierre QA",
      );
      const child = await create("Rechazo familiar QA", { parent_id: root.id });
      await open();
      await chooseGanttPeriod(page, "quarter");
      const rejected = responseFor(
        (r) =>
          r.request().method() === "PATCH" &&
          r.url().endsWith(`/tasks/${child.id}/`),
      );
      await program(child.id);
      assert.equal((await rejected).status(), 400);
      const current = await detail(child.id);
      assert.equal(current.due_date, null);
      assert.equal(current.start_date, child.start_date);
      assert.equal(current.parent_id, root.id);
      assert.equal(current.state_code, child.state_code);
      await page.getByText(/Propuesta:/).waitFor();
    },
  );
  await check("Resumen real sin tareas, 0 y 100 por ciento", async () => {
    const empty = await api("projects/", "post", {
      name: "Extremos avance QA " + Date.now(),
      area_ids: [qa.context.area],
      mode: "available",
      worker_contribute: false,
    });
    assert.equal(empty.status, 201);
    await page.goto(url(empty.data.id) + "?vista=gantt");
    await page.getByText("Sin tareas", { exact: true }).waitFor();
    assert.equal(await page.getByRole("progressbar").count(), 0);
    await snap("progress-empty");
    const t = await api(`projects/${empty.data.id}/tasks/`, "post", {
      name: "Única tarea QA",
      state_code: state,
      parent_id: null,
    });
    assert.equal(t.status, 201);
    await page.reload();
    const progress = page.getByRole("progressbar", { name: /Avance de/ });
    await progress.waitFor();
    assert.equal(await progress.getAttribute("value"), "0");
    await snap("progress-zero");
    const final = empty.data.task_states.states.find((s) =>
      ["done", "closed"].includes(s.category),
    );
    assert.equal(
      (
        await api(
          `projects/${empty.data.id}/tasks/${t.data.id}/state/`,
          "post",
          { state_code: final.code },
        )
      ).status,
      200,
    );
    await page.reload();
    await progress.waitFor();
    assert.equal(await progress.getAttribute("value"), "100");
    await snap("progress-complete");
  });
  await check(
    "Trabajador de solo lectura: API directa rechaza edición y no ofrece programación",
    async () => {
      const worker = await browser.newContext(),
        p = await worker.newPage();
      await login(p, "worker");
      await p.goto(url(qa.context.readonly) + "?vista=gantt");
      await p.locator(".gm-task-gantt .wx-gantt").waitFor();
      const response = await p.evaluate(async (id) => {
        const { httpClient } = await import("/src/core/api/httpClient.ts");
        const tasks = (await httpClient.get(`projects/${id}/tasks/`)).data;
        const t = tasks[0];
        try {
          await httpClient.patch(`projects/${id}/tasks/${t.id}/`, {
            due_date: "2026-11-20",
            expected_calendar_revision: t.calendar_revision,
            calendar_intent_id: crypto.randomUUID(),
          });
          return 200;
        } catch (e) {
          return e.status;
        }
      }, qa.context.readonly);
      assert.equal(response, 403);
      assert.equal(
        await p.locator('[data-calendar-editable="true"]').count(),
        0,
      );
      await worker.close();
    },
  );
  await check(
    "Lectura anterior a una confirmación no revierte el calendario en TanStack Query",
    async () => {
      const task = await create("Lectura tardía QA");
      await open();
      const pattern = `**/api/projects/${projectId}/tasks/`;
      let release, received;
      const held = new Promise((r) => (release = r)),
        captured = new Promise((r) => (received = r));
      await page.route(pattern, async (route) => {
        if (route.request().method() !== "GET") return route.continue();
        const response = await route.fetch();
        received();
        await held;
        await route.fulfill({ response });
      });
      const read = responseFor(
        (r) =>
          r.request().method() === "GET" &&
          r.url().endsWith(`/projects/${projectId}/tasks/`),
      );
      await page
        .getByRole("button", { name: "Actualizar Gantt", exact: true })
        .click();
      await captured;
      const saved = responseFor(
        (r) =>
          r.request().method() === "PATCH" &&
          r.url().endsWith(`/tasks/${task.id}/`),
      );
      await program(task.id);
      assert.equal((await saved).status(), 200);
      await bar(task.id).waitFor();
      release();
      await read;
      await settle();
      await page.unroute(pattern);
      assert.equal(
        await page.locator(`[data-gantt-missing-dates="${task.id}"]`).count(),
        0,
      );
      await bar(task.id).waitFor();
    },
  );
  await check("Escala Día legible y guardado DATE en ancho estrecho", async () => {
    await open(); await chooseGanttPeriod(page, "day");
    await page.setViewportSize({ width: 900, height: 950 }); await settle();
    assert.match(await page.locator(".gm-task-gantt .gm-gantt-time-header").innerText(), /(?:00|03|06|09|12|15|18|21):00/);
    assert.equal(await page.getByText("Solo días (DATE)", { exact: true }).count(), 0);
    await snap("day-readable"); await page.setViewportSize({ width: 1600, height: 950 });
  });
  assert.deepEqual(errors, []);
} catch (e) {
  await snap("failure");
  throw e;
} finally {
  fs.writeFileSync(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
          browser: browser.version(),
        environment:
          "Chrome + frontend actual + Django + MySQL QA aislado; demoras/abortos controlados de transporte",
        projectId,
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
