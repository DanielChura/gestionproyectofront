import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE).href);
const secrets = JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH, "utf8"));
const data = secrets.context, output = process.env.GM_BROWSER_REPORT_DIR;
await mkdir(output, { recursive: true });
const origin = "http://localhost:5189", project = data.editing_project;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const clients = [], errors = [], records = [], traffic = [], accepted = new Map(), requests = [];
let current = "", a, b;
const resource = (id, pid = project) => "/api/projects/" + pid + "/tasks/" + id + "/";
const patchPattern = (id) => "**" + resource(id);
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
function remember(id, sent, body) {
  if (body?.calendar_receipt?.intent_id || body?.calendar_revision) accepted.set(id + ":" + sent.calendar_intent_id, { task_id: id, intent_id: sent.calendar_intent_id });
}
async function session(role) {
  const context = await browser.newContext({ viewport: { width: 1800, height: 1100 }, timezoneId: "America/Lima" });
  const page = await context.newPage(); page.setDefaultTimeout(18000);
  clients.push({ page, context });
  page.on("pageerror", (error) => errors.push({ role, message: error.message.slice(0,400) }));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (request.method() === "PATCH" && /\/tasks\/\d+\/$/.test(url.pathname)) requests.push({ role, path: url.pathname, sent: request.postDataJSON() });
  });
  page.on("response", async (response) => {
    const request = response.request(), url = new URL(response.url());
    if (!url.pathname.startsWith("/api/")) return;
    traffic.push({ role, path: url.pathname, method: request.method(), status: response.status() });
    if (request.method() === "PATCH" && /\/tasks\/\d+\/$/.test(url.pathname) && response.status() === 200) {
      const body = await response.json().catch(() => null);
      remember(Number(url.pathname.split("/").at(-2)), request.postDataJSON(), body);
    }
  });
  await page.goto(origin);
  await page.getByLabel("Correo electrónico", { exact: true }).fill(secrets[role].email);
  await page.getByLabel("Contraseña", { exact: true }).fill(secrets[role].password);
  const waiting = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/auth/login/" && response.request().method() === "POST");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  const reply = await waiting; assert.equal(reply.status(), 200);
  await page.getByRole("button", { name: "Abrir menú de perfil" }).waitFor();
  return { page, context, role, token: (await reply.json()).access };
}
async function api(client, id, method = "GET", payload, pid = project) {
  const cookies = await client.context.cookies(), csrf = cookies.find((item) => item.name === "csrftoken")?.value;
  const reply = await client.context.request.fetch(origin + resource(id,pid), {
    method, headers: { Authorization: "Bearer " + client.token, Origin: origin, ...(csrf ? { "X-CSRFToken": csrf } : {}) },
    data: payload, maxRetries: 0,
  });
  const body = await reply.json();
  if (method === "PATCH" && reply.status() === 200) remember(id,payload,body);
  return { status: reply.status(), body };
}
async function snapshot(client,id) { const result = await api(client,id); assert.equal(result.status,200); return result.body.task; }
async function gantt(client,pid = project) {
  await client.page.goto(origin + "/proyectos/" + pid + "?vista=gantt");
  await client.page.getByRole("combobox", { name: "Localizar tarea", exact: true }).waitFor();
  await client.page.locator(".gm-task-gantt .wx-row[data-id]").first().waitFor();
}
const bar = (client,id) => client.page.locator(".gm-gantt-bar[data-gantt-calendar-task='" + id + "']");
const row = (client,id) => client.page.locator(".gm-task-gantt .wx-row[data-id='" + id + "']");
const card = (client,name) => client.page.locator("[aria-label='Calendario de " + name + "']");
async function locate(client,id) {
  await client.page.getByRole("combobox", { name: "Localizar tarea", exact: true }).selectOption(String(id));
  await client.page.getByRole("button", { name: "Localizar selección", exact: true }).click();
  await row(client,id).waitFor();
}
async function begin(client,id,dx,mode="move") {
  await locate(client,id);
  const target = mode === "move" ? bar(client,id) : bar(client,id).locator("[data-gantt-calendar-mode='" + mode + "']");
  const box = await target.boundingBox(); assert.ok(box && box.width > 0, "visible drag surface");
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await client.page.mouse.move(x,y); await client.page.mouse.down(); await client.page.mouse.move(x+dx,y,{steps:8});
  return {x,y};
}
async function drag(client,id,dx,mode="move",status=200) {
  const waiting = client.page.waitForResponse((response) => new URL(response.url()).pathname === resource(id) && response.request().method() === "PATCH");
  await begin(client,id,dx,mode); await client.page.mouse.up();
  const reply = await waiting; assert.equal(reply.status(),status);
  const body = await reply.json(), sent = reply.request().postDataJSON();
  if (status === 200) remember(id,sent,body);
  return { body, sent };
}
async function confirmed(client,name) { await card(client,name).getByRole("status").filter({hasText:"Calendario confirmado:"}).waitFor(); }
async function refresh(client) {
  const waiting = client.page.waitForResponse((reply) => new URL(reply.url()).pathname === "/api/projects/" + project + "/tasks/");
  await client.page.getByRole("button",{name:"Actualizar Gantt",exact:true}).click();
  await waiting;
  await client.page.getByRole("button",{name:"Actualizar Gantt",exact:true}).waitFor({state:"visible"});
  await client.page.waitForFunction(() => ![...globalThis.document.querySelectorAll("button")].find((button) => button.textContent === "Actualizar Gantt")?.disabled);
}
const shift = (key,days) => { const [y,m,d] = key.split("-").map(Number); const date = new Date(y,m-1,d+days,12); return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-"); };
async function check(name,action) {
  current=name; const details=await action(); records.push({name,status:"Aprobado",details}); console.log("OK " + name);
}
try {
  a = await session("admin"); b = await session("admin_delay");
  await gantt(a); await gantt(b);
  await check("Vista previa real, una confirmación y un día inclusivo",async()=>{
    const id=data.editing_one, base=await snapshot(a,id), count=requests.length;
    await begin(a,id,80);
    assert.equal(requests.length,count,"no writes during pointer preview");
    assert.equal(await a.page.locator(".gm-task-gantt[data-calendar-dragging='true']").count(),1);
    await a.page.screenshot({path:path.join(output,"01_vista_previa.png")});
    const waiting=a.page.waitForResponse((reply)=>new URL(reply.url()).pathname===resource(id)&&reply.request().method()==="PATCH");
    await a.page.mouse.up(); const reply=await waiting; assert.equal(reply.status(),200);
    const sent=reply.request().postDataJSON(), saved=await snapshot(a,id); remember(id,sent,await reply.json());
    assert.equal(requests.length,count+1); assert.equal(saved.start_date,shift(base.start_date,2)); assert.equal(saved.due_date,saved.start_date);
    assert.equal(typeof sent.expected_calendar_revision,"string"); assert.equal(sent.expected_calendar_revision,base.calendar_revision);
    assert.match(sent.calendar_intent_id,/^[0-9a-f-]{36}$/);
    await confirmed(a,"Un día editable QA");
    return {writes:1,start:saved.start_date,due:saved.due_date,revision_is_string:true};
  });
  await check("Redimensionar cada extremo envía solo su campo y respeta intervalo",async()=>{
    const id=data.editing_second, initial=await snapshot(a,id);
    let result=await drag(a,id,80,"end"); assert.deepEqual(Object.keys(result.sent).sort(),["calendar_intent_id","due_date","expected_calendar_revision"]);
    await confirmed(a,"Otra barra editable QA");
    result=await drag(a,id,40,"start"); assert.deepEqual(Object.keys(result.sent).sort(),["calendar_intent_id","expected_calendar_revision","start_date"]);
    await confirmed(a,"Otra barra editable QA");
    const saved=await snapshot(a,id); assert.equal(saved.start_date,shift(initial.start_date,1)); assert.equal(saved.due_date,shift(initial.due_date,2));
    return {end_resize_fields:["due_date"],start_resize_fields:["start_date"]};
  });
  await check("Escape repetido libera inmediatamente misma tarea y otra; clic conserva detalle",async()=>{
    const id=data.editing_one,count=requests.length;
    for(let i=0;i<5;i++){
      await begin(a,id,40); await a.page.keyboard.press("Escape"); await a.page.mouse.up();
      assert.equal(await a.page.locator(".gm-task-gantt[data-calendar-dragging='true']").count(),0);
    }
    await begin(a,data.editing_second,40); await a.page.keyboard.press("Escape"); await a.page.mouse.up();
    assert.equal(requests.length,count);
    await drag(a,id,40); await confirmed(a,"Un día editable QA");
    assert.equal(requests.length,count+1);
    assert.equal(await a.page.locator("dialog[open]").count(),0);
    await row(a,id).getByRole("button",{name:"Abrir tarea Un día editable QA",exact:true}).click();
    await a.page.locator("dialog[open]").waitFor(); await a.page.keyboard.press("Escape");
    return {consecutive_cancellations:6,canceled_writes:0,next_gesture_immediate:true,residual_dialogs:0};
  });
  await check("Pérdida real de captura cancela sin escribir y permite reiniciar",async()=>{
    const id=data.editing_one,count=requests.length;
    await begin(a,id,40);
    const released=await bar(a,id).evaluate((node)=>{
      for(let id=1;id<16;id++) if(node.hasPointerCapture(id)){node.releasePointerCapture(id);return true;}return false;
    });
    assert.equal(released,true); await a.page.mouse.up();
    assert.equal(requests.length,count);
    await drag(a,id,40); await confirmed(a,"Un día editable QA");
    return {released_real_capture:true,canceled_writes:0,restart:true};
  });
  await check("Dos clientes: 409 conserva propuesta, consulta y reaplicación explícita",async()=>{
    const id=data.editing_subject,base=await snapshot(b,id);
    await drag(a,id,40); await confirmed(a,"Mover calendario QA");
    const failed=await drag(b,id,80,"move",409); assert.equal(failed.sent.expected_calendar_revision,base.calendar_revision);
    const panel=card(b,"Mover calendario QA");
    await panel.getByText("El calendario cambió desde que abriste la edición. Tu borrador se conserva.",{exact:true}).waitFor();
    const count=requests.length; await panel.getByRole("button",{name:"Consultar fechas vigentes",exact:true}).click();
    await panel.getByText(/Inicio vigente:/).waitFor(); assert.equal(requests.length,count);
    await panel.getByRole("button",{name:"Preparar nueva intención sobre esta revisión",exact:true}).click(); assert.equal(requests.length,count);
    const waiting=b.page.waitForResponse((reply)=>new URL(reply.url()).pathname===resource(id)&&reply.request().method()==="PATCH");
    await panel.getByRole("button",{name:"Guardar propuesta",exact:true}).click(); const reply=await waiting; assert.equal(reply.status(),200);
    const sent=reply.request().postDataJSON(); remember(id,sent,await reply.json());
    assert.notEqual(sent.calendar_intent_id,failed.sent.calendar_intent_id);
    assert.equal(sent.expected_calendar_revision,(BigInt(base.calendar_revision)+1n).toString());
    await confirmed(b,"Mover calendario QA");
    const saved=await snapshot(a,id); assert.equal(saved.start_date,shift(base.start_date,2));
    await b.page.screenshot({path:path.join(output,"02_reaplicacion_explicita.png")});
    await refresh(a); return {conflict:409,automatic_replay:false,new_intention:true};
  });
  await check("Respuesta lenta bloquea solo su tarea; otra barra se confirma",async()=>{
    const gate=deferred(),entered=deferred(),id=data.editing_one;
    await a.page.route(patchPattern(id),async(route)=>{entered.resolve();await gate.promise;await route.continue();},{times:1});
    await begin(a,id,40); await a.page.mouse.up(); await entered.promise;
    await card(a,"Un día editable QA").getByText(/Guardando calendario/).waitFor();
    const count=requests.length; await begin(a,id,40); await a.page.mouse.up(); assert.equal(requests.length,count);
    await drag(a,data.editing_second,40); await confirmed(a,"Otra barra editable QA");
    gate.resolve(); await confirmed(a,"Un día editable QA");
    return {same_task_pending_blocked:true,other_task_available:true};
  });
  await check("Error de red permite reintento explícito con UUID y revisión originales",async()=>{
    const id=data.editing_one,count=requests.length;
    await a.page.route(patchPattern(id),route=>route.abort("failed"),{times:1});
    await begin(a,id,40); await a.page.mouse.up();
    const panel=card(a,"Un día editable QA"); await panel.getByRole("button",{name:"Reintentar misma intención",exact:true}).waitFor();
    assert.equal(requests.length,count+1); const sent=requests.at(-1).sent;
    const waiting=a.page.waitForResponse((reply)=>new URL(reply.url()).pathname===resource(id)&&reply.request().method()==="PATCH");
    await panel.getByRole("button",{name:"Reintentar misma intención",exact:true}).click(); const reply=await waiting; assert.equal(reply.status(),200);
    assert.deepEqual(reply.request().postDataJSON(),sent); remember(id,sent,await reply.json()); await confirmed(a,"Un día editable QA");
    return {automatic_retry:false,explicit_same_key_payload_revision:true};
  });
  await check("Respuesta perdida tras commit y replay después de otra edición no retroceden",async()=>{
    const id=data.editing_one,committed=deferred(); let original;
    await a.page.route(patchPattern(id),async(route)=>{
      const response=await route.fetch();assert.equal(response.status(),200);original=route.request().postDataJSON();
      remember(id,original,await response.json());committed.resolve();await route.abort("failed");
    },{times:1});
    await begin(a,id,40);await a.page.mouse.up();await committed.promise;
    const panel=card(a,"Un día editable QA");await panel.getByRole("button",{name:"Reintentar misma intención",exact:true}).waitFor();
    const base=await snapshot(b,id);
    const payload={start_date:shift(base.start_date,1),due_date:shift(base.due_date,1),expected_calendar_revision:base.calendar_revision,calendar_intent_id:randomUUID()};
    assert.equal((await api(b,id,"PATCH",payload)).status,200);
    await panel.getByRole("button",{name:"Consultar fechas vigentes",exact:true}).click();await panel.getByText(/Inicio vigente:/).waitFor();
    const latest=await snapshot(b,id);
    const waiting=a.page.waitForResponse((reply)=>new URL(reply.url()).pathname===resource(id)&&reply.request().method()==="PATCH");
    await panel.getByRole("button",{name:"Reintentar misma intención",exact:true}).click(); const reply=await waiting;
    assert.equal(reply.status(),200); assert.deepEqual(reply.request().postDataJSON(),original);
    const body=await reply.json();assert.equal(body.calendar_receipt.replayed,true);remember(id,original,body);
    await confirmed(a,"Un día editable QA"); await row(a,id).locator("time[datetime='"+latest.start_date+"']").first().waitFor();
    assert.equal((await snapshot(b,id)).calendar_revision,latest.calendar_revision);
    return {lost_after_commit:true,replayed:true,latest_revision_preserved:true};
  });
  await check("Éxito antiguo demorado no reemplaza una revisión confirmada posterior",async()=>{
    const id=data.editing_second,gate=deferred(),entered=deferred();
    await a.page.route(patchPattern(id),async(route)=>{
      const response=await route.fetch();assert.equal(response.status(),200);remember(id,route.request().postDataJSON(),await response.json());
      entered.resolve();await gate.promise;await route.fulfill({response});
    },{times:1});
    await begin(a,id,40);await a.page.mouse.up();await entered.promise;
    const base=await snapshot(b,id),payload={due_date:shift(base.due_date,1),expected_calendar_revision:base.calendar_revision,calendar_intent_id:randomUUID()};
    assert.equal((await api(b,id,"PATCH",payload)).status,200);
    await refresh(a);const latest=await snapshot(b,id);
    await row(a,id).locator("time[datetime='"+latest.due_date+"']").waitFor();
    gate.resolve();await confirmed(a,"Otra barra editable QA");
    await row(a,id).locator("time[datetime='"+latest.due_date+"']").waitFor();
    return {old_success_ignored:true,confirmed_revision:latest.calendar_revision};
  });
  await check("Límites de familia y permisos reales conservan estado confirmado",async()=>{
    const parent=data.editing_parent,base=await snapshot(a,parent),child=await snapshot(a,data.editing_child);
    await drag(a,parent,400,"start",400);
    await card(a,"Padre editable QA").getByRole("alert").waitFor();
    assert.deepEqual(await snapshot(a,parent),base);assert.deepEqual(await snapshot(a,data.editing_child),child);
    await card(a,"Padre editable QA").getByRole("button",{name:"Descartar propuesta",exact:true}).click();
    const worker=await session("worker");await gantt(worker,data.readonly_project);
    const count=requests.length;await begin(worker,data.readonly_task,80);await worker.page.mouse.up();assert.equal(requests.length,count);
    const forbidden=await api(worker,data.readonly_task,"PATCH",{due_date:shift(data.today,2),expected_calendar_revision:(await api(worker,data.readonly_task,"GET",undefined,data.readonly_project)).body.task.calendar_revision,calendar_intent_id:randomUUID()},data.readonly_project);
    assert.equal(forbidden.status,403);
    await gantt(worker); await drag(worker,data.editing_subject,40);await confirmed(worker,"Mover calendario QA");
    await refresh(a);
    return {family_validation:400,worker_readonly:403,worker_authorized:200,no_cascade:true};
  });
  await check("403 visible revierte solo geometría; siguiente intención vuelve a estar disponible",async()=>{
    const id=data.editing_one,before=await snapshot(a,id);
    await a.page.route(patchPattern(id),route=>route.fulfill({status:403,contentType:"application/json",body:JSON.stringify({detail:"Permiso revocado QA"})}),{times:1});
    await drag(a,id,40,"move",403);const panel=card(a,"Un día editable QA");await panel.getByRole("alert").filter({hasText:"Permiso revocado QA"}).waitFor();
    assert.deepEqual(await snapshot(a,id),before);
    await panel.getByRole("button",{name:"Descartar propuesta",exact:true}).click();
    await drag(a,id,40);await confirmed(a,"Un día editable QA");
    return {controlled_http:403,confirmed_data_preserved:true,explicit_discard_then_new_gesture:true};
  });
  await check("Subtarea conserva padre y estado propio; histórica no cambia otros atributos",async()=>{
    const id=data.editing_child,before=await snapshot(a,id);
    await drag(a,id,40);await confirmed(a,"Hija independiente editable QA");const after=await snapshot(a,id);
    assert.equal(after.parent_id,before.parent_id);assert.equal(after.state_code,before.state_code);
    await locate(a,data.editing_historical);
    assert.equal(await bar(a,data.editing_historical).count(),1);
    return {parent:after.parent_id,state:after.state_code,historical_bar:true};
  });
  await check("Sin límite sin barra; detalle compartido edita calendario y sincroniza vistas",async()=>{
    const id=data.editing_null;
    await locate(a,id);await row(a,id).getByText("Sin fecha límite",{exact:true}).waitFor();
    assert.equal(await bar(a,id).isVisible(),false);
    await row(a,id).getByRole("button",{name:"Abrir tarea Sin límite editable QA",exact:true}).click();
    const dialog=a.page.locator("dialog[open]");await dialog.locator('section[aria-label="Propiedades de la tarea"]').waitFor();
    await dialog.locator("button[id$='-due_date']").click();
    const panel=a.page.locator(":popover-open");await panel.waitFor();await panel.locator("[data-date='"+shift(data.today,3)+"']").click();
    const waiting=a.page.waitForResponse((reply)=>new URL(reply.url()).pathname===resource(id)&&reply.request().method()==="PATCH");
    await panel.getByRole("button",{name:"Guardar",exact:true}).click();const reply=await waiting;assert.equal(reply.status(),200);
    remember(id,reply.request().postDataJSON(),await reply.json());
    await a.page.keyboard.press("Escape");await a.page.keyboard.press("Escape");
    await locate(a,id);await bar(a,id).waitFor(); const saved=await snapshot(a,id);
    await a.page.reload();await a.page.getByRole("combobox",{name:"Localizar tarea",exact:true}).waitFor();await locate(a,id);
    await row(a,id).locator("time[datetime='"+saved.due_date+"']").waitFor();
    await a.page.goto(origin+"/proyectos/"+project+"?vista=lista");await a.page.locator(".gm-task-list").waitFor();
    const listRow=a.page.locator("tr[data-task-id='"+id+"']").first();await listRow.waitFor();
    await listRow.locator("button[id$='-due_date']").click();await a.page.locator(":popover-open [data-date='"+saved.due_date+"'][aria-selected='true']").waitFor();
    await a.page.keyboard.press("Escape");
    await a.page.getByRole("link",{name:"Tablero",exact:true}).click();
    await a.page.getByText("Sin límite editable QA",{exact:true}).first().waitFor();
    await a.page.getByText("Sin límite editable QA",{exact:true}).first().click();
    await a.page.locator("dialog[open]").waitFor();
    await a.page.locator("dialog[open] button[id$='-due_date']").click();
    await a.page.locator(":popover-open [data-date='"+saved.due_date+"'][aria-selected='true']").waitFor();
    await a.page.keyboard.press("Escape");await a.page.keyboard.press("Escape");await gantt(a);
    return {null_no_fictitious_bar:true,shared_detail_save:true,gantt_list_board_detail:true,persisted_after_reload:true};
  });
  await check("Escalas semana y mes conservan duración y realizan una sola operación",async()=>{
    const id=data.editing_second;
    for(const scale of ["week","month"]){
      await a.page.getByRole("combobox",{name:"Escala de Gantt",exact:true}).selectOption(scale);
      const before=await snapshot(a,id),count=requests.length;
      await drag(a,id,scale==="week"?96:20);await confirmed(a,"Otra barra editable QA");
      const after=await snapshot(a,id);
      const diff=(from,to)=>{const [y,m,d]=from.split("-").map(Number),[yy,mm,dd]=to.split("-").map(Number);return (Date.UTC(yy,mm-1,dd)-Date.UTC(y,m-1,d))/86400000;};
      assert.equal(diff(before.start_date,before.due_date),diff(after.start_date,after.due_date));
      assert.equal(requests.length,count+1);
    }
    await a.page.getByRole("combobox",{name:"Escala de Gantt",exact:true}).selectOption("day");
    return {scales:["week","month"],span_preserved:true,writes_per_gesture:1};
  });
  await check("Volver a Gantt durante una escritura conserva bloqueo visible por tarea",async()=>{
    const id=data.editing_one,gate=deferred(),entered=deferred();
    await a.page.route(patchPattern(id),async(route)=>{entered.resolve();await gate.promise;await route.continue();},{times:1});
    await begin(a,id,40);await a.page.mouse.up();await entered.promise;
    await a.page.getByRole("link",{name:"Lista",exact:true}).click();await a.page.locator(".gm-task-list").waitFor();
    await a.page.getByRole("link",{name:"Gantt",exact:true}).click();await a.page.getByRole("combobox",{name:"Localizar tarea",exact:true}).waitFor();
    await locate(a,id);assert.equal(await bar(a,id).getAttribute("data-calendar-pending"),"true");
    const count=requests.length;await begin(a,id,40);await a.page.mouse.up();assert.equal(requests.length,count);
    await drag(a,data.editing_second,40);await confirmed(a,"Otra barra editable QA");
    const waiting=a.page.waitForResponse((reply)=>new URL(reply.url()).pathname===resource(id)&&reply.request().method()==="PATCH");
    gate.resolve();assert.equal((await waiting).status(),200);
    await a.page.waitForFunction((id)=>!globalThis.document.querySelector(".gm-gantt-bar[data-gantt-calendar-task='"+id+"']")?.hasAttribute("data-calendar-pending"),id);
    await drag(a,id,40);await confirmed(a,"Un día editable QA");
    return {remount_pending_visible:true,duplicate_blocked:true,other_task_available:true,released_after_confirmation:true};
  });
  await check("Desmontaje con gesto activo no escribe y el nuevo montaje queda disponible",async()=>{
    const count=requests.length;await begin(a,data.editing_one,40);
    await a.page.getByRole("link",{name:"Lista",exact:true}).focus();await a.page.keyboard.press("Enter");
    await a.page.locator(".gm-task-list").waitFor();await a.page.mouse.up();
    assert.equal(requests.length,count);
    await gantt(a);await drag(a,data.editing_one,-40);await confirmed(a,"Un día editable QA");
    return {unmount_canceled:true,restart:true};
  });
  await check("Cambio de proyecto y cierre de sesión descartan respuestas de otro ámbito",async()=>{
    const client=await session("admin_chunk");await gantt(client);
    for(const action of ["project","logout"]){
      const id=data.editing_one,gate=deferred(),entered=deferred();
      await client.page.route(patchPattern(id),async(route)=>{
        const response=await route.fetch();assert.equal(response.status(),200);remember(id,route.request().postDataJSON(),await response.json());
        entered.resolve();await gate.promise;await route.fulfill({response}).catch(()=>{});
      },{times:1});
      await begin(client,id,40);await client.page.mouse.up();await entered.promise;
      if(action==="project"){
        await gantt(client,data.readonly_project);gate.resolve();
        await row(client,data.readonly_task).waitFor();
        assert.equal(await client.page.getByRole("heading",{name:"Un día editable QA",exact:true}).count(),0);
        await gantt(client);
      }else{
        await client.page.getByRole("button",{name:"Abrir menú de perfil"}).click();
        await client.page.getByRole("menuitem",{name:"Cerrar sesión",exact:true}).click();
        await client.page.getByRole("button",{name:"Ingresar",exact:true}).waitFor();gate.resolve();
        assert.equal(await client.page.locator(".gm-task-gantt").count(),0);
      }
    }
    return {old_project_response_discarded:true,logout_response_discarded:true};
  });
  assert.deepEqual(errors,[]);
  await a.page.screenshot({path:path.join(output,"03_calendario_confirmado.png")});
} catch(error) {
  records.push({name:current,status:"Fallido",error:error.stack?.slice(0,1800)??String(error)});process.exitCode=1;console.error(error);
  if(a){await a.page.screenshot({path:path.join(output,"fallo.png")}).catch(()=>{});await writeFile(path.join(output,"fallo.txt"),await a.page.locator("body").innerText()).catch(()=>{});}
} finally {
  if(b){
    const ids=[...new Set([...accepted.values()].map(entry=>entry.task_id))],final={};
    for(const id of ids){try{const task=await snapshot(b,id);final[id]={start_date:task.start_date,due_date:task.due_date,calendar_revision:task.calendar_revision};}catch(error){errors.push({name:"final-ledger",message:error.message});process.exitCode=1;}}
    await writeFile(path.join(output,"calendar-ledger.json"),JSON.stringify({accepted_intents:[...accepted.values()],final_calendars:final},null,2));
  }
  await writeFile(path.join(output,"browser.json"),JSON.stringify({date:new Date().toISOString(),records,traffic,requests,errors},null,2));
  for(const client of clients)await client.context.close();await browser.close();
}
