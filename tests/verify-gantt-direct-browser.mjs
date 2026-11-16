import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import {
  chooseGanttPeriod,
  observeGanttCollections,
} from "./ganttBrowserControls.mjs";
const { chromium } = await import(
  pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE)
);
const qa = JSON.parse(fs.readFileSync(process.env.GM_QA_SECRETS_PATH, "utf8")),
  c = qa.direct;
assert.ok(c && process.env.GM_BROWSER_REPORT_DIR);
const out = process.env.GM_BROWSER_REPORT_DIR;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  timezoneId: "America/Lima",
});
page.setDefaultTimeout(12000);
const checks = [],
  writes = [],
  errors = [];
observeGanttCollections(page);
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  const path = new URL(request.url()).pathname;
  if (
    path.startsWith("/api/projects/") &&
    !["GET", "OPTIONS"].includes(request.method())
  )
    writes.push({
      path,
      method: request.method(),
      body: request.postDataJSON(),
    });
});
const path = (id) => `/api/projects/${c.project}/tasks/${id}/dependencies/`;
const taskPath = (id) => `projects/${c.project}/tasks/${id}/`;
const bar = (id) => page.locator(`[data-gantt-calendar-task="${id}"]`).first();
const connector = (id, side) =>
  page.locator(`[data-connector-task="${id}"][data-connector-side="${side}"]`);
const settle = () =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        globalThis.requestAnimationFrame(() =>
          globalThis.requestAnimationFrame(resolve),
        ),
      ),
  );
async function api(method, url, data) {
  return page.evaluate(
    async (args) => {
      const { httpClient } = await import("/src/core/api/httpClient.ts");
      try {
        const r = await httpClient.request(args);
        return { status: r.status, data: r.data };
      } catch (e) {
        return { status: e.status, data: e.payload };
      }
    },
    { method, url, data },
  );
}
async function task(id) {
  const r = await api("get", taskPath(id));
  assert.equal(r.status, 200);
  return r.data.task;
}
async function ready() {
  await page.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor();
  await chooseGanttPeriod(page, "month");
  await level(5);
  await settle();
}
async function step(name, action) {
  if (
    process.env.GM_DIRECT_CASE &&
    !name.startsWith(process.env.GM_DIRECT_CASE)
  )
    return;
  await action();
  checks.push(name);
  console.log("PASS " + name);
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
  assert.fail("zoom");
}
async function point(id, side, hover = false) {
  if (hover) {
    const r = await bar(id).boundingBox();
    assert.ok(r);
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await settle();
  }
  const r = await connector(id, side).boundingBox();
  assert.ok(r, `Connector ${id} ${side}`);
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}
async function drag(target, origin, destination, expected, body = false) {
  const a = await point(c.source, origin, true);
  const r = body ? await bar(target).boundingBox() : null;
  const b = body
    ? { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    : await point(target, destination);
  const count = writes.length;
  await page.mouse.move(a.x, a.y);
  await settle();
  await page.mouse.down();
  await page.mouse.move(a.x + 8, a.y + 2);
  await page.locator(".gm-gantt-link-preview").waitFor();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  assert.equal(writes.length, count);
  const waiting = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === path(target) &&
      r.request().method() === "POST",
  );
  await page.mouse.up();
  const response = await waiting;
  assert.equal(response.status(), 201, await response.text());
  await page.locator(`[data-gantt-link="${c.source}:${target}"]`).waitFor();
  assert.equal(writes.length, count + 1);
  assert.equal(writes.at(-1).body.predecessor_id, c.source);
  assert.equal(writes.at(-1).body.dependency_type, expected);
  assert.equal(
    (await task(target)).dependency_links.find(
      (l) => l.predecessor_id === c.source,
    )?.type,
    expected,
  );
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(await page.locator(".gm-gantt-link-preview").count(), 0);
}
async function remove(target) {
  const edge = page.locator(`[data-gantt-link="${c.source}:${target}"]`);
  await edge.focus();
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === path(target) &&
      r.request().method() === "DELETE",
  );
  await page.locator(`[data-remove-link="${c.source}:${target}"]`).click();
  assert.equal((await response).status(), 204);
  await page.getByRole("button", { name: "Deshacer", exact: true }).waitFor();
  assert.equal(await edge.count(), 0);
}
async function reveal(id) {
  const chart = page.locator(".gm-task-gantt .wx-chart"),
    vertical = page.locator(".gm-task-gantt .wx-chart");
  const surface = await chart.boundingBox();
  await page.mouse.move(surface.x + 30, surface.y + 100);
  await page.mouse.wheel(0, -5000);
  await settle();
  for (let step = 0; step < 30; step++) {
    const visible = await page.evaluate((id) => {
      const row = globalThis.document
          .querySelector(`[data-gantt-tree-id="${id}"]`)
          ?.getBoundingClientRect(),
        chart = globalThis.document
          .querySelector(".gm-task-gantt .wx-chart")
          .getBoundingClientRect();
      return row && row.y >= chart.y + 56 && row.bottom <= chart.bottom;
    }, id);
    if (visible) return;
    const previous = await vertical.evaluate((n) => n.scrollTop);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(50);
    await settle();
    if ((await vertical.evaluate((n) => n.scrollTop)) === previous) break;
  }
  assert.fail(`Visible row ${id}`);
}
async function program(id) {
  await reveal(id);
  const before = await task(id),
    name = await page.locator(`[data-gantt-tree-id="${id}"]`).boundingBox(),
    chart = await page.locator(".gm-task-gantt .wx-chart").boundingBox();
  assert.ok(name && chart);
  const y = name.y + name.height / 2,
    x = chart.x + chart.width / 2;
  const count = writes.length;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 110, y, { steps: 8 });
  const waiting = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/" + taskPath(id) &&
      r.request().method() === "PATCH",
  );
  await page.mouse.up();
  const response = await waiting;
  assert.equal(response.status(), 200, await response.text());
  await settle();
  const after = await task(id);
  assert.ok(after.start_date && after.due_date);
  assert.equal(writes.length, count + 1);
  assert.equal(writes.at(-1).path, "/api/" + taskPath(id));
  assert.equal(after.state_code, before.state_code);
  assert.equal(after.parent_id, before.parent_id);
  assert.deepEqual(after.execution, before.execution);
  return after;
}
async function alignment() {
  const rows = await page.evaluate(() =>
    [...globalThis.document.querySelectorAll("[data-gantt-tree-id]")].map(
      (n) => {
        const id = Number(n.dataset.ganttTreeId),
          name = n.getBoundingClientRect();
        const b = [
          ...globalThis.document.querySelectorAll(
            `[data-gantt-calendar-task="${id}"]`,
          ),
        ]
          .map((n) => n.getBoundingClientRect())
          .find((r) => r.height > 0);
        const external = globalThis.document
          .querySelector(`[aria-label="Abrir detalle de ${n.innerText}"]`)
          ?.getBoundingClientRect();
        return {
          id,
          name: n.innerText,
          y: name.y + name.height / 2,
          barY: b ? b.y + b.height / 2 : null,
          labelY: external ? external.y + external.height / 2 : null,
        };
      },
    ),
  );
  for (const row of rows.filter((r) => r.barY !== null))
    assert.ok(Math.abs(row.y - row.barY) <= 1, JSON.stringify(row));
  return rows;
}
try {
  await page.goto(`http://localhost:5189/proyectos/${c.project}?vista=gantt`);
  await page.getByLabel("Correo electrónico").fill(qa.admin.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(qa.admin.password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await ready();
  if (!process.env.GM_DIRECT_CASE) {
    for (const key of [
      "FS",
      "SS",
      "FF",
      "SF",
      "body",
      "adjust",
      "closed",
      "child",
    ]) {
      if ((await task(c[key])).dependencies.includes(c.source))
        await api("delete", taskPath(c[key]) + "dependencies/", {
          predecessor_id: c.source,
        });
    }
    for (const id of [c.unplanned, c.child, c.last]) {
      const current = await task(id);
      if (current.due_date)
        await api("patch", taskPath(id), {
          start_date: c.today,
          due_date: null,
          expected_calendar_revision: current.calendar_revision,
          calendar_intent_id: crypto.randomUUID(),
        });
    }
    await page.reload();
    await ready();
  }
  await step(
    "Cuatro tipos directos, cuerpo, ajuste temporal y estados históricos",
    async () => {
      await drag(c.FS, "end", "start", "FS");
      await drag(c.SS, "start", "start", "SS");
      await drag(c.FF, "end", "end", "FF");
      await drag(c.SF, "start", "end", "SF");
      await drag(c.body, "end", "start", "FF", true);
      await drag(c.adjust, "end", "start", "FF");
      await drag(c.closed, "end", "start", "FS");
      await page.reload();
      await ready();
      for (const [key, type] of [
        ["FS", "FS"],
        ["SS", "SS"],
        ["FF", "FF"],
        ["SF", "SF"],
        ["body", "FF"],
        ["adjust", "FF"],
        ["closed", "FS"],
      ])
        assert.equal(
          (await task(c[key])).dependency_links.find(
            (l) => l.predecessor_id === c.source,
          )?.type,
          type,
        );
      await page.screenshot({ path: out + "/direct-links.png" });
    },
  );
  await step(
    "Un ciclo queda fuera de elegibilidad sin modificar vínculos confirmados",
    async () => {
      const a = await point(c.SS, "start", true),
        b = await point(c.source, "start");
      const before = await task(c.source),
        count = writes.length;
      await page.mouse.move(a.x, a.y);
      await settle();
      await page.mouse.down();
      await page.mouse.move(a.x + 8, a.y);
      await page.mouse.move(b.x, b.y, { steps: 8 });
      assert.equal(await connector(c.source, "start").isDisabled(), true);
      await page.mouse.up();
      await settle();
      assert.equal(writes.length, count);
      assert.equal(await page.locator(".gm-gantt-link-preview").count(), 0);
      assert.equal(
        await page.locator(`[data-gantt-link="${c.SS}:${c.source}"]`).count(),
        0,
      );
      assert.deepEqual(
        (await task(c.source)).dependency_links,
        before.dependency_links,
      );
    },
  );
  await step(
    "Eliminación inmediata, Deshacer exacto y expiración silenciosa",
    async () => {
      await remove(c.FF);
      const count = writes.length;
      await page.getByRole("button", { name: "Deshacer", exact: true }).click();
      await page.locator(`[data-gantt-link="${c.source}:${c.FF}"]`).waitFor();
      assert.equal(writes.length, count + 1);
      assert.ok(writes.at(-1).body.undo_token);
      assert.equal(
        (await task(c.FF)).dependency_links.find(
          (l) => l.predecessor_id === c.source,
        )?.type,
        "FF",
      );
      await page.reload();
      await ready();
      assert.ok((await task(c.FF)).dependencies.includes(c.source));
      await remove(c.FS);
      await page
        .getByRole("status", { name: "Dependencia retirada" })
        .waitFor({ state: "detached", timeout: 13000 });
      await page.reload();
      await ready();
      assert.equal((await task(c.FS)).dependencies.includes(c.source), false);
    },
  );
  await step(
    "Programación de completada y subtarea de padre completado persiste sin cambiar estados ni jerarquía",
    async () => {
      await program(c.unplanned);
      await program(c.child);
      await drag(c.child, "end", "start", "FS", true);
      await page.reload();
      await ready();
      assert.ok((await task(c.unplanned)).due_date);
      assert.ok((await task(c.child)).due_date);
      assert.equal((await task(c.parent)).state_code, "COMPLETADA");
    },
  );
  await step(
    "Programación en última fila identifica tarea y alinea barra y etiqueta después de scroll",
    async () => {
      await program(c.last);
      const rows = await alignment();
      fs.writeFileSync(
        out + "/alignment-after.json",
        JSON.stringify(rows, null, 2),
      );
      await page.screenshot({ path: out + "/bottom-rows.png" });
      await page.reload();
      await ready();
      await reveal(c.last);
      await alignment();
    },
  );
  await step(
    "Alineación por ID en cinco temporalidades, extremos de zoom, filtros y jerarquía",
    async () => {
      const count = writes.length;
      for (const period of ["day", "week", "month", "quarter", "year"]) {
        await chooseGanttPeriod(page, period);
        for (const zoom of [1, 9]) {
          await level(zoom);
          await reveal(c.last);
          await alignment();
        }
      }
      await chooseGanttPeriod(page, "month");
      await level(5);
      await reveal(c.parent);
      await page
        .getByRole("button", {
          name: "Contraer subtareas de Padre completado",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", {
          name: "Expandir subtareas de Padre completado",
          exact: true,
        })
        .waitFor();
      await reveal(c.last);
      await alignment();
      await reveal(c.parent);
      await page
        .getByRole("button", {
          name: "Expandir subtareas de Padre completado",
          exact: true,
        })
        .click();
      await reveal(c.last);
      await alignment();
      await page
        .getByRole("button", { name: "Buscar tareas", exact: true })
        .click();
      const search = page.getByPlaceholder("Buscar tareas…");
      await search.fill("Fila inferior 29");
      await settle();
      await alignment();
      const name = await page
          .locator(`[data-gantt-tree-id="${c.last}"]`)
          .boundingBox(),
        b = await bar(c.last).boundingBox();
      assert.ok(Math.abs(name.y + name.height / 2 - b.y - b.height / 2) <= 1);
      await search.fill("");
      await page
        .getByRole("button", { name: "Buscar tareas", exact: true })
        .click();
      await settle();
      assert.equal(writes.length, count);
    },
  );
  await step(
    "Mover última barra filtrada escribe solo su ID y protección conserva navegación",
    async () => {
      await page
        .getByRole("button", { name: "Buscar tareas", exact: true })
        .click();
      await page.getByPlaceholder("Buscar tareas…").fill("Fila inferior 29");
      await settle();
      const before = await task(c.last),
        b = await bar(c.last).boundingBox(),
        count = writes.length;
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2 + 85, b.y + b.height / 2, {
        steps: 8,
      });
      const waiting = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === "/api/" + taskPath(c.last) &&
          r.request().method() === "PATCH",
      );
      await page.mouse.up();
      assert.equal((await waiting).status(), 200);
      await settle();
      const after = await task(c.last);
      assert.notEqual(after.start_date, before.start_date);
      assert.equal(after.parent_id, before.parent_id);
      assert.equal(writes.length, count + 1);
      await alignment();
      await page.getByRole("button", { name: /^Proteger vista:/ }).click();
      assert.equal(await page.locator("[data-connector-task]").count(), 0);
      assert.equal(await page.locator("[data-gantt-edit-task]").count(), 0);
      const protectedCount = writes.length;
      await chooseGanttPeriod(page, "year");
      await level(1);
      await page
        .getByRole("button", { name: "Siguiente", exact: true })
        .click();
      await chooseGanttPeriod(page, "month");
      await level(5);
      assert.equal(writes.length, protectedCount);
      await page.getByRole("button", { name: /^Vista protegida:/ }).click();
      await page
        .getByRole("button", { name: "Buscar tareas", exact: true })
        .click();
      await page.getByPlaceholder("Buscar tareas…").fill("");
    },
  );
  assert.deepEqual(errors, []);
} finally {
  fs.writeFileSync(
    out + "/browser-report.json",
    JSON.stringify({ checks, writes, errors }, null, 2),
  );
  await page.screenshot({ path: out + "/last-state.png" }).catch(() => {});
  await browser.close();
}
