import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chooseGanttPeriod } from "./ganttBrowserControls.mjs";
const { chromium } = await import(
  pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE)
);
let ready = false;
for (let attempt = 0; attempt < 80 && !ready; attempt++) {
  try {
    ready = (
      await fetch("http://localhost:8819/api/auth/csrf/", {
        signal: AbortSignal.timeout(1000),
      })
    ).ok;
  } catch {
    ready = false;
  }
  if (!ready) await new Promise((resolve) => setTimeout(resolve, 250));
}
assert.ok(
  ready,
  "The isolated Django fixture must be ready before loading its fresh QA credentials",
);
const qa = JSON.parse(fs.readFileSync(process.env.GM_QA_SECRETS_PATH, "utf8"));
const origin = process.env.GM_FRONTEND_ORIGIN || "http://localhost:5189";
assert.equal(
  origin,
  "http://localhost:5189",
  "Only the isolated QA frontend is allowed",
);
assert.ok(qa.scheduling && process.env.GM_BROWSER_REPORT_DIR);
const out = process.env.GM_BROWSER_REPORT_DIR;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  timezoneId: "America/Lima",
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const checks = [],
  writes = [],
  errors = [];
let setupWrites = 0;
const c = qa.scheduling;
const taskPath = (id) => `/api/projects/${c.project}/tasks/${id}/`;
const dialog = (title) =>
  page.getByRole("dialog", { name: title, exact: true });
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  const pathname = new URL(request.url()).pathname;
  if (
    pathname.startsWith("/api/projects/") &&
    !["GET", "OPTIONS"].includes(request.method())
  )
    writes.push({
      path: pathname,
      method: request.method(),
      body: request.postDataJSON(),
    });
});
async function api(id) {
  return page.evaluate(async (url) => {
    const { httpClient } = await import("/src/core/api/httpClient.ts");
    return (await httpClient.get(url.replace(/^\/api\//, ""))).data.task;
  }, taskPath(id));
}
async function step(name, action) {
  await action();
  checks.push(name);
  console.log("PASS " + name);
}
async function reply(method, url, action, status = 200) {
  const result = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === url &&
      response.request().method() === method,
  );
  await action();
  const response = await result;
  assert.equal(response.status(), status, await response.text());
  return response.json();
}
async function openEdit(name) {
  await page
    .getByRole("button", { name: "Abrir tarea " + name, exact: true })
    .click();
  await page.getByRole("button", { name: "Editar datos", exact: true }).click();
  return dialog("Editar datos de tarea");
}
async function closeDetail() {
  const close = page.getByRole("button", { name: "Cerrar modal", exact: true });
  if (await close.count()) await close.click();
}
try {
  await page.goto(origin + `/proyectos/${c.project}?vista=gantt`);
  await page.getByLabel("Correo electrónico").fill(qa.admin.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(qa.admin.password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor();
  await step(
    "Apertura actual sin escritura; hora y legado recibidos",
    async () => {
      assert.equal(writes.length, 0);
      assert.equal((await api(c.source)).schedule.precision, "hour");
      const legacy = await api(c.legacy_target);
      assert.equal(legacy.dependency_links[0].type, null);
      assert.equal(legacy.dependency_links[0].legacy, true);
    },
  );
  const initial = await api(c.source);
  if (
    initial.name !== "Hora origen QA" ||
    initial.schedule.start.slice(11, 16) !== "09:00"
  ) {
    await page.evaluate(
      async ({ project, id, revision, day }) => {
        const { httpClient } = await import("/src/core/api/httpClient.ts");
        await httpClient.patch(`projects/${project}/tasks/${id}/`, {
          name: "Hora origen QA",
          schedule: {
            precision: "hour",
            start: day + "T09:00:00-05:00",
            end: day + "T10:00:00-05:00",
            timezone: "America/Lima",
          },
          expected_calendar_revision: revision,
          calendar_intent_id: crypto.randomUUID(),
        });
      },
      {
        project: c.project,
        id: c.source,
        revision: initial.calendar_revision,
        day: c.day,
      },
    );
    setupWrites++;
    await page.reload();
    await page.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor();
  }
  await step(
    "Formulario conserva horas, guarda una intención y permite editar nombre sin tocar calendario",
    async () => {
      const before = await api(c.source);
      let form = await openEdit("Hora origen QA");
      assert.equal(
        await form.getByLabel("Inicio horario", { exact: true }).inputValue(),
        c.day + "T09:00",
      );
      await form
        .getByLabel("Inicio horario", { exact: true })
        .fill(c.day + "T10:00");
      await form
        .getByLabel("Fin horario exclusivo (opcional)")
        .fill(c.day + "T11:00");
      const saved = await reply("PATCH", taskPath(c.source), () =>
        form
          .getByRole("button", { name: "Guardar cambios", exact: true })
          .click(),
      );
      assert.equal(saved.schedule.start.slice(11, 16), "10:00");
      const payload = writes.at(-1).body;
      assert.ok(payload.calendar_intent_id);
      assert.equal(
        payload.expected_calendar_revision,
        before.calendar_revision,
      );
      assert.equal("start_date" in payload, false);
      assert.equal("due_date" in payload, false);
      await closeDetail();
      form = await openEdit("Hora origen QA");
      await form.locator("#task-name").fill("Hora origen renombrada QA");
      await reply("PATCH", taskPath(c.source), () =>
        form
          .getByRole("button", { name: "Guardar cambios", exact: true })
          .click(),
      );
      assert.deepEqual(Object.keys(writes.at(-1).body), ["name"]);
      assert.equal(
        (await api(c.source)).calendar_revision,
        saved.calendar_revision,
      );
      await closeDetail();
    },
  );
  await step(
    "Lista y Tablero conservan el horario confirmado después de navegar",
    async () => {
      for (const view of ["Lista", "Tablero", "Gantt"]) {
        await page.getByRole("link", { name: view, exact: true }).click();
        if (view === "Lista")
          await page
            .locator(`tr[data-task-id="${c.source}"]`)
            .getByText("Hora origen renombrada QA", { exact: true })
            .click();
        else if (view === "Tablero")
          await page
            .getByText("Hora origen renombrada QA", { exact: true })
            .click();
        else
          await page
            .getByRole("button", {
              name: "Abrir tarea Hora origen renombrada QA",
              exact: true,
            })
            .click();
        await page
          .getByRole("button", { name: "Editar datos", exact: true })
          .click();
        const form = dialog("Editar datos de tarea");
        assert.equal(
          await form.getByLabel("Inicio horario", { exact: true }).inputValue(),
          c.day + "T10:00",
        );
        await form
          .getByRole("button", { name: "Cancelar", exact: true })
          .click();
        await closeDetail();
      }
    },
  );
  await step(
    "Crear desde formulario compartido conserva una hora y no inventa calendario sin límite",
    async () => {
      await page
        .getByRole("button", { name: "+ Agregar tarea", exact: true })
        .first()
        .click();
      const form = dialog("Nueva tarea");
      await form
        .locator("#task-name")
        .fill("Creación horaria navegador QA " + Date.now());
      await form.getByLabel("Usar horario · America/Lima").check();
      await form
        .getByLabel("Inicio horario", { exact: true })
        .fill(c.day + "T13:00");
      await form
        .getByLabel("Fin horario exclusivo (opcional)")
        .fill(c.day + "T14:00");
      const created = await reply(
        "POST",
        `/api/projects/${c.project}/tasks/`,
        () =>
          form
            .getByRole("button", { name: "Crear tarea", exact: true })
            .click(),
        201,
      );
      assert.equal(
        Date.parse(created.schedule.end) - Date.parse(created.schedule.start),
        3600000,
      );
      assert.equal(created.schedule.precision, "hour");
      assert.equal((await api(c.unbounded)).schedule.end, null);
      assert.equal(
        await page
          .locator(
            `[data-gantt-calendar-task="${c.unbounded}"] [data-gantt-calendar-mode]`,
          )
          .count(),
        0,
      );
    },
  );
  await step(
    "Legado informativo se convierte solo al confirmar un tipo explícito",
    async () => {
      await page
        .getByRole("button", {
          name: "Abrir tarea Legado destino QA",
          exact: true,
        })
        .click();
      const relation = page
        .locator("li")
        .filter({ hasText: "Legado origen QA" });
      await relation.getByLabel("Tipo de dependencia").selectOption("SS");
      await reply("PATCH", taskPath(c.legacy_target) + "dependencies/", () =>
        relation
          .getByRole("button", { name: "Confirmar tipo", exact: true })
          .click(),
      );
      assert.equal((await api(c.legacy_target)).dependency_links[0].type, "SS");
      assert.equal(writes.at(-1).body.expected_type, null);
      await closeDetail();
    },
  );
  await step(
    "Nueva dependencia desde detalle exige tipo y conserva dirección",
    async () => {
      await page
        .getByRole("button", {
          name: "Abrir tarea Hora origen renombrada QA",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", {
          name: /^Relacionar elementos o añadir dependencias/,
        })
        .click();
      const popup = page.locator("[popover]:popover-open");
      await popup
        .getByRole("button", { name: "Esta tarea bloquea...", exact: true })
        .click();
      await popup.getByLabel("Tipo de dependencia").selectOption("SS");
      await popup.getByRole("searchbox").fill("Hora destino QA");
      await reply(
        "POST",
        taskPath(c.target) + "dependencies/",
        () =>
          popup
            .locator("button[data-candidate]")
            .filter({ hasText: "Hora destino QA" })
            .click(),
        201,
      );
      assert.equal((await api(c.target)).dependency_links[0].type, "SS");
      assert.equal(
        (await api(c.target)).dependency_links[0].predecessor_id,
        c.source,
      );
      await closeDetail();
    },
  );
  await step(
    "Arrastre horario real: Escape libera inmediatamente; mover y redimensionar escriben una vez",
    async () => {
      await chooseGanttPeriod(page, "day");
      const shield = page.getByRole("button", {
        name: /^(Proteger vista|Vista protegida):/,
      });
      if ((await shield.getAttribute("aria-pressed")) === "true")
        await shield.click();
      let current = await api(c.source);
      await page
        .locator(".gm-task-gantt .wx-chart")
        .evaluate(async (node, instant) => {
          const { viewportGeometry } =
            await import("/src/features/home/views/TaskGantt/ganttViewport.ts");
          const d = globalThis.document.querySelector(".gm-task-gantt").dataset;
          const geometry = viewportGeometry({
            start: new Date(Number(d.ganttWindowStart)),
            end: new Date(Number(d.ganttWindowEnd)),
            scale: d.ganttScale,
            zoomLevel: Number(d.ganttZoom),
          });
          node.scrollLeft =
            geometry.toX(new Date(instant)) - node.clientWidth / 2;
        }, current.schedule.start);
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            globalThis.requestAnimationFrame(() =>
              globalThis.requestAnimationFrame(resolve),
            ),
          ),
      );
      const bar = () =>
        page.locator(`[data-gantt-calendar-task="${c.source}"]`);
      let rect = await bar().boundingBox();
      assert.ok(rect && rect.width >= 32);
      const hourWidth = await page
        .locator(".gm-gantt-time-header [role=row]")
        .last()
        .getByRole("columnheader")
        .first()
        .evaluate((node) => node.getBoundingClientRect().width);
      const n = writes.length;
      await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        rect.x + rect.width / 2 + hourWidth,
        rect.y + rect.height / 2,
        { steps: 6 },
      );
      await page.keyboard.press("Escape");
      await page.mouse.up();
      assert.equal(writes.length, n);
      rect = await bar().boundingBox();
      await reply("PATCH", taskPath(c.source), async () => {
        await page.mouse.move(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(
          rect.x + rect.width / 2 + hourWidth,
          rect.y + rect.height / 2,
          { steps: 6 },
        );
        await page.mouse.up();
      });
      assert.equal(writes.length, n + 1);
      let moved = await api(c.source);
      assert.equal(
        Date.parse(moved.schedule.start) - Date.parse(current.schedule.start),
        3600000,
      );
      assert.equal(
        Date.parse(moved.schedule.end) - Date.parse(moved.schedule.start),
        3600000,
      );
      assert.equal(moved.state_code, current.state_code);
      assert.equal(moved.parent_id, current.parent_id);
      const handle = bar().locator('[data-gantt-calendar-mode="end"]');
      rect = await handle.boundingBox();
      assert.ok(rect);
      await reply("PATCH", taskPath(c.source), async () => {
        await page.mouse.move(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(
          rect.x + rect.width / 2 + hourWidth,
          rect.y + rect.height / 2,
          { steps: 6 },
        );
        await page.mouse.up();
      });
      const resized = await api(c.source);
      assert.equal(resized.schedule.start, moved.schedule.start);
      assert.equal(
        Date.parse(resized.schedule.end) - Date.parse(moved.schedule.end),
        3600000,
      );
      assert.equal(writes.length, n + 2);
      assert.equal(await page.getByRole("dialog").count(), 0);
    },
  );
  await step(
    "Dos clientes: 409 conserva horas y reaplicar requiere decisión explícita",
    async () => {
      const otherContext = await browser.newContext({
        viewport: { width: 1600, height: 1000 },
        timezoneId: "America/Lima",
      });
      try {
        const other = await otherContext.newPage();
        await other.goto(origin + `/proyectos/${c.project}?vista=gantt`);
        await other.getByLabel("Correo electrónico").fill(qa.admin_delay.email);
        await other
          .getByLabel("Contraseña", { exact: true })
          .fill(qa.admin_delay.password);
        await other
          .getByRole("button", { name: "Ingresar", exact: true })
          .click();
        await other
          .getByRole("button", {
            name: "Abrir tarea Hora origen renombrada QA",
            exact: true,
          })
          .click();
        await other
          .getByRole("button", { name: "Editar datos", exact: true })
          .click();
        const stale = other.getByRole("dialog", {
          name: "Editar datos de tarea",
          exact: true,
        });
        const form = await openEdit("Hora origen renombrada QA");
        await form
          .getByLabel("Fin horario exclusivo (opcional)")
          .fill(c.day + "T14:00");
        await stale
          .getByLabel("Fin horario exclusivo (opcional)")
          .fill(c.day + "T15:00");
        await reply("PATCH", taskPath(c.source), () =>
          form
            .getByRole("button", { name: "Guardar cambios", exact: true })
            .click(),
        );
        await closeDetail();
        const rejected = other.waitForResponse(
          (r) =>
            new URL(r.url()).pathname === taskPath(c.source) &&
            r.request().method() === "PATCH",
        );
        await stale
          .getByRole("button", { name: "Guardar cambios", exact: true })
          .click();
        const failure = await rejected;
        assert.equal(failure.status(), 409);
        assert.equal((await failure.json()).code, "calendar_revision_conflict");
        assert.equal(
          await stale
            .getByLabel("Fin horario exclusivo (opcional)")
            .inputValue(),
          c.day + "T15:00",
        );
        await stale
          .getByRole("button", {
            name: "Consultar fechas vigentes",
            exact: true,
          })
          .click();
        await stale.getByText(/14:00.*America\/Lima/).waitFor();
        assert.equal((await api(c.source)).schedule.end.slice(11, 16), "14:00");
        await stale
          .getByRole("button", {
            name: "Preparar nueva intención sobre esta revisión",
            exact: true,
          })
          .click();
        const reapplied = other.waitForResponse(
          (r) =>
            new URL(r.url()).pathname === taskPath(c.source) &&
            r.request().method() === "PATCH",
        );
        await stale
          .getByRole("button", { name: "Guardar cambios", exact: true })
          .click();
        assert.equal((await reapplied).status(), 200);
        assert.equal((await api(c.source)).schedule.end.slice(11, 16), "15:00");
      } finally {
        await otherContext.close();
      }
    },
  );
  await step(
    "Restricción SS real devuelve 400 sin sobrescribir el calendario ni perder borrador",
    async () => {
      const before = await api(c.target);
      const form = await openEdit("Hora destino QA");
      await form
        .getByLabel("Inicio horario", { exact: true })
        .fill(c.day + "T10:00");
      const failure = await reply(
        "PATCH",
        taskPath(c.target),
        () =>
          form
            .getByRole("button", { name: "Guardar cambios", exact: true })
            .click(),
        400,
      );
      assert.equal(failure.code, "dependency_constraint");
      await form.getByRole("alert").filter({ hasText: "SS:" }).waitFor();
      assert.equal(
        await form.getByLabel("Inicio horario", { exact: true }).inputValue(),
        c.day + "T10:00",
      );
      assert.equal(
        (await api(c.target)).calendar_revision,
        before.calendar_revision,
      );
      await form.getByRole("button", { name: "Cancelar", exact: true }).click();
      await closeDetail();
    },
  );
  await step(
    "Respuesta perdida después del commit: consultar y reintentar conserva UUID y revisión",
    async () => {
      const before = await api(c.target);
      const form = await openEdit("Hora destino QA");
      await form
        .getByLabel("Fin horario exclusivo (opcional)")
        .fill(c.day + "T13:00");
      let lost = false;
      await page.route("**" + taskPath(c.target), async (route) => {
        if (route.request().method() === "PATCH" && !lost) {
          lost = true;
          const response = await route.fetch();
          assert.equal(response.status(), 200);
          await route.abort("failed");
        } else await route.continue();
      });
      const n = writes.length;
      await form
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click();
      await form
        .getByText(/No se pudo confirmar el resultado/)
        .first()
        .waitFor();
      assert.equal(writes.length, n + 1);
      const original = writes.at(-1).body;
      await form
        .getByRole("button", { name: "Consultar fechas vigentes", exact: true })
        .click();
      await form.getByText(/13:00.*America\/Lima/).waitFor();
      await reply("PATCH", taskPath(c.target), () =>
        form
          .getByRole("button", { name: "Guardar cambios", exact: true })
          .click(),
      );
      assert.equal(writes.length, n + 2);
      assert.deepEqual(writes.at(-1).body, original);
      const saved = await api(c.target);
      assert.equal(
        BigInt(saved.calendar_revision),
        BigInt(before.calendar_revision) + 1n,
      );
      assert.equal(saved.schedule.end.slice(11, 16), "13:00");
      await page.unroute("**" + taskPath(c.target));
      await closeDetail();
    },
  );
  await page.reload();
  await page.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor();
  await chooseGanttPeriod(page, "day");
  const latest = await api(c.source);
  await page
    .locator(".gm-task-gantt .wx-chart")
    .evaluate(async (node, instant) => {
      const { viewportGeometry } =
        await import("/src/features/home/views/TaskGantt/ganttViewport.ts");
      const d = globalThis.document.querySelector(".gm-task-gantt").dataset;
      const geometry = viewportGeometry({
        start: new Date(Number(d.ganttWindowStart)),
        end: new Date(Number(d.ganttWindowEnd)),
        scale: d.ganttScale,
        zoomLevel: Number(d.ganttZoom),
      });
      node.scrollLeft = geometry.toX(new Date(instant)) - node.clientWidth / 2;
    }, latest.schedule.start);
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        globalThis.requestAnimationFrame(() =>
          globalThis.requestAnimationFrame(resolve),
        ),
      ),
  );
  await page.screenshot({
    path: path.join(out, "scheduling-light.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
} finally {
  fs.writeFileSync(
    path.join(out, "scheduling-results.json"),
    JSON.stringify(
      {
        captured_at: new Date().toISOString(),
        checks,
        setupWrites,
        writes,
        errors,
      },
      null,
      2,
    ),
  );
  await page
    .screenshot({ path: path.join(out, "scheduling-last.png"), fullPage: true })
    .catch(() => {});
  await browser.close();
}
