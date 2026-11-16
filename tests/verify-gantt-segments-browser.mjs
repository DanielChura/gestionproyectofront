import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chooseGanttPeriod, showGanttRange } from "./ganttBrowserControls.mjs";
const { chromium } = await import(
  pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE)
);
const qa = JSON.parse(fs.readFileSync(process.env.GM_QA_SECRETS_PATH, "utf8"));
const origin = process.env.GM_FRONTEND_ORIGIN || "http://localhost:5189",
  out = process.env.GM_BROWSER_REPORT_DIR;
assert.ok(out);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  }),
  page = await context.newPage();
page.setDefaultTimeout(12000);
const checks = [],
  writes = [],
  errors = [],
  stamp = Date.now();
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (request) => {
  const u = new URL(request.url());
  if (
    u.pathname.startsWith("/api/projects/") &&
    !["GET", "OPTIONS"].includes(request.method())
  )
    writes.push({
      method: request.method(),
      path: u.pathname,
      data: request.postDataJSON(),
    });
});
const shield = () =>
  page.getByRole("button", { name: /^(Proteger vista|Vista protegida):/ });
const modal = (name) => page.getByRole("dialog", { name, exact: true });
const tree = (id) => page.locator(`[data-gantt-tree-id='${id}']`);
const bar = (id) => page.locator(`[data-gantt-calendar-task='${id}']`);
const popup = () => page.locator("[popover]:popover-open");
const taskPath = (id) => `/api/projects/${qa.context.project}/tasks/${id}/`;
const shift = (day, offset) => {
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() + offset);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};
async function settled() {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        globalThis.requestAnimationFrame(() =>
          globalThis.requestAnimationFrame(resolve),
        ),
      ),
  );
}
async function api(url, method = "get", data) {
  return page.evaluate(
    async ({ url, method, data }) => {
      const { httpClient } = await import("/src/core/api/httpClient.ts");
      try {
        const r = await httpClient.request({
          url: url.replace(/^\/api\//, ""),
          method,
          data,
        });
        return { status: r.status, data: r.data };
      } catch (e) {
        return { status: e.status, data: e.payload };
      }
    },
    { url, method, data },
  );
}
async function current(id) {
  const r = await api(taskPath(id));
  assert.equal(r.status, 200);
  return r.data.task;
}
async function waitReply(method, url, action, status = 200) {
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === url && r.request().method() === method,
  );
  await action();
  const reply = await response;
  assert.equal(reply.status(), status, await reply.text());
  return reply.json();
}
async function screenshot(name) {
  await page.screenshot({
    path: path.join(out, name + ".png"),
    fullPage: true,
  });
}
async function check(name, run) {
  try {
    const detail = await run();
    checks.push({ name, status: "Aprobado", detail });
    console.log("PASS " + name);
  } catch (e) {
    checks.push({ name, status: "Fallido", error: e.message });
    await screenshot("failure-" + checks.length);
    throw e;
  } finally {
    fs.writeFileSync(
      path.join(out, "results.json"),
      JSON.stringify(
        {
          captured_at: new Date().toISOString(),
          environment:
            "Current frontend + current backend, disposable MySQL 8.4, synthetic QA only",
          checks,
          writes,
          errors,
        },
        null,
        2,
      ),
    );
  }
}
async function login(target, role, project) {
  await target.goto(origin + `/proyectos/${project}?vista=gantt`);
  await target.getByLabel("Correo electrónico").fill(qa[role].email);
  await target
    .getByLabel("Contraseña", { exact: true })
    .fill(qa[role].password);
  await target.getByRole("button", { name: "Ingresar", exact: true }).click();
  await target.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor();
}
async function top() {
  await page.locator(".gm-task-gantt .wx-gantt").evaluate((n) => {
    n.scrollTop = 0;
  });
  await settled();
}
async function openEdit(id, name) {
  await top();
  await page
    .getByRole("button", { name: "Abrir tarea " + name, exact: true })
    .click();
  await page.getByRole("button", { name: "Editar datos", exact: true }).click();
  await modal("Editar datos de tarea").waitFor();
}
async function chooseStart(scope, day) {
  await scope.getByRole("button", { name: /^Fecha de inicio:/ }).click();
  await popup().locator(`[data-date='${day}']`).focus();
  await page.keyboard.press("Enter");
  await popup().waitFor({ state: "detached" });
}
async function saveEdit(id, day) {
  await chooseStart(modal("Editar datos de tarea"), day);
  const saved = await waitReply("PATCH", taskPath(id), () =>
    modal("Editar datos de tarea")
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click(),
  );
  await modal("Editar datos de tarea").waitFor({ state: "detached" });
  const close = page.getByRole("button", {
    name: "Cerrar modal",
    exact: true,
  });
  await page.keyboard.press("Escape");
  await close.waitFor({ state: "detached" });
  return saved;
}
try {
  await login(page, "admin", qa.context.project);
  const previous = await current(qa.context.first);
  const reset = await api(taskPath(previous.id), "patch", {
    start_date: qa.context.today,
    due_date: shift(qa.context.today, 12),
    expected_calendar_revision: previous.calendar_revision,
    calendar_intent_id: randomUUID(),
  });
  assert.equal(reset.status, 200);
  const seeded = await api(
    `/api/projects/${qa.context.project}/tasks/${qa.context.second}/state/`,
    "post",
    { state_code: "COMPLETADA" },
  );
  assert.equal(seeded.status, 200);
  await page.reload();
  await shield().waitFor();
  const initial = await current(qa.context.first);
  await check(
    "Cinco temporalidades, selector compacto y DATE sin texto técnico ni escrituras",
    async () => {
      const before = writes.length;
      await page.getByRole("button", { name: /^Periodo de Gantt:/ }).click();
      assert.deepEqual(
        await page.getByRole("menuitemradio").allTextContents(),
        ["Día", "Semana", "Mes", "Trimestre", "Año"],
      );
      await page
        .getByRole("menuitemradio", { name: "Día", exact: true })
        .focus();
      await page.keyboard.press("End");
      assert.equal(
        await page
          .getByRole("menuitemradio", { name: "Año", exact: true })
          .evaluate((n) => n === globalThis.document.activeElement),
        true,
      );
      await page.keyboard.press("Home");
      assert.equal(
        await page
          .getByRole("menuitemradio", { name: "Día", exact: true })
          .evaluate((n) => n === globalThis.document.activeElement),
        true,
      );
      await screenshot("01-cinco-periodos");
      await page.keyboard.press("Escape");
      for (const scale of ["year", "quarter", "month", "week", "day"]) {
        await chooseGanttPeriod(page, scale);
        await page.getByRole("button", { name: "Hoy", exact: true }).click();
        await settled();
      }
      assert.equal(
        await page.getByText("Solo días (DATE)", { exact: true }).count(),
        0,
      );
      assert.equal(writes.length, before);
      assert.equal((await current(initial.id)).start_date, initial.start_date);
    },
  );
  await chooseGanttPeriod(page, "month");
  await check(
    "Proteger: pan desde barra y rueda sincronizada, clic de detalle y cero escrituras",
    async () => {
      await shield().click();
      assert.equal(await shield().getAttribute("aria-pressed"), "true");
      const before = writes.length,
        bounds = await bar(initial.id).boundingBox();
      assert.ok(bounds);
      const x = bounds.x + Math.min(70, bounds.width / 2),
        y = bounds.y + bounds.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x - 60, y, { steps: 6 });
      await page.mouse.up();
      assert.equal(await page.getByRole("dialog").count(), 0);
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 50, y, { steps: 6 });
      await page.keyboard.press("Escape");
      await page.mouse.up();
      const grid = page.locator(".gm-task-gantt .wx-gantt");
      await page.mouse.move(x, y);
      await page.mouse.wheel(0, 250);
      await settled();
      assert.ok((await grid.evaluate((n) => n.scrollTop)) > 0);
      await top();
      await page
        .getByRole("button", {
          name: "Abrir tarea " + initial.name,
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Cerrar modal", exact: true })
        .click();
      assert.equal(writes.length, before);
      assert.equal(await page.locator(".gm-gantt-connector").count(), 0);
      assert.equal(
        await bar(initial.id).locator(".gm-gantt-resize:visible").count(),
        0,
      );
    },
  );
  let created;
  await check(
    "Botón superior reutiliza Nueva tarea completo y crea una raíz una sola vez protegido",
    async () => {
      await page
        .locator(".gm-gantt-controls")
        .getByRole("button", { name: "+ Agregar tarea", exact: true })
        .click();
      const form = modal("Nueva tarea");
      await form.waitFor();
      await form
        .locator("input[name=name]")
        .fill("Completa segmentos QA " + stamp);
      await form
        .locator("textarea")
        .fill("Descripción sintética del formulario compartido");
      for (const label of [
        /^Estado inicial:/,
        /^Fecha de inicio:/,
        /^Fecha límite:/,
        /^Responsables:/,
        /^Prioridad:/,
        /^Etiquetas:/,
      ])
        assert.ok(
          await form.getByRole("button", { name: label }).count(),
          String(label),
        );
      await screenshot("02-nueva-tarea-compartida");
      const before = writes.length;
      created = await waitReply(
        "POST",
        `/api/projects/${qa.context.project}/tasks/`,
        () =>
          form
            .getByRole("button", { name: "Crear tarea", exact: true })
            .click(),
        201,
      );
      await form.waitFor({ state: "detached" });
      assert.equal(created.parent_id, null);
      assert.equal(
        created.description,
        "Descripción sintética del formulario compartido",
      );
      assert.equal(writes.length, before + 1);
      assert.equal(await shield().getAttribute("aria-pressed"), "true");
    },
  );
  await check(
    "Pie rápido, hija exacta y lápiz conservan flujos simples, parentesco y solo nombre",
    async () => {
      const grid = page.locator(".gm-task-gantt .wx-gantt");
      await grid.evaluate((n) => {
        n.scrollTop = n.scrollHeight;
      });
      await settled();
      await page
        .locator(".gm-task-gantt")
        .getByRole("button", { name: "+ Agregar tarea", exact: true })
        .click();
      const quick = modal("Crear tarea");
      assert.equal(await quick.locator("textarea").count(), 0);
      await quick
        .getByLabel("Nombre", { exact: true })
        .fill("Rápida segmentos QA " + stamp);
      const root = await waitReply(
        "POST",
        `/api/projects/${qa.context.project}/tasks/`,
        () => quick.getByRole("button", { name: "Crear", exact: true }).click(),
        201,
      );
      assert.equal(root.parent_id, null);
      await quick.waitFor({ state: "detached" });
      await top();
      const parent = await current(qa.context.parent);
      await tree(parent.id).hover();
      await tree(parent.id)
        .getByRole("button", {
          name: "Crear subtarea de " + parent.name,
          exact: true,
        })
        .click();
      const childForm = modal("Crear subtarea");
      await childForm
        .getByLabel("Nombre", { exact: true })
        .fill("Hija segmentos QA " + stamp);
      const child = await waitReply(
        "POST",
        `/api/projects/${qa.context.project}/tasks/`,
        () =>
          childForm.getByRole("button", { name: "Crear", exact: true }).click(),
        201,
      );
      assert.equal(child.parent_id, parent.id);
      await childForm.waitFor({ state: "detached" });
      await tree(child.id).waitFor();
      await tree(child.id).hover();
      await tree(child.id)
        .getByRole("button", {
          name: "Cambiar nombre de " + child.name,
          exact: true,
        })
        .click();
      const rename = modal("Cambiar nombre");
      assert.equal(
        await rename.getByLabel("Nombre", { exact: true }).inputValue(),
        child.name,
      );
      await rename
        .getByLabel("Nombre", { exact: true })
        .fill(child.name + " renombrada");
      const reply = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === taskPath(child.id) &&
          r.request().method() === "PATCH",
      );
      await rename
        .getByRole("button", { name: "Guardar", exact: true })
        .click();
      const response = await reply;
      assert.equal(response.status(), 200);
      assert.deepEqual(Object.keys(response.request().postDataJSON()), [
        "name",
      ]);
      assert.equal((await response.json()).parent_id, parent.id);
      await rename.waitFor({ state: "detached" });
    },
  );
  await check(
    "Fechas en formulario de Gantt, Lista y Tablero se sincronizan manteniendo la protección",
    async () => {
      await top();
      let latest = await current(initial.id);
      await openEdit(initial.id, latest.name);
      latest = await saveEdit(initial.id, shift(latest.start_date, 1));
      assert.equal(await shield().getAttribute("aria-pressed"), "true");
      const dateFromGantt = latest.start_date;
      await page.getByRole("link", { name: "Lista", exact: true }).click();
      await page
        .locator(`tr[data-task-id='${initial.id}']`)
        .getByText(latest.name, { exact: true })
        .click();
      await page
        .getByRole("button", { name: "Editar datos", exact: true })
        .click();
      latest = await saveEdit(initial.id, shift(latest.start_date, 1));
      await page.getByRole("link", { name: "Tablero", exact: true }).click();
      await page.getByText(latest.name, { exact: true }).click();
      await page
        .getByRole("button", { name: "Editar datos", exact: true })
        .focus();
      await page.keyboard.press("Enter");
      latest = await saveEdit(initial.id, shift(latest.start_date, 1));
      await page.getByRole("link", { name: "Gantt", exact: true }).click();
      await shield().waitFor();
      assert.equal(await shield().getAttribute("aria-pressed"), "true");
      await top();
      await showGanttRange(page, latest.start_date, latest.due_date);
      const title = await bar(initial.id).getAttribute("title");
      assert.ok(title.includes(String(Number(latest.start_date.slice(8, 10)))));
      assert.equal(latest.start_date, shift(dateFromGantt, 2));
      assert.equal(latest.state_code, initial.state_code);
      assert.equal(latest.parent_id, initial.parent_id);
      return {
        confirmed: latest.start_date,
        revision: latest.calendar_revision,
      };
    },
  );
  await check(
    "Error de formulario conserva borrador y calendario confirmado sin barra ficticia",
    async () => {
      const before = await current(initial.id);
      await openEdit(initial.id, before.name);
      await chooseStart(
        modal("Editar datos de tarea"),
        shift(before.start_date, 1),
      );
      await page.route("**" + taskPath(initial.id), async (route) => {
        if (route.request().method() === "PATCH")
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ start_date: ["Rechazo QA controlado"] }),
          });
        else await route.continue();
      });
      await waitReply(
        "PATCH",
        taskPath(initial.id),
        () =>
          modal("Editar datos de tarea")
            .getByRole("button", { name: "Guardar cambios", exact: true })
            .click(),
        400,
      );
      await modal("Editar datos de tarea")
        .getByText("Rechazo QA controlado", { exact: true })
        .waitFor();
      await modal("Editar datos de tarea")
        .getByRole("button", { name: "Cancelar", exact: true })
        .click();
      await page.unroute("**" + taskPath(initial.id));
      const close = page.getByRole("button", {
        name: "Cerrar modal",
        exact: true,
      });
      await page.keyboard.press("Escape");
      await close.waitFor({ state: "detached" });
      const after = await current(initial.id);
      assert.equal(after.start_date, before.start_date);
      assert.equal(after.calendar_revision, before.calendar_revision);
      return {
        error:
          "HTTP 400 inyectado en navegador; MySQL no recibió esta escritura",
      };
    },
  );
  await check(
    "Proteger durante preview cancela sin escritura; un envío pendiente termina y se reconcilia",
    async () => {
      await chooseGanttPeriod(page, "week");
      await page.getByRole("button", { name: "Hoy", exact: true }).click();
      await top();
      await shield().click();
      assert.equal(await shield().getAttribute("aria-pressed"), "false");
      let before = writes.length,
        bounds = await bar(initial.id).boundingBox();
      assert.ok(bounds);
      let x = Math.max(
          bounds.x + Math.min(bounds.width / 2, 40),
          (await page.locator(".wx-chart").boundingBox()).x + 40,
        ),
        y = bounds.y + bounds.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x - 60, y, { steps: 8 });
      await page.locator("[data-calendar-active]").waitFor();
      await shield().focus();
      await page.keyboard.press("Space");
      await page.mouse.up();
      assert.equal(await shield().getAttribute("aria-pressed"), "true");
      assert.equal(writes.length, before);
      assert.equal(await page.locator("[data-calendar-active]").count(), 0);
      await shield().click();
      const original = await current(initial.id);
      let release, received;
      const held = new Promise((r) => (release = r)),
        committed = new Promise((r) => (received = r));
      await page.route("**" + taskPath(initial.id), async (route) => {
        if (route.request().method() !== "PATCH") return route.continue();
        const response = await route.fetch();
        received(response.status());
        await held;
        await route.fulfill({ response });
      });
      bounds = await bar(initial.id).boundingBox();
      x = Math.max(
        bounds.x + Math.min(bounds.width / 2, 40),
        (await page.locator(".wx-chart").boundingBox()).x + 40,
      );
      y = bounds.y + bounds.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x - 60, y, { steps: 8 });
      await page.mouse.up();
      assert.equal(await committed, 200);
      await shield().click();
      release();
      await page.unroute("**" + taskPath(initial.id), { behavior: "wait" });
      await page
        .locator("[data-calendar-pending]")
        .waitFor({ state: "detached" });
      const saved = await current(initial.id);
      assert.equal(saved.start_date, shift(original.start_date, -1));
      assert.equal(saved.due_date, shift(original.due_date, -1));
      assert.equal(saved.parent_id, original.parent_id);
      assert.equal(saved.state_code, original.state_code);
      assert.equal(await shield().getAttribute("aria-pressed"), "true");
    },
  );
  await check(
    "Desproteger recupera resize y la navegación existente sin Flexible; guarda solo el extremo editado",
    async () => {
      const before = await current(initial.id);
      await showGanttRange(page, shift(before.due_date, -3), before.due_date);
      assert.equal(await shield().getAttribute("aria-pressed"), "true");
      await shield().click();
      const handle = bar(initial.id).locator("[data-gantt-calendar-mode=end]");
      await handle.waitFor();
      const dayWidth = await page.evaluate(
        async ({ start, end }) => {
          const { viewportGeometry } =
            await import("/src/features/home/views/TaskGantt/ganttViewport.ts");
          const data =
            globalThis.document.querySelector(".gm-task-gantt").dataset;
          const geometry = viewportGeometry({
            start: new Date(Number(data.ganttWindowStart)),
            end: new Date(Number(data.ganttWindowEnd)),
            scale: data.ganttScale,
            zoomLevel: Number(data.ganttZoom),
          });
          const date = (value) => {
            const [y, m, d] = value.split("-").map(Number);
            return new Date(y, m - 1, d);
          };
          return geometry.toX(date(end)) - geometry.toX(date(start));
        },
        { start: shift(before.due_date, -1), end: before.due_date },
      );
      const box = await handle.boundingBox();
      assert.ok(box);
      const reply = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === taskPath(initial.id) &&
          r.request().method() === "PATCH",
      );
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width / 2 - dayWidth,
        box.y + box.height / 2,
        { steps: 8 },
      );
      await page.mouse.up();
      const response = await reply;
      assert.equal(response.status(), 200, await response.text());
      const payload = response.request().postDataJSON();
      assert.equal("start_date" in payload, false);
      assert.ok(payload.calendar_intent_id);
      assert.equal(typeof payload.expected_calendar_revision, "string");
      const saved = await response.json();
      assert.equal(saved.start_date, before.start_date);
      assert.equal(saved.due_date, shift(before.due_date, -1));
      await shield().click();
      return { revision: saved.calendar_revision, endpoint: "due_date" };
    },
  );
  await check(
    "Ambos temas, sidebar y anchos estrechos mantienen resumen compacto, cinco opciones y controles accesibles",
    async () => {
      await chooseGanttPeriod(page, "month");
      const progress = await page
        .getByRole("progressbar")
        .getAttribute("value");
      for (const theme of ["light", "dark"])
        for (const width of [1600, 768, 390]) {
          await page.setViewportSize({ width, height: 950 });
          await page.evaluate(
            (theme) =>
              globalThis.document.documentElement.classList.toggle(
                "dark",
                theme === "dark",
              ),
            theme,
          );
          await settled();
          const summary = page.getByLabel("Resumen del proyecto", {
              exact: true,
            }),
            bounds = await summary.boundingBox();
          assert.ok(bounds.height <= 48);
          assert.equal(
            await page.getByRole("progressbar").getAttribute("value"),
            progress,
          );
          const controls = await page
            .getByRole("navigation", { name: "Navegación temporal de Gantt" })
            .boundingBox();
          assert.ok(controls.x + controls.width <= width + 1);
          const primary = page
            .locator(".gm-gantt-controls")
            .getByRole("button", { name: "+ Agregar tarea", exact: true });
          if (theme === "dark") {
            const contrast = await primary.evaluate((node) => {
              const style = globalThis.getComputedStyle(node),
                canvas = globalThis.document.createElement("canvas"),
                context = canvas.getContext("2d");
              const luminance = (color) => {
                context.fillStyle = color;
                context.fillRect(0, 0, 1, 1);
                const rgb = [...context.getImageData(0, 0, 1, 1).data]
                  .slice(0, 3)
                  .map((value) => {
                    const c = value / 255;
                    return c <= 0.04045
                      ? c / 12.92
                      : ((c + 0.055) / 1.055) ** 2.4;
                  });
                return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
              };
              const foreground = luminance(style.color),
                background = luminance(style.backgroundColor);
              return (
                (Math.max(foreground, background) + 0.05) /
                (Math.min(foreground, background) + 0.05)
              );
            });
            assert.ok(
              contrast >= 4.5,
              "primary button contrast in dark: " + contrast,
            );
          }
          await screenshot(`03-resumen-${theme}-${width}`);
        }
      await page.setViewportSize({ width: 1600, height: 1000 });
      const toggle = page.getByRole("button", {
        name: "Ocultar menú lateral",
        exact: true,
      });
      await toggle.click();
      assert.equal(
        await page
          .getByRole("button", { name: "Mostrar menú lateral", exact: true })
          .getAttribute("aria-expanded"),
        "false",
      );
      await settled();
      const compact = await page
        .getByLabel("Resumen del proyecto", { exact: true })
        .boundingBox();
      assert.ok(compact.height <= 48);
      await screenshot("04-sidebar-contraido");
      await page
        .getByRole("button", { name: "Mostrar menú lateral", exact: true })
        .click();
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      assert.deepEqual(errors, []);
    },
  );
  await check(
    "Recarga conserva calendario y jerarquía; trabajador de lectura no recibe controles de edición",
    async () => {
      const expected = await current(initial.id);
      await page.reload();
      await shield().waitFor();
      assert.equal((await current(initial.id)).start_date, expected.start_date);
      const worker = await browser.newContext(),
        target = await worker.newPage();
      await login(target, "worker", qa.context.readonly_project);
      assert.equal(
        await target
          .locator(".gm-gantt-controls")
          .getByRole("button", { name: "+ Agregar tarea", exact: true })
          .count(),
        0,
      );
      assert.equal(await target.locator("[data-calendar-editable]").count(), 0);
      await worker.close();
    },
  );
} finally {
  await browser.close();
}
