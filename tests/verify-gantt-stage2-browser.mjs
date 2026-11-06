import {
  observeGanttCollections,
  currentGanttTasks,
  waitGantt,
  chooseGanttPeriod,
  selectGanttTask,
  selectedGanttTaskId,
  ganttFilter,
  clearGanttFilters,
  currentGanttPeriod,
} from "./ganttBrowserControls.mjs";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(
  pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE).href
);
const secrets = JSON.parse(
  await readFile(process.env.GM_QA_SECRETS_PATH, "utf8"),
);
const data = secrets.context;
const output = process.env.GM_BROWSER_REPORT_DIR;
await mkdir(output, { recursive: true });
const origin = "http://localhost:5189";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const network = [],
  errors = [],
  records = [],
  clients = [],
  resources = [];
let admin,
  currentCheck = "",
  baselineTasks;
async function login(role) {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1100 },
    timezoneId: "America/Lima",
  });
  const page = await context.newPage();
  observeGanttCollections(page);
  page.setDefaultTimeout(20000);
  page.on("pageerror", (error) =>
    errors.push({ role, message: error.message.slice(0, 400) }),
  );
  page.on("request", (request) =>
    resources.push({
      role,
      path: new URL(request.url()).pathname,
      method: request.method(),
    }),
  );
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith("/api/"))
      network.push({
        role,
        path: pathname,
        method: response.request().method(),
        status: response.status(),
      });
  });
  clients.push({ page, context });
  await page.goto(origin);
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill(secrets[role].email);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(secrets[role].password);
  const waiting = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/auth/login/" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  const reply = await waiting;
  assert.equal(reply.status(), 200);
  await page.getByRole("button", { name: "Abrir menú de perfil" }).waitFor();
  return { page, context, role, token: (await reply.json()).access };
}
async function request(client, resource) {
  const response = await client.context.request.get(
    origin + "/api/" + resource,
    { headers: { Authorization: "Bearer " + client.token }, maxRetries: 0 },
  );
  return { status: response.status(), body: await response.json() };
}
async function check(name, callback) {
  currentCheck = name;
  records.push({ name, status: "Aprobado", details: await callback() });
  console.log("OK " + name);
}
const row = (page, id) =>
  page.locator(".gm-task-gantt .wx-row[data-id='" + id + "']");
const locate = async (page, id) => {
  await selectGanttTask(page, String(id));
  await row(page, id).waitFor();
};
const textStatus = (page) => page.locator(".gm-gantt-chart-top");
const businessReads = (role) =>
  resources.filter(
    (entry) =>
      entry.role === role &&
      entry.path.startsWith("/api/projects/") &&
      entry.method === "GET",
  );
const collectionPath = "/api/projects/" + data.operational_project + "/tasks/";
try {
  admin = await login("admin");
  await check(
    "Carga compartida completa, diferida y virtualizada con 368 tareas",
    async () => {
      assert.equal(
        resources.filter((item) =>
          /@svar-ui_react-gantt|TaskGantt\/TaskGantt\.tsx/.test(item.path),
        ).length,
        0,
      );
      const loaded = admin.page.waitForResponse(
        (response) => new URL(response.url()).pathname === collectionPath,
      );
      await admin.page.goto(
        origin + "/proyectos/" + data.operational_project + "?vista=gantt",
      );
      const reply = await loaded;
      baselineTasks = await reply.json();
      assert.equal(baselineTasks.length, data.operational_count);
      assert.ok(baselineTasks.length > 350);
      await waitGantt(admin.page);
      assert.equal(currentGanttTasks(admin.page).length, baselineTasks.length);
      await admin.page
        .locator(".gm-task-gantt .wx-row[data-id]")
        .first()
        .waitFor();
      const rendered = await admin.page
        .locator(".gm-task-gantt .wx-row[data-id]")
        .count();
      assert.ok(
        rendered > 0 && rendered < 100,
        "the widget must virtualize its loaded collection",
      );
      const window = await textStatus(admin.page).textContent();
      assert.ok(window.includes(data.today.slice(0, 4)));
      assert.ok(!window.includes("1900-") && !window.includes("2099-"));
      const reads = businessReads("admin");
      assert.equal(
        reads.filter((entry) => /\/tasks\/\d+\//.test(entry.path)).length,
        0,
      );
      await admin.page.screenshot({
        path: path.join(output, "01_consulta_completa.png"),
        fullPage: true,
      });
      return {
        authorized_tasks: baselineTasks.length,
        rendered_rows: rendered,
        initial_reads: reads,
      };
    },
  );
  await check(
    "Cuatro niveles, orden y estados propios sobreviven a recarga",
    async () => {
      await locate(admin.page, data.deep_leaf);
      for (const id of [
        data.deep_root,
        data.deep_child,
        data.deep_grandchild,
        data.deep_leaf,
      ])
        await row(admin.page, id).waitFor();
      const ids = await admin.page
        .locator(".gm-task-gantt .wx-row[data-id]")
        .evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.id)));
      assert.ok(ids.indexOf(data.deep_root) < ids.indexOf(data.deep_child));
      assert.ok(
        ids.indexOf(data.deep_child) < ids.indexOf(data.deep_grandchild),
      );
      assert.ok(
        ids.indexOf(data.deep_grandchild) < ids.indexOf(data.deep_leaf),
      );
      await row(admin.page, data.deep_child)
        .getByText("EN CURSO", { exact: true })
        .waitFor();
      await row(admin.page, data.deep_grandchild)
        .getByText("BLOQUEADA", { exact: true })
        .waitFor();
      assert.equal(await admin.page.locator(".wx-bar.wx-summary").count(), 0);
      await admin.page.reload();
      await waitGantt(admin.page);
      await locate(admin.page, data.deep_leaf);
      await row(admin.page, data.deep_child)
        .getByText("EN CURSO", { exact: true })
        .waitFor();
      assert.deepEqual(
        (
          await request(
            admin,
            "projects/" + data.operational_project + "/tasks/",
          )
        ).body,
        baselineTasks,
      );
      return { depth: 4, own_states: true, persisted_parent_ids: true };
    },
  );
  await check(
    "Búsqueda por nombre y etiqueta conserva ancestros y no consulta detalle",
    async () => {
      const before = businessReads("admin").length;
      await admin.page
        .getByRole("button", { name: "Buscar tareas", exact: true })
        .click();
      const search = admin.page.getByRole("searchbox", {
        name: "Buscar tareas por nombre, responsable o etiqueta",
        exact: true,
      });
      await search.fill("Cuarto nivel búsqueda");
      await row(admin.page, data.deep_leaf).waitFor();
      await admin.page.waitForFunction(
        () =>
          globalThis.document.querySelectorAll(
            ".gm-task-gantt .wx-row[data-id]",
          ).length === 4,
      );
      assert.equal(
        await admin.page.locator(".gm-task-gantt .wx-row[data-id]").count(),
        4,
      );
      await textStatus(admin.page)
        .filter({ hasText: "1 de " + data.operational_count + " tareas" })
        .waitFor();
      assert.equal(
        await admin.page
          .getByRole("button", {
            name: "Contraer subtareas de Raíz operativa QA",
            exact: true,
          })
          .isDisabled(),
        true,
      );
      await search.fill("Revisión profunda QA");
      await row(admin.page, data.deep_leaf).waitFor();
      await admin.page.waitForFunction(
        () =>
          globalThis.document.querySelectorAll(
            ".gm-task-gantt .wx-row[data-id]",
          ).length === 4,
      );
      assert.equal(
        await admin.page.locator(".gm-task-gantt .wx-row[data-id]").count(),
        4,
      );
      await admin.page.screenshot({
        path: path.join(output, "02_filtro_ancestros.png"),
        fullPage: true,
      });
      await clearGanttFilters(admin.page);
      assert.equal(businessReads("admin").length, before);
      return { matches: 1, ancestor_context_rows: 3, read_requests: 0 };
    },
  );
  await check(
    "Filtros combinados, vacío válido y limpieza no alteran la colección",
    async () => {
      const child = baselineTasks.find((task) => task.id === data.deep_child);
      const person = child.assignees[0];
      const before = businessReads("admin").length;
      await ganttFilter(admin.page, "Persona", String(person.id));
      await ganttFilter(admin.page, "Estado", "EN_CURSO");
      await row(admin.page, data.deep_child).waitFor();
      await ganttFilter(admin.page, "Fecha", "undated");
      await admin.page
        .getByText("No hay tareas que coincidan con los filtros.", {
          exact: true,
        })
        .waitFor();
      assert.equal(
        await admin.page
          .getByText("Este proyecto todavía no tiene tareas.", { exact: true })
          .count(),
        0,
      );
      await clearGanttFilters(admin.page);
      await locate(admin.page, data.deep_child);
      await row(admin.page, data.deep_child)
        .getByText(person.name, { exact: true })
        .waitFor();
      assert.equal(businessReads("admin").length, before);
      return {
        filters: ["state", "additional_assignee", "due_date"],
        valid_no_matches: true,
        read_requests: 0,
      };
    },
  );
  await check(
    "Escalas día semana mes, hoy y ajuste completo sin extremos ficticios",
    async () => {
      const before = businessReads("admin").length;
      for (const scale of ["week", "month", "day"]) {
        await chooseGanttPeriod(admin.page, scale);
        assert.equal(await currentGanttPeriod(admin.page), scale);
      }
      await locate(admin.page, data.extreme);
      await row(admin.page, data.extreme)
        .locator("time[datetime='2099-01-01']")
        .first()
        .waitFor();
      await textStatus(admin.page).filter({ hasText: "2099-" }).waitFor();
      await admin.page
        .getByRole("button", { name: "Hoy", exact: true })
        .click();
      await textStatus(admin.page)
        .filter({ hasText: data.today.slice(0, 4) + "-" })
        .waitFor();
      await admin.page
        .getByRole("button", { name: "Ajuste automático", exact: true })
        .click();
      await textStatus(admin.page).filter({ hasText: "1901-" }).waitFor();
      assert.equal(await currentGanttPeriod(admin.page), "year");
      await admin.page
        .getByRole("button", { name: "Hoy", exact: true })
        .click();
      const currentYear = admin.page
        .locator(".gm-task-gantt .wx-chart")
        .getByText(data.today.slice(0, 4), { exact: true });
      await currentYear.waitFor();
      const yearBounds = await currentYear.boundingBox(),
        timeline = await admin.page
          .locator(".gm-task-gantt .wx-chart")
          .boundingBox();
      assert.ok(
        yearBounds.x + yearBounds.width > timeline.x &&
          yearBounds.x < timeline.x + timeline.width,
      );
      await locate(admin.page, data.deep_grandchild);
      await row(admin.page, data.deep_grandchild)
        .getByText("Sin fecha límite", { exact: true })
        .waitFor();
      assert.equal(
        await admin.page
          .locator(".wx-bar[data-id='" + data.deep_grandchild + "']")
          .isVisible(),
        false,
      );
      await chooseGanttPeriod(admin.page, "day");
      await admin.page.screenshot({
        path: path.join(output, "03_navegacion.png"),
        fullPage: true,
      });
      assert.equal(businessReads("admin").length, before);
      return {
        scales: 3,
        extreme_locatable: true,
        initial_range_bounded: true,
        explicit_fit: true,
        null_end_preserved: true,
        read_requests: 0,
      };
    },
  );
  await check(
    "Selección expansión rango y scroll sobreviven a actualización ordinaria y fallo recuperable",
    async () => {
      await locate(admin.page, data.deep_root);
      await admin.page
        .getByRole("button", {
          name: "Contraer subtareas de Raíz operativa QA",
          exact: true,
        })
        .click();
      await row(admin.page, data.deep_child).waitFor({ state: "hidden" });
      await locate(admin.page, data.branch);
      const chart = admin.page.locator(".gm-task-gantt .wx-chart");
      const box = await chart.boundingBox();
      assert.ok(box);
      await admin.page.mouse.move(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
      const wheelStart = await chart.evaluate((node) => ({
        left: node.scrollLeft,
        top: node.scrollTop,
      }));
      await admin.page.mouse.wheel(160, -120);
      await admin.page.waitForFunction((start) => {
        const node = globalThis.document.querySelector(
          ".gm-task-gantt .wx-chart",
        );
        return node.scrollLeft !== start.left || node.scrollTop !== start.top;
      }, wheelStart);
      await admin.page.evaluate(
        () =>
          new Promise((resolve) =>
            globalThis.requestAnimationFrame(() =>
              globalThis.requestAnimationFrame(resolve),
            ),
          ),
      );
      const before = await chart.evaluate((node) => ({
        left: node.scrollLeft,
        top: node.scrollTop,
      }));
      const visibleRange = await textStatus(admin.page).textContent();
      const route = "**" + collectionPath;
      const freshRead = async (incoming) => {
        const response = await incoming.fetch();
        const body = await response.json();
        const updated = body.map((task) =>
          task.id === data.successor
            ? { ...task, name: "Sucesora actualizada QA" }
            : task,
        );
        await incoming.fulfill({ response, json: updated });
      };
      await admin.page.route(route, freshRead);
      const response = admin.page.waitForResponse(
        (reply) => new URL(reply.url()).pathname === collectionPath,
      );
      await admin.page
        .getByRole("button", { name: "Actualizar Gantt", exact: true })
        .click();
      await response;
      await admin.page
        .getByRole("button", { name: "Actualizar Gantt", exact: true })
        .waitFor({ state: "visible" });
      await admin.page.waitForFunction(
        () =>
          !globalThis.document.querySelector(
            "button[aria-label='Actualizar Gantt']",
          )?.disabled,
      );
      assert.ok(
        currentGanttTasks(admin.page).some(
          (task) => task.name === "Sucesora actualizada QA",
        ),
      );
      assert.equal(await selectedGanttTaskId(admin.page), String(data.branch));
      assert.equal(await textStatus(admin.page).textContent(), visibleRange);
      const after = await chart.evaluate((node) => ({
        left: node.scrollLeft,
        top: node.scrollTop,
      }));
      assert.ok(
        Math.abs(before.left - after.left) < 2 &&
          Math.abs(before.top - after.top) < 2,
        JSON.stringify({ before, after }),
      );
      await admin.page.unroute(route, freshRead);
      await locate(admin.page, data.deep_root);
      await admin.page
        .getByRole("button", {
          name: "Expandir subtareas de Raíz operativa QA",
          exact: true,
        })
        .waitFor();
      const fail = (incoming) =>
        incoming.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Lectura QA interrumpida" }),
        });
      await admin.page.route(route, fail);
      await admin.page
        .getByRole("button", { name: "Actualizar Gantt", exact: true })
        .click();
      await admin.page
        .getByRole("button", { name: "Reintentar tareas", exact: true })
        .waitFor();
      assert.ok(
        (await admin.page.locator(".gm-task-gantt .wx-row[data-id]").count()) >
          0,
      );
      await admin.page.unroute(route, fail);
      const retried = admin.page.waitForResponse(
        (reply) =>
          new URL(reply.url()).pathname === collectionPath &&
          reply.status() === 200,
      );
      await admin.page
        .getByRole("button", { name: "Reintentar tareas", exact: true })
        .click();
      await retried;
      await admin.page.waitForFunction(
        () =>
          !globalThis.document.querySelector(
            "button[aria-label='Actualizar Gantt']",
          )?.disabled,
      );
      await admin.page
        .getByRole("button", { name: "Reintentar tareas", exact: true })
        .waitFor({ state: "hidden" });
      await admin.page
        .getByRole("button", {
          name: "Expandir subtareas de Raíz operativa QA",
          exact: true,
        })
        .waitFor();
      return {
        controlled_snapshot_update: true,
        scroll_before: before,
        scroll_after: after,
        selection: data.branch,
        collapse_retained: true,
        retry: true,
      };
    },
  );
  await check(
    "Dependencias dirigidas navegables, sin tipo temporal inventado ni consultas por fila",
    async () => {
      const before = businessReads("admin").length;
      await locate(admin.page, data.deep_root);
      const panel = admin.page.getByRole("region", {
        name: "Dependencias de la tarea seleccionada",
        exact: true,
      });
      await panel
        .getByRole("button", {
          name: "Localizar sucesora Sucesora operativa QA",
          exact: true,
        })
        .waitFor();
      await panel
        .getByRole("button", {
          name: "Localizar sucesora Sucesora operativa QA",
          exact: true,
        })
        .click();
      assert.equal(
        await selectedGanttTaskId(admin.page),
        String(data.successor),
      );
      await panel
        .getByRole("button", {
          name: "Localizar predecesora Predecesora no asignada QA",
          exact: true,
        })
        .waitFor();
      assert.equal(
        await admin.page.locator(".gm-task-gantt .wx-link").count(),
        0,
      );
      assert.equal(businessReads("admin").length, before);
      await admin.page.screenshot({
        path: path.join(output, "04_dependencias.png"),
        fullPage: true,
      });
      return {
        directional_relationships: true,
        native_temporal_type_assigned: false,
        read_requests: 0,
      };
    },
  );
  await check(
    "Colapsar filtrar y limpiar recupera la expansión elegida sin cambiar padres",
    async () => {
      await locate(admin.page, data.deep_root);
      await admin.page
        .getByRole("button", {
          name: "Expandir subtareas de Raíz operativa QA",
          exact: true,
        })
        .waitFor();
      await admin.page
        .getByRole("button", { name: "Buscar tareas", exact: true })
        .click();
      const search = admin.page.getByRole("searchbox", {
        name: "Buscar tareas por nombre, responsable o etiqueta",
        exact: true,
      });
      await search.fill("Cuarto nivel búsqueda");
      await row(admin.page, data.deep_leaf).waitFor();
      await clearGanttFilters(admin.page);
      await locate(admin.page, data.deep_root);
      await admin.page
        .getByRole("button", {
          name: "Expandir subtareas de Raíz operativa QA",
          exact: true,
        })
        .waitFor();
      await row(admin.page, data.deep_child).waitFor({ state: "hidden" });
      return {
        temporary_context_expansion: true,
        original_collapse_restored: true,
      };
    },
  );
  await check(
    "Detalle actual y navegación de dependencias respetan ámbito del trabajador",
    async () => {
      const worker = await login("worker");
      const listing = await request(
        worker,
        "projects/" + data.operational_project + "/tasks/",
      );
      assert.equal(listing.status, 200);
      assert.ok(
        !listing.body.some((task) => task.id === data.hidden_predecessor),
      );
      const successor = listing.body.find((task) => task.id === data.successor);
      assert.deepEqual(successor.dependencies, [data.deep_root]);
      await worker.page.goto(
        origin + "/proyectos/" + data.operational_project + "?vista=gantt",
      );
      await waitGantt(worker.page);
      assert.equal(currentGanttTasks(worker.page).length, listing.body.length);
      await locate(worker.page, data.successor);
      const panel = worker.page.getByRole("region", {
        name: "Dependencias de la tarea seleccionada",
        exact: true,
      });
      await panel
        .getByRole("button", {
          name: "Localizar predecesora Raíz operativa QA",
          exact: true,
        })
        .waitFor();
      assert.equal(
        await panel
          .getByText("Predecesora no asignada QA", { exact: true })
          .count(),
        0,
      );
      await row(worker.page, data.successor)
        .getByRole("button", {
          name: "Abrir tarea Sucesora operativa QA",
          exact: true,
        })
        .click();
      await worker.page
        .locator('dialog[open] section[aria-label="Propiedades de la tarea"]')
        .waitFor();
      await worker.page.keyboard.press("Escape");
      await worker.page.locator("dialog[open]").waitFor({ state: "hidden" });
      await worker.page.screenshot({
        path: path.join(output, "05_trabajador.png"),
        fullPage: true,
      });
      return {
        authorized_rows: listing.body.length,
        unauthorized_predecessor_exposed: false,
        existing_detail: true,
      };
    },
  );
  await check(
    "Selección con puntero y controles operativos en oscuro y móvil",
    async () => {
      await locate(admin.page, data.successor);
      const chart = admin.page.locator(".gm-task-gantt .wx-chart");
      const target = await admin.page
        .locator(".gm-task-gantt")
        .evaluate((element) => {
          const box = element
            .querySelector(".wx-chart")
            .getBoundingClientRect();
          return [...element.querySelectorAll(".wx-row[data-id]")].find(
            (node) => {
              const rect = node.getBoundingClientRect();
              return rect.top >= box.top && rect.bottom < box.bottom;
            },
          )?.dataset.id;
        });
      assert.ok(target);
      await row(admin.page, target).locator("time").first().click();
      await admin.page
        .getByRole("region", { name: "Acciones de la tarea seleccionada" })
        .waitFor();
      assert.equal(await selectedGanttTaskId(admin.page), target);
      await admin.page
        .getByRole("button", { name: "Actualizar Gantt", exact: true })
        .click();
      await admin.page.waitForFunction(
        () =>
          !globalThis.document.querySelector(
            "button[aria-label='Actualizar Gantt']",
          )?.disabled,
      );
      assert.equal(await selectedGanttTaskId(admin.page), target);
      await admin.page.evaluate(() =>
        globalThis.localStorage.setItem("theme", "dark"),
      );
      await admin.page.reload();
      await waitGantt(admin.page);
      await locate(admin.page, Number(target));
      assert.equal(
        await admin.page.evaluate(() =>
          globalThis.document.documentElement.classList.contains("dark"),
        ),
        true,
      );
      await admin.page.screenshot({
        path: path.join(output, "06_oscuro.png"),
        fullPage: true,
      });
      await admin.page.setViewportSize({ width: 390, height: 844 });
      const region = admin.page.getByRole("region", {
        name: "Calendario de tareas; tabla y línea de tiempo",
        exact: true,
      });
      assert.equal(
        await region.evaluate((node) => node.scrollWidth > node.clientWidth),
        true,
      );
      await chooseGanttPeriod(admin.page, "week");
      await admin.page.screenshot({
        path: path.join(output, "07_movil.png"),
        fullPage: true,
      });
      await admin.page.setViewportSize({ width: 1600, height: 1100 });
      await admin.page.evaluate(() => {
        globalThis.localStorage.setItem("theme", "light");
        globalThis.document.documentElement.classList.remove("dark");
      });
      await chooseGanttPeriod(admin.page, "day");
      assert.ok(await chart.isVisible());
      return {
        pointer_selection: true,
        selection_after_refresh: target,
        dark: true,
        mobile_width: 390,
        scroll_region: true,
      };
    },
  );
  await check(
    "Atajos y puntero sin permiso siguen sin mutaciones; recarga conserva la colección íntegra",
    async () => {
      const readonly = await login("worker");
      await readonly.page.goto(
        origin + "/proyectos/" + data.readonly_project + "?vista=gantt",
      );
      await waitGantt(readonly.page);
      const bar = readonly.page.locator(
        ".gm-task-gantt .wx-bar[data-id='" + data.readonly_task + "']",
      );
      await bar.scrollIntoViewIfNeeded();
      const box = await bar.boundingBox();
      assert.ok(box);
      await readonly.page.mouse.move(box.x + 5, box.y + box.height / 2);
      await readonly.page.mouse.down();
      await readonly.page.mouse.move(box.x + 85, box.y + box.height / 2, {
        steps: 8,
      });
      await readonly.page.mouse.up();
      await readonly.page.keyboard.press("Delete");
      await readonly.page.keyboard.press("Insert");
      await readonly.page.keyboard.press("Control+c");
      await readonly.page.keyboard.press("Control+v");
      await admin.page.reload();
      await waitGantt(admin.page);
      assert.equal(
        currentGanttTasks(admin.page).length,
        data.operational_count,
      );
      const writes = network.filter(
        (entry) =>
          entry.path.startsWith("/api/projects/") && entry.method !== "GET",
      );
      assert.deepEqual(writes, []);
      assert.deepEqual(
        (
          await request(
            admin,
            "projects/" + data.operational_project + "/tasks/",
          )
        ).body,
        baselineTasks,
      );
      return {
        task_writes: 0,
        records_after_reload: data.operational_count,
        unchanged: true,
      };
    },
  );
  assert.deepEqual(errors, []);
} catch (error) {
  records.push({
    name: currentCheck || "Preparación",
    status: "Fallido",
    detail: error.stack,
  });
  if (admin)
    await admin.page
      .screenshot({ path: path.join(output, "fallo.png"), fullPage: true })
      .catch(() => {});
  process.exitCode = 1;
  console.error(error.stack);
} finally {
  await writeFile(
    path.join(output, "resultados-etapa2.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        browser: browser.version(),
        records,
        network,
        resources,
        errors,
      },
      null,
      2,
    ),
  );
  await Promise.all(clients.map((client) => client.context.close()));
  await browser.close();
}
