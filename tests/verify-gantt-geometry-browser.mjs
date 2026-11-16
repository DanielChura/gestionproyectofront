import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chooseGanttPeriod } from "./ganttBrowserControls.mjs";
const { chromium } = await import(pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE));
const qa = JSON.parse(fs.readFileSync(process.env.GM_QA_SECRETS_PATH, "utf8"));
const out = process.env.GM_BROWSER_REPORT_DIR;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, timezoneId: "America/Lima" });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const checks = [], errors = [], writes = [], samples = [];
page.on("pageerror", e => errors.push(e.message));
page.on("request", r => {
  if (new URL(r.url()).pathname.startsWith("/api/projects/") && !['GET', 'OPTIONS'].includes(r.method()))
    writes.push({ method: r.method(), path: new URL(r.url()).pathname });
});
const widget = () => page.locator(".gm-task-gantt");
const shield = () => page.getByRole("button", { name: /^(Vista protegida|Proteger vista):/ });
const zoom = async () => Number(await widget().getAttribute("data-gantt-zoom"));
const settled = () => page.evaluate(() => new Promise(resolve => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
async function point(fraction = .5) {
  return page.locator(".gm-gantt-time-header").evaluate((node, fraction) => {
    const box = node.getBoundingClientRect(), x = box.x + box.width * fraction, rows = node.querySelectorAll('[role=row]'), cells = [...rows[1].querySelectorAll('[role=columnheader]')];
    const cell = cells.find(c => { const b = c.getBoundingClientRect(); return b.x <= x && b.right >= x; });
    if (!cell)
      throw new Error('No temporal cell at viewport point');
    const b = cell.getBoundingClientRect(), start = Number(cell.dataset.ganttHeaderStart), end = Number(cell.dataset.ganttHeaderEnd);
    return { time: start + (end - start) * (x - b.x) / b.width, ratio: b.width / (end - start), x, width: box.width, left: box.left, y: box.y + 42 };
  }, fraction);
}
const stable = (a, b, label) => assert.ok(Math.abs(a.time - b.time) * Math.max(a.ratio, b.ratio) < .12, `${label}: drift ${Math.abs(a.time - b.time) * Math.max(a.ratio, b.ratio)}px`);
async function zoomTo(level) {
  while (await zoom() !== level) {
    const before = await zoom();
    await page.getByRole("button", { name: before < level ? "Acercar cronograma" : "Alejar cronograma", exact: true }).click();
    await page.waitForFunction(level => Number(globalThis.document.querySelector('.gm-task-gantt')?.dataset.ganttZoom) === level, before + (before < level ? 1 : -1));
    await settled();
  }
}
async function image(name) { await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true }); }
async function check(name, run) {
  try {
    const result = await run();
    checks.push({ name, status: 'Aprobado', result });
    console.log('PASS ' + name);
  }
  catch (e) {
    checks.push({ name, status: 'Fallido', error: e.message });
    await image('failure-' + checks.length);
    throw e;
  }
  finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ captured_at: new Date().toISOString(), checks, errors, writes, samples }, null, 2));
  }
}
try {
  await page.goto((process.env.GM_FRONTEND_ORIGIN || 'http://localhost:5189') + '/proyectos/' + qa.context.project + '?vista=gantt');
  await page.getByLabel('Correo electrónico').fill(qa.admin.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(qa.admin.password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.getByRole('button', { name: /^Periodo de Gantt:/ }).waitFor();
  await page.getByRole('columnheader').first().waitFor();
  await settled();
  await check('45 combinaciones: zoom monotónico, ancla central estable y quince capturas reales', async () => {
    await shield().click();
    for (const scale of ['day', 'week', 'month', 'quarter', 'year']) {
      await chooseGanttPeriod(page, scale);
      await zoomTo(1);
      const first = await point();
      for (let level = 1;level <= 9;level++) {
        await zoomTo(level);
        assert.equal(await widget().getAttribute('data-gantt-scale'), scale);
        const center = await point();
        assert.ok(Math.abs(first.time - center.time) * Math.max(first.ratio, center.ratio) <= 0.5 + 1 / 64, scale + ' ' + level + ' exceeds physical scroll pixel quantization');
        const m = await page.locator('.gm-gantt-time-header').evaluate(n => ({ headers: n.querySelectorAll('[role=columnheader]').length, height: n.parentElement.querySelector('[data-gantt-calendar-task]')?.getBoundingClientRect().height, columns: [...n.querySelectorAll('[role=row]')[1].children].slice(1, -1).map(c => c.getBoundingClientRect().width), font: globalThis.getComputedStyle(n).fontSize }));
        assert.ok(m.headers < 100);
        samples.push({ scale, level, center: center.time, columns: m.columns, headers: m.headers, font: m.font });
        if ([1, 5, 9].includes(level))
          await image(scale + '-' + level + '-light');
        if (level === 5) {
          await page.evaluate(() => globalThis.document.documentElement.classList.add('dark'));
          await image(scale + '-5-dark');
          await page.evaluate(() => globalThis.document.documentElement.classList.remove('dark'));
        }
      }
      assert.equal(await page.getByRole('button', { name: 'Acercar cronograma', exact: true }).isDisabled(), true);
      await zoomTo(1);
      stable(first, await point(), scale + ' 1→9→1');
      assert.equal(await page.getByRole('button', { name: 'Alejar cronograma', exact: true }).isDisabled(), true);
    }
    assert.equal(writes.length, 0);
    assert.deepEqual(errors, []);
    return { combinations: 45, screenshots: 20 };
  });
  await check('Navegación prolongada por rueda en ambas direcciones y flechas mantiene ventanas y cero escrituras', async () => {
    await chooseGanttPeriod(page, 'week');
    await zoomTo(5);
    await settled();
    let previous = await point();
    const chart = page.locator('.gm-task-gantt .wx-chart');
    const box = await chart.boundingBox();
    let resets = 0, oldScroll = await chart.evaluate(n => n.scrollLeft);
    for (const direction of [1, -1])
      for (let n = 0;n < 35;n++) {
        await page.mouse.move(box.x + box.width / 2, box.y + 100);
        await page.mouse.wheel(direction * 750, 0);
        await settled();
        const current = await point();
        assert.ok(direction * (current.time - previous.time) > 0, 'physical scroll direction');
        assert.ok(Math.abs(Math.abs(current.time - previous.time) * current.ratio - 750) < 1, 'wheel pixel distance');
        const currentScroll = await chart.evaluate(n => n.scrollLeft);
        if (Math.abs(currentScroll - oldScroll) > 1000)
          resets++;
        oldScroll = currentScroll;
        previous = current;
      }
    assert.ok(resets >= 4, 'successive range recycling executed');
    const before = await point();
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await settled();
    const next = await point();
    assert.ok(next.time > before.time);
    await page.getByRole('button', { name: 'Anterior', exact: true }).click();
    await settled();
    stable(before, await point(), 'arrows inverse');
    assert.equal(writes.length, 0);
    return { wheelEvents: 70, rangeCompensations: resets };
  });
  await check('Arrastre real de cabeceras y fondo atraviesa rangos sin soltar, permite Escape y reanudar', async () => {
    await page.getByRole('button', { name: 'Hoy', exact: true }).click();
    await settled();
    for (const surface of ['header', 'background']) {
      const before = await point(), startX = before.x, startY = surface === 'header' ? before.y : before.y + 56;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      for (let step = 1;step <= 24;step++) {
        const x = startX - step * 650;
        await page.mouse.move(x, startY);
        await settled();
        assert.equal(await widget().getAttribute('data-panning'), 'true');
        const current = await point();
        assert.ok(Math.abs((current.time - before.time) * current.ratio - step * 650) < 1, `${surface} maintains original grab point step ${step}`);
      }
      await page.mouse.up();
      assert.equal(await page.getByRole('dialog').count(), 0);
      const reverse = await point();
      await page.mouse.move(reverse.x, startY);
      await page.mouse.down();
      await page.mouse.move(reverse.x + 150, startY);
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await page.mouse.move(reverse.x, startY);
      await page.mouse.down();
      await page.mouse.move(reverse.x - 150, startY);
      await page.mouse.up();
      assert.equal(await widget().getAttribute('data-panning'), null);
    }
    assert.equal(writes.length, 0);
    return { continuousMoves: 48, escapeAndImmediateRestart: true };
  });
  await check('Sidebar y resize conservan ancla; scroll vertical solo cuando desbordan filas y alineación de tabla/calendario', async () => {
    await page.getByRole('button', { name: 'Hoy', exact: true }).click();
    await settled();
    const initial = await point();
    await page.getByRole('button', { name: 'Ocultar menú lateral', exact: true }).click();
    await settled();
    stable(initial, await point(), 'sidebar');
    await image('sidebar-cerrado');
    for (const width of [1100, 900, 1600]) {
      const before = await point();
      await page.setViewportSize({ width, height: 1000 });
      await settled();
      stable(before, await point(), 'viewport ' + width);
    }
    const metrics = await page.evaluate(() => { const canvas = globalThis.document.querySelector('.gm-gantt-canvas'), grid = canvas.querySelector('.wx-gantt'); return { canvasY: canvas.scrollHeight - canvas.clientHeight, gridY: grid.scrollHeight - grid.clientHeight }; });
    assert.ok(metrics.canvasY <= 1, 'no nested canvas vertical scrollbar');
    assert.ok(metrics.gridY > 0, 'large project requires the native shared vertical scrollbar');
    const beforeScroll = await point();
    await page.mouse.move(beforeScroll.x, beforeScroll.y + 110);
    await page.mouse.wheel(0, 220);
    await settled();
    await page.waitForFunction(() => {
      const visible = [...globalThis.document.querySelectorAll('[data-gantt-calendar-task]')].flatMap(n => {
        const row = globalThis.document.querySelector('.wx-row[data-id="' + n.dataset.ganttCalendarTask + '"]'), bar = n.closest('.wx-bar');
        if (!row || !bar) return [];
        const a = row.getBoundingClientRect(), b = bar.getBoundingClientRect();
        return b.height ? [Math.abs(a.y + a.height / 2 - b.y - b.height / 2)] : [];
      });
      return visible.length && visible.every(delta => delta <= 1);
    });
    const aligned = await page.evaluate(() => [...globalThis.document.querySelectorAll('[data-gantt-calendar-task]')].flatMap(n => {
      const id = n.dataset.ganttCalendarTask, row = globalThis.document.querySelector('.wx-row[data-id="' + id + '"]'), bar = n.closest('.wx-bar'); if (!row || !bar)
        return []; const a = row.getBoundingClientRect(), b = bar.getBoundingClientRect(); if (!b.height)
        return []; return [{ id, delta: Math.abs(a.y + a.height / 2 - b.y - b.height / 2) }];
    }));
    assert.ok(aligned.length > 0);
    assert.ok(aligned.every(r => r.delta <= 1));
    await page.getByRole('button', { name: 'Mostrar menú lateral', exact: true }).click();
    await page.getByRole('button', { name: 'Ajuste automático', exact: true }).click();
    await settled();
    await page.getByRole('button', { name: 'Buscar tareas', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Buscar tareas' }).fill('Histórica Gantt QA');
    await page.keyboard.press('Tab');
    await settled();
    await page.getByRole('button', { name: 'Abrir tarea Histórica Gantt QA', exact: true }).waitFor();
    await page.waitForFunction(() => globalThis.document.querySelectorAll('[data-gantt-tree-id]').length === 1);
    const small = await page.evaluate(() => { const root = globalThis.document.querySelector('.gm-task-gantt'), grid = root.querySelector('.wx-gantt'); return { height: root.clientHeight, overflow: grid.scrollHeight - grid.clientHeight, rows: root.querySelectorAll('[data-gantt-tree-id]').length }; });
    assert.equal(small.rows, 1);
    assert.ok(small.overflow <= 1, 'small project has no vertical scrollbar');
    assert.ok(small.height < 200, 'no artificial empty band');
    await image('pocas-filas');
    assert.equal(writes.length, 0);
    return { large: metrics, small, alignment: aligned };
  });
  await check('Protección y formulario completo conservados; navegación también sin protección y sin escrituras', async () => {
    await page.locator('.gm-gantt-controls').getByRole('button', { name: '+ Agregar tarea', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Nueva tarea', exact: true });
    await modal.waitFor();
    await modal.locator('textarea').waitFor();
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.equal(await shield().getAttribute('aria-pressed'), 'true');
    await shield().click();
    const p = await point();
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x - 150, p.y);
    await page.mouse.up();
    await settled();
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(writes.length, 0);
    assert.deepEqual(errors, []);
  });
}
finally {
  await browser.close();
}
