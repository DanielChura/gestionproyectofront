import assert from "node:assert/strict";

const collections = new WeakMap();
export function observeGanttCollections(page) {
  const state = { tasks: [], project: null };
  collections.set(page, state);
  page.on("response", async response => {
    const path = new URL(response.url()).pathname;
    const method = response.request().method();
    if (!["GET", "PATCH", "POST"].includes(method) || ![200, 201].includes(response.status())) return;
    const match = /^\/api\/projects\/(\d+)\/tasks\/$/.exec(path);
    if (match) {
      const tasks = await response.json().catch(() => null);
      const current = /\/proyectos\/(\d+)/.exec(new URL(page.url()).pathname);
      if (Array.isArray(tasks) && current?.[1] === match[1]) { state.tasks = tasks; state.project = Number(match[1]); }
      else if (method === "POST" && tasks?.id && current?.[1] === match[1]) state.tasks = [...state.tasks.filter(task => task.id !== tasks.id), tasks];
    } else if (/\/tasks\/\d+\/(state\/)?$/.test(path)) {
      const body = await response.json().catch(() => null);
      const task = method === "GET" ? body?.task : body;
      if (task?.id) state.tasks = state.tasks.map(current => current.id === task.id ? task : current);
    }
  });
}
export const currentGanttTasks = page => collections.get(page)?.tasks ?? [];
export const waitGantt = page => page.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor();
export async function chooseGanttPeriod(page, scale) {
  const names = { day: "Día", week: "Semana", month: "Mes", quarter: "Trimestre", year: "Año", flexible: "Flexible" };
  await page.getByRole("button", { name: /^Periodo de Gantt:/ }).click();
  await page.getByRole("menuitemradio", { name: names[scale] ?? scale, exact: true }).click();
}
export async function flexibleGanttRange(page, first, last) {
  await chooseGanttPeriod(page, "flexible");
  await page.getByLabel("Inicio del intervalo", { exact: true }).fill(first);
  await page.getByLabel("Fin del intervalo", { exact: true }).fill(last);
  await page.getByRole("button", { name: "Aplicar intervalo", exact: true }).click();
}
export async function selectGanttTask(page, id, { calendar = true, search = false } = {}) {
  const task = currentGanttTasks(page).find(task => task.id === Number(id));
  assert.ok(task, "The requested task belongs to the authorized loaded collection: " + id);
  const row = page.locator(".gm-task-gantt .wx-row[data-id='" + id + "']");
  if (search) {
    await page.getByRole("button", { name: "Buscar tareas", exact: true }).click();
    await page.getByRole("searchbox", { name: "Buscar tareas por nombre, responsable o etiqueta" }).fill(task.name);
    await row.scrollIntoViewIfNeeded();
    await row.locator(".wx-cell").last().click();
    return;
  }
  const tasks = currentGanttTasks(page), byId = new Map(tasks.map(task => [task.id, task]));
  const chart = page.locator(".gm-task-gantt .wx-chart");
  const vertical = page.locator(".gm-task-gantt .wx-gantt");
  const settle = () => page.evaluate(() => new Promise(resolve => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
  async function wheelTo(top) {
    const before = await vertical.evaluate(element => element.scrollTop);
    if (Math.abs(before - top) > 1) await page.mouse.wheel(0, top - before);
    await page.waitForFunction(top => {
      const region = globalThis.document.querySelector(".gm-task-gantt .wx-gantt");
      const table = region.querySelector(".wx-table");
      const offset = Math.max(0, Math.floor(top / 40) - 1) * 40 - top;
      return Math.abs(region.scrollTop - top) <= 1 && Math.abs(Number.parseFloat(table.style.getPropertyValue("--wx-body-offset")) - offset) <= 1;
    }, top);
    await settle();
  }
  async function reveal(target) {
    const node = page.locator(".gm-task-gantt .wx-row[data-id='" + target + "']");
    if (await node.count()) return;
    await chart.hover();
    const maximum = await vertical.evaluate(element => element.scrollHeight - element.clientHeight);
    await wheelTo(0);
    for (let step = 0; step <= Math.ceil(maximum / 300) && !await node.count(); step++) {
      const before = await vertical.evaluate(element => element.scrollTop);
      if (before >= maximum) break;
      await wheelTo(Math.min(maximum, before + 300));
    }
    await node.waitFor();
  }
  const ancestors = [], chain = new Set();
  let parent = task.parent_id;
  while (byId.has(parent) && !chain.has(parent)) { chain.add(parent); ancestors.unshift(parent); parent = byId.get(parent).parent_id; }
  for (const ancestor of ancestors) {
    await reveal(ancestor);
    const expand = page.getByRole("button", { name: "Expandir subtareas de " + byId.get(ancestor).name, exact: true });
    if (await expand.count() && await expand.isEnabled()) { await expand.click(); await settle(); }
  }
  await reveal(Number(id));
  await row.scrollIntoViewIfNeeded();
  if (calendar) {
    const previous = (await page.getByRole("button", { name: /^Periodo de Gantt:/ }).textContent()).trim();
    await flexibleGanttRange(page, task.start_date, task.start_date);
    if (previous !== "Flexible") await chooseGanttPeriod(page, previous);
  }
  await row.scrollIntoViewIfNeeded();
  await row.locator(".wx-cell").last().click();
}
export async function selectedGanttTaskId(page) {
  const section = page.getByRole("region", { name: "Acciones de la tarea seleccionada", exact: true });
  const name = await section.locator("span[title]").first().getAttribute("title");
  return String(currentGanttTasks(page).find(task => task.name === name)?.id ?? "");
}
export async function ganttFilter(page, criterion, value) {
  const trigger = page.getByRole("button", { name: /^Filtros de Gantt:/ });
  if (await trigger.getAttribute("aria-expanded") !== "true") await trigger.click();
  await page.getByRole("dialog", { name: "Filtros de Gantt", exact: true }).getByLabel(criterion, { exact: true }).selectOption(value);
}
export async function clearGanttFilters(page) {
  const trigger = page.getByRole("button", { name: /^Filtros de Gantt:/ });
  if (await trigger.getAttribute("aria-expanded") !== "true") await trigger.click();
  const clearFilters = page.getByRole("button", { name: "Limpiar filtros", exact: true });
  if (await clearFilters.isEnabled()) await clearFilters.click();
  await page.keyboard.press("Escape");
  const clear = page.getByRole("button", { name: "Limpiar búsqueda", exact: true });
  if (await clear.count()) await clear.click();
}

export async function currentGanttPeriod(page) {
  const label = (await page.getByRole("button", { name: /^Periodo de Gantt:/ }).textContent()).trim();
  return ({ "Día": "day", "Semana": "week", "Mes": "month", "Trimestre": "quarter", "Año": "year", "Flexible": "flexible" })[label];
}
