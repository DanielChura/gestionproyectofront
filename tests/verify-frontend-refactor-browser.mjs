import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE));
const qa = JSON.parse(fs.readFileSync(process.env.GM_QA_SECRETS_PATH, "utf8"));
const out = process.env.GM_BROWSER_REPORT_DIR;
assert.ok(out && qa.context);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const checks = [], errors = [], requests = [], failures = [];
page.on("pageerror", e => errors.push(e.message));
page.on("request", r => { const u = new URL(r.url()); if (u.pathname.startsWith("/api/")) requests.push({ path: u.pathname, method: r.method() }); });
page.on("response", async r => { if (r.status() >= 400 && new URL(r.url()).pathname.startsWith("/api/")) failures.push({ path: new URL(r.url()).pathname, status: r.status(), authorizationPresent: Boolean(r.request().headers().authorization) }); });
const paint = () => page.evaluate(() => new Promise(resolve => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
async function step(name, action) { await action(); checks.push(name); console.log("PASS " + name); }
try {
 await page.goto(`http://localhost:5189/proyectos/${qa.context.project}?vista=lista`);
 await page.getByLabel("Correo electrónico").fill(qa.admin_chunk.email);
 await page.getByLabel("Contraseña", { exact: true }).fill(qa.admin_chunk.password);
 await page.getByRole("button", { name: "Ingresar", exact: true }).click();
 await page.locator("[data-task-id]").first().waitFor();
 await step("Direct URL, real tasks, shared Query requests and Gantt lazy loading", async () => {
  assert.ok(await page.getByRole("navigation", { name: "Ruta de navegación" }).innerText());
  assert.equal(await page.locator(".gm-task-gantt").count(), 0);
  assert.equal(await page.evaluate(() => performance.getEntriesByType("resource").filter(r => /TaskGantt\.tsx|taskGantt\.css/.test(r.name)).length), 0);
  assert.equal(requests.filter(r => r.path === `/api/projects/${qa.context.project}/tasks/` && r.method === "GET").length, 1);
 });
 await step("Colleague List opens detail with its original dimensions and supports repeated dismissal", async () => {
  const row = page.locator(`[data-task-id="${qa.context.first}"]`);
  for (let i=0; i<3; i++) {
   await row.locator("[data-task-drag-surface]").click();
   const detail = page.getByRole("dialog", { name: "Detalle de tarea", exact: true });
   await detail.waitFor();
   assert.ok((await detail.boundingBox()).width >= 1000);
   await page.keyboard.press("Escape");
   await detail.waitFor({ state: "hidden" });
   assert.equal(await row.getAttribute("data-dragging"), null);
  }
 });
 await step("List Board and Gantt share the same task cache without duplicate collections", async () => {
  const before=requests.filter(r=>r.path.endsWith("/tasks/")&&r.method==="GET").length;
  await page.getByRole("link",{name:"Tablero",exact:true}).click();
  await page.getByRole("button",{name:"Crear nueva tarea",exact:true}).waitFor();
  await page.getByRole("link",{name:"Gantt",exact:true}).click();
  await page.getByRole("button",{name:/^Periodo de Gantt:/}).waitFor();await paint();
  assert.ok(await page.locator("[data-gantt-calendar-task]").count());
  assert.equal(requests.filter(r=>r.path.endsWith("/tasks/")&&r.method==="GET").length,before);
  const count=await page.locator("h1").locator("..").innerText();assert.match(count,/tareas/);
 });
 await step("Colleague Organization project form and menu preserve session after reload", async () => {
  await page.goto("http://localhost:5189/organizaciones/estructura?modal=proyecto");
  await page.getByLabel("Nombre del proyecto *", { exact: true }).waitFor();
  await page.getByLabel("Modo de asignación", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.locator("#project-name").waitFor({ state: "hidden" });
  await page.goto(`http://localhost:5189/proyectos/${qa.context.project}?vista=gantt`);
  await page.reload();await page.getByRole("button",{name:/^Periodo de Gantt:/}).waitFor();
  assert.equal(await page.getByText("Error al cargar proyectos", { exact: true }).count(), 0);
  assert.equal(await page.getByText("Sesión expirada", { exact: true }).count(), 0);
 });
 await step("Direct task URL survives initial loading and exposes the colleague inline title editor", async () => {
  await page.goto(`http://localhost:5189/proyectos/${qa.context.project}?vista=lista&tarea=${qa.context.first}`);
  const detail = page.getByRole("dialog", { name: "Detalle de tarea", exact: true });
  await detail.getByRole("heading", { level: 1 }).click();
  const title = detail.locator("input[maxlength=180]");
  await title.waitFor();
  assert.ok(await title.inputValue());
  await page.keyboard.press("Escape");
  await detail.waitFor({ state: "hidden" });
 });
 await step("New personal filters and Board grouping preserve interactive views", async () => {
  await page.getByRole("button", { name: "Ver solo mis tareas", exact: true }).click();
  await page.getByRole("button", { name: "Ver todas las tareas", exact: true }).click();
  await page.getByRole("link", { name: "Tablero", exact: true }).click();
  await page.getByRole("region", { name: "Tablero", exact: true }).waitFor();
  await page.getByRole("button", { name: "Estado", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Prioridad", exact: true }).click();
  await page.getByRole("button", { name: "Prioridad", exact: true }).waitFor();
  assert.ok(await page.locator('section[aria-label="Tablero"]').innerText());
 });
 await step("Organization structure retains the colleague project creation form", async () => {
  await page.goto("http://localhost:5189/organizaciones/estructura");
  await page.getByRole("heading", { name: "Áreas y proyectos", exact: true }).waitFor();
  await page.getByRole("link", { name: "Nuevo proyecto", exact: true }).click();
  await page.locator("#project-name").waitFor();
  await page.getByLabel("Modo de asignación", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.locator("#project-name").waitFor({ state: "hidden" });
  assert.equal(await page.locator("#project-name").count(), 0);
 });
 await step("Logout clears the session and returns to the real login form", async () => {
  await page.getByRole("button",{name:"Abrir menú de perfil",exact:true}).click();
  await page.getByRole("menuitem",{name:"Cerrar sesión",exact:true}).click();
  await page.getByRole("button",{name:"Ingresar",exact:true}).waitFor();
 });
 assert.deepEqual(errors,[]);
 assert.deepEqual(failures.filter(r=>r.path!=="/api/auth/refresh/"),[]);
 assert.equal(requests.filter(r=>r.method!=="GET" && !r.path.startsWith("/api/auth/")).length,0);
} catch(error) { await page.screenshot({path:out+"/refactor-failure.png"});throw error; }
finally {fs.writeFileSync(out+"/refactor-browser.json",JSON.stringify({checks,errors,failures,requests,url:page.url()},null,2));await browser.close();}
