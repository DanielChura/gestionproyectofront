import {
  chooseGanttPeriod,
  showGanttRange,
} from "./ganttBrowserControls.mjs";
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
const row = (id) => page.locator(`tr[data-task-id="${id}"]`);
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
let projectId,
  seed = {};
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
async function openGantt() {
  await page.goto(url(projectId) + "?vista=gantt");
  await page.locator(".gm-task-gantt .wx-gantt").waitFor();
  await chooseGanttPeriod(page, "week");
  await page
    .getByRole("button", { name: "Ajuste automático", exact: true })
    .click();
  await chooseGanttPeriod(page, "week");
  await settle();
}
async function detail(id, target = page) {
  return target.evaluate(
    async ({ projectId, id }) => {
      const { httpClient } = await import("/src/core/api/httpClient.ts");
      return (await httpClient.get(`projects/${projectId}/tasks/${id}/`)).data
        .task;
    },
    { projectId, id },
  );
}
async function schedulingPoint(id, xRatio = 0.35) {
  await tree(id).scrollIntoViewIfNeeded();
  await settle();
  const region = await page.locator(".gm-gantt-scene").boundingBox(),
    r = await tree(id).boundingBox();
  return { x: region.x + region.width * xRatio, y: r.y + r.height / 2 };
}
async function dragProgram(id, cancel = false, reverse = false) {
  const at = await schedulingPoint(id);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + (reverse ? -90 : 90), at.y + 3, { steps: 8 });
  await snap("programming-preview");
  if (cancel) await page.keyboard.press("Escape");
  await page.mouse.up();
}
try {
  await login(page, "admin");
  const created = await api("projects/", "post", {
    name: "Cierre Gantt QA " + Date.now(),
    area_ids: [qa.context.area],
    mode: "available",
    worker_contribute: true,
    end_date: "2027-12-31",
  });
  assert.equal(created.status, 201, JSON.stringify(created));
  projectId = created.data.id;
  const state = created.data.task_states.states.find(
    (s) => s.category === "not_started",
  ).code;
  async function create(name, extra = {}) {
    const r = await api(`projects/${projectId}/tasks/`, "post", {
      name,
      state_code: state,
      start_date: "2026-11-10",
      due_date: "2026-11-30",
      parent_id: null,
      ...extra,
    });
    assert.equal(r.status, 201, JSON.stringify(r));
    return r.data;
  }
  seed.root = await create("Raíz del cierre QA");
  seed.child = await create("Hija del cierre QA", {
    parent_id: seed.root.id,
    due_date: "2026-11-25",
  });
  seed.nested = await create("Nieta del cierre QA", {
    parent_id: seed.child.id,
    due_date: null,
  });
  seed.target = await create("Destino del cierre QA", {
    start_date: "2026-11-18",
    due_date: "2026-11-23",
  });
  seed.open = await create("Sin intervalo del cierre QA", { due_date: null });
  seed.reverse = await create("Inversa del cierre QA", { due_date: null });
  seed.closed = await create("Finalizada del cierre QA");
  const final = created.data.task_states.states.find((s) =>
    ["done", "closed"].includes(s.category),
  );
  assert.equal(
    (
      await api(
        `projects/${projectId}/tasks/${seed.closed.id}/state/`,
        "post",
        { state_code: final.code },
      )
    ).status,
    200,
  );
  await openGantt();
  await check(
    "Cabecera única, avance oficial, acciones reservadas y permisos reales",
    async () => {
      const p = page.getByRole("progressbar", { name: /Avance de/ });
      assert.equal(
        await p.getAttribute("value"),
        String(Math.round((1 / 7) * 10000) / 100),
      );
      assert.equal(await page.locator(".gm-gantt-chart-top").count(), 0);
      for (const t of [seed.root, seed.child, seed.nested]) {
        await tree(t.id).hover();
        assert.equal(
          await tree(t.id).locator(".gm-gantt-row-actions button").count(),
          2,
        );
        assert.equal(
          await tree(t.id)
            .locator(".gm-gantt-row-actions")
            .evaluate((e) => globalThis.getComputedStyle(e).opacity),
          "1",
        );
        await tree(t.id)
          .getByRole("button", {
            name: "Cambiar nombre de " + t.name,
            exact: true,
          })
          .focus();
        assert.equal(
          await tree(t.id)
            .locator(".gm-gantt-row-actions")
            .evaluate((e) => globalThis.getComputedStyle(e).opacity),
          "1",
        );
      }
      const disabled = tree(seed.closed.id).getByRole("button", {
        name: "Crear subtarea de " + seed.closed.name,
        exact: true,
      });
      assert.equal(await disabled.getAttribute("aria-disabled"), "true");
      await snap("header-week-light");
    },
  );
  await check(
    "Cinco escalas, referencias horarias DATE y navegación sin escritura",
    async () => {
      const before = requests.filter((r) => r.method !== "GET").length;
      for (const scale of ["year", "quarter", "month", "week", "day"]) {
        await chooseGanttPeriod(page, scale);
        await settle();
        const labels = await page
          .locator(".gm-task-gantt .gm-gantt-time-header")
          .innerText();
        if (scale === "year") assert.match(labels, /Q[1-4]/);
        if (scale === "quarter") assert.match(labels, /Q[1-4]/);
        if (scale === "month") assert.match(labels, /S\d\d/);
        if (scale === "week") assert.match(labels, /S\d\d/);
        if (scale === "day") assert.match(labels, /\d\d:00/);
        await snap("scale-" + scale);
      }
      await showGanttRange(page, "2024-02-28", "2024-03-01");
      await settle();
      await snap("leap-calendar");
      await showGanttRange(page, "2026-12-28", "2027-01-03");
      await settle();
      assert.match(await page.locator(".gm-gantt-time-header").innerText(), /2026/);
      await snap("iso-cross-year");
      assert.equal(requests.filter((r) => r.method !== "GET").length, before);
      await openGantt();
    },
  );
  await check(
    "Crear y renombrar bajo el padre exacto a profundidad tres; persistencia",
    async () => {
      await tree(seed.nested.id).hover();
      await tree(seed.nested.id)
        .getByRole("button", {
          name: "Crear subtarea de " + seed.nested.name,
          exact: true,
        })
        .click();
      const d = page.getByRole("dialog", {
        name: "Crear subtarea",
        exact: true,
      });
      await d
        .getByLabel("Nombre", { exact: true })
        .fill("Cuarto nivel del cierre QA");
      const save = responseFor(
        (r) =>
          r.request().method() === "POST" &&
          r.url().endsWith(`/projects/${projectId}/tasks/`),
      );
      await d.getByRole("button", { name: "Crear", exact: true }).click();
      const response = await save;
      assert.equal(response.status(), 201);
      seed.deep = await response.json();
      assert.equal(seed.deep.parent_id, seed.nested.id);
      await tree(seed.deep.id).waitFor();
      await tree(seed.deep.id).hover();
      await tree(seed.deep.id)
        .getByRole("button", {
          name: "Cambiar nombre de " + seed.deep.name,
          exact: true,
        })
        .click();
      const rename = page.getByRole("dialog", {
        name: "Cambiar nombre",
        exact: true,
      });
      await rename
        .getByLabel("Nombre", { exact: true })
        .fill("Cuarto nivel renombrado QA");
      const changed = responseFor(
        (r) =>
          r.request().method() === "PATCH" &&
          r.url().endsWith(`/tasks/${seed.deep.id}/`),
      );
      await rename
        .getByRole("button", { name: "Guardar", exact: true })
        .click();
      const patch = await changed;
      assert.deepEqual(patch.request().postDataJSON(), {
        name: "Cuarto nivel renombrado QA",
      });
      const after = await detail(seed.deep.id);
      assert.equal(after.parent_id, seed.nested.id);
      assert.equal(after.due_date, null);
      await openGantt();
      await tree(seed.deep.id).waitFor();
    },
  );
  await check(
    "Programación: clic, Escape y repetición inmediata; gesto inverso fijo y revisión exacta",
    async () => {
      let point = await schedulingPoint(seed.open.id);
      await page.mouse.move(point.x, point.y);
    await snap("programming-hover");
    await page.mouse.click(point.x, point.y);
      await page
        .getByRole("dialog", { name: "Definir fechas", exact: true })
        .waitFor();
      await page.keyboard.press("Escape");
      const before = requests.filter((r) => r.method === "PATCH").length;
      await dragProgram(seed.open.id, true);
      await dragProgram(seed.open.id, true);
      assert.equal(requests.filter((r) => r.method === "PATCH").length, before);
      const lost = await schedulingPoint(seed.open.id);
      await page.evaluate(() =>
        globalThis.document.addEventListener(
          "pointerdown",
          (event) => {
            globalThis.__ganttQaPointer = event.pointerId;
          },
          { once: true, capture: true },
        ),
      );
      await page.mouse.move(lost.x, lost.y);
      await page.mouse.down();
      await page.mouse.move(lost.x + 80, lost.y, { steps: 6 });
      await page.evaluate(() => {
        const surface = globalThis.document.querySelector(".gm-gantt-scene");
        surface.releasePointerCapture(globalThis.__ganttQaPointer);
      });
      await page.mouse.up();
      assert.equal(requests.filter((r) => r.method === "PATCH").length, before);
      const base = await detail(seed.open.id),
        saved = responseFor(
          (r) =>
            r.request().method() === "PATCH" &&
            r.url().endsWith(`/tasks/${base.id}/`),
        );
      await dragProgram(base.id);
      const r = await saved;
      assert.equal(r.status(), 200);
      const payload = r.request().postDataJSON();
      assert.equal(payload.expected_calendar_revision, base.calendar_revision);
      assert.match(payload.calendar_intent_id, /^[a-f\d-]{36}$/);
      assert.ok(payload.start_date && payload.due_date);
      await bar(base.id).waitFor();
      assert.equal(
        await page.locator(`[data-gantt-missing-dates="${base.id}"]`).count(),
        0,
      );
      assert.equal(await page.getByRole("dialog").count(), 0);
      const next = responseFor(
        (r) =>
          r.request().method() === "PATCH" &&
          r.url().endsWith(`/tasks/${seed.reverse.id}/`),
      );
      await dragProgram(seed.reverse.id, false, true);
      const reverse = await next;
      assert.equal(reverse.status(), 200);
      const values = reverse.request().postDataJSON();
      assert.ok(values.start_date <= values.due_date);
      await page.reload();
      await page.locator(".gm-task-gantt .wx-gantt").waitFor();
      await chooseGanttPeriod(page, "week");
      await bar(base.id).waitFor();
      assert.equal((await detail(base.id)).due_date, payload.due_date);
      await snap("programmed-confirmed");
    },
  );
  await check(
    "Barra completa: mover conserva intervalo y resize guarda solo el extremo elegido",
    async () => {
      await openGantt();
      await showGanttRange(page, "2026-11-08", "2026-12-15");
      async function gesture(mode) {
        const base = await detail(seed.target.id),
          b = await bar(base.id).boundingBox();
        const x = mode === "end" ? b.x + b.width - 2 : b.x + b.width / 2;
        const response = responseFor(
          (r) =>
            r.request().method() === "PATCH" &&
            r.url().endsWith(`/tasks/${base.id}/`),
        );
        await page.mouse.move(x, b.y + b.height / 2);
        await page.mouse.down();
        await page.mouse.move(x + 100, b.y + b.height / 2, { steps: 10 });
        await page.mouse.up();
        const saved = await response;
        assert.equal(saved.status(), 200);
        const payload = saved.request().postDataJSON(),
          current = await detail(base.id);
        assert.equal(
          payload.expected_calendar_revision,
          base.calendar_revision,
        );
        if (mode === "end") {
          assert.equal("start_date" in payload, false);
          assert.equal(current.start_date, base.start_date);
        } else {
          assert.equal(
            Date.parse(current.due_date) - Date.parse(current.start_date),
            Date.parse(base.due_date) - Date.parse(base.start_date),
          );
        }
        assert.equal(current.state_code, base.state_code);
        assert.equal(current.parent_id, base.parent_id);
      }
      await gesture("move");
      await gesture("end");
    },
  );
  await check(
    "Escudo: pan y rueda, Escape, reanudación; ninguna escritura",
    async () => {
      await page
        .getByRole("button", { name: "Proteger vista", exact: true })
        .click();
      const before = requests.filter((r) => r.method !== "GET").length;
      const b = await bar(seed.root.id).boundingBox();
      await page.mouse.move(b.x + 30, b.y + 10);
      await page.mouse.down();
      await page.mouse.move(b.x + 160, b.y + 10, { steps: 8 });
      await page.keyboard.press("Escape");
      await page.mouse.up();
      await page.mouse.down();
      await page.mouse.move(b.x + 80, b.y + 10, { steps: 5 });
      await page.mouse.up();
      await page.mouse.wheel(0, 180);
      await settle();
      assert.equal(requests.filter((r) => r.method !== "GET").length, before);
      assert.equal(await page.getByRole("dialog").count(), 0);
      await page
        .getByRole("button", { name: "Proteger vista", exact: true })
        .click();
      await openGantt();
    },
  );

  await check(
    "Dependencias reales: ambos sentidos espaciales, vacío, ciclos, retirada y Deshacer",
    async () => {
      await showGanttRange(page, "2026-11-08", "2026-12-03");
      await settle();
      const connector = (id, side = "end") =>
        page.locator(
          `[data-connector-task="${id}"][data-connector-side="${side}"]`,
        );
      async function connect(
        source,
        target,
        side = "end",
        blank = false,
        cancel = false,
      ) {
        await tree(source).scrollIntoViewIfNeeded();
        await connector(source, side).focus();
        const a = await connector(source, side).boundingBox(),
          b = await bar(target).boundingBox();
        await page.mouse.move(a.x + 12, a.y + 12);
        await page.mouse.down();
        await page.mouse.move(
          blank ? a.x + 80 : b.x + b.width / 2,
          blank ? a.y + 200 : b.y + b.height / 2,
          { steps: 10 },
        );
        await snap("connection-preview");
      if (cancel) await page.keyboard.press("Escape");
        await page.mouse.up();
      }
      const count = requests.filter((r) => r.method !== "GET").length;
      await connect(seed.root.id, seed.target.id, "end", true);
      assert.equal(
        await page
          .getByRole("dialog", { name: "Dependencia", exact: true })
          .count(),
        0,
      );
      await connect(seed.root.id, seed.target.id, "start", false, true);
      assert.equal(requests.filter((r) => r.method !== "GET").length, count);
      await connect(seed.root.id, seed.target.id, "start");
      const modal = page.getByRole("dialog", {
        name: "Dependencia",
        exact: true,
      });
      await modal
        .getByRole("button", { name: "Confirmar vínculo", exact: true })
        .click();
      await modal.waitFor({ state: "hidden" });
      assert.ok(
        (await detail(seed.target.id)).dependencies.includes(seed.root.id),
      );
      const edge = page.locator(
        `[data-gantt-link="${seed.root.id}:${seed.target.id}"]`,
      );
      await edge.waitFor();
      assert.match(await edge.getAttribute("d"), /Q/);
      assert.equal(
        await page.locator(`[data-connector-task="${seed.child.id}"]`).count(),
        0,
      );
      const cycle = await api(
        `projects/${projectId}/tasks/${seed.root.id}/dependencies/`,
        "post",
        { predecessor_id: seed.target.id },
      );
      assert.equal(cycle.status, 400);
      const duplicate = await api(
        `projects/${projectId}/tasks/${seed.target.id}/dependencies/`,
        "post",
        { predecessor_id: seed.root.id },
      );
      assert.ok([200, 201, 400, 409].includes(duplicate.status));
      assert.equal(
        (await detail(seed.target.id)).dependencies.filter(
          (id) => id === seed.root.id,
        ).length,
        1,
      );
      await edge.focus();
      await page
        .locator(`[data-remove-link="${seed.root.id}:${seed.target.id}"]`)
        .click();
      await modal
        .getByRole("button", { name: "Retirar dependencia", exact: true })
        .click();
      const undo = page.getByRole("status", {
        name: "Dependencia retirada",
        exact: true,
      });
      await undo
        .getByRole("button", { name: "Deshacer", exact: true })
        .dblclick();
      await undo.waitFor({ state: "hidden" });
      assert.ok(
        (await detail(seed.target.id)).dependencies.includes(seed.root.id),
      );
      await connect(seed.root.id, seed.closed.id, "end");
      await modal.getByRole("button", { name: "Confirmar vínculo", exact: true }).click();
      await modal.waitFor({ state: "hidden" });
      assert.ok((await detail(seed.closed.id)).dependencies.includes(seed.root.id));
      await snap("dependencies-real");
    },
  );
  await check(
    "Programación concurrente: dos sesiones reales, 409, consulta y reaplicación explícita",
    async () => {
      seed.conflict = await create("Conflicto del cierre QA", {
        due_date: null,
      });
      await openGantt();
      const other = await browser.newContext(),
        second = await other.newPage();
      await login(second, "admin2");
      const base = await detail(seed.conflict.id),
        at = await schedulingPoint(base.id);
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
      await page.mouse.move(at.x + 90, at.y, { steps: 5 });
      const competing = await second.evaluate(
        async ({ projectId, id, revision }) => {
          const { httpClient } = await import("/src/core/api/httpClient.ts");
          return (
            await httpClient.patch(`projects/${projectId}/tasks/${id}/`, {
              due_date: "2026-11-27",
              expected_calendar_revision: revision,
              calendar_intent_id: crypto.randomUUID(),
            })
          ).status;
        },
        { projectId, id: base.id, revision: base.calendar_revision },
      );
      assert.equal(competing, 200);
      const rejected = responseFor(
        (r) =>
          r.request().method() === "PATCH" &&
          r.url().endsWith(`/tasks/${base.id}/`),
      );
      await page.mouse.up();
      assert.equal((await rejected).status(), 409);
      const feedback = page.getByRole("region", {
        name: "Operaciones de calendario",
        exact: true,
      });
      await feedback.getByText(/Tu borrador se conserva/).waitFor();
      assert.equal((await detail(base.id)).due_date, "2026-11-27");
      await feedback
        .getByRole("button", { name: "Consultar fechas vigentes", exact: true })
        .click();
      await feedback
        .getByRole("button", {
          name: "Preparar nueva intención sobre esta revisión",
          exact: true,
        })
        .click();
      const saved = responseFor(
        (r) =>
          r.request().method() === "PATCH" &&
          r.url().endsWith(`/tasks/${base.id}/`),
      );
      await feedback
        .getByRole("button", { name: "Guardar propuesta", exact: true })
        .click();
      assert.equal((await saved).status(), 200);
      await bar(base.id).waitFor();
      await other.close();
    },
  );
  await check(
    "Respuesta perdida después del commit: consultar y reintentar el mismo UUID sin nueva revisión",
    async () => {
      seed.lost = await create("Respuesta perdida del cierre QA", {
        due_date: null,
      });
      await openGantt();
      const pattern = `**/api/projects/${projectId}/tasks/${seed.lost.id}/`;
      let payload;
      await page.route(pattern, async (route) => {
        if (route.request().method() !== "PATCH") return route.continue();
        payload = route.request().postDataJSON();
        await route.fetch();
        await route.abort("failed");
        await page.unroute(pattern);
      });
      await dragProgram(seed.lost.id);
      const feedback = page.getByRole("region", {
        name: "Operaciones de calendario",
        exact: true,
      });
      await feedback
        .getByRole("button", { name: "Consultar fechas vigentes", exact: true })
        .waitFor();
      const retry = feedback.getByRole("button", {
        name: "Reintentar misma intención",
        exact: true,
      });
      assert.equal(await retry.isDisabled(), true);
      const committed = await detail(seed.lost.id);
      assert.equal(committed.due_date, payload.due_date);
      await feedback
        .getByRole("button", { name: "Consultar fechas vigentes", exact: true })
        .click();
      await retry.waitFor();
      await page.waitForFunction(
        () =>
          !globalThis.document
            .querySelector(".gm-gantt-feedback button:disabled")
            ?.textContent.includes("Reintentar"),
      );
      const again = responseFor(
        (r) =>
          r.request().method() === "PATCH" &&
          r.url().endsWith(`/tasks/${seed.lost.id}/`),
      );
      await retry.click();
      const r = await again;
      assert.equal(r.status(), 200);
      assert.deepEqual(r.request().postDataJSON(), payload);
      assert.equal(
        (await detail(seed.lost.id)).calendar_revision,
        committed.calendar_revision,
      );
      await bar(seed.lost.id).waitFor();
    },
  );
  await check(
    "Celda vacía de Semana abre creación confirmada con día precargado",
    async () => {
      await openGantt();
      const footer = page
        .locator(".gm-task-gantt")
        .getByRole("button", { name: "+ Agregar tarea", exact: true });
      await footer.scrollIntoViewIfNeeded();
      const row = await footer.boundingBox(),
        region = await page.locator(".gm-gantt-scene").boundingBox();
      const before = requests.filter((r) => r.method === "POST").length;
      await page.mouse.click(region.x + 160, row.y + row.height / 2);
      const modal = page.getByRole("dialog", {
        name: "Crear tarea",
        exact: true,
      });
      await modal.waitFor();
      assert.match(await modal.innerText(), /Inicio: 2026-/);
      await page.keyboard.press("Escape");
      assert.equal(requests.filter((r) => r.method === "POST").length, before);
    },
  );
  await check(
    "Temas, anchos, sidebar, Lista y detalle comparten calendario confirmado",
    async () => {
      for (const dark of [false, true])
        for (const width of [1600, 900, 600]) {
          await page.setViewportSize({ width, height: 950 });
          await page.evaluate(
            (d) =>
              globalThis.document.documentElement.classList.toggle("dark", d),
            dark,
          );
          await settle();
          await snap(`theme-${dark ? "dark" : "light"}-${width}`);
        }
      await page.setViewportSize({ width: 1600, height: 950 });
      await page.evaluate(() =>
        globalThis.document.documentElement.classList.remove("dark"),
      );
      const collapse = page.getByRole("button", {
        name: /Contraer menú|Contraer barra/,
      });
      if (await collapse.count()) await collapse.click();
      await snap("sidebar-collapsed");
      await page.getByRole("link", { name: "Lista", exact: true }).click();
      await row(seed.open.id).waitFor();
      const confirmed = await detail(seed.open.id);
      assert.ok(confirmed.due_date);
      await row(seed.open.id)
        .getByRole("button", { name: seed.open.name, exact: true })
        .click();
      await page.getByRole("dialog").waitFor();
      await snap("shared-detail");
      await page.keyboard.press("Escape");
      await page.getByRole("link", { name: "Tablero", exact: true }).click();
      await page.getByText(seed.open.name, { exact: true }).first().waitFor();
      await page
        .getByRole("button", { name: "Crear proyecto", exact: true })
        .click();
      await page
        .getByRole("dialog", {
          name: "Crear proyecto · Paso 1 de 2",
          exact: true,
        })
        .waitFor();
      await page.keyboard.press("Escape");
      await openGantt();
    },
  );
  assert.deepEqual(errors, []);
} catch (e) {
  await snap("unexpected-failure");
  throw e;
} finally {
  fs.writeFileSync(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
          browser: browser.version(),
        environment: "Chrome + frontend actual + Django + MySQL QA aislado",
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
