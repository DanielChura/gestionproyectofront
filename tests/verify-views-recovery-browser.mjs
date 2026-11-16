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
const popup = () => page.locator("[popover]:popover-open");
const edit = () =>
  page.getByRole("dialog", { name: "Editar datos de tarea", exact: true });
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
async function home() {
  await page.goto(url(qa.context.project));
  await row(qa.context.parent).waitFor();
  await page
    .getByRole("status", { name: "Cargando", exact: true })
    .waitFor({ state: "hidden" });
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
try {
  await login(page, "admin");
  const rootBefore = (
    await api(`projects/${qa.context.project}/tasks/${qa.context.parent}/`)
  ).data.task;
  if (rootBefore.name !== "Raíz histórica QA")
    assert.equal(
      (
        await api(
          `projects/${qa.context.project}/tasks/${qa.context.parent}/`,
          "patch",
          { name: "Raíz histórica QA" },
        )
      ).status,
      200,
    );
  const existing = (
    await api(`projects/${qa.context.project}/tasks/${qa.context.other}/`)
  ).data.task;
  if (existing.name !== "Sin fecha límite QA" || existing.priority !== 3)
    assert.equal(
      (
        await api(
          `projects/${qa.context.project}/tasks/${existing.id}/`,
          "patch",
          { name: "Sin fecha límite QA", priority: 3 },
        )
      ).status,
      200,
    );
  if (existing.state_code !== "PENDIENTE")
    assert.equal(
      (
        await api(
          `projects/${qa.context.project}/tasks/${existing.id}/state/`,
          "post",
          { state_code: "PENDIENTE" },
        )
      ).status,
      200,
    );
  if (!existing.due_date)
    assert.equal(
      (
        await api(
          `projects/${qa.context.project}/tasks/${existing.id}/`,
          "patch",
          {
            due_date: qa.context.today.slice(0, 8) + "17",
            expected_calendar_revision: existing.calendar_revision,
            calendar_intent_id: crypto.randomUUID(),
          },
        )
      ).status,
      200,
    );
  const readOnlyTask = (await api(`projects/${qa.context.readonly}/tasks/`))
    .data[0];
  qa.context.readonly_task = readOnlyTask.id;
  if (readOnlyTask.responsible_id !== qa.context.worker)
    assert.equal(
      (
        await api(
          `projects/${qa.context.readonly}/tasks/${readOnlyTask.id}/`,
          "patch",
          { responsible_ids: [qa.context.worker] },
        )
      ).status,
      200,
    );
  await home();

  await check(
    "Login real sin overlay persistente; jerarquía por raíz y colores del catálogo",
    async () => {
      await row(qa.context.parent).waitFor();
      await page
        .getByRole("button", {
          name: "Expandir subtareas de Raíz histórica QA",
          exact: true,
        })
        .click();
      await row(qa.context.child).waitFor();
      assert.equal(
        await row(qa.context.child)
          .locator("[data-state]")
          .last()
          .getAttribute("data-state"),
        "EN_CURSO",
      );
      assert.ok(
        await page
          .getByRole("table", { name: "Tareas de PENDIENTE", exact: true })
          .locator(`tr[data-task-id="${qa.context.child}"]`)
          .count(),
      );
      await page
        .getByRole("button", {
          name: "Expandir subtareas de Subtarea independiente QA",
          exact: true,
        })
        .click();
      await row(qa.context.nested).waitFor();
      await snap("lista-sidebar-claro");
    },
  );
  await check(
    "Creación de proyectos desde encabezado y área, contexto, dos pasos y persistencia",
    async () => {
      for (const fromArea of [false, true]) {
        await page
          .getByRole("button", {
            name: fromArea
              ? "Crear proyecto en Área sintética A"
              : "Crear proyecto",
            exact: true,
          })
          .click();
        const d = page.getByRole("dialog", {
          name: "Crear proyecto · Paso 1 de 2",
          exact: true,
        });
        await d.waitFor();
        await d.getByRole("button", { name: "Continuar", exact: true }).click();
        await d
          .getByText("Indica el nombre del proyecto.", { exact: true })
          .waitFor();
        const name =
          (fromArea ? "Proyecto con equipo QA " : "Proyecto disponible QA ") +
          Date.now();
        await d.getByLabel("Nombre *", { exact: true }).fill(name);
        if (fromArea)
          assert.match(
            await d
              .getByRole("button", { name: /^Área obligatoria:/ })
              .innerText(),
            /Área sintética A/,
          );
        else {
          await d.getByRole("button", { name: /^Área obligatoria:/ }).click();
          await page
            .getByRole("group", { name: "Áreas disponibles", exact: true })
            .getByRole("button", { name: "Área sintética A", exact: true })
            .click();
        }
        await d
          .getByRole("button", { name: "Configurar", exact: true })
          .click();
        await page
          .getByRole("dialog", {
            name: "Modifica los estados de Tareas",
            exact: true,
          })
          .waitFor();
        await page.keyboard.press("Escape");
        assert.equal(
          await d.getByLabel("Nombre *", { exact: true }).inputValue(),
          name,
        );
        await snap("proyecto-paso1");
        await d.getByRole("button", { name: "Continuar", exact: true }).click();
        const second = page.getByRole("dialog", {
          name: "Crear proyecto · Paso 2 de 2",
          exact: true,
        });
        await second.waitFor();
        if (fromArea) {
          await second
            .getByLabel("Crear proyecto con trabajadores asignados", {
              exact: true,
            })
            .check();
          await second
            .getByRole("button", { name: "Equipos", exact: true })
            .click();
          await second
            .getByRole("checkbox", { name: /Equipo de vistas QA/ })
            .check();
          await second.getByRole("switch").click();
        }
        await snap("proyecto-paso2");
        const saved = responseFor(
          (r) =>
            r.url().endsWith("/api/projects/") &&
            r.request().method() === "POST",
        );
        await second
          .getByRole("button", {
            name: fromArea
              ? "Crear con asignados"
              : "Publicar dentro del sistema",
            exact: true,
          })
          .click();
        const response = await saved;
        assert.equal(response.status(), 201);
        const project = await response.json();
        await page.waitForURL(url(project.id));
        const confirmed = await api(`projects/${project.id}/`);
        assert.equal(confirmed.data.name, name);
        assert.equal(confirmed.data.areas[0].id, qa.context.area);
        assert.equal(confirmed.data.worker_state, fromArea);
        assert.equal(confirmed.data.end_date, null);
        if (fromArea)
          await page
            .getByRole("navigation", { name: "Navegación principal" })
            .getByRole("link", { name, exact: true })
            .waitFor();
        await home();
      }
    },
  );
  await check(
    "Acceso Crear tarea del sidebar y borrador del formulario con selectores compactos",
    async () => {
      await page
        .getByRole("button", {
          name: "Crear tarea en Recuperación de vistas QA",
          exact: true,
        })
        .click();
      const d = page.getByRole("dialog", { name: "Nueva tarea", exact: true });
      await d.waitFor();
      await d.locator('input[name="name"]').fill("Borrador conservado QA");
      await d.getByRole("button", { name: /^Responsables:/ }).click();
      await popup()
        .getByRole("button", { name: "Equipos", exact: true })
        .click();
      await page.keyboard.press("Escape");
      assert.equal(
        await d.locator('input[name="name"]').inputValue(),
        "Borrador conservado QA",
      );
      assert.equal(
        await page.evaluate(() => globalThis.document.activeElement?.id),
        "task-responsible",
      );
      await snap("crear-tarea");
      await page.keyboard.press("Escape");
      await d.waitFor({ state: "detached" });
    },
  );
  await check(
    "Creación rápida en una línea, responsables, prioridad, etiquetas y fecha nullable",
    async () => {
      await page
        .locator('[data-group-key="state:PENDIENTE"]')
        .getByRole("button", { name: "Añadir tarea", exact: true })
        .click();
      const form = page.getByRole("form", {
        name: "Creación rápida de tarea",
        exact: true,
      });
      await form
        .getByRole("textbox", { name: "Nombre de la tarea", exact: true })
        .fill("Rápida QA " + Date.now());
      const positions = await form
        .locator('input[name="name"],button[type="submit"]')
        .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().y));
      assert.ok(Math.abs(positions[0] - positions[1]) < 20);
      await form.getByRole("button", { name: /^Responsables:/ }).click();
      await popup().getByRole("button", { name: "Listo", exact: true }).click();
      await snap("creacion-rapida");
      const saved = responseFor(
        (r) =>
          r.request().method() === "POST" &&
          r.url().endsWith(`/projects/${qa.context.project}/tasks/`),
      );
      await form.getByRole("button", { name: "Guardar", exact: true }).click();
      const response = await saved;
      assert.equal(response.status(), 201);
      const task = await response.json();
      qa.context.quick = task.id;
      assert.equal(task.parent_id, null);
      assert.equal(task.due_date, null);
      await row(task.id).waitFor();
    },
  );
  await check(
    "Detalle auténtico, edición mínima, sincronización de propiedades y creación de subtarea",
    async () => {
      await row(qa.context.other)
        .getByRole("button", { name: "Sin fecha límite QA", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Editar datos", exact: true })
        .click();
      await edit().locator('input[name="name"]').fill("Tarea editada QA");
      await edit()
        .getByRole("button", { name: /^Responsables:/ })
        .click();
      await snap("responsables");
      await page.keyboard.press("Escape");
      assert.equal(
        await edit().locator('input[name="name"]').inputValue(),
        "Tarea editada QA",
      );
      await snap("edicion-compacta");
      const saved = responseFor(
        (r) =>
          r.request().method() === "PATCH" &&
          r.url().endsWith(`/tasks/${qa.context.other}/`),
      );
      await edit()
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click();
      const response = await saved;
      assert.equal(response.status(), 200);
      assert.deepEqual(response.request().postDataJSON(), {
        name: "Tarea editada QA",
      });
      await edit().waitFor({ state: "detached" });
      await page
        .getByRole("button", {
          name: "Editar nombre: Tarea editada QA",
          exact: true,
        })
        .waitFor();
      await snap("detalle");
      await page.getByRole("button", { name: "Cerrar modal" }).click();
      await row(qa.context.other)
        .getByRole("button", { name: /^Prioridad ·/ })
        .click();
      await popup()
        .getByRole("button", { name: "Urgente", exact: true })
        .click();
      await popup()
        .getByRole("button", { name: "Guardar", exact: true })
        .click();
      await popup().waitFor({ state: "hidden" });
      await row(qa.context.other)
        .getByRole("button", { name: /^Estado ·/ })
        .click();
      await popup()
        .getByRole("button", { name: "EN CURSO", exact: true })
        .click();
      await popup()
        .getByRole("button", { name: "Guardar", exact: true })
        .click();
      await popup().waitFor({ state: "hidden" });
      assert.equal(
        (await api(`projects/${qa.context.project}/tasks/${qa.context.other}/`))
          .data.task.state_code,
        "EN_CURSO",
      );
      await row(qa.context.other)
        .getByRole("button", { name: /^Acciones de/ })
        .click();
      await popup()
        .getByRole("button", { name: "Crear subtarea", exact: true })
        .click();
      const child = page.getByRole("dialog", {
        name: "Nueva subtarea",
        exact: true,
      });
      await child.locator('input[name="name"]').fill("Subtarea modal QA");
      const creating = responseFor(
        (r) =>
          r.request().method() === "POST" &&
          r.url().endsWith(`/projects/${qa.context.project}/tasks/`),
      );
      await child
        .getByRole("button", { name: "Crear subtarea", exact: true })
        .click();
      const created = await creating;
      assert.equal(created.status(), 201);
      assert.equal((await created.json()).parent_id, qa.context.other);
      await child.waitFor({ state: "detached" });
    },
  );
  await check(
    "Calendario inline real: null, revisión, intención, dos clientes y reaplicación explícita",
    async () => {
      await row(qa.context.other)
        .getByRole("button", { name: /^Fecha límite ·/ })
        .click();
      await popup()
        .getByRole("button", { name: "Quitar fecha", exact: true })
        .click();
      const save = responseFor(
        (r) =>
          r.request().method() === "PATCH" &&
          r.url().endsWith(`/tasks/${qa.context.other}/`),
      );
      await popup()
        .getByRole("button", { name: "Guardar", exact: true })
        .click();
      const response = await save;
      assert.equal(response.status(), 200);
      const data = response.request().postDataJSON();
      assert.equal(data.due_date, null);
      assert.equal(typeof data.expected_calendar_revision, "string");
      assert.match(data.calendar_intent_id, /^[a-f0-9-]{36}$/i);
      await popup().waitFor({ state: "hidden" });
      await row(qa.context.quick)
        .getByRole("button", { name: /^Fecha límite ·/ })
        .click();
      const proposal = qa.context.today.slice(0, 8) + "12";
      await popup().locator(`[data-date="${proposal}"]`).click();
      const otherContext = await browser.newContext(),
        otherPage = await otherContext.newPage();
      await login(otherPage, "admin2");
      const changed = await otherPage.evaluate(
        async ({ project, id, date }) => {
          const { httpClient } = await import("/src/core/api/httpClient.ts");
          const task = (
            await httpClient.get(`projects/${project}/tasks/${id}/`)
          ).data.task;
          return (
            await httpClient.patch(`projects/${project}/tasks/${id}/`, {
              due_date: date,
              expected_calendar_revision: task.calendar_revision,
              calendar_intent_id: crypto.randomUUID(),
            })
          ).status;
        },
        {
          project: qa.context.project,
          id: qa.context.quick,
          date: qa.context.today.slice(0, 8) + "13",
        },
      );
      assert.equal(changed, 200);
      const failed = responseFor(
        (r) =>
          r.request().method() === "PATCH" &&
          r.url().endsWith(`/tasks/${qa.context.quick}/`),
      );
      await popup()
        .getByRole("button", { name: "Guardar", exact: true })
        .click();
      assert.equal((await failed).status(), 409);
      await popup()
        .getByText(/Tu borrador se conserva/)
        .waitFor();
      await snap("calendario-conflicto");
      const writes = requests.filter((r) => r.method === "PATCH").length;
      await popup()
        .getByRole("button", { name: "Consultar fechas vigentes", exact: true })
        .click();
      await popup()
        .getByText(/Límite vigente:/)
        .waitFor();
      assert.equal(requests.filter((r) => r.method === "PATCH").length, writes);
      await popup()
        .getByRole("button", { name: /Preparar nueva intención/ })
        .click();
      await popup()
        .getByRole("button", { name: "Guardar", exact: true })
        .click();
      await popup().waitFor({ state: "hidden" });
      assert.equal(
        (await api(`projects/${qa.context.project}/tasks/${qa.context.quick}/`))
          .data.task.due_date,
        proposal,
      );
      await otherContext.close();
    },
  );
  await check(
    "Arrastre real, cancelación y reanudación inmediata sin clic residual",
    async () => {
      const source = row(qa.context.quick),
        box = await source.boundingBox();
      const writes = requests.filter((r) => r.method !== "GET").length;
      for (let i = 0; i < 3; i++) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(
          box.x + box.width / 2 + 30,
          box.y + box.height / 2 + 10,
        );
        await page.locator('.gm-task-list[data-moving="true"]').waitFor();
        await page.keyboard.press("Escape");
        await page.mouse.up();
        assert.equal(
          await page.locator('.gm-task-list[data-moving="true"]').count(),
          0,
        );
      }
      assert.equal(requests.filter((r) => r.method !== "GET").length, writes);
      assert.equal(await page.getByRole("dialog").count(), 0);
    },
  );
  await check(
    "Lista, Tablero, Gantt y recarga comparten calendario y jerarquía",
    async () => {
      await page.getByRole("link", { name: "Tablero", exact: true }).click();
      await page
        .getByText("Tarea editada QA", { exact: true })
        .first()
        .waitFor();
      await page.getByRole("link", { name: "Gantt", exact: true }).click();
      await page.locator(".gm-task-gantt .wx-gantt").waitFor();
      await page
        .getByRole("button", { name: "Proteger vista", exact: true })
        .click();
      const count = requests.filter((r) => r.method !== "GET").length;
      const canvas = page.locator(".gm-gantt-scene");
      if (await canvas.count()) {
        const b = await canvas.boundingBox();
        await page.mouse.move(b.x + 200, b.y + 100);
        await page.mouse.down();
        await page.mouse.move(b.x + 300, b.y + 100, { steps: 8 });
        await page.mouse.up();
      }
      assert.equal(requests.filter((r) => r.method !== "GET").length, count);
      await snap("gantt-conservado");
      await page.reload();
      await page.locator(".gm-task-gantt .wx-gantt").waitFor();
      const task = (
        await api(`projects/${qa.context.project}/tasks/${qa.context.other}/`)
      ).data.task;
      assert.equal(task.name, "Tarea editada QA");
      assert.equal(task.due_date, null);
      assert.equal(task.state_code, "EN_CURSO");
      assert.equal(task.priority, 1);
      await home();
    },
  );
  await check(
    "Temas, pantalla estrecha y altura reducida: foco, calendario y footer accesibles",
    async () => {
      for (const [theme, width, height] of [
        ["light", 1600, 950],
        ["dark", 1600, 650],
        ["dark", 390, 700],
        ["light", 900, 500],
      ]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(
          (theme) =>
            globalThis.document.documentElement.classList.toggle(
              "dark",
              theme === "dark",
            ),
          theme,
        );
        await page
          .getByRole("button", { name: "Crear nueva tarea", exact: true })
          .click();
        const d = page.getByRole("dialog", {
          name: "Nueva tarea",
          exact: true,
        });
        await d.locator('input[name="name"]').fill("Borrador en " + theme);
        await d.getByRole("button", { name: /^Fecha límite:/ }).click();
        await popup().waitFor();
        const b = await popup().boundingBox();
        assert.ok(
          b.x >= 0 &&
            b.x + b.width <= width + 1 &&
            b.y >= 0 &&
            b.y + b.height <= height + 1,
        );
        await snap(`selector-${theme}-${width}x${height}`);
        await page.keyboard.press("Escape");
        assert.equal(
          await d.locator('input[name="name"]').inputValue(),
          "Borrador en " + theme,
        );
        const footer = await d.locator("footer").boundingBox();
        assert.ok(footer.y + footer.height <= height + 1);
        await snap(`form-${theme}-${width}x${height}`);
        await page.keyboard.press("Escape");
      }
      await page.setViewportSize({ width: 1600, height: 950 });
    },
  );
  await check(
    "Roles reales: trabajador, solo lectura, ajeno y rechazo directo de creación",
    async () => {
      const workerContext = await browser.newContext(),
        workerPage = await workerContext.newPage();
      await login(workerPage, "worker");
      assert.equal(
        await workerPage
          .getByRole("button", { name: "Crear proyecto", exact: true })
          .count(),
        0,
      );
      const statuses = await workerPage.evaluate(
        async ({ project, readonly, readonlyTask, task, area }) => {
          const { httpClient } = await import("/src/core/api/httpClient.ts");
          const call = async (url, method, data) => {
            try {
              return (await httpClient.request({ url, method, data })).status;
            } catch (e) {
              return e.status;
            }
          };
          const read = (await httpClient.get(`projects/${readonly}/tasks/`))
            .data;
          if (!read.some((item) => item.id === readonlyTask))
            throw Error("QA readonly task not visible");
          return {
            project: await call("projects/", "post", {
              name: "No autorizado QA",
              area_ids: [area],
              mode: "available",
            }),
            edit: await call(`projects/${project}/tasks/${task}/`, "patch", {
              name: "Prohibido",
            }),
            state: await call(
              `projects/${readonly}/tasks/${readonlyTask}/state/`,
              "post",
              { state_code: "EN_CURSO" },
            ),
          };
        },
        {
          project: qa.context.project,
          readonly: qa.context.readonly,
          task: qa.context.other,
          readonlyTask: qa.context.readonly_task,
          area: qa.context.area,
        },
      );
      assert.equal(statuses.project, 403);
      assert.equal(statuses.edit, 404);
      assert.equal(statuses.state, 403);
      await workerContext.close();
      const outsiderContext = await browser.newContext(),
        outsiderPage = await outsiderContext.newPage();
      await login(outsiderPage, "outsider");
      const denied = await outsiderPage.evaluate(async (project) => {
        const { httpClient } = await import("/src/core/api/httpClient.ts");
        try {
          await httpClient.get(`projects/${project}/tasks/`);
          return 200;
        } catch (e) {
          return e.status;
        }
      }, qa.context.project);
      assert.equal(denied, 404);
      await outsiderContext.close();
      assert.deepEqual(errors, []);
    },
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
