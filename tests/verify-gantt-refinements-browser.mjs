import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { homedir } from "node:os";
import { showGanttRange } from "./ganttBrowserControls.mjs";
const { chromium } = await import(
  pathToFileURL(
    process.env.GM_PLAYWRIGHT_MODULE ||
      path.join(
        homedir(),
        ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
      ),
  ).href
);
const origin = process.env.GM_FRONTEND_ORIGIN || "http://localhost:5189";
const output =
  process.env.GM_BROWSER_REPORT_DIR ||
  "../docs/checkpoints/gantt-recuperacion-20261107/browser-" + Date.now();
await mkdir(output, { recursive: true });
const states = [
  {
    code: "PENDIENTE",
    name: "Pendiente",
    category: "not_started",
    tema_id: 1,
    tema: { id: 1, color: "sky-500", icono: "CircleDotIcon" },
  },
  {
    code: "COMPLETADA",
    name: "Cerrado",
    category: "closed",
    tema_id: 2,
    tema: { id: 2, color: "emerald-500", icono: "CheckIcon" },
  },
  {
    code: "BLOQUEADA",
    name: "Bloqueada",
    category: "active",
    tema_id: 3,
    tema: { id: 3, color: "red-500", icono: "circle-minus" },
  },
];
const project = {
  id: 7,
  name: "Recuperación de refinamientos QA",
  description: "QA",
  participants: [],
  requirements: [],
  start_date: "2026-10-01",
  end_date: "2026-12-31",
  areas: [],
  is_favorite: false,
  permissions: { manage: true, create_tasks: true },
  task_states: {
    states,
    available_states: states,
    revision: "s1",
    can_configure: true,
  },
};
const task = (id, name, parent = null, state = states[0], dates = {}) => ({
  id,
  parent_id: parent,
  name,
  description: "Conservar",
  state_code: state.code,
  state_name: state.name,
  state_category: state.category,
  state_tema_id: state.tema_id,
  state_tema: state.tema,
  priority: null,
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-01T10:00:00Z",
  start_date: "2026-11-01",
  due_date: "2026-11-30",
  calendar_revision: "9007199254740999",
  manual_position: String(id),
  move_revision: "r1",
  responsible_id: null,
  responsible_name: null,
  labels: [],
  dependencies: [],
  transitions: states.map((s) => ({ target: s.code, reason_required: false })),
  permissions: {
    edit: true,
    state: true,
    assign: true,
    create_child: state.category !== "closed",
    dependencies: parent === null,
    relations: true,
  },
  ...dates,
});
let tasks = [
  task(71, "Raíz azul QA"),
  task(72, "Hija roja sin límite QA", 71, states[2], { due_date: null }),
  task(75, "Nieto independiente QA", 72, states[1], { due_date: null }),
  task(73, "Raíz verde QA", null, states[1]),
  task(74, "Destino azul QA", null, states[0], {
    start_date: "2026-11-14",
    due_date: "2026-11-20",
    responsible_id: 5,
    responsible_name: "Persona QA",
  }),
  task(76, "Sin límite QA", null, states[0], { due_date: null }),
  task(77, "Un día QA", null, states[2], {
    start_date: "2026-11-08",
    due_date: "2026-11-08",
  }),
  task(78, "Fuera del intervalo QA", null, states[0], {
    start_date: "2028-01-01",
    due_date: "2028-02-01",
  }),
];
let next = 100,
  revision = 1,
  conflict = false,
  loseDelete = false,
  readOnly = false;
const writes = [],
  reads = [],
  errors = [],
  checks = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 1100 },
  timezoneId: "America/Lima",
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
page.on("pageerror", (e) => errors.push(e.stack));
await page.exposeFunction("recordWindowError", (message) =>
  errors.push(message),
);
await page.addInitScript(() => {
  globalThis.addEventListener("error", (event) => {
    void globalThis.recordWindowError(event.message);
  });
});
const persist = async () =>
  writeFile(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        checks,
        writes,
        reads,
        errors,
        backend: "intercepted synthetic API; no database access",
        browser: browser.version(),
      },
      null,
      2,
    ),
  );
async function check(name, fn) {
  await fn();
  checks.push({ name, result: "Aprobado" });
  console.log("OK " + name);
  await persist();
}
await context.route("**/*", async (route) => {
  const req = route.request(),
    p = new URL(req.url()).pathname,
    method = req.method();
  if (!p.startsWith("/api/")) return route.continue();
  const json = (body, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  if (p.includes("/auth/"))
    return json({
      access: "synthetic-qa",
      csrf_token: "synthetic-qa",
      user: {
        id: 1,
        name: "QA",
        role: readOnly ? "TRABAJADOR" : "ADMINISTRADOR",
        areas: [],
        all_areas: true,
        permissions: { manage_accounts: true },
      },
    });
  if (method === "GET") reads.push(p);
  else writes.push({ p, method, data: req.postDataJSON() });
  if (p === "/api/projects/catalogs/")
    return json({
      areas: [],
      states,
      priorities: [],
      creation_date: "2026-11-07",
    });
  if (p === "/api/projects/7/")
    return json(
      readOnly
        ? { ...project, permissions: { manage: false, create_tasks: false } }
        : project,
    );
  if (p === "/api/projects/7/tasks/") {
    if (method === "GET")
      return json(
        readOnly
          ? tasks.map((t) => ({
              ...t,
              permissions: {
                edit: false,
                state: false,
                assign: false,
                create_child: false,
                dependencies: false,
              },
            }))
          : tasks,
      );
    const data = req.postDataJSON();
    const created = task(
      next++,
      data.name,
      data.parent_id ?? null,
      states.find((s) => s.code === data.state_code) || states[0],
      { start_date: "2026-11-07", due_date: null, ...data },
    );
    tasks.push(created);
    return json(created, 201);
  }
  const related = /tasks\/(\d+)\/related-candidates\/$/.exec(p);
  if (related) {
    const q = new URL(req.url()).searchParams.get("q") ?? "";
    return json({
      items: tasks.filter(
        (t) =>
          t.parent_id === null &&
          t.id !== Number(related[1]) &&
          t.name.toLowerCase().includes(q.toLowerCase()),
      ),
      next_cursor: null,
    });
  }
  const relationships = /tasks\/(\d+)\/relations\/$/.exec(p);
  if (relationships && method === "GET") {
    const current = tasks.find((t) => t.id === Number(relationships[1]));
    return json({
      items: (current?.dependencies ?? []).map((id) => ({
        id: `dep:${id}:${current.id}`,
        kind: "blocked_by",
        name: "",
        target_id: id,
        target_name: tasks.find((t) => t.id === id).name,
        predecessor_id: id,
        successor_id: current.id,
      })),
      next_cursor: null,
    });
  }
  if (
    method === "GET" &&
    /tasks\/\d+\/(subtasks|activity|relations)\/$/.test(p)
  )
    return json({ items: [], next_cursor: null, total: 0, completed: 0 });
  const match =
    /^\/api\/projects\/7\/tasks\/(\d+)\/(move\/|dependencies\/|state\/)?$/.exec(
      p,
    );
  if (match) {
    const id = Number(match[1]),
      data = method === "GET" ? {} : req.postDataJSON();
    let t = tasks.find((t) => t.id === id);
    assert.ok(t);
    if (match[2] === "state/") {
      const state = states.find((state) => state.code === data.state_code);
      assert.ok(state);
      Object.assign(t, {
        state_code: state.code,
        state_name: state.name,
        state_category: state.category,
        state_tema: state.tema,
        state_tema_id: state.tema_id,
      });
      return json(t);
    }
    if (match[2] === "dependencies/") {
      const source = data.predecessor_id;
      t.dependencies =
        method === "DELETE"
          ? t.dependencies.filter((id) => id !== source)
          : [...t.dependencies, source];
      if (loseDelete && method === "DELETE") {
        loseDelete = false;
        return route.abort("failed");
      }
      return method === "DELETE"
        ? route.fulfill({ status: 204 })
        : json({}, 201);
    }
    if (match[2] === "move/") {
      assert.equal(data.state_code, t.state_code);
      assert.equal(data.mode, "hierarchy");
      assert.equal(data.expected_revision, t.move_revision);
      assert.ok("parent_id" in data);
      t.parent_id = data.parent_id;
      tasks = tasks.filter((item) => item.id !== id);
      const anchor =
        data.before_id === null
          ? tasks.length
          : tasks.findIndex((item) => item.id === data.before_id);
      tasks.splice(anchor, 0, t);
      tasks.forEach((item, index) => {
        item.manual_position = String(index);
        item.move_revision = "r" + ++revision;
      });
      return json(tasks);
    }
    if (method === "GET")
      return json({
        task: readOnly
          ? {
              ...t,
              permissions: {
                edit: false,
                state: false,
                assign: false,
                create_child: false,
                dependencies: false,
                relations: false,
              },
            }
          : t,
        parent: tasks.find((item) => item.id === t.parent_id) ?? null,
      });
    if (method === "PATCH") {
      if ("start_date" in data || "due_date" in data) {
        assert.equal(typeof data.expected_calendar_revision, "string");
        assert.match(data.calendar_intent_id, /^[a-f\d-]{36}$/);
        if (
          conflict ||
          data.expected_calendar_revision !== t.calendar_revision
        ) {
          conflict = false;
          return json({ code: "calendar_revision_conflict" }, 409);
        }
        t.calendar_revision = String(BigInt(t.calendar_revision) + 1n);
      }
      const { expected_calendar_revision, calendar_intent_id, ...fields } =
        data;
      void expected_calendar_revision;
      void calendar_intent_id;
      Object.assign(t, fields);
      return json(t);
    }
  }
  if (p.includes("/areas/") || p === "/api/projects/")
    return json({ results: [], next_cursor: null });
  return json([]);
});
const bar = (id) => page.locator(`[data-gantt-calendar-task='${id}']`),
  marker = (id) => page.locator(`[data-gantt-missing-dates='${id}']`),
  connector = (id, side = "end") =>
    page.locator(
      `[data-connector-task='${id}'][data-connector-side='${side}']`,
    ),
  modal = () => page.getByRole("dialog");
async function ganttFilter(page, criterion, value) {
  const dialog = page.getByRole("dialog", {
    name: "Filtros de Gantt",
    exact: true,
  });
  if (!(await dialog.count()))
    await page.getByRole("button", { name: /^Filtros de Gantt:/ }).click();
  await dialog.getByLabel(criterion, { exact: true }).selectOption(value);
}
async function load() {
  await page.goto(origin + "/proyectos/7?vista=gantt");
  await page.locator(".gm-task-gantt .wx-gantt").waitFor();
  await showGanttRange(page, "2026-10-25", "2026-12-05");
}
async function connect(source, target, cancel = false) {
  await connector(source).focus();
  const a = await connector(source).boundingBox(),
    b = await bar(target).boundingBox();
  assert.ok(a && b);
  await page.mouse.move(a.x + 12, a.y + 12);
  await page.mouse.down();
  await page.mouse.move(b.x + Math.min(30, b.width / 2), b.y + b.height / 2, {
    steps: 10,
  });
  if (cancel) await page.keyboard.press("Escape");
  await page.mouse.up();
  if (!cancel) await modal().waitFor();
}
async function remove(source, target) {
  await page.locator(`[data-gantt-link='${source}:${target}']`).focus();
  await page.locator(`[data-remove-link='${source}:${target}']`).click();
  await modal()
    .getByRole("button", { name: "Retirar dependencia", exact: true })
    .click();
  return page
    .getByRole("status", { name: "Dependencia retirada", exact: true })
    .last();
}
try {
  await check("Montaje y temas reales del contrato actual", async () => {
    await load();
    assert.equal(
      (await page.locator("[data-task-count]").innerText()).trim(),
      "8 tareas",
    );
    assert.equal(
      await page
        .getByRole("region", { name: "Acciones de la tarea seleccionada" })
        .count(),
      0,
    );
    const colors = await Promise.all(
      [71, 73, 77].map((id) =>
        bar(id).evaluate((n) => globalThis.getComputedStyle(n).backgroundColor),
      ),
    );
    assert.equal(new Set(colors).size, 3);
    assert.ok(colors.every((c) => c !== "rgba(0, 0, 0, 0)"));
    assert.equal(
      await page.locator('[aria-label="Resumen del proyecto"]').count(),
      1,
    );
    assert.ok(
      (
        await page.locator('[aria-label="Resumen del proyecto"]').innerText()
      ).includes("25"),
    );
    assert.equal(await marker(78).count(), 0);
    await page.screenshot({
      path: path.join(output, "temas-claro.png"),
      fullPage: true,
    });
  });
  await check(
    "Acciones fijas, renombrado mínimo y formulario compartido seguro",
    async () => {
      await page
        .getByRole("button", {
          name: "Cambiar nombre de Raíz azul QA",
          exact: true,
        })
        .click();
      await modal()
        .getByLabel("Nombre", { exact: true })
        .fill("Raíz azul renombrada QA");
      await modal()
        .getByRole("button", { name: "Guardar", exact: true })
        .click();
      await modal().waitFor({ state: "detached" });
      assert.deepEqual(writes.at(-1).data, { name: "Raíz azul renombrada QA" });
      await page
        .getByRole("button", {
          name: "Abrir tarea Raíz azul renombrada QA",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Editar datos", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Editar datos de tarea", exact: true })
        .locator('input[name="name"]')
        .fill("Raíz azul QA");
      await page
        .getByRole("dialog", { name: "Editar datos de tarea", exact: true })
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Editar datos de tarea", exact: true })
        .waitFor({ state: "detached" });
      await page
        .getByRole("button", { name: "Cerrar modal", exact: true })
        .click();
      await modal().waitFor({ state: "detached" });
      assert.deepEqual(writes.at(-1).data, { name: "Raíz azul QA" });
    },
  );
  await check("Crear bajo el padre exacto y pie dentro del árbol", async () => {
    await page
      .getByRole("button", {
        name: "Crear subtarea de Hija roja sin límite QA",
        exact: true,
      })
      .click();
    await modal().getByLabel("Nombre", { exact: true }).fill("Nueva nieta QA");
    await modal().getByRole("button", { name: "Crear", exact: true }).click();
    await modal().waitFor({ state: "detached" });
    assert.equal(tasks.at(-1).parent_id, 72);
    await page
      .getByRole("button", { name: "Abrir tarea Nueva nieta QA", exact: true })
      .waitFor();
    await page
      .locator(".gm-task-gantt")
      .getByRole("button", { name: "+ Agregar tarea", exact: true })
      .click();
    await modal().getByLabel("Nombre", { exact: true }).fill("Nueva raíz QA");
    await modal().getByRole("button", { name: "Crear", exact: true }).click();
    await modal().waitFor({ state: "detached" });
    assert.equal(tasks.at(-1).parent_id, null);
  });
  await check(
    "Filtros combinados conservan ancestros, búsqueda y avance global",
    async () => {
      const count = writes.length,
        readCount = reads.length,
        summary = await page
          .locator('[aria-label="Resumen del proyecto"]')
          .innerText();
      await page
        .getByRole("button", { name: "Buscar tareas", exact: true })
        .click();
      await page
        .getByRole("searchbox", { name: "Buscar tareas", exact: true })
        .fill("Hija roja");
      await ganttFilter(page, "Estado", "BLOQUEADA");
      await ganttFilter(page, "Persona", "none");
      await ganttFilter(page, "Fecha", "undated");
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", {
          name: "Abrir tarea Hija roja sin límite QA",
          exact: true,
        })
        .waitFor();
      await page
        .getByRole("button", { name: "Abrir tarea Raíz azul QA", exact: true })
        .waitFor();
      assert.equal(
        await page.locator('[aria-label="Resumen del proyecto"]').innerText(),
        summary,
      );
      await ganttFilter(page, "Estado", "PENDIENTE");
      await page.keyboard.press("Escape");
      await page
        .getByText("No hay tareas que coincidan con los filtros.", {
          exact: true,
        })
        .waitFor();
      await page.getByRole("button", { name: /^Filtros de Gantt:/ }).click();
      await page
        .getByRole("button", { name: "Limpiar filtros", exact: true })
        .click();
      await page.keyboard.press("Escape");
      assert.equal(
        await page
          .getByRole("searchbox", { name: "Buscar tareas", exact: true })
          .inputValue(),
        "Hija roja",
      );
      await page
        .getByRole("searchbox", { name: "Buscar tareas", exact: true })
        .fill("");
      await page
        .getByRole("button", { name: "Abrir tarea Un día QA", exact: true })
        .waitFor();
      assert.equal(writes.length, count);
      assert.equal(reads.length, readCount);
    },
  );
  await check(
    "Escudo desde barras, cancelación inmediata y cero escrituras",
    async () => {
      const count = writes.length;
      await page
        .getByRole("button", { name: "Proteger vista", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "Proteger vista", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(await page.locator("[data-connector-task]").count(), 0);
      assert.ok(await marker(76).isDisabled());
      for (let i = 0; i < 2; i++) {
        const a = await bar(71).boundingBox();
        await page.mouse.move(a.x + 50, a.y + 10);
        await page.mouse.down();
        await page.mouse.move(a.x + 110, a.y + 10, { steps: 8 });
        await page.keyboard.press("Escape");
        await page.mouse.up();
      }
      await page.mouse.wheel(0, 120);
      assert.equal(writes.length, count);
      await page
        .getByRole("button", { name: "Proteger vista", exact: true })
        .click();
      await showGanttRange(page, "2026-10-25", "2026-12-05");
    },
  );
  await check(
    "Calendario nullable, cancelación, conflicto y reaplicación explícita",
    async () => {
      const count = writes.length;
      await marker(76).click();
      assert.equal(
        await modal().getByLabel("Fecha límite", { exact: true }).inputValue(),
        "",
      );
      await page.keyboard.press("Escape");
      assert.equal(writes.length, count);
      await marker(76).click();
      await modal()
        .getByLabel("Fecha límite", { exact: true })
        .fill("2026-11-15");
      conflict = true;
      await modal()
        .getByRole("button", { name: "Guardar", exact: true })
        .click();
      await modal()
        .getByRole("button", { name: "Consultar fechas vigentes", exact: true })
        .waitFor();
      assert.equal(
        await modal().getByLabel("Fecha límite", { exact: true }).inputValue(),
        "2026-11-15",
      );
      await modal()
        .getByRole("button", { name: "Consultar fechas vigentes", exact: true })
        .click();
      await modal()
        .getByRole("button", {
          name: "Preparar nueva intención sobre esta revisión",
          exact: true,
        })
        .click();
      await modal()
        .getByRole("button", { name: "Guardar", exact: true })
        .click();
      await modal().waitFor({ state: "detached" });
      assert.equal(tasks.find((t) => t.id === 76).due_date, "2026-11-15");
      await marker(76).waitFor({ state: "detached" });
      assert.deepEqual(Object.keys(writes.at(-1).data).sort(), [
        "calendar_intent_id",
        "due_date",
        "expected_calendar_revision",
      ]);
    },
  );
  await check(
    "Arrastre y resize reales guardan una intención y conservan el día inclusivo",
    async () => {
      await showGanttRange(page, "2026-11-07", "2026-11-12");
      const original = structuredClone(tasks),
        count = writes.length;
      async function gesture(mode, cancel = false) {
        const box = await bar(77).boundingBox();
        assert.ok(box.width > 32);
        const handle =
          mode === "move"
            ? bar(77)
            : bar(77).locator('[data-gantt-calendar-mode="end"]');
        const bounds = await handle.boundingBox();
        const x = bounds.x + bounds.width / 2,
          y = bounds.y + bounds.height / 2;
        const dx = box.width + 1;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + dx, y, { steps: 12 });
        if (cancel) await page.keyboard.press("Escape");
        await page.mouse.up();
      }
      await gesture("move", true);
      await gesture("move", true);
      assert.equal(writes.length, count);
      let response = page.waitForResponse(
        (r) =>
          r.request().method() === "PATCH" && r.url().includes("/tasks/77/"),
      );
      await gesture("move");
      await response;
      await page.waitForFunction(
        () =>
          !globalThis.document
            .querySelector('[data-gantt-calendar-task="77"]')
            ?.hasAttribute("data-calendar-pending"),
      );
      assert.equal(writes.length, count + 1);
      const moved = structuredClone(tasks.find((t) => t.id === 77));
      assert.equal(moved.start_date, moved.due_date);
      assert.notEqual(moved.start_date, "2026-11-08");
      response = page.waitForResponse(
        (r) =>
          r.request().method() === "PATCH" && r.url().includes("/tasks/77/"),
      );
      await gesture("end");
      await response;
      await page.waitForFunction(
        () =>
          !globalThis.document
            .querySelector('[data-gantt-calendar-task="77"]')
            ?.hasAttribute("data-calendar-pending"),
      );
      assert.equal(writes.length, count + 2);
      assert.equal(tasks.find((t) => t.id === 77).start_date, moved.start_date);
      assert.notEqual(tasks.find((t) => t.id === 77).due_date, moved.due_date);
      for (const other of original.filter((t) => t.id !== 77))
        assert.deepEqual(
          tasks.find((t) => t.id === other.id),
          other,
        );
      assert.equal(await modal().count(), 0);
      await showGanttRange(page, "2026-10-25", "2026-12-05");
    },
  );
  await check(
    "Conectores reales, cancelar y confirmar una operación",
    async () => {
      assert.equal(await connector(72).count(), 0);
      assert.equal(await connector(78).count(), 0);
      assert.equal(await page.locator("[data-neutral-anchor]").count(), 0);
      const count = writes.length;
      await connect(71, 74, true);
      assert.equal(writes.length, count);
      await connect(71, 74);
      await modal()
        .getByRole("button", { name: "Confirmar vínculo", exact: true })
        .click();
      await modal().waitFor({ state: "detached" });
      assert.deepEqual(tasks.find((t) => t.id === 74).dependencies, [71]);
    },
  );
  await check(
    "Retirar y deshacer exacto con doble clic y caducidad real",
    async () => {
      let notice = await remove(71, 74);
      await notice
        .getByRole("button", { name: "Deshacer", exact: true })
        .dblclick();
      await notice.waitFor({ state: "detached" });
      assert.deepEqual(tasks.find((t) => t.id === 74).dependencies, [71]);
      notice = await remove(71, 74);
      const count = writes.length;
      await notice
        .getByText("El plazo para deshacer finalizó.", { exact: true })
        .waitFor({ timeout: 15000 });
      assert.equal(writes.length, count);
      await notice
        .getByRole("button", { name: "Cerrar aviso de dependencia" })
        .click();
    },
  );
  await check(
    "Orden jerárquico por teclado conserva calendario y estado",
    async () => {
      const before = structuredClone(tasks.find((t) => t.id === 72));
      await page
        .getByRole("button", {
          name: "Abrir tarea Hija roja sin límite QA",
          exact: true,
        })
        .focus();
      await page.keyboard.press("Shift+F10");
      await modal().getByRole("combobox").first().selectOption("74");
      await modal().getByRole("button", { name: "Mover", exact: true }).click();
      await modal().waitFor({ state: "detached" });
      await page.waitForFunction(
        () => !globalThis.document.body.textContent.includes("Guardando orden"),
      );
      const changed = tasks.find((t) => t.id === 72);
      assert.equal(changed.parent_id, 74);
      assert.equal(changed.state_code, before.state_code);
      assert.equal(changed.start_date, before.start_date);
      assert.equal(changed.due_date, before.due_date);
      assert.equal(tasks.find((t) => t.id === 75).parent_id, 72);
    },
  );
  await check(
    "Arrastre jerárquico real y reinicio inmediato después de Escape",
    async () => {
      const count = writes.length;
      const source = page.getByRole("button", {
          name: "Abrir tarea Raíz azul QA",
          exact: true,
        }),
        target = page.getByRole("button", {
          name: "Abrir tarea Destino azul QA",
          exact: true,
        });
      for (let attempt = 0; attempt < 2; attempt++) {
        const a = await source.boundingBox(),
          b = await target.boundingBox();
        await page.mouse.move(a.x + 20, a.y + a.height / 2);
        await page.mouse.down();
        await page.mouse.move(b.x + 20, b.y + b.height - 2, { steps: 12 });
        assert.equal(await page.locator("[data-task-preview]").count(), 1);
        assert.equal(
          await page.locator("[data-task-preview] button").count(),
          0,
        );
        await page.keyboard.press("Escape");
        await page.mouse.up();
        assert.equal(await page.locator("[data-task-preview]").count(), 0);
      }
      assert.equal(writes.length, count);
      const a = await source.boundingBox(),
        b = await target.boundingBox();
      await page.mouse.move(a.x + 20, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + 20, b.y + b.height - 2, { steps: 12 });
      await page.mouse.up();
      await page.waitForFunction(
        () => !globalThis.document.body.textContent.includes("Guardando orden"),
      );
      assert.equal(writes.length, count + 1);
      assert.equal(writes.at(-1).data.mode, "hierarchy");
      assert.equal(writes.at(-1).data.parent_id, null);
    },
  );
  await check(
    "Borrado ambiguo consulta antes de ofrecer deshacer",
    async () => {
      await connect(71, 74);
      await modal()
        .getByRole("button", { name: "Confirmar vínculo", exact: true })
        .click();
      await modal().waitFor({ state: "detached" });
      loseDelete = true;
      await page.locator(`[data-gantt-link='71:74']`).focus();
      await page.locator(`[data-remove-link='71:74']`).click();
      await modal()
        .getByRole("button", { name: "Retirar dependencia", exact: true })
        .click();
      await modal()
        .getByRole("button", { name: "Consultar resultado", exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByRole("status", { name: "Dependencia retirada", exact: true })
          .count(),
        0,
      );
      await modal()
        .getByRole("button", { name: "Consultar resultado", exact: true })
        .click();
      const notice = page.getByRole("status", {
        name: "Dependencia retirada",
        exact: true,
      });
      await notice.waitFor();
      await notice
        .getByRole("button", { name: "Deshacer", exact: true })
        .click();
      await notice.waitFor({ state: "detached" });
    },
  );
  await check(
    "Temas, filtros, anchos y sincronización con Lista y Tablero",
    async () => {
      for (const theme of ["light", "dark"]) {
        await page.evaluate((t) => {
          localStorage.setItem("theme", t);
          globalThis.document.documentElement.classList.toggle(
            "dark",
            t === "dark",
          );
        }, theme);
        for (const width of [1600, 768]) {
          await page.setViewportSize({ width, height: 1100 });
          await page.screenshot({
            path: path.join(output, theme + "-" + width + ".png"),
            fullPage: true,
          });
        }
      }
      await page.setViewportSize({ width: 1600, height: 1100 });
      for (const name of ["Lista", "Tablero", "Gantt"]) {
        await page.getByRole("link", { name, exact: true }).click();
        await page.getByText("Raíz azul QA", { exact: true }).first().waitFor();
      }
      await page.reload();
      await page.locator(".gm-task-gantt .wx-gantt").waitFor();
      assert.equal(tasks.find((t) => t.id === 72).parent_id, 74);
      assert.equal(
        (await page.locator("[data-task-count]").innerText()).trim(),
        "10 tareas",
      );
      assert.deepEqual(errors, []);
    },
  );
  await check(
    "Estado y dependencias siguen accesibles desde una tarea sin barra",
    async () => {
      const root = tasks.find((task) => task.name === "Nueva raíz QA"),
        before = structuredClone(tasks);
      assert.equal(root.due_date, null);
      await page
        .getByRole("button", { name: "Abrir tarea Nueva raíz QA", exact: true })
        .click();
      await modal()
        .getByRole("button", { name: /^Estado:/ })
        .click();
      await page
        .locator("[popover]:popover-open")
        .getByRole("button", { name: "Cerrado", exact: true })
        .click();
      await page
        .locator("[popover]:popover-open")
        .getByRole("button", { name: "Guardar", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Cerrar modal", exact: true })
        .click();
      await modal().waitFor({ state: "detached" });
      assert.equal(
        tasks.find((task) => task.id === root.id).state_code,
        "COMPLETADA",
      );
      assert.deepEqual(writes.at(-1).data, { state_code: "COMPLETADA" });
      await page
        .getByRole("button", { name: "Abrir tarea Nueva raíz QA", exact: true })
        .click();
      await modal()
        .getByRole("button", {
          name: /^Relacionar elementos o añadir dependencias:/,
        })
        .click();
      await page
        .locator("[popover]:popover-open")
        .getByRole("button", {
          name: "Esta tarea está bloqueada por...",
          exact: true,
        })
        .click();
      await page
        .locator("[popover]:popover-open")
        .getByRole("button", { name: "Vincular Raíz azul QA", exact: true })
        .click();
      await page.locator("[popover]:popover-open").waitFor({ state: "hidden" });
      await modal().getByText("Está bloqueada por", { exact: true }).waitFor();
      await page
        .getByRole("button", { name: "Cerrar modal", exact: true })
        .click();
      assert.deepEqual(
        tasks.find((task) => task.id === root.id).dependencies,
        [71],
      );
      assert.equal(tasks.find((task) => task.id === root.id).due_date, null);
      for (const other of before.filter((task) => task.id !== root.id))
        assert.deepEqual(
          tasks.find((task) => task.id === other.id),
          other,
        );
      await page.reload();
      await page.locator(".gm-task-gantt .wx-gantt").waitFor();
      await page
        .getByRole("button", { name: "Abrir tarea Nueva raíz QA", exact: true })
        .waitFor();
      assert.equal(await bar(root.id).isVisible(), false);
      assert.ok(await marker(root.id).count());
    },
  );
  await check(
    "2000 filas mantienen virtualización, pie en flujo y scroll sincronizado",
    async () => {
      tasks = Array.from({ length: 2000 }, (_, i) =>
        task(1000 + i, "Volumen QA " + i),
      );
      const count = writes.length,
        readCount = reads.length;
      await page.reload();
      await page.locator(".gm-task-gantt .wx-gantt").waitFor();
      await showGanttRange(page, "2026-10-25", "2026-12-05");
      assert.equal(
        (await page.locator("[data-task-count]").innerText()).trim(),
        "2000 tareas",
      );
      assert.ok(
        (await page.locator(".gm-task-gantt .wx-table .wx-row").count()) < 100,
      );
      await page
        .getByRole("button", { name: "Proteger vista", exact: true })
        .click();
      const chart = await page
        .locator(".gm-task-gantt .wx-chart")
        .boundingBox();
      await page.mouse.move(
        chart.x + chart.width / 2,
        chart.y + chart.height / 2,
      );
      await page.mouse.wheel(0, 100000);
      const end = page.getByRole("button", {
        name: "Abrir tarea Volumen QA 1999",
        exact: true,
      });
      await end.waitFor();
      const row = await end.boundingBox(),
        timeline = await bar(2999).boundingBox();
      assert.ok(
        Math.abs(row.y + row.height / 2 - timeline.y - timeline.height / 2) < 3,
      );
      assert.ok(
        (await page.locator(".gm-task-gantt .wx-table .wx-row").count()) < 100,
      );
      const footer = page
        .locator(".gm-task-gantt")
        .getByRole("button", { name: "+ Agregar tarea", exact: true });
      await footer.click();
      await modal().getByLabel("Nombre", { exact: true }).waitFor();
      await page.keyboard.press("Escape");
      assert.equal(writes.length, count);
      const loads = reads.slice(readCount);
      assert.equal(
        loads.filter((p) => p === "/api/projects/7/tasks/").length,
        1,
      );
      assert.equal(loads.filter((p) => /tasks\/\d+/.test(p)).length, 0);
      await page.screenshot({
        path: path.join(output, "2000-filas.png"),
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Proteger vista", exact: true })
        .click();
      assert.deepEqual(errors, []);
    },
  );
  await check(
    "Solo lectura conserva consulta y protección sin controles de escritura",
    async () => {
      readOnly = true;
      const count = writes.length;
      await page.reload();
      await page.locator(".gm-task-gantt .wx-gantt").waitFor();
      assert.equal(
        await page.getByRole("button", { name: /^Crear subtarea de/ }).count(),
        0,
      );
      assert.equal(
        await page.getByRole("button", { name: /^Cambiar nombre de/ }).count(),
        0,
      );
      assert.equal(
        await page
          .getByRole("button", { name: "+ Agregar tarea", exact: true })
          .count(),
        0,
      );
      assert.equal(
        await page.locator('[data-calendar-editable="true"]').count(),
        0,
      );
      assert.equal(await page.locator("[data-connector-task]").count(), 0);
      await page
        .getByRole("button", { name: "Abrir tarea Volumen QA 0", exact: true })
        .click();
      await modal().waitFor();
      assert.equal(await modal().getByRole("textbox").count(), 0);
      assert.equal(
        await modal()
          .getByRole("button", {
            name: /Guardar|Cambiar estado|Gestionar dependencias/,
          })
          .count(),
        0,
      );
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", { name: "Proteger vista", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "Proteger vista", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      await page
        .getByRole("button", { name: "Proteger vista", exact: true })
        .click();
      assert.equal(writes.length, count);
      assert.deepEqual(errors, []);
    },
  );
  await persist();
} catch (error) {
  await page.screenshot({
    path: path.join(output, "failure.png"),
    fullPage: true,
  });
  await persist();
  console.error(errors);
  throw error;
} finally {
  await context.close();
  await browser.close();
}
