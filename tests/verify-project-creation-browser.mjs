import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";
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
const output = process.env.GM_BROWSER_REPORT_DIR,
  origin = process.env.GM_FRONTEND_ORIGIN || "http://localhost:5189";
assert.ok(output);
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 950 },
  timezoneId: "America/Lima",
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const errors = [],
  results = [],
  requests = [],
  responses = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.exposeFunction("recordWindowError", (message) =>
  errors.push(message),
);
await page.addInitScript(() =>
  globalThis.addEventListener("error", (event) => {
    void globalThis.recordWindowError(event.message);
  }),
);
page.on("request", (request) => {
  const u = new URL(request.url());
  if (u.pathname.startsWith("/api/projects/") && request.method() !== "GET")
    requests.push({
      method: request.method(),
      path: u.pathname,
      data: request.postDataJSON(),
    });
});
page.on("response", (response) => {
  const u = new URL(response.url());
  if (u.pathname.startsWith("/api/projects/"))
    responses.push({
      method: response.request().method(),
      path: u.pathname,
      status: response.status(),
    });
});
const wizard = () =>
  page.getByRole("dialog", { name: /^Crear proyecto · Paso/ });
const popup = () => page.locator("[popover]:popover-open");
const nameField = () => wizard().getByLabel("Nombre *", { exact: true });
async function snap(name) {
  await page.screenshot({
    path: path.join(output, name + ".png"),
    fullPage: false,
  });
}
async function api(url, method = "GET", data) {
  return page.evaluate(
    async ({ url, method, data }) => {
      const { httpClient } = await import("/src/core/api/httpClient.ts");
      try {
        const r = await httpClient.request({ url, method, data });
        return { status: r.status, data: r.data };
      } catch (e) {
        return { status: e.status, data: e.payload };
      }
    },
    { url, method, data },
  );
}
async function login(target, role) {
  await target.goto(origin + "/proyectos/" + qa.context.project);
  await target.getByLabel("Correo electrónico").fill(qa[role].email);
  await target
    .getByLabel("Contraseña", { exact: true })
    .fill(qa[role].password);
  await target.getByRole("button", { name: "Ingresar", exact: true }).click();
  await target.getByRole("link", { name: "Gantt", exact: true }).waitFor();
  await target
    .getByRole("status", { name: "Cargando", exact: true })
    .waitFor({ state: "hidden" });
}
async function open(fromArea = false, keyboard = false) {
  const button = page.getByRole("button", {
    name: fromArea ? "Crear proyecto en Área sintética A" : "Crear proyecto",
    exact: true,
  });
  if (keyboard) {
    await button.focus();
    await page.keyboard.press("Enter");
  } else await button.click();
  await wizard().waitFor();
}
async function close() {
  await wizard()
    .getByRole("button", { name: "Cerrar modal", exact: true })
    .click();
}
async function selectArea() {
  await wizard()
    .getByRole("button", { name: /^Área obligatoria:/ })
    .click();
  await popup()
    .getByRole("button", { name: "Área sintética A", exact: true })
    .click();
}
async function next() {
  await wizard()
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Crear proyecto · Paso 2 de 2", exact: true })
    .waitFor();
}
async function frames() {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        globalThis.requestAnimationFrame(() =>
          globalThis.requestAnimationFrame(resolve),
        ),
      ),
  );
}
async function check(
  name,
  run,
  environment = "Frontend + Django + MySQL aislado, sin interceptar API",
) {
  try {
    await run();
    assert.deepEqual(errors, []);
    results.push({ name, result: "Aprobado", environment });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, result: "Fallido", error: e.message, environment });
    await snap("failure-" + results.length);
    throw e;
  } finally {
    fs.writeFileSync(
      path.join(output, "results.json"),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          results,
          requests,
          responses,
          errors,
        },
        null,
        2,
      ),
    );
  }
}
let createdId, projectName;
try {
  await login(page, "admin2");
  await check(
    "Encabezado por teclado, errores inline y foco en nombre/área",
    async () => {
      await open(false, true);
      await wizard()
        .getByRole("button", { name: "Continuar", exact: true })
        .click();
      assert.equal(
        await nameField().evaluate(
          (node) => node === globalThis.document.activeElement,
        ),
        true,
      );

      await nameField().fill("Borrador QA");
      await wizard()
        .getByRole("button", { name: "Continuar", exact: true })
        .click();
      const area = wizard().getByRole("button", { name: /^Área obligatoria:/ });
      assert.equal(
        await area.evaluate(
          (node) => node === globalThis.document.activeElement,
        ),
        true,
      );
      await area.click();
      await popup()
        .getByLabel("Buscar área", { exact: true })
        .fill("sin-coincidencias");
      await popup()
        .getByText("No hay áreas que coincidan.", { exact: true })
        .waitFor();
      await snap("area-busqueda-vacia");
      await popup()
        .getByLabel("Buscar área", { exact: true })
        .fill("sintética A");
      await popup()
        .getByRole("button", { name: "Área sintética A", exact: true })
        .click();
      assert.equal(await nameField().inputValue(), "Borrador QA");
      await close();
    },
  );
  await check(
    "Diseño claro/oscuro y viewport: campos iguales, selectores compactos, footer y un solo scroll",
    async () => {
      for (const [dark, width, height] of [
        [false, 1600, 950],
        [true, 1600, 650],
        [false, 900, 500],
        [true, 390, 700],
      ]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(
          (dark) =>
            globalThis.document.documentElement.classList.toggle("dark", dark),
          dark,
        );
        await open(true);
        await nameField().fill(
          "Proyecto con nombre extenso para verificar proporciones del asistente QA",
        );
        await wizard()
          .getByLabel(/^Descripción/)
          .fill(
            "Descripción conservada al abrir selectores, avanzar y volver.",
          );
        const name = await nameField().boundingBox(),
          description = await wizard()
            .getByLabel(/^Descripción/)
            .boundingBox();
        assert.ok(
          Math.abs(name.x - description.x) < 1 &&
            Math.abs(name.width - description.width) < 1,
        );
        const area = await wizard()
            .getByRole("button", { name: /^Área obligatoria:/ })
            .boundingBox(),
          date = await wizard()
            .getByRole("button", { name: /^Fecha de fin estimada/ })
            .boundingBox();
        assert.ok(Math.abs(area.y - date.y) < 2 || width < 500);
        assert.ok(area.width < name.width);
        await wizard()
          .getByRole("button", { name: /^Fecha de fin estimada/ })
          .click();
        await frames();
        let box = await popup().boundingBox();
        assert.ok(
          box.x >= 0 &&
            box.x + box.width <= width + 1 &&
            box.y >= 0 &&
            box.y + box.height <= height + 1,
        );
        const calendarAction = await popup()
          .getByRole("button", { name: "Listo", exact: true })
          .boundingBox();
        assert.ok(
          calendarAction.y >= box.y &&
            calendarAction.y + calendarAction.height <= box.y + box.height + 1,
        );
        await snap(`calendario-${dark ? "oscuro" : "claro"}-${width}`);
        await page.keyboard.press("Escape");
        assert.equal(
          await nameField().inputValue(),
          "Proyecto con nombre extenso para verificar proporciones del asistente QA",
        );
        await wizard()
          .getByRole("button", { name: /^Área obligatoria:/ })
          .click();
        await popup()
          .getByLabel("Buscar área", { exact: true })
          .fill("sintética");
        await frames();
        await snap(`area-${dark ? "oscuro" : "claro"}-${width}`);
        await page.keyboard.press("Escape");
        assert.equal(
          await wizard()
            .getByRole("button", { name: "Cancelar", exact: true })
            .count(),
          0,
        );
        if (width === 1600 && height === 950)
          assert.equal(
            await wizard()
              .locator("form > div")
              .evaluate((node) => node.scrollHeight > node.clientHeight + 1),
            false,
          );
        await snap(`paso1-${dark ? "oscuro" : "claro"}-${width}`);
        await next();
        await wizard()
          .getByRole("radio", {
            name: "Crear proyecto con trabajadores asignados",
            exact: true,
          })
          .check();
        await wizard()
          .getByRole("group", { name: "Trabajadores elegibles", exact: true })
          .waitFor();
        const mode = await wizard().locator("#project-mode").boundingBox(),
          members = await wizard().locator("#project-members").boundingBox();
        if (width >= 640) assert.ok(members.x > mode.x + mode.width - 1);
        else assert.ok(members.y > mode.y);
        const permission = wizard().getByRole("switch", {
          name: "Permitir edición en el proyecto",
          exact: true,
        });
        const off = await permission.locator("span").boundingBox();
        await permission.click();
        const on = await permission.locator("span").boundingBox();
        assert.ok(on.x > off.x + 8);
        await wizard().getByText("Edición", { exact: true }).waitFor();
        await snap(`paso2-${dark ? "oscuro" : "claro"}-${width}`);
        const footer = await wizard()
          .getByRole("button", { name: "Crear con asignados", exact: true })
          .boundingBox();
        assert.ok(footer.y >= 0 && footer.y + footer.height <= height);
        assert.equal(
          await wizard()
            .locator("[role=group]")
            .evaluateAll(
              (nodes) =>
                nodes.filter(
                  (node) =>
                    ["auto", "scroll"].includes(
                      globalThis.getComputedStyle(node).overflowY,
                    ) && node.scrollHeight > node.clientHeight + 1,
                ).length,
            ),
          0,
        );
        await wizard()
          .getByRole("button", { name: "Volver", exact: true })
          .click();
        assert.equal(
          await nameField().inputValue(),
          "Proyecto con nombre extenso para verificar proporciones del asistente QA",
        );
        await close();
      }
    },
  );
  await page.setViewportSize({ width: 1600, height: 950 });
  await page.evaluate(() =>
    globalThis.document.documentElement.classList.remove("dark"),
  );
  await check(
    "Borrador, miembros, error de campo controlado y creación asignada sin doble envío",
    async () => {
      await open(true);
      projectName = "Formulario asignado QA " + Date.now();
      await nameField().fill(projectName);
      await wizard()
        .getByLabel(/^Descripción/)
        .fill("Datos de prueba aislados, conservados entre pasos.");
      await wizard()
        .getByRole("button", { name: /^Fecha de fin estimada/ })
        .click();
      await popup()
        .getByRole("button", { name: "Mes siguiente", exact: true })
        .click();
      await popup().locator("button[data-date]:not(:disabled)").nth(14).click();
      await popup().waitFor({ state: "hidden" });
      await next();
      await wizard()
        .getByRole("switch", {
          name: "Permitir edición en el proyecto",
          exact: true,
        })
        .click();
      await wizard()
        .getByRole("radio", {
          name: "Crear proyecto con trabajadores asignados",
          exact: true,
        })
        .check();
      await wizard()
        .getByRole("button", { name: "Crear con asignados", exact: true })
        .click();
      assert.equal(
        await wizard()
          .locator("#project-members")
          .evaluate((node) => node === globalThis.document.activeElement),
        true,
      );
      await wizard()
        .getByRole("button", { name: "Equipos", exact: true })
        .click();
      const teams = wizard().getByRole("group", {
        name: "Equipos elegibles",
        exact: true,
      });
      await teams.getByRole("checkbox").first().check();
      await teams.getByText("Ver integrantes", { exact: true }).first().click();
      await snap("equipo-integrantes");
      await wizard()
        .getByRole("button", { name: "Volver", exact: true })
        .click();
      assert.equal(await nameField().inputValue(), projectName);
      await next();
      assert.equal(
        await wizard()
          .getByRole("switch", {
            name: "Permitir edición en el proyecto",
            exact: true,
          })
          .getAttribute("aria-checked"),
        "true",
      );
      assert.equal(
        await wizard()
          .getByRole("group", { name: "Equipos elegibles", exact: true })
          .getByRole("checkbox")
          .first()
          .isChecked(),
        true,
      );
      const reject = async (route) => {
        if (route.request().method() === "POST")
          await route.fulfill({
            status: 400,
            json: { name: ["Nombre rechazado por QA controlado."] },
          });
        else await route.continue();
      };
      await page.route("**/api/projects/", reject);
      await wizard()
        .getByRole("button", { name: "Crear con asignados", exact: true })
        .click();
      await wizard()
        .getByText("Nombre rechazado por QA controlado.", { exact: true })
        .waitFor();
      assert.equal(
        await nameField().evaluate(
          (node) => node === globalThis.document.activeElement,
        ),
        true,
      );
      assert.equal(await nameField().inputValue(), projectName);
      await page.unroute("**/api/projects/", reject);
      await next();
      let release, sent;
      const reached = new Promise((resolve) => (sent = resolve)),
        hold = new Promise((resolve) => (release = resolve));
      const delayed = async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        const response = await route.fetch();
        sent();
        await hold;
        await route.fulfill({ response });
      };
      await page.route("**/api/projects/", delayed);
      const count = requests.length;
      const create = wizard().getByRole("button", {
        name: "Crear con asignados",
        exact: true,
      });
      const box = await create.boundingBox();
      await create.click();
      await reached;
      assert.equal(
        await wizard()
          .getByRole("button", { name: "Creando…", exact: true })
          .isDisabled(),
        true,
      );
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      assert.equal(requests.length - count, 1);
      release();
      await wizard().waitFor({ state: "hidden" });
      await page.unroute("**/api/projects/", delayed);
      createdId = Number(new URL(page.url()).pathname.split("/").pop());
      assert.ok(createdId);
      const stored = await api(`projects/${createdId}/`);
      assert.equal(stored.status, 200);
      assert.equal(stored.data.name, projectName);
      assert.equal(
        stored.data.description,
        "Datos de prueba aislados, conservados entre pasos.",
      );
      assert.equal(stored.data.areas.length, 1);
      assert.equal(stored.data.worker_create, true);
      assert.equal(stored.data.available, false);
      assert.ok(stored.data.end_date);
      await page.reload();
      await page
        .getByRole("navigation", { name: "Navegación principal", exact: true })
        .getByRole("link", { name: projectName, exact: true })
        .waitFor();
      await snap("proyecto-creado-recargado");
    },
    "API/BD reales para el alta final; un 400 de campo simulado y demora controlada de su respuesta real",
  );
  await check(
    "Acceso de encabezado, configuración secundaria y fecha final opcional persistida",
    async () => {
      await open();
      const name = "Formulario disponible QA " + Date.now();
      await nameField().fill(name);
      await selectArea();
      await wizard()
        .getByRole("button", { name: "Configurar", exact: true })
        .click();
      const flow = page.getByRole("dialog", {
        name: "Modifica los estados de Tareas",
        exact: true,
      });
      await flow.waitFor();
      await flow
        .getByRole("button", { name: "Cerrar modal", exact: true })
        .click();
      assert.equal(await nameField().inputValue(), name);
      await next();
      await wizard()
        .getByRole("button", {
          name: "Publicar dentro del sistema",
          exact: true,
        })
        .click();
      await wizard().waitFor({ state: "hidden" });
      const id = Number(new URL(page.url()).pathname.split("/").pop());
      const stored = (await api(`projects/${id}/`)).data;
      assert.equal(stored.end_date, null);
      assert.equal(stored.available, true);
      assert.equal(stored.worker_create, false);
      await page.reload();
      await page.getByRole("heading", { name, exact: true }).waitFor();
      const associated = await api(
        `projects/?associated=true&project_id=${id}`,
      );
      assert.equal(associated.data.results.length, 0);
      assert.equal(
        await page
          .getByRole("navigation", {
            name: "Navegación principal",
            exact: true,
          })
          .getByRole("link", { name, exact: true })
          .count(),
        0,
      );
    },
  );
  await check(
    "Respuesta perdida después del alta conserva borrador y consulta sin repetir POST",
    async () => {
      await open(true);
      const name = "Formulario ambiguo QA " + Date.now();
      await nameField().fill(name);
      await next();
      let serverStatus;
      const lose = async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        const response = await route.fetch();
        serverStatus = response.status();
        await route.abort("failed");
      };
      await page.route("**/api/projects/", lose);
      const before = requests.length;
      await wizard()
        .getByRole("button", {
          name: "Publicar dentro del sistema",
          exact: true,
        })
        .click();
      await wizard()
        .getByRole("button", {
          name: "Consultar antes de reintentar",
          exact: true,
        })
        .waitFor();
      assert.equal(serverStatus, 201);
      await page.unroute("**/api/projects/", lose);
      await wizard()
        .getByRole("button", {
          name: "Consultar antes de reintentar",
          exact: true,
        })
        .click();
      await wizard()
        .getByText(/Hay proyectos con ese nombre/)
        .waitFor();
      assert.equal(requests.length - before, 1);
      await snap("respuesta-perdida-consulta");
      await close();
      const matches = (
        await api(`projects/?q=${encodeURIComponent(name)}`)
      ).data.results.filter((item) => item.name === name);
      assert.equal(matches.length, 1);
    },
    "POST confirmado por Django/MySQL reales; pérdida de respuesta provocada en Playwright",
  );
  await check(
    "Miembros extensos: un solo scroll y acciones accesibles",
    async () => {
      const synthetic = Array.from({ length: 60 }, (_, index) => ({
        id: 9000 + index,
        name: `Participante sintético extenso ${index}`,
        project_count: index,
      }));
      const candidates = (route) =>
        route.fulfill({ status: 200, json: synthetic });
      await page.route("**/api/projects/workers/**", candidates);
      for (const [width, height] of [
        [1600, 650],
        [390, 700],
      ]) {
        await page.setViewportSize({ width, height });
        await open(true);
        await nameField().fill("Contenido extenso QA");
        await next();
        await wizard()
          .getByRole("radio", {
            name: "Crear proyecto con trabajadores asignados",
            exact: true,
          })
          .check();
        await wizard()
          .getByLabel("Buscar trabajadores", { exact: true })
          .fill("extenso");
        await wizard()
          .getByRole("button", { name: "Buscar", exact: true })
          .click();
        await wizard()
          .getByRole("checkbox", { name: /Participante sintético extenso 59/ })
          .waitFor({ state: "attached" });
        const body = wizard().locator("form > div");
        assert.equal(
          await body.evaluate((node) => node.scrollHeight > node.clientHeight),
          true,
        );
        const last = wizard().getByRole("checkbox", {
          name: /Participante sintético extenso 59/,
        });
        await last.focus();
        await last.scrollIntoViewIfNeeded();
        const footer = await wizard().locator("footer").boundingBox(),
          item = await last.boundingBox();
        assert.ok(item.y + item.height <= footer.y + 1);
        assert.equal(
          await wizard()
            .getByRole("group", { name: "Trabajadores elegibles", exact: true })
            .evaluate((node) => node.scrollHeight > node.clientHeight + 1),
          false,
        );
        await snap(`miembros-extensos-${width}`);
        await close();
      }
      await page.unroute("**/api/projects/workers/**", candidates);
      await page.setViewportSize({ width: 1600, height: 950 });
    },
    "Pantalla real; 60 candidatos sintéticos interceptados, sin escrituras",
  );
  await check(
    "Validación y permisos reales de API permanecen vigentes",
    async () => {
      const invalid = await api("projects/", "POST", {
        name: "",
        area_ids: [qa.context.area],
        mode: "available",
        worker_ids: [],
        worker_contribute: false,
        end_date: "2000-01-01",
      });
      assert.equal(invalid.status, 400);
      const workerContext = await browser.newContext(),
        worker = await workerContext.newPage();
      await login(worker, "worker");
      assert.equal(
        await worker
          .getByRole("button", { name: "Crear proyecto", exact: true })
          .count(),
        0,
      );
      const denied = await worker.evaluate(async (area) => {
        const { httpClient } = await import("/src/core/api/httpClient.ts");
        try {
          await httpClient.post("projects/", {
            name: "Alta denegada QA",
            area_ids: [area],
            mode: "available",
            worker_ids: [],
          });
          return 201;
        } catch (error) {
          return error.status;
        }
      }, qa.context.area);
      assert.equal(denied, 403);
      await workerContext.close();
    },
  );
  await check(
    "Dependencia compartida: selector de tarea conserva su interacción sin escrituras",
    async () => {
      const count = requests.length;
      await page
        .getByRole("button", { name: "Crear nueva tarea", exact: true })
        .click();
      const task = page.getByRole("dialog", {
        name: "Nueva tarea",
        exact: true,
      });
      await task.getByRole("button", { name: /^Fecha límite:/ }).click();
      await frames();
      const box = await popup().boundingBox();
      assert.ok(
        box.x >= 0 &&
          box.y >= 0 &&
          box.x + box.width <= 1601 &&
          box.y + box.height <= 951,
      );
      await page.keyboard.press("Escape");
      await task.waitFor();
      await page.keyboard.press("Escape");
      await task.waitFor({ state: "hidden" });
      assert.equal(requests.length, count);
    },
  );
} finally {
  await browser.close();
}
