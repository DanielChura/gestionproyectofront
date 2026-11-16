import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { homedir } from "node:os";
import path from "node:path";
const { chromium } = await import(
  pathToFileURL(
    process.env.GM_PLAYWRIGHT_MODULE ||
      path.join(
        homedir(),
        ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
      ),
  ).href
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(e.stack));
const states = [
  {
    code: "PENDIENTE",
    name: "PENDIENTE",
    category: "not_started",
    color: "#475569",
    tema: { id: 1, color: "#475569", icono: "circle" },
  },
];
const project = {
  id: 7,
  name: "Proyecto regresión QA",
  description: "",
  participants: [],
  requirements: [],
  start_date: "2026-10-01",
  end_date: null,
  areas: [],
  is_favorite: false,
  permissions: { manage: true, create_tasks: true },
  task_states: {
    states,
    available_states: states,
    revision: "1",
    can_configure: true,
  },
};
let tasks = [
  {
    id: 71,
    project_id: 7,
    parent_id: null,
    name: "Raíz regresión QA",
    description: "",
    state_code: "PENDIENTE",
    state_name: "PENDIENTE",
    state_category: "not_started",
    state_color: "#475569",
    priority: null,
    created_at: "2026-10-01T00:00:00Z",
    start_date: "2026-10-07",
    due_date: "2026-10-08",
    calendar_revision: "1",
    order_revision: "1",
    position: 0,
    responsible_id: null,
    responsible_name: null,
    labels: [],
    dependencies: [],
    transitions: [],
    permissions: {
      edit: true,
      state: true,
      assign: true,
      create_child: true,
      dependencies: true,
    },
  },
];
tasks.push({
  ...tasks[0],
  id: 72,
  parent_id: 71,
  name: "Subtarea regresión QA",
  due_date: null,
});
const writes = [];
await page.route("**/*", async (route) => {
  const req = route.request(),
    url = new URL(req.url()),
    p = url.pathname;
  if (!p.startsWith("/api/")) return route.continue();
  let body;
  if (p.includes("/auth/"))
    body = {
      access: "synthetic-local-test",
      user: {
        id: 1,
        name: "QA",
        role: "ADMINISTRADOR",
        areas: [],
        all_areas: true,
        permissions: { manage_accounts: true },
      },
    };
  else if (p === "/api/projects/7/tasks/" && req.method() === "GET")
    body = tasks;
  else if (p === "/api/projects/7/tasks/71/" && req.method() === "PATCH") {
    writes.push(req.postDataJSON());
    tasks = tasks.map((t) =>
      t.id === 71 ? { ...t, ...req.postDataJSON() } : t,
    );
    body = tasks[0];
  } else if (p === "/api/projects/7/") body = project;
  else if (p === "/api/projects/catalogs/")
    body = { areas: [], states, priorities: [] };
  else if (p.includes("/areas/") || p === "/api/projects/")
    body = { results: [], next_cursor: null };
  else body = [];
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
});
try {
  await page.goto("http://localhost:5173/proyectos/7?vista=gantt");
  if (process.argv.includes("--before")) {
    await page
      .getByText("No se pudo mostrar Gantt. Vuelve a cargar la vista.")
      .waitFor();
    assert.equal(
      (await page.locator("[data-task-count]").innerText()).trim(),
      "0 tareas",
    );
    assert.ok(
      errors.some((e) =>
        e.includes("La edición requiere el espacio de trabajo del proyecto"),
      ),
    );
    console.log(
      "REPRODUCIDO: falta TaskSyncContext y contador 0 con API 200 y dos tareas",
    );
  } else {
    await page.locator(".gm-task-gantt .wx-gantt").waitFor();
    assert.equal(
      (await page.locator("[data-task-count]").innerText()).trim(),
      "2 tareas",
    );
    await page
      .getByRole("button", {
        name: "Abrir tarea Raíz regresión QA",
        exact: true,
      })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[name="name"]').waitFor();
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await dialog.waitFor({ state: "detached" });
    tasks = tasks.map((t) =>
      t.id === 71 ? { ...t, name: "Raíz actualizada QA" } : t,
    );
    await page
      .getByRole("button", { name: "Actualizar Gantt", exact: true })
      .click();
    await page
      .getByText("Raíz actualizada QA", { exact: true })
      .first()
      .waitFor();
    for (const view of ["Lista", "Tablero", "Gantt"]) {
      await page.getByRole("link", { name: view, exact: true }).click();
      await page
        .getByText("Raíz actualizada QA", { exact: true })
        .first()
        .waitFor();
      assert.equal(
        (await page.locator("[data-task-count]").innerText()).trim(),
        "2 tareas",
      );
    }
    assert.deepEqual(writes, []);
    await page.reload();
    await page.locator(".gm-task-gantt .wx-gantt").waitFor();
    await page
      .getByText("Raíz actualizada QA", { exact: true })
      .first()
      .waitFor();
    assert.deepEqual(errors, []);
    console.log(
      "APROBADO: montaje SVAR real, contador, detalle, actualización compartida, Gantt/List/Tablero y recarga. API sintética interceptada, sin escrituras backend.",
    );
  }
} catch (error) {
  console.error(errors);
  console.error((await page.locator("body").innerText()).slice(-2500));
  throw error;
} finally {
  await browser.close();
}
