import assert from "node:assert/strict";
import fs from "node:fs";
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
async function closeDetail() {
  const close = page.getByRole("button", { name: "Cerrar modal", exact: true });
  if (await close.count()) await close.click();
}

const partial = qa.p3.partial;
async function resetPartial() {
  const before = await api(partial);
  await page.evaluate(
    async ({ id, project, revision, day }) => {
      const { httpClient } = await import("/src/core/api/httpClient.ts");
      await httpClient.patch(`projects/${project}/tasks/${id}/`, {
        schedule: {
          precision: "day",
          start: day,
          end: null,
          timezone: "America/Lima",
        },
        expected_calendar_revision: revision,
        calendar_intent_id: crypto.randomUUID(),
      });
    },
    {
      id: partial,
      project: c.project,
      revision: before.calendar_revision,
      day: c.day,
    },
  );
  setupWrites++;
  await page.reload();
  await page.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor();
}
async function level(value) {
  for (let i = 0; i < 10; i++) {
    const current = Number(
      await page.locator(".gm-task-gantt").getAttribute("data-gantt-zoom"),
    );
    if (current === value) return;
    await page
      .getByRole("button", {
        name: value > current ? "Acercar cronograma" : "Alejar cronograma",
        exact: true,
      })
      .click();
  }
  assert.fail("Zoom must reach its requested level");
}
async function settle() {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        globalThis.requestAnimationFrame(() =>
          globalThis.requestAnimationFrame(resolve),
        ),
      ),
  );
}
async function locate(id) {
  const arrow = page.locator(`[data-gantt-offscreen="${id}"]`);
  if (await arrow.count()) await arrow.click();
  await settle();
}
async function barDrag(id, mode, dx, cancel = false, beforeDrop) {
  await locate(id);
  const node =
    mode === "move"
      ? page.locator(`[data-gantt-calendar-task="${id}"]`).first()
      : page.locator(
          `[data-gantt-edit-task="${id}"][data-gantt-calendar-mode="${mode}"]`,
        );
  await node.scrollIntoViewIfNeeded();
  const box = await node.boundingBox();
  assert.ok(box && box.width > 0, `Visible ${mode} control`);
  const x = box.x + Math.min(box.width / 2, Math.max(1, box.width - 3)),
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 8 });
  if (cancel) await page.keyboard.press("Escape");
  if (beforeDrop) await beforeDrop();
  await page.mouse.up();
}
async function program(dx, cancel = false) {
  const marker = page.locator(`[data-gantt-missing-dates="${partial}"]`),
    box = await marker.boundingBox(),
    chart = await page.locator(".gm-task-gantt .wx-chart").boundingBox();
  assert.ok(box && chart);
  const x = chart.x + chart.width * 0.48,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 10 });
  if (cancel) await page.keyboard.press("Escape");
  await page.mouse.up();
}
try {
  await page.goto(origin + `/proyectos/${c.project}?vista=gantt`);
  await page.getByLabel("Correo electrónico").fill(qa.admin.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(qa.admin.password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor();

  const hourlyBefore = await api(c.unbounded);
  if (hourlyBefore.schedule.end) {
    await page.evaluate(
      async ({ id, project, revision, day }) => {
        const { httpClient } = await import("/src/core/api/httpClient.ts");
        await httpClient.patch(`projects/${project}/tasks/${id}/`, {
          schedule: {
            precision: "hour",
            start: day + "T13:00:00-05:00",
            end: null,
            timezone: "America/Lima",
          },
          expected_calendar_revision: revision,
          calendar_intent_id: crypto.randomUUID(),
        });
      },
      {
        id: c.unbounded,
        project: c.project,
        revision: hourlyBefore.calendar_revision,
        day: c.day,
      },
    );
    setupWrites++;
  }
  await resetPartial();
  const baselineWrites = writes.length;
  await step(
    "Apertura sin escrituras; marcador rojo y tareas fuera de pantalla diferenciados",
    async () => {
      assert.equal(writes.length, baselineWrites);
      const marker = page.locator(`[data-gantt-missing-dates="${partial}"]`);
      const shape = await marker
        .locator("span")
        .evaluate((n) => ({
          width: n.getBoundingClientRect().width,
          height: n.getBoundingClientRect().height,
          color: globalThis.getComputedStyle(n).backgroundColor,
          radius: globalThis.getComputedStyle(n).borderRadius,
        }));
      assert.equal(shape.width, 7);
      assert.equal(shape.height, 7);
      assert.equal(shape.radius, "0px");
      assert.ok(
        await page.locator(`[data-gantt-offscreen="${c.source}"]`).count(),
      );
      assert.equal(
        await page.locator(`[data-gantt-missing-dates="${c.source}"]`).count(),
        0,
      );
      await marker.click();
      const form = dialog("Definir fechas");
      assert.equal(
        await form.getByLabel("Fecha de inicio", { exact: true }).inputValue(),
        (await api(partial)).start_date,
      );
      await form.getByRole("button", { name: "Cancelar", exact: true }).click();
      assert.equal(writes.length, baselineWrites);
    },
  );
  await step(
    "Selector compartido conserva inicio horario parcial y cancelar no escribe",
    async () => {
      await page.locator(`[data-gantt-missing-dates="${c.unbounded}"]`).click();
      const form = dialog("Definir fechas");
      assert.equal(
        await form.getByLabel("Inicio horario", { exact: true }).inputValue(),
        c.day + "T13:00",
      );
      await form
        .getByLabel("Fin horario exclusivo (opcional)")
        .fill(c.day + "T14:00");
      await form.getByRole("button", { name: "Cancelar", exact: true }).click();
      assert.equal(writes.length, baselineWrites);
    },
  );
  for (const scale of ["day", "week", "month", "quarter", "year"])
    for (const z of [1, 9]) {
      await step(
        `${scale} zoom ${z}: programación, movimiento, resize y cancelación con puntero real`,
        async () => {
          await resetPartial();
          await chooseGanttPeriod(page, scale);
          await level(z);
          await settle();
          await locate(c.source);
          const aligned = await page
            .locator(`[data-gantt-calendar-task="${c.source}"]`)
            .evaluate(
              async (node, instant) => {
                const { viewportGeometry } =
                  await import("/src/features/home/views/TaskGantt/ganttViewport.ts");
                const root = node.closest(".gm-task-gantt"),
                  d = root.dataset;
                const geometry = viewportGeometry({
                    start: new Date(Number(d.ganttWindowStart)),
                    end: new Date(Number(d.ganttWindowEnd)),
                    scale: d.ganttScale,
                    zoomLevel: Number(d.ganttZoom),
                  }),
                  native = node.closest(".wx-bar");
                return {
                  actual: parseFloat(native.style.width),
                  expected:
                    geometry.toX(new Date(instant.end)) -
                    geometry.toX(new Date(instant.start)),
                };
              },
              (await api(c.source)).schedule,
            );
          assert.ok(
            Math.abs(aligned.actual - aligned.expected) < 0.01,
            "Hourly native width must match shared geometry, without a fictitious day",
          );
          let count = writes.length;
          await program(24, true);
          assert.equal(writes.length, count);
          assert.equal((await api(partial)).due_date, null);
          const saved = await reply("PATCH", taskPath(partial), () =>
            program(24),
          );
          assert.equal(writes.length, count + 1);
          assert.ok(saved.due_date);
          const body = writes.at(-1).body;
          assert.equal(typeof body.expected_calendar_revision, "string");
          assert.match(body.calendar_intent_id, /^[a-f0-9-]{36}$/i);
          if (scale === "day") assert.equal(saved.schedule.precision, "hour");
          else assert.equal(saved.schedule.precision, "day");
          assert.equal(saved.parent_id, null);
          assert.equal(saved.state_code, "PENDIENTE");
          await settle();
          const shift =
            scale === "day"
              ? z === 9
                ? 156
                : 52
              : scale === "week"
                ? z === 9
                  ? 146
                  : 42
                : scale === "month" && z === 9
                  ? 65
                  : 30;
          const moved = await reply("PATCH", taskPath(partial), () =>
            barDrag(partial, "move", shift),
          );
          assert.equal(writes.length, count + 2);
          if (saved.schedule.precision === "hour")
            assert.equal(
              Date.parse(moved.schedule.end) - Date.parse(moved.schedule.start),
              Date.parse(saved.schedule.end) - Date.parse(saved.schedule.start),
            );
          else
            assert.equal(
              Date.parse(moved.due_date) - Date.parse(moved.start_date),
              Date.parse(saved.due_date) - Date.parse(saved.start_date),
            );
          await settle();
          const resized = await reply("PATCH", taskPath(partial), () =>
            barDrag(partial, "end", shift),
          );
          assert.equal(writes.length, count + 3);
          assert.equal(resized.schedule.start, moved.schedule.start);
          await settle();
          const leftResized = await reply("PATCH", taskPath(partial), () =>
            barDrag(partial, "start", -shift),
          );
          assert.equal(writes.length, count + 4);
          assert.equal(leftResized.schedule.end, resized.schedule.end);
          await settle();
          const beforeCancel = writes.length;
          await barDrag(partial, "move", -30, true);
          assert.equal(writes.length, beforeCancel);
          assert.equal(await dialog("Definir fechas").count(), 0);
          await page.screenshot({ path: out + `/p3-${scale}-${z}.png` });
          const persisted = await api(partial);
          await page.reload();
          await page
            .getByRole("button", { name: /^Periodo de Gantt:/ })
            .waitFor();
          assert.deepEqual((await api(partial)).schedule, persisted.schedule);
        },
      );
    }
  await step(
    "Error 400 restaura confirmado y permite un gesto nuevo sin enfriamiento",
    async () => {
      await resetPartial();
      await chooseGanttPeriod(page, "week");
      const before = await api(partial);
      await page.route(
        "**" + taskPath(partial),
        async (route) =>
          route.request().method() === "PATCH"
            ? route.fulfill({
                status: 400,
                contentType: "application/json",
                body: JSON.stringify({ due_date: ["Límite QA rechazado"] }),
              })
            : route.continue(),
        { times: 1 },
      );
      await reply("PATCH", taskPath(partial), () => program(32), 400);
      await page
        .getByText(/Límite QA rechazado/)
        .first()
        .waitFor();
      assert.equal(
        (await api(partial)).calendar_revision,
        before.calendar_revision,
      );
      assert.ok(
        await page.locator(`[data-gantt-missing-dates="${partial}"]`).count(),
      );
      await reply("PATCH", taskPath(partial), () => program(40));
    },
  );
  await step(
    "Vista protegida permite pan e indicadores sin escrituras ni acceso de marcador",
    async () => {
      await page.getByRole("button", { name: /^Proteger vista:/ }).click();
      const count = writes.length;
      assert.equal(
        await page
          .getByRole("button", { name: /^Vista protegida:/ })
          .getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(
        await page
          .locator(`[data-gantt-missing-dates="${c.unbounded}"]`)
          .isDisabled(),
        true,
      );
      const chart = await page.locator(".wx-chart").boundingBox();
      await page.mouse.move(chart.x + chart.width * 0.6, chart.y + 100);
      await page.mouse.down();
      await page.mouse.move(chart.x + chart.width * 0.3, chart.y + 100, {
        steps: 12,
      });
      await page.mouse.up();
      await page.mouse.wheel(200, 100);
      await settle();
      assert.equal(writes.length, count);
      await page.getByRole("button", { name: /^Vista protegida:/ }).click();
    },
  );
  await step(
    "Lista, Tablero y detalle muestran el calendario guardado tras recargar",
    async () => {
      const confirmed = await api(partial);
      for (const view of ["Lista", "Tablero", "Gantt"]) {
        await page.getByRole("link", { name: view, exact: true }).click();
        if (view === "Lista")
          await page
            .locator(`tr[data-task-id="${partial}"]`)
            .getByText("Parcial diario P3", { exact: true })
            .click();
        else if (view === "Tablero")
          await page
            .locator('section[aria-label="Tablero"]')
            .getByText("Parcial diario P3", { exact: true })
            .click();
        else
          await page
            .getByRole("button", {
              name: "Abrir tarea Parcial diario P3",
              exact: true,
            })
            .click();
        await page
          .getByRole("button", { name: "Editar datos", exact: true })
          .click();
        const form = dialog("Editar datos de tarea");
        assert.deepEqual((await api(partial)).schedule, confirmed.schedule);
        await form
          .getByRole("button", { name: "Cancelar", exact: true })
          .click();
        await closeDetail();
      }
    },
  );

  await step(
    "Dos clientes: 409 conserva propuesta, consulta y reaplicación explícita",
    async () => {
      await page.reload();
      await page.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor();
      await chooseGanttPeriod(page, "week");
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
          .getByRole("button", { name: /^Periodo de Gantt:/ })
          .waitFor();
        const before = await api(partial),
          count = writes.length;
        const rejected = await reply(
          "PATCH",
          taskPath(partial),
          () =>
            barDrag(partial, "move", 85, false, async () => {
              await other.evaluate(
                async ({ project, id, before }) => {
                  const { httpClient } =
                    await import("/src/core/api/httpClient.ts");
                  const end = new Date(before.due_date + "T12:00:00Z");
                  end.setUTCDate(end.getUTCDate() + 1);
                  await httpClient.patch(`projects/${project}/tasks/${id}/`, {
                    due_date: end.toISOString().slice(0, 10),
                    expected_calendar_revision: before.calendar_revision,
                    calendar_intent_id: crypto.randomUUID(),
                  });
                },
                { project: c.project, id: partial, before },
              );
            }),
          409,
        );
        assert.equal(rejected.code, "calendar_revision_conflict");
        assert.equal(writes.length, count + 1);
        const original = writes.at(-1).body;
        await page.getByText(/Tu borrador se conserva/).waitFor();
        await page
          .getByRole("button", {
            name: "Consultar fechas vigentes",
            exact: true,
          })
          .click();
        await page
          .getByRole("button", {
            name: "Preparar nueva intención sobre esta revisión",
            exact: true,
          })
          .click();
        assert.equal(writes.length, count + 1);
        await reply("PATCH", taskPath(partial), () =>
          page
            .getByRole("button", { name: "Guardar propuesta", exact: true })
            .click(),
        );
        assert.notEqual(
          writes.at(-1).body.calendar_intent_id,
          original.calendar_intent_id,
        );
        assert.notEqual(
          writes.at(-1).body.expected_calendar_revision,
          original.expected_calendar_revision,
        );
        assert.equal((await api(partial)).parent_id, before.parent_id);
        assert.equal((await api(partial)).state_code, before.state_code);
      } finally {
        await otherContext.close();
      }
    },
  );
  await step(
    "Respuesta perdida tras commit: reintento explícito comparte UUID y una sola revisión",
    async () => {
      const before = await api(partial);
      let lost = false;
      await page.route("**" + taskPath(partial), async (route) => {
        if (route.request().method() === "PATCH" && !lost) {
          lost = true;
          const response = await route.fetch();
          assert.equal(response.status(), 200);
          await route.abort("failed");
        } else await route.continue();
      });
      const count = writes.length;
      await barDrag(partial, "move", 85);
      await page
        .getByText(/No se pudo confirmar el resultado/)
        .first()
        .waitFor();
      assert.equal(writes.length, count + 1);
      const original = writes.at(-1).body;
      await page
        .getByRole("button", { name: "Consultar fechas vigentes", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Reintentar misma intención",
          exact: true,
        })
        .waitFor();
      await reply("PATCH", taskPath(partial), () =>
        page
          .getByRole("button", {
            name: "Reintentar misma intención",
            exact: true,
          })
          .click(),
      );
      assert.deepEqual(writes.at(-1).body, original);
      assert.equal(
        BigInt((await api(partial)).calendar_revision),
        BigInt(before.calendar_revision) + 1n,
      );
      await page.unroute("**" + taskPath(partial));
    },
  );
  await step(
    "Respuesta lenta distingue pendiente y confirmado sin duplicar escritura",
    async () => {
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      await page.route(
        "**" + taskPath(partial),
        async (route) => {
          if (route.request().method() === "PATCH") {
            const response = await route.fetch();
            await gate;
            await route.fulfill({ response });
          } else await route.continue();
        },
        { times: 1 },
      );
      const count = writes.length;
      await barDrag(partial, "move", 85);
      await page.getByText("Guardando calendario…", { exact: true }).waitFor();
      assert.equal(writes.length, count + 1);
      assert.equal(
        await page.locator(`[data-gantt-edit-task="${partial}"]`).count(),
        0,
      );
      const confirmed = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === taskPath(partial) &&
          r.request().method() === "PATCH",
      );
      release();
      assert.equal((await confirmed).status(), 200);
      await page.getByText(/Calendario confirmado:/).waitFor();
      assert.equal(writes.length, count + 1);
    },
  );

  await step(
    "Marcador completa el horario parcial mediante el formulario compartido",
    async () => {
      await page.locator(`[data-gantt-missing-dates="${c.unbounded}"]`).click();
      const form = dialog("Definir fechas");
      assert.equal(
        await form.getByLabel("Inicio horario", { exact: true }).inputValue(),
        c.day + "T13:00",
      );
      await form
        .getByLabel("Fin horario exclusivo (opcional)")
        .fill(c.day + "T14:00");
      const saved = await reply("PATCH", taskPath(c.unbounded), () =>
        form.getByRole("button", { name: "Guardar", exact: true }).click(),
      );
      assert.equal(saved.schedule.start.slice(11, 16), "13:00");
      assert.equal(saved.schedule.end.slice(11, 16), "14:00");
      assert.equal(saved.schedule.precision, "hour");
      await locate(c.unbounded);
      assert.equal(
        await page
          .locator(`[data-gantt-missing-dates="${c.unbounded}"]`)
          .count(),
        0,
      );
    },
  );
  await step(
    "Programación continua expande a ambos lados sin soltar ni duplicar solicitudes",
    async () => {
      for (const side of ["right", "left"]) {
        await resetPartial();
        await chooseGanttPeriod(page, "day");
        await level(1);
        await settle();
        const chart = await page.locator(".wx-chart").boundingBox(),
          marker = await page
            .locator(`[data-gantt-missing-dates="${partial}"]`)
            .boundingBox();
        const initial = await page
            .locator(".gm-task-gantt")
            .getAttribute("data-gantt-window-start"),
          y = marker.y + 12;
        await page.mouse.move(chart.x + chart.width / 2, y);
        await page.mouse.down();
        await page.mouse.move(
          side === "right" ? chart.x + chart.width - 2 : chart.x + 2,
          y,
          { steps: 20 },
        );
        await page.waitForFunction(
          (value) =>
            globalThis.document.querySelector(".gm-task-gantt").dataset
              .ganttWindowStart !== value,
          initial,
        );
        assert.equal(
          await page.locator("[data-gantt-programming][data-dragging]").count(),
          1,
        );
        const count = writes.length;
        const result = await reply("PATCH", taskPath(partial), () =>
          page.mouse.up(),
        );
        assert.ok(result.due_date);
        assert.equal(writes.length, count + 1);
        assert.equal(await page.getByRole("dialog").count(), 0);
      }
    },
  );
  await step(
    "Ambos temas, anchos estrechos, foco y controles de tamaño estable",
    async () => {
      const count = writes.length;
      for (const theme of ["light", "dark"]) {
        await page.evaluate((t) => localStorage.setItem("theme", t), theme);
        await page.reload();
        await page
          .getByRole("button", { name: /^Periodo de Gantt:/ })
          .waitFor();
        if (page.viewportSize().width < 768) {
          const menu = page.getByRole("button", {
            name: "Ocultar panel",
            exact: true,
          });
          if (await menu.count()) await menu.click();
        }
        await chooseGanttPeriod(page, "year");
        for (const width of [1600, 768, 390]) {
          await page.setViewportSize({ width, height: 1000 });
          await settle();
          if (width < 768) {
            const menu = page.getByRole("button", {
              name: "Ocultar panel",
              exact: true,
            });
            if (await menu.count()) await menu.click();
          }
          await locate(partial);
          assert.equal(
            await page.evaluate(
              () =>
                globalThis.document.documentElement.scrollWidth >
                globalThis.innerWidth + 1,
            ),
            false,
          );
          const control = page
            .locator(`[data-gantt-edit-task="${partial}"]`)
            .first();
          if (await control.count()) {
            await control.focus();
            const box = await control.boundingBox();
            assert.ok(box.width >= 24 && box.height >= 24);
          }
          await page.screenshot({ path: out + `/p3-${theme}-${width}.png` });
        }
      }
      assert.equal(writes.length, count);
    },
  );
  assert.deepEqual(errors, []);
} catch (error) {
  await page.screenshot({ path: out + "/p3-failure.png" }).catch(() => {});
  throw error;
} finally {
  fs.writeFileSync(
    out + "/p3-browser.json",
    JSON.stringify(
      { checks, writes, setupWrites, errors, date: new Date().toISOString() },
      null,
      2,
    ),
  );
  await browser.close();
}
