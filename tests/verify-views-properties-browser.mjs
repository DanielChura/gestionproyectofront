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
  await login(page, "admin2");
  await check(
    "Menú progresivo: proyecto posterior a la página 50 y URL directa sin escrituras",
    async () => {
      const nav = page.getByRole("navigation", {
        name: "Navegación principal",
        exact: true,
      });
      const count = requests.filter((r) => r.method !== "GET").length;
      for (
        let i = 0;
        i < 5 &&
        !(await nav
          .getByRole("link", { name: "Directorio QA 000", exact: true })
          .count());
        i++
      ) {
        await nav.hover();
        await page.mouse.wheel(0, 12000);
        await page.waitForFunction(() => {
          const el = globalThis.document.querySelector(
            'nav[aria-label="Navegación principal"]',
          );
          return el.scrollTop > 0;
        });
      }
      const link = nav.getByRole("link", {
        name: "Directorio QA 000",
        exact: true,
      });
      await link.waitFor();
      const href = await link.getAttribute("href");
      await link.click();
      await page.waitForURL(origin + href);
      await page
        .getByRole("heading", { name: "Directorio QA 000", exact: true })
        .waitFor();
      await page.reload();
      await page
        .getByRole("heading", { name: "Directorio QA 000", exact: true })
        .waitFor();
      assert.equal(requests.filter((r) => r.method !== "GET").length, count);
      await snap("sidebar-pagina2-url-directa");
      await home();
    },
  );
  await check(
    "Selectores reales: dos responsables, equipos, etiquetas, prioridad e inicio",
    async () => {
      await page
        .getByRole("button", { name: "Crear nueva tarea", exact: true })
        .click();
      const d = page.getByRole("dialog", { name: "Nueva tarea", exact: true });
      const name = "Propiedades completas QA " + Date.now();
      await d.locator('input[name="name"]').fill(name);
      await d.getByRole("button", { name: /^Responsables:/ }).click();
      await popup()
        .getByRole("button", { name: "Nombre sintético worker", exact: true })
        .click();
      await popup()
        .getByRole("button", {
          name: "Nombre sintético admin_second_qa",
          exact: true,
        })
        .click();
      await popup()
        .getByRole("button", { name: "Equipos", exact: true })
        .click();
      await popup()
        .getByLabel("Equipo del área", { exact: true })
        .selectOption(String(qa.context.team));
      await snap("selector-equipo");
      await popup().getByRole("button", { name: "Listo", exact: true }).click();
      await d.getByRole("button", { name: /^Prioridad:/ }).click();
      await popup()
        .getByRole("button", { name: "Urgente", exact: true })
        .click();
      await d.getByRole("button", { name: /^Etiquetas:/ }).click();
      await popup()
        .getByRole("button", { name: "Especialidad de vistas QA", exact: true })
        .click();
      await snap("selector-etiquetas");
      await page.keyboard.press("Escape");
      await d.getByRole("button", { name: /^Fecha de inicio:/ }).click();
      await popup().locator('[data-date="2026-11-08"]').click();
      const saving = responseFor(
        (r) =>
          r.request().method() === "POST" &&
          r.url().endsWith(`/projects/${qa.context.project}/tasks/`),
      );
      await d.getByRole("button", { name: "Crear tarea", exact: true }).click();
      const response = await saving;
      assert.equal(response.status(), 201);
      const task = await response.json();
      qa.context.complete = task.id;
      qa.context.completeName = name;
      assert.equal(task.assignees.length, 2);
      assert.equal(task.priority, 1);
      assert.equal(task.labels.length, 1);
      assert.equal(task.start_date, "2026-11-08");
      assert.equal(task.parent_id, null);
      await row(task.id).waitFor();
      await snap("lista-responsables-etiquetas");
    },
  );
  await check(
    "Formulario compartido guarda ambos extremos una vez y preserva otros atributos",
    async () => {
      const id = qa.context.complete;
      await row(id)
        .getByRole("button", { name: qa.context.completeName, exact: true })
        .click();
      await page
        .getByRole("button", { name: "Editar datos", exact: true })
        .click();
      await edit()
        .getByRole("button", { name: /^Fecha de inicio:/ })
        .click();
      await popup().locator('[data-date="2026-11-09"]').click();
      await edit()
        .getByRole("button", { name: /^Fecha límite:/ })
        .click();
      for (
        let i = 0;
        i < 4 && !(await popup().locator('[data-date="2026-11-20"]').count());
        i++
      )
        await popup()
          .getByRole("button", { name: "Mes anterior", exact: true })
          .click();
      await popup().locator('[data-date="2026-11-20"]').click();
      const saving = responseFor(
        (r) =>
          r.request().method() === "PATCH" && r.url().endsWith(`/tasks/${id}/`),
      );
      await edit()
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click();
      const response = await saving;
      assert.equal(response.status(), 200);
      assert.deepEqual(Object.keys(response.request().postDataJSON()).sort(), [
        "calendar_intent_id",
        "due_date",
        "expected_calendar_revision",
        "start_date",
      ]);
      const task = await response.json();
      assert.equal(task.start_date, "2026-11-09");
      assert.equal(task.due_date, "2026-11-20");
      assert.equal(task.assignees.length, 2);
      assert.equal(task.labels.length, 1);
      assert.equal(task.priority, 1);
      await edit().waitFor({ state: "detached" });
    },
  );
  await check(
    "Dependencias informativas desde detalle: alta, rechazo de ciclo y retiro sin reprogramación",
    async () => {
      const id = qa.context.complete;
      const detail = page.getByRole("dialog", {
        name: "Detalle de tarea",
        exact: true,
      });
      await detail
        .getByRole("button", {
          name: /^Relacionar elementos o añadir dependencias:/,
        })
        .click();
      await popup()
        .getByRole("button", {
          name: "Esta tarea está bloqueada por...",
          exact: true,
        })
        .click();
      await popup()
        .getByRole("button", {
          name: "Vincular Raíz histórica QA",
          exact: true,
        })
        .click();
      await popup().waitFor({ state: "hidden" });
      await detail.getByText("Está bloqueada por", { exact: true }).waitFor();
      let saved = (await api(`projects/${qa.context.project}/tasks/${id}/`))
        .data.task;
      assert.deepEqual(saved.dependencies, [qa.context.parent]);
      assert.equal(saved.start_date, "2026-11-09");
      assert.equal(saved.due_date, "2026-11-20");
      const cycle = await api(
        `projects/${qa.context.project}/tasks/${qa.context.parent}/dependencies/`,
        "post",
        { predecessor_id: id },
      );
      assert.equal(cycle.status, 400);
      await snap("detalle-dependencia-real");
      await detail
        .getByRole("button", { name: "Desvincular", exact: true })
        .click();
      await detail
        .getByRole("button", { name: "Confirmar desvinculación", exact: true })
        .click();
      await detail
        .getByText("Está bloqueada por", { exact: true })
        .waitFor({ state: "detached" });
      saved = (await api(`projects/${qa.context.project}/tasks/${id}/`)).data
        .task;
      assert.deepEqual(saved.dependencies, []);
      assert.equal(saved.due_date, "2026-11-20");
    },
  );
  await check(
    "Crear a dos profundidades desde el detalle y conservar el padre exacto",
    async () => {
      const detail = page.getByRole("dialog", {
        name: "Detalle de tarea",
        exact: true,
      });
      let parent = qa.context.complete;
      for (const depth of [1, 2]) {
        const name = `Profundidad ${depth} QA ${Date.now()}`;
        await detail
          .getByRole("button", { name: "+ Añadir tarea", exact: true })
          .click();
        const form = detail.getByRole("form", {
          name: "Creación rápida de tarea",
          exact: true,
        });
        await form
          .getByRole("textbox", { name: "Nombre de la tarea", exact: true })
          .fill(name);
        const saving = responseFor(
          (r) =>
            r.request().method() === "POST" &&
            r.url().endsWith(`/projects/${qa.context.project}/tasks/`),
        );
        await form
          .getByRole("button", { name: "Guardar", exact: true })
          .click();
        const response = await saving;
        assert.equal(response.status(), 201);
        const child = await response.json();
        assert.equal(child.parent_id, parent);
        await detail.getByRole("button", { name, exact: true }).click();
        await detail
          .getByRole("button", { name: `Editar nombre: ${name}`, exact: true })
          .waitFor();
        parent = child.id;
      }
      await page
        .getByRole("button", { name: "Cerrar modal", exact: true })
        .click();
      await page.reload();
      await row(qa.context.complete).waitFor();
      await page
        .getByRole("button", {
          name: `Expandir subtareas de ${qa.context.completeName}`,
          exact: true,
        })
        .click();
      await snap("subtareas-profundidad");
      assert.deepEqual(errors, []);
    },
  );

  await check(
    "Movimiento real de Lista persiste estado, padre y atributos sin propagar a la rama",
    async () => {
      const id = qa.context.complete,
        before = (await api(`projects/${qa.context.project}/tasks/`)).data;

      await row(id).scrollIntoViewIfNeeded();
      await row(id).evaluate((node) => {
        const region = node.closest('[role="region"]'),
          a = node.getBoundingClientRect(),
          b = region.getBoundingClientRect();
        region.scrollTop += a.top - b.top - region.clientHeight / 2;
      });
      const source = await row(id).boundingBox(),
        target = await page
          .locator('[data-group-key="state:EN_CURSO"] h2')
          .boundingBox();
      assert.ok(source && target);
      const saving = responseFor(
        (r) =>
          r.request().method() === "POST" &&
          r.url().endsWith(`/tasks/${id}/move/`),
      );
      await page.mouse.move(
        source.x + source.width * 0.7,
        source.y + source.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        source.x + source.width * 0.7 + 15,
        source.y + source.height / 2,
      );
      await page.locator('.gm-task-list[data-moving="true"]').waitFor();
      await page.mouse.move(target.x + 100, target.y + target.height / 2, {
        steps: 12,
      });
      assert.equal(await page.locator(".gm-task-insertion").count(), 1);
      await page.mouse.up();
      const response = await saving;
      assert.equal(response.status(), 200);
      const after = (await api(`projects/${qa.context.project}/tasks/`)).data,
        fields = (t) => ({
          name: t.name,
          parent: t.parent_id,
          start: t.start_date,
          due: t.due_date,
          state: t.state_code,
          assignees: t.assignees,
          labels: t.labels,
        });
      for (const item of before) {
        const saved = after.find((t) => t.id === item.id);
        if (item.id === id)
          assert.deepEqual(fields(saved), {
            ...fields(item),
            state: "EN_CURSO",
          });
        else assert.deepEqual(fields(saved), fields(item));
      }
      await page.reload();
      await row(id).waitFor();
      assert.equal(
        (await api(`projects/${qa.context.project}/tasks/${id}/`)).data.task
          .state_code,
        "EN_CURSO",
      );
      assert.equal(await page.getByRole("dialog").count(), 0);
      await snap("lista-movimiento-persistido");
    },
  );
  await check(
    "Calendario seleccionado legible en claro y oscuro, foco y panel dentro del viewport",
    async () => {
      const writes = requests.filter((r) => r.method !== "GET").length;
      for (const [dark, width, height] of [
        [false, 1600, 650],
        [true, 1600, 650],
        [true, 390, 700],
      ]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(
          (value) =>
            globalThis.document.documentElement.classList.toggle("dark", value),
          dark,
        );
        await page
          .getByRole("button", { name: "Crear nueva tarea", exact: true })
          .click();
        const d = page.getByRole("dialog", {
          name: "Nueva tarea",
          exact: true,
        });
        await d.getByRole("button", { name: /^Fecha límite:/ }).click();
        const selected = popup().locator('[data-date][aria-selected="true"]');
        const ratio = await selected.evaluate((node) => {
          const style = globalThis.getComputedStyle(node),
            canvas = new globalThis.OffscreenCanvas(1, 1),
            context = canvas.getContext("2d"),
            luminance = (color) => {
              context.clearRect(0, 0, 1, 1);
              context.fillStyle = color;
              context.fillRect(0, 0, 1, 1);
              const rgb = [...context.getImageData(0, 0, 1, 1).data]
                .slice(0, 3)
                .map((x) => {
                  const value = x / 255;
                  return value <= 0.04045
                    ? value / 12.92
                    : ((value + 0.055) / 1.055) ** 2.4;
                });
              return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
            };
          const a = luminance(style.color),
            b = luminance(style.backgroundColor);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        });
        assert.ok(ratio >= 4.5, `Selected day contrast ${ratio}`);
        const box = await popup().boundingBox();
        assert.ok(
          box.x >= 0 &&
            box.x + box.width <= width + 1 &&
            box.y >= 0 &&
            box.y + box.height <= height + 1,
        );
        await snap(`calendario-final-${dark ? "oscuro" : "claro"}-${width}`);
        await page.keyboard.press("Escape");
        await page.keyboard.press("Escape");
      }
      assert.equal(requests.filter((r) => r.method !== "GET").length, writes);
      assert.deepEqual(errors, []);
    },
  );

  await check(
    "Cerrar sesión e iniciar con otro rol descarta la colección y acciones administrativas",
    async () => {
      await page.setViewportSize({ width: 1600, height: 900 });
      await page
        .getByRole("button", { name: "Abrir menú de perfil", exact: true })
        .click();
      await page
        .getByRole("menuitem", { name: "Cerrar sesión", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Ingresar", exact: true })
        .waitFor();
      assert.equal(await page.locator("[data-task-count]").count(), 0);
      await login(page, "worker");
      assert.equal(
        await page
          .getByRole("button", { name: "Crear proyecto", exact: true })
          .count(),
        0,
      );
      const authorized = (await api(`projects/${qa.context.project}/tasks/`))
        .data;
      assert.equal(
        (await page.locator("[data-task-count]").innerText()).trim(),
        `${authorized.length} ${authorized.length === 1 ? "tarea" : "tareas"}`,
      );
      await snap("sesion-trabajador");
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
