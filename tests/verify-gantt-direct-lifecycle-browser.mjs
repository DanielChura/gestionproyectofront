import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { chooseGanttPeriod } from "./ganttBrowserControls.mjs";
const { chromium } = await import(pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE));
let ready = false;
for (let attempt = 0; attempt < 80 && !ready; attempt++) {
  try { ready = (await fetch("http://localhost:8819/api/auth/csrf/", { signal: AbortSignal.timeout(1000) })).ok; } catch { ready = false; }
  if (!ready) await new Promise(resolve => setTimeout(resolve, 250));
}
assert.ok(ready, "The isolated Django fixture must be ready before loading its fresh QA credentials");
const qa = JSON.parse(fs.readFileSync(process.env.GM_QA_SECRETS_PATH, "utf8"));
const origin = process.env.GM_FRONTEND_ORIGIN || "http://localhost:5189";
assert.equal(origin, "http://localhost:5189", "Only the isolated QA frontend is allowed");
assert.ok(qa.scheduling && process.env.GM_BROWSER_REPORT_DIR);
const out = process.env.GM_BROWSER_REPORT_DIR;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, timezoneId: "America/Lima" });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const checks = [], writes = [], errors = [];
const c = qa.scheduling;
const taskPath = id => `/api/projects/${c.project}/tasks/${id}/`;
const dialog = title => page.getByRole("dialog", { name: title, exact: true });
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => {
  const pathname = new URL(request.url()).pathname;
  if (pathname.startsWith("/api/projects/") && !["GET", "OPTIONS"].includes(request.method())) writes.push({ path: pathname, method: request.method(), body: request.postDataJSON() });
});
async function api(id) {
  return page.evaluate(async url => {
    const { httpClient } = await import("/src/core/api/httpClient.ts");
    return (await httpClient.get(url.replace(/^\/api\//, ""))).data.task;
  }, taskPath(id));
}
async function step(name, action) {
  if(process.env.GM_P3_CASE && !name.startsWith(process.env.GM_P3_CASE))return;
  await action(); checks.push(name); console.log("PASS " + name);
}
async function reply(method, url, action, status = 200) {
  const result = page.waitForResponse(response => new URL(response.url()).pathname === url && response.request().method() === method);
  await action(); const response = await result;
  assert.equal(response.status(), status, await response.text());
  return response.json();
}

async function paint(){await page.evaluate(()=>new Promise(resolve=>globalThis.requestAnimationFrame(()=>globalThis.requestAnimationFrame(resolve))));}
async function reset(){
 const before=await api(qa.p3.partial);
 await page.evaluate(async({id,project,revision,day})=>{const{httpClient}=await import("/src/core/api/httpClient.ts");await httpClient.patch(`projects/${project}/tasks/${id}/`,{schedule:{precision:"hour",start:day+"T09:00:00-05:00",end:day+"T10:00:00-05:00",timezone:"America/Lima"},expected_calendar_revision:revision,calendar_intent_id:crypto.randomUUID()});},{id:qa.p3.partial,project:c.project,revision:before.calendar_revision,day:c.day});
 await page.reload();await page.getByRole("button",{name:/^Periodo de Gantt:/}).waitFor();await chooseGanttPeriod(page,"day");
 const arrow=page.locator(`[data-gantt-offscreen="${qa.p3.partial}"]`);if(await arrow.count())await arrow.click();await paint();
}
async function down(mode="move"){
 const chart=await page.locator(".wx-chart").boundingBox();
 const control=mode==="move"?page.locator(`[data-gantt-calendar-task="${qa.p3.partial}"]`):page.locator(`[data-gantt-edit-task="${qa.p3.partial}"][data-gantt-calendar-mode="${mode}"]`);
 const box=await control.boundingBox();assert.ok(box);
 const left=Math.max(box.x,chart.x+2),right=Math.min(box.x+box.width,chart.x+chart.width-2),x=(left+right)/2,y=box.y+box.height/2;
 await page.mouse.move(x,y);await page.mouse.down();return{x,y,chart};
}
try{
  await page.goto(origin + `/proyectos/${c.project}?vista=gantt`);
  await page.getByLabel("Correo electrónico").fill(qa.admin.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(qa.admin.password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.getByRole("button", { name: /^Periodo de Gantt:/ }).waitFor();


 await step("Cancelar repetidamente y perder captura permite reanudar inmediatamente",async()=>{
   await reset();const count=writes.length;
   for(let i=0;i<3;i++){const p=await down();await page.mouse.move(p.x+100,p.y,{steps:8});await page.keyboard.press("Escape");await page.mouse.up();}
   let p=await down();await page.mouse.move(p.x+100,p.y,{steps:8});
   const captured=await page.locator(`[data-gantt-calendar-task="${qa.p3.partial}"]`).evaluate(node=>{if(!node.hasPointerCapture(1))return false;node.releasePointerCapture(1);return true;});assert.equal(captured,true);
   await page.mouse.move(p.x+105,p.y);await page.mouse.up();assert.equal(writes.length,count);
   await reply("PATCH",taskPath(qa.p3.partial),async()=>{p=await down();await page.mouse.move(p.x+100,p.y,{steps:8});await page.mouse.up();});
   assert.equal(writes.length,count+1);assert.equal(await page.getByRole("dialog").count(),0);
 });
 await step("Mover y redimensionar extiende la ventana sin perder captura ni emitir múltiples escrituras",async()=>{
   for(const [mode,side] of [["move","right"],["move","left"],["end","right"],["start","left"]]){
     await reset();const before=await api(qa.p3.partial),count=writes.length,p=await down(mode),initial=await page.locator(".gm-task-gantt").getAttribute("data-gantt-window-start");
     await page.mouse.move(side==="right"?p.chart.x+p.chart.width-2:p.chart.x+2,p.y,{steps:20});
     await page.waitForFunction(value=>globalThis.document.querySelector(".gm-task-gantt").dataset.ganttWindowStart!==value,initial);
     assert.equal(await page.locator(".gm-task-gantt").getAttribute("data-calendar-dragging"),"true");
     const saved=await reply("PATCH",taskPath(qa.p3.partial),()=>page.mouse.up());assert.equal(writes.length,count+1);
     if(mode==="move")assert.equal(Date.parse(saved.schedule.end)-Date.parse(saved.schedule.start),3600000);
     if(mode==="start")assert.equal(saved.schedule.end,before.schedule.end);
     if(mode==="end")assert.equal(saved.schedule.start,before.schedule.start);
     assert.equal(saved.parent_id,before.parent_id);assert.equal(saved.state_code,before.state_code);
   }
 });
 await step("Controles de teclado abren el formulario y conservan foco sin doble marco",async()=>{
   await reset();const count=writes.length,control=page.locator(`[data-gantt-edit-task="${qa.p3.partial}"][data-gantt-calendar-mode="end"]`);
   await control.focus();await page.keyboard.press("Shift+Tab");await page.keyboard.press("Tab");assert.ok(await control.evaluate(n=>globalThis.getComputedStyle(n).outlineStyle!=="none"));await page.keyboard.press("Enter");
   const form=dialog("Definir fechas");await form.waitFor();await page.keyboard.press("Escape");await form.waitFor({state:"detached"});assert.equal(writes.length,count);
   const p=await down();await page.mouse.move(p.x+90,p.y,{steps:8});await page.keyboard.press("Escape");await page.mouse.up();
   const styles=await page.locator(`[data-gantt-calendar-task="${qa.p3.partial}"]`).evaluate(n=>({bar:globalThis.getComputedStyle(n).outlineStyle,wrapper:globalThis.getComputedStyle(n.closest(".wx-bar")).outlineStyle,height:n.getBoundingClientRect().height}));
   assert.equal(styles.bar,"none");assert.equal(styles.wrapper,"none");assert.equal(styles.height,24);
   await page.screenshot({path:out+"/p3-foco-sin-doble-marco.png"});
 });
 await step("Estados distintos, avatar estable y subtarea conservan su pertenencia",async()=>{
   await page.goto(origin+`/proyectos/${qa.context.project}?vista=gantt`);await page.getByRole("button",{name:/^Periodo de Gantt:/}).waitFor();await chooseGanttPeriod(page,"month");
   const expand=page.getByRole("button",{name:"Expandir subtareas de Padre QA",exact:true});if(await expand.count())await expand.click();
   const before=await page.evaluate(async({project,id})=>{const{httpClient}=await import("/src/core/api/httpClient.ts");return(await httpClient.get(`projects/${project}/tasks/${id}/`)).data.task;},{project:qa.context.project,id:qa.context.child});
   assert.equal(before.parent_id,qa.context.parent);assert.equal(before.state_code,"EN_CURSO");
   const shades=await page.locator("[data-gantt-calendar-task]").evaluateAll(nodes=>[...new Set(nodes.map(n=>globalThis.getComputedStyle(n).backgroundColor))]);assert.ok(shades.length>=2);
   for(const theme of ["light","dark"]){
     await page.evaluate(t=>localStorage.setItem("theme",t),theme);await page.reload();await page.getByRole("button",{name:/^Periodo de Gantt:/}).waitFor();await chooseGanttPeriod(page,"month");
     const e=page.getByRole("button",{name:"Expandir subtareas de Padre QA",exact:true});if(await e.count())await e.click();await paint();
     const avatars=await page.locator(".gm-gantt-exterior .size-6").evaluateAll(nodes=>nodes.map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));assert.ok(avatars.length);assert.ok(avatars.every(a=>a.width===24&&a.height===24));
     await page.screenshot({path:out+`/p3-colores-avatar-${theme}.png`});
   }
   const current=await page.evaluate(async({project,id})=>{const{httpClient}=await import("/src/core/api/httpClient.ts");return(await httpClient.get(`projects/${project}/tasks/${id}/`)).data.task;},{project:qa.context.project,id:qa.context.child});assert.equal(current.parent_id,before.parent_id);assert.equal(current.state_code,before.state_code);assert.deepEqual(current.schedule,before.schedule);
 });
 await step("Subtarea: resize persiste sin alterar padre, estado ni calendario de la raíz",async()=>{
   const project=qa.context.project,id=qa.context.child,parent=qa.context.parent;
   await page.goto(origin+`/proyectos/${project}?vista=gantt`);await page.getByRole("button",{name:/^Periodo de Gantt:/}).waitFor();await chooseGanttPeriod(page,"week");
   const expand=page.getByRole("button",{name:"Expandir subtareas de Padre QA",exact:true});if(await expand.count())await expand.click();
   const before=await page.evaluate(async({project,id,parent})=>{const{httpClient}=await import("/src/core/api/httpClient.ts");return{child:(await httpClient.get(`projects/${project}/tasks/${id}/`)).data.task,parent:(await httpClient.get(`projects/${project}/tasks/${parent}/`)).data.task};},{project,id,parent});
   const arrow=page.locator(`[data-gantt-offscreen="${id}"]`);if(await arrow.count())await arrow.click();await paint();
   const control=page.locator(`[data-gantt-edit-task="${id}"][data-gantt-calendar-mode="start"]`),box=await control.boundingBox();assert.ok(box);
   const saved=await reply("PATCH",`/api/projects/${project}/tasks/${id}/`,async()=>{await page.mouse.move(box.x+12,box.y+12);await page.mouse.down();await page.mouse.move(box.x+100,box.y+12,{steps:8});await page.mouse.up();});
   assert.equal(saved.parent_id,before.child.parent_id);assert.equal(saved.state_code,before.child.state_code);assert.equal(saved.due_date,before.child.due_date);assert.notEqual(saved.start_date,before.child.start_date);
   await page.reload();await page.getByRole("button",{name:/^Periodo de Gantt:/}).waitFor();
   const persisted=await page.evaluate(async({project,id,parent})=>{const{httpClient}=await import("/src/core/api/httpClient.ts");return{child:(await httpClient.get(`projects/${project}/tasks/${id}/`)).data.task,parent:(await httpClient.get(`projects/${project}/tasks/${parent}/`)).data.task};},{project,id,parent});
   assert.deepEqual(persisted.parent.schedule,before.parent.schedule);assert.equal(persisted.parent.calendar_revision,before.parent.calendar_revision);assert.equal(persisted.child.parent_id,parent);assert.deepEqual(persisted.child.schedule,saved.schedule);
 });
 await step("Trabajador de solo lectura carece de controles y la API rechaza editar",async()=>{
   const workerContext=await browser.newContext({viewport:{width:1600,height:1000},timezoneId:"America/Lima"});
   try{const worker=await workerContext.newPage();await worker.goto(origin+`/proyectos/${qa.context.readonly_project}?vista=gantt`);await worker.getByLabel("Correo electrónico").fill(qa.worker.email);await worker.getByLabel("Contraseña",{exact:true}).fill(qa.worker.password);await worker.getByRole("button",{name:"Ingresar",exact:true}).click();await worker.getByRole("button",{name:/^Periodo de Gantt:/}).waitFor();assert.equal(await worker.locator("[data-gantt-edit-task]").count(),0);
     const status=await worker.evaluate(async({project,id})=>{const{httpClient}=await import("/src/core/api/httpClient.ts");const before=(await httpClient.get(`projects/${project}/tasks/${id}/`)).data.task;try{await httpClient.patch(`projects/${project}/tasks/${id}/`,{due_date:before.due_date,expected_calendar_revision:before.calendar_revision,calendar_intent_id:crypto.randomUUID()});return 200;}catch(error){return error.status;}},{project:qa.context.readonly_project,id:qa.context.readonly_task});assert.equal(status,403);
   }finally{await workerContext.close();}
 });
 assert.deepEqual(errors,[]);
}catch(error){await page.screenshot({path:out+"/p3-lifecycle-failure.png"}).catch(()=>{});throw error;}
finally{fs.writeFileSync(out+(process.env.GM_P3_CASE?"/p3-subtask.json":"/p3-lifecycle.json"),JSON.stringify({checks,writes,errors,date:new Date().toISOString()},null,2));await browser.close();}
