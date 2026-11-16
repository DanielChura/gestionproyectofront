import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { chooseGanttPeriod } from "./ganttBrowserControls.mjs";
const { chromium } = await import(
  pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE)
);
const qa = JSON.parse(fs.readFileSync(process.env.GM_QA_SECRETS_PATH, "utf8")),
  c = qa.p4,
  out = process.env.GM_BROWSER_REPORT_DIR;
assert.ok(c && out);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  context = await browser.newContext({
    viewport: { width: 1700, height: 1050 },
    timezoneId: "America/Lima",
  }),
  page = await context.newPage();
page.setDefaultTimeout(15000);
const checks = [],
  writes = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  if (
    new URL(r.url()).pathname.startsWith("/api/projects/") &&
    !["GET", "OPTIONS"].includes(r.method())
  )
    writes.push(r.method());
});
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
async function ready() {
  await page.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor();
  await settle();
}
async function level(value) {
  for (let i = 0; i < 10; i++) {
    const old = Number(
      await page.locator(".gm-task-gantt").getAttribute("data-gantt-zoom"),
    );
    if (old === value) return;
    await page
      .getByRole("button", {
        name: value > old ? "Acercar cronograma" : "Alejar cronograma",
        exact: true,
      })
      .click();
  }
  assert.fail("zoom");
}
async function locate() {
  const arrow = page.locator(`[data-gantt-offscreen="${c.source}"]`);
  if (await arrow.count()) await arrow.click();
  await settle();
}
async function invariants(scale, zoom) {
  const result = await page.evaluate(() => {
    const scene = globalThis.document.querySelector(".gm-gantt-scene"),
      bounds = scene.getBoundingClientRect(),
      svg = scene.querySelector("svg"),
      origin = svg.getBoundingClientRect();
    const rectangles = [
      ...globalThis.document.querySelectorAll(
        ".gm-gantt-bar,.gm-gantt-exterior",
      ),
    ].map((n) => n.getBoundingClientRect());
    const failures = [];
    let samples = 0;
    for (const path of scene.querySelectorAll("[data-gantt-link]")) {
      const [source, target] = path.dataset.ganttLink.split(":").map(Number),
        type = path.dataset.dependencyType;
      const a = globalThis.document
          .querySelector(`[data-gantt-calendar-task="${source}"]`)
          ?.getBoundingClientRect(),
        b = globalThis.document
          .querySelector(`[data-gantt-calendar-task="${target}"]`)
          ?.getBoundingClientRect();
      const length = path.getTotalLength(),
        first = path.getPointAtLength(0),
        last = path.getPointAtLength(length);
      if (a && b && type !== "legacy") {
        if (
          Math.abs(first.x + origin.x - (type[0] === "S" ? a.left : a.right)) >
          2
        )
          failures.push(
            "source " +
              path.dataset.ganttLink +
              " " +
              JSON.stringify({
                first: first.x + origin.x,
                expected: type[0] === "S" ? a.left : a.right,
                path: path.getAttribute("d"),
                barWidth: a.width,
              }),
          );
        if (
          Math.abs(last.x + origin.x - (type[1] === "S" ? b.left : b.right)) > 2
        )
          failures.push(
            "target " +
              path.dataset.ganttLink +
              " " +
              JSON.stringify({
                last: last.x + origin.x,
                expected: type[1] === "S" ? b.left : b.right,
                barWidth: b.width,
              }),
          );
        if (globalThis.getComputedStyle(path).strokeDasharray !== "none")
          failures.push("solid path");
      }
      for (let d = 7; d < length - 7; d += Math.max(4, length / 512)) {
        const p = path.getPointAtLength(d),
          x = p.x + origin.x,
          y = p.y + origin.y;
        samples++;
        if (
          x < bounds.left ||
          x > bounds.right ||
          y < origin.top ||
          y > origin.bottom
        )
          continue;
        if (
          rectangles.some(
            (r) =>
              x > r.left + 1 &&
              x < r.right - 1 &&
              y > r.top + 1 &&
              y < r.bottom - 1,
          )
        )
          failures.push("obstacle " + path.dataset.ganttLink);
      }
    }
    for (const node of scene.querySelectorAll("[data-connector-task]")) {
      const bar = globalThis.document
        .querySelector(
          `[data-gantt-calendar-task="${node.dataset.connectorTask}"]`,
        )
        ?.getBoundingClientRect();
      if (!bar) continue;
      const x = node.dataset.connectorSide === "start" ? bar.left : bar.right;
      if (x < bounds.left - 1 || x > bounds.right + 1)
        failures.push("clipped endpoint");
    }
    return {
      failures: [...new Set(failures)],
      samples,
      links: scene.querySelectorAll("[data-gantt-link]").length,
      scale:
        globalThis.document.querySelector(".gm-task-gantt").dataset.ganttScale,
      zoom: Number(
        globalThis.document.querySelector(".gm-task-gantt").dataset.ganttZoom,
      ),
      font: globalThis.getComputedStyle(
        globalThis.document.querySelector(".gm-gantt-exterior button"),
      ).fontSize,
      avatar: globalThis.document
        .querySelector(".gm-gantt-exterior > span")
        ?.getBoundingClientRect().height,
    };
  });
  if (result.failures.length)
    console.log(
      JSON.stringify(
        await page
          .locator(`[data-gantt-calendar-task="${c.source}"]`)
          .evaluate((node) => {
            const values = [];
            for (
              let current = node, i = 0;
              current && i < 4;
              current = current.parentElement, i++
            ) {
              const s = globalThis.getComputedStyle(current),
                r = current.getBoundingClientRect();
              values.push({
                class: current.className,
                style: current.getAttribute("style"),
                x: r.x,
                width: r.width,
                border: s.borderWidth,
                padding: s.padding,
                left: s.left,
                boxSizing: s.boxSizing,
                minWidth: s.minWidth,
              });
            }
            return values;
          }),
      ),
    );
  assert.deepEqual(result.failures, [], `${scale}/${zoom}`);
  assert.equal(result.scale, scale);
  assert.equal(result.zoom, zoom);
  assert.ok(
    result.links > 0,
    "Visible edges are required for a meaningful visual check",
  );
  assert.equal(result.font, "12px");
  assert.equal(result.avatar, 24);
  checks.push({ scale, zoom, samples: result.samples, links: result.links });
}
try {
  await page.goto(
    "http://localhost:5189/proyectos/" + c.project + "?vista=gantt",
  );
  await page.getByLabel("Correo electrónico").fill(qa.admin_delay.email);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(qa.admin_delay.password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await ready();
  for (const scale of ["day", "week", "month", "quarter", "year"]) {
    await chooseGanttPeriod(page, scale);
    for (const zoom of [1, 5, 9]) {
      await level(zoom);
      await locate();
      await invariants(scale, zoom);
      await page.mouse.move(1, 1);
      await page.mouse.down();
      await page.mouse.up();
      await settle();
      await page.screenshot({ path: out + `/p4-${scale}-${zoom}.png` });
      console.log(`PASS ${scale} zoom ${zoom}`);
    }
  }
  for (const [theme, width] of [
    ["light", 1100],
    ["dark", 1700],
    ["dark", 850],
  ]) {
    await page.evaluate(
      (theme) => globalThis.localStorage.setItem("theme", theme),
      theme,
    );
    await page.setViewportSize({ width, height: 1050 });
    await page.reload();
    await ready();
    if (width < 1000)
      await page
        .getByRole("button", { name: "Ocultar panel", exact: true })
        .click();
    await chooseGanttPeriod(page, "week");
    await level(5);
    await locate();
    await invariants("week", 5);
    await page.screenshot({ path: out + `/p4-${theme}-${width}.png` });
    console.log(`PASS ${theme} ${width}`);
  }
  assert.equal(writes.length, 0);
  assert.deepEqual(errors, []);
} catch (error) {
  await page
    .screenshot({ path: out + "/p4-geometria-fallo.png" })
    .catch(() => {});
  throw error;
} finally {
  fs.writeFileSync(
    out + "/p4-geometry-browser.json",
    JSON.stringify(
      { date: new Date().toISOString(), checks, writes, errors },
      null,
      2,
    ),
  );
  await browser.close();
}
