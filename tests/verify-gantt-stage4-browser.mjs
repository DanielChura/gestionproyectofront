import { observeGanttCollections, waitGantt, selectGanttTask, ganttFilter } from "./ganttBrowserControls.mjs";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.env.GM_PLAYWRIGHT_MODULE).href);
const secrets=JSON.parse(await readFile(process.env.GM_QA_SECRETS_PATH,"utf8"));
const data=secrets.context, output=process.env.GM_BROWSER_REPORT_DIR;
const baseline=JSON.parse(await readFile(path.join(output,"operations-baseline.json"),"utf8"));
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:"chrome",headless:true});
const origin="http://localhost:5189",project=data.operations_project;
const clients=[],records=[],traffic=[],writes=[],errors=[],created=new Set(),names=[],touched=new Set();
let a,b,current="",newRoot,newChild;
const url=(id,pid=project)=>"/api/projects/"+pid+"/tasks/"+id+"/";
const collection="/api/projects/"+project+"/tasks/";
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
function observe(page,role){
 page.on("pageerror",error=>errors.push({role,message:error.message.slice(0,400)}));
 page.on("request",request=>{
  const pathname=new URL(request.url()).pathname;
  if(pathname.startsWith("/api/projects/")&&request.method()!=="GET")writes.push({role,path:pathname,method:request.method(),payload:request.postDataJSON()});
 });
 page.on("response",async response=>{const pathname=new URL(response.url()).pathname;if(pathname.startsWith("/api/")){const entry={role,path:pathname,method:response.request().method(),status:response.status()};traffic.push(entry);if(entry.method==="GET"&&response.status()===200&&/\/tasks\/\d+\/$/.test(pathname)){const result=await response.json().catch(()=>null);if(result?.task)entry.task={id:result.task.id,dependencies:result.task.dependencies,updated_at:result.task.updated_at,calendar_revision:result.task.calendar_revision};}}});
}
async function login(role){
 const context=await browser.newContext({viewport:{width:1800,height:1100},timezoneId:"America/Lima"});
 const page=await context.newPage(); observeGanttCollections(page);page.setDefaultTimeout(16000);clients.push({context,page});observe(page,role);
 await page.goto(origin);await page.getByLabel("Correo electrónico",{exact:true}).fill(secrets[role].email);
 await page.getByLabel("Contraseña",{exact:true}).fill(secrets[role].password);
 const waiting=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/auth/login/"&&r.request().method()==="POST");
 await page.getByRole("button",{name:"Ingresar",exact:true}).click();const reply=await waiting;assert.equal(reply.status(),200);
 await page.getByRole("button",{name:"Abrir menú de perfil"}).waitFor();return {page,context,role,token:(await reply.json()).access};
}
async function api(client,resource,method="GET",payload){
 const csrf=(await client.context.cookies()).find(cookie=>cookie.name==="csrftoken")?.value;
 const reply=await client.context.request.fetch(origin+resource,{method,headers:{Authorization:"Bearer "+client.token,Origin:origin,...(csrf?{"X-CSRFToken":csrf}:{})},data:payload,maxRetries:0});
 return {status:reply.status(),body:reply.status()===204?null:await reply.json()};
}
async function snapshot(client,id){const reply=await api(client,url(id));assert.equal(reply.status,200);return reply.body.task;}
async function gantt(client,pid=project){
 await client.page.goto(origin+"/proyectos/"+pid+"?vista=gantt");
 await client.page.getByRole("button",{name:"Abrir menú de perfil"}).waitFor();
 if(pid!==data.empty_project){await waitGantt(client.page);await client.page.locator(".gm-task-gantt .wx-row[data-id]").first().waitFor();}
}
const action=client=>client.page.getByRole("region",{name:"Acciones de la tarea seleccionada",exact:true});
const dialog=client=>client.page.locator("dialog[open]");
const graph=client=>client.page.getByRole("region",{name:"Dependencias de la tarea seleccionada",exact:true});
async function select(client,id){await selectGanttTask(client.page, String(id), {calendar:false,search:true});const clear=client.page.getByRole("button",{name:"Limpiar búsqueda",exact:true});if(await clear.count())await clear.click();await action(client).waitFor();}
async function open(client,id,dependencies=false){
 await select(client,id);await action(client).getByRole("button",{name:dependencies?"Gestionar dependencias":"Abrir detalle",exact:true}).click();
 await dialog(client).locator('section[aria-label="Propiedades de la tarea"]').waitFor();
 if(dependencies)await dialog(client).getByRole("region",{name:"Relaciones",exact:true}).waitFor();
}
async function close(client){await dialog(client).getByRole("button",{name:"Cerrar detalle de tarea",exact:true}).click();await dialog(client).waitFor({state:"hidden"});}
function response(page,resource,method){return page.waitForResponse(reply=>new URL(reply.url()).pathname===resource&&reply.request().method()===method);}
async function property(client,field){await dialog(client).locator("button[id$='-"+field+"']").click();const panel=client.page.locator(":popover-open");await panel.waitFor();return panel;}
async function saveProperty(client,panel,id,method="PATCH",status=200){
 const waiting=response(client.page,url(id)+(method==="POST"?"state/":""),method);
 await panel.getByRole("button",{name:/^(Guardar|Reintentar)$/,exact:true}).last().click();const reply=await waiting;assert.equal(reply.status(),status);return reply;
}
async function picker(client,kind){
 const section=dialog(client).getByRole("region",{name:"Relaciones",exact:true});
 await section.getByRole("button",{name:/^Relacionar elementos o añadir dependencias/}).click();
 const panel=client.page.locator(":popover-open");await panel.getByRole("button",{name:kind==="blocks"?"Esta tarea bloquea...":"Esta tarea está bloqueada por...",exact:true}).click();
 await panel.getByRole("searchbox",{name:"Buscar tareas",exact:true}).waitFor();return panel;
}
async function link(client,taskId,kind,otherId,otherName){
 const panel=await picker(client,kind);await panel.getByRole("searchbox",{name:"Buscar tareas",exact:true}).fill(otherName);
 const waiting=response(client.page,url(kind==="blocks"?otherId:taskId)+"dependencies/","POST");
 await panel.getByRole("button",{name:"Vincular "+otherName,exact:true}).click();const reply=await waiting;assert.equal(reply.status(),201);
 await client.page.locator(":popover-open").waitFor({state:"hidden"});
 await dialog(client).getByRole("region",{name:"Relaciones",exact:true}).getByRole("button",{name:otherName,exact:true}).waitFor();
 touched.add(taskId);touched.add(otherId);
}
async function create(client,name,parentId){
 if(parentId){await select(client,parentId);await action(client).getByRole("button",{name:"Crear subtarea",exact:true}).click();}
 else await client.page.getByRole("button",{name:"Crear nueva tarea",exact:true}).click();
 await client.page.locator("#task-name").fill(name);
 const waiting=response(client.page,collection,"POST");await dialog(client).getByRole("button",{name:parentId?"Crear subtarea":"Crear tarea",exact:true}).click({clickCount:2});
 const reply=await waiting;assert.equal(reply.status(),201);const saved=await reply.json();created.add(saved.id);touched.add(saved.id);names.push(name);
 await dialog(client).waitFor({state:"hidden"});return saved;
}
async function check(name,run){current=name;const details=await run();records.push({name,status:"Aprobado",details});console.log("OK "+name);}
const globalReads=()=>traffic.filter(item=>item.method==="GET"&&(item.path===collection||item.path==="/api/projects/"+project+"/")).length;
try{
 a=await login("admin");b=await login("admin_delay");await gantt(a);
 await check("Creación compartida en Gantt vacío y permisos de consulta",async()=>{
  await gantt(a,data.empty_project);await a.page.getByText("Este proyecto todavía no tiene tareas.",{exact:true}).waitFor();
  await a.page.getByRole("button",{name:"Crear nueva tarea",exact:true}).click();await a.page.locator("#task-name").waitFor();await dialog(a).getByRole("button",{name:"Cancelar",exact:true}).click();
  await gantt(a);assert.equal((await api(a,collection)).body.length,data.operations_count);
  return {empty_creation_available:true,no_writes_on_open:true};
 });
 await check("Crear tarea y subtarea con formularios compartidos, sin doble envío ni recarga global",async()=>{
  const before=globalReads(),count=writes.length;
  newRoot=await create(a,"Creación Gantt QA");
  newChild=await create(a,"Hija nueva Gantt QA",data.operations_root);
  assert.equal(newChild.parent_id,data.operations_root);assert.equal(writes.length,count+2);assert.equal(globalReads(),before);
  await select(a,newChild.id);await a.page.getByRole("button",{name:"Contraer subtareas de Principal de gestión QA",exact:true}).waitFor();
  return {created_ids:[newRoot.id,newChild.id],posts:2,global_reads:0};
 });
 await check("Creación rápida de subtarea desde el detalle compartido actualiza Gantt",async()=>{
  const before=globalReads();await open(a,data.operations_root);
  await dialog(a).getByRole("button",{name:"+ Añadir tarea",exact:true}).click();
  const form=dialog(a).getByRole("form",{name:"Creación rápida de tarea",exact:true});
  await form.getByRole("textbox",{name:"Nombre de la tarea",exact:true}).fill("Subtarea rápida Gantt QA");
  const waiting=response(a.page,collection,"POST");await form.getByRole("button",{name:"Guardar",exact:true}).click({clickCount:2});
  const reply=await waiting;assert.equal(reply.status(),201);const task=await reply.json();created.add(task.id);touched.add(task.id);names.push(task.name);
  assert.equal(task.parent_id,data.operations_root);await dialog(a).getByRole("button",{name:task.name,exact:true}).waitFor();
  await close(a);await select(a,task.id);await a.page.getByRole("button",{name:"Abrir tarea "+task.name,exact:true}).waitFor();
  assert.equal(globalReads(),before);return {shared_quick_creation:true,parent:task.parent_id,global_reads:0};
 });
 await check("Estado independiente, edición completa y propiedades compartidas sincronizadas",async()=>{
  const before=globalReads(),parent=await snapshot(a,data.operations_root);
  await select(a,newChild.id);await action(a).getByRole("button",{name:"Cambiar estado",exact:true}).click();
  await a.page.locator("#task-target").selectOption("EN_CURSO");
  const waiting=response(a.page,url(newChild.id)+"state/","POST");await dialog(a).getByRole("button",{name:"Cambiar estado",exact:true}).click({clickCount:2});assert.equal((await waiting).status(),200);
  await dialog(a).waitFor({state:"hidden"});assert.equal((await snapshot(a,data.operations_root)).state_code,parent.state_code);
  await select(a,newRoot.id);await action(a).getByRole("button",{name:"Editar datos",exact:true}).click();
  await a.page.locator("#task-name").fill("Creación Gantt QA editada");names[names.indexOf("Creación Gantt QA")]="Creación Gantt QA editada";
  const saved=response(a.page,url(newRoot.id),"PATCH");await dialog(a).getByRole("button",{name:"Guardar cambios",exact:true}).click();assert.equal((await saved).status(),200);await dialog(a).waitFor({state:"hidden"});
  await open(a,data.operations_root);let panel=await property(a,"priority");await panel.getByRole("button",{name:"Urgente",exact:true}).click();await saveProperty(a,panel,data.operations_root);
  panel=await property(a,"responsible_id");await panel.getByRole("button",{name:"Sin responsable",exact:true}).click();await saveProperty(a,panel,data.operations_root);
  panel=await property(a,"responsible_id");await panel.getByRole("button",{name:/Nombre sintético worker/}).click();await saveProperty(a,panel,data.operations_root);
  panel=await property(a,"labels");await panel.getByRole("button",{name:"Competencia remota QA",exact:true}).click();await saveProperty(a,panel,data.operations_root);
  touched.add(data.operations_root);
  const root=await snapshot(a,data.operations_root);assert.equal(root.priority,1);assert.equal(root.labels.some(label=>label.name==="Competencia remota QA"),true);
  assert.deepEqual(root.assignees.map(person=>person.id),[data.operations_worker]);assert.equal(globalReads(),before);
  await close(a);return {state_independent:true,edit_form:true,priority:root.priority,assignees:root.assignees.length,labels:root.labels.length,global_reads:0};
 });
 await check("Errores conocidos conservan el editor y no muestran cambios no guardados",async()=>{
  const id=data.operations_root,before=await snapshot(a,id);await open(a,id);const panel=await property(a,"priority");await panel.getByRole("button",{name:"Baja",exact:true}).click();
  await a.page.route("**"+url(id),route=>route.fulfill({status:400,contentType:"application/json",body:JSON.stringify({detail:"Prioridad rechazada QA"})}),{times:1});
  await saveProperty(a,panel,id,"PATCH",400);await panel.getByRole("alert").waitFor();assert.equal((await snapshot(a,id)).priority,before.priority);
  await saveProperty(a,panel,id);touched.add(id);await close(a);
  await a.page.getByRole("button",{name:"Crear nueva tarea",exact:true}).click();await a.page.locator("#task-name").fill("Crear después de validación QA");
  await a.page.route("**"+collection,async route=>route.request().method()==="POST"?route.fulfill({status:400,contentType:"application/json",body:JSON.stringify({name:["Nombre rechazado QA"]})}):route.continue(),{times:1});
  const waiting=response(a.page,collection,"POST");await dialog(a).getByRole("button",{name:"Crear tarea",exact:true}).click();assert.equal((await waiting).status(),400);
  assert.equal(await a.page.locator("#task-name").inputValue(),"Crear después de validación QA");
  const retry=response(a.page,collection,"POST");await dialog(a).getByRole("button",{name:"Crear tarea",exact:true}).click();const result=await retry;assert.equal(result.status(),201);
  const task=await result.json();created.add(task.id);touched.add(task.id);names.push(task.name);await dialog(a).waitFor({state:"hidden"});
  return {property_400_preserved:true,creation_draft_preserved:true,explicit_creation_after_validation:1};
 });
 await check("Dependencia desde tarea sin barra hacia otra fuera de rango, con candidato paginado",async()=>{
  const before=globalReads();await select(a,data.operations_null);
  assert.equal(await a.page.locator(".wx-bar[data-id='"+data.operations_null+"']").isVisible(),false);
  await action(a).getByRole("button",{name:"Gestionar dependencias",exact:true}).click();
  await dialog(a).getByRole("region",{name:"Relaciones",exact:true}).waitFor();
  const panel=await picker(a,"blocks");await panel.getByRole("button",{name:"Más tareas",exact:true}).waitFor();
  await panel.getByRole("button",{name:"Más tareas",exact:true}).click();
  await panel.getByRole("button",{name:"Vincular Principal fuera del rango QA",exact:true}).waitFor();
  const waiting=response(a.page,url(data.operations_outside)+"dependencies/","POST");
  const count=writes.length;await panel.getByRole("button",{name:"Vincular Principal fuera del rango QA",exact:true}).click({clickCount:2});assert.equal((await waiting).status(),201);
  await a.page.locator(":popover-open").waitFor({state:"hidden"});
  await dialog(a).getByRole("region",{name:"Relaciones",exact:true}).getByRole("button",{name:"Principal fuera del rango QA",exact:true}).waitFor();
  assert.equal(writes.length,count+1);touched.add(data.operations_null);touched.add(data.operations_outside);
  await close(a);await graph(a).getByRole("button",{name:"Localizar sucesora Principal fuera del rango QA",exact:true}).waitFor();
  assert.equal(globalReads(),before);assert.equal(await a.page.locator(".gm-task-gantt .wx-link").count(),0);
  return {null_accessible:true,outside_range_accessible:true,candidate_pagination:true,posts:1,global_reads:0,temporal_link_type_invented:false};
 });
 await check("Retiro confirmado, error conserva vínculo y no hay eliminación optimista",async()=>{
  await open(a,data.operations_null,true);const relations=dialog(a).getByRole("region",{name:"Relaciones",exact:true});
  await relations.getByRole("button",{name:"Desvincular",exact:true}).click();
  await a.page.route("**"+url(data.operations_outside)+"dependencies/",route=>route.fulfill({status:400,contentType:"application/json",body:JSON.stringify({detail:"Retiro rechazado QA"})}),{times:1});
  let waiting=response(a.page,url(data.operations_outside)+"dependencies/","DELETE");await relations.getByRole("button",{name:"Confirmar desvinculación",exact:true}).click();assert.equal((await waiting).status(),400);
  await relations.getByRole("alert").waitFor();assert.equal((await snapshot(a,data.operations_outside)).dependencies.includes(data.operations_null),true);
  waiting=response(a.page,url(data.operations_outside)+"dependencies/","DELETE");await relations.getByRole("button",{name:"Confirmar desvinculación",exact:true}).click({clickCount:2});assert.equal((await waiting).status(),204);
  await relations.getByRole("button",{name:"Principal fuera del rango QA",exact:true}).waitFor({state:"hidden"});await close(a);
  await graph(a).getByText("Sin dependencias visibles para esta tarea.",{exact:true}).waitFor();
  return {rejection_kept_edge:true,confirmed_delete:204,no_optimistic_edge:true};
 });
 await check("Dependencia informativa dirigida, autorreferencia, ciclos y ámbito rechazados por backend",async()=>{
  await open(a,data.operations_null,true);await link(a,data.operations_null,"blocked_by",data.operations_root,"Principal de gestión QA");await close(a);
  const before=(await api(a,collection)).body.map(task=>({id:task.id,start:task.start_date,due:task.due_date,state:task.state_code,parent:task.parent_id,rev:task.calendar_revision}));
  const invalid=[];
  for(const [successor,predecessor] of [[data.operations_root,data.operations_root],[data.operations_root,data.operations_null],[data.operations_null,data.operations_root],[data.operations_null,data.operations_child],[data.operations_null,data.readonly_task]]){
   invalid.push((await api(a,url(successor)+"dependencies/","POST",{predecessor_id:predecessor})).status);
  }
  assert.deepEqual(invalid,[400,400,400,400,404]);
  assert.deepEqual((await api(a,collection)).body.map(task=>({id:task.id,start:task.start_date,due:task.due_date,state:task.state_code,parent:task.parent_id,rev:task.calendar_revision})),before);
  await open(a,data.operations_null,true);const panel=await picker(a,"blocks");await panel.getByRole("searchbox",{name:"Buscar tareas",exact:true}).fill("Principal de gestión QA");
  await panel.getByText("No hay tareas elegibles que coincidan.",{exact:true}).waitFor();await a.page.keyboard.press("Escape");await close(a);
  return {rejections:invalid,no_dates_or_state_cascade:true,cycle_candidate_excluded:true};
 });
 await check("Creación con respuesta perdida conserva borrador y bloquea otro POST ambiguo",async()=>{
  const name="Creación con respuesta perdida QA",committed=deferred();
  await a.page.route("**"+collection,async route=>{
   if(route.request().method()!=="POST")return route.continue();
   const reply=await route.fetch();assert.equal(reply.status(),201);const task=await reply.json();created.add(task.id);touched.add(task.id);names.push(task.name);committed.resolve();await route.abort("failed");
  },{times:1});
  await a.page.getByRole("button",{name:"Crear nueva tarea",exact:true}).click();await a.page.locator("#task-name").fill(name);
  const count=writes.length;await dialog(a).getByRole("button",{name:"Crear tarea",exact:true}).click();await committed.promise;
  await dialog(a).getByText(/No se pudo confirmar la creación/).waitFor();assert.equal(await dialog(a).getByRole("button",{name:"Crear tarea",exact:true}).isDisabled(),true);
  assert.equal(await a.page.locator("#task-name").inputValue(),name);await dialog(a).getByRole("button",{name:"Consultar tareas creadas",exact:true}).click();
  await dialog(a).getByText(/Lista actualizada/).waitFor();assert.equal(writes.length,count+1);await dialog(a).getByRole("button",{name:"Cancelar",exact:true}).click();
  const all=(await api(a,collection)).body;assert.equal(all.filter(task=>task.name===name).length,1);
  return {lost_after_commit:true,draft_preserved:true,second_post_blocked:true,manual_consultation:true,one_task:true};
 });
 await check("Filtrar y recargar conserva padre, estados propios y propiedades entre vistas",async()=>{
  const task=await snapshot(a,newChild.id);assert.equal(task.parent_id,data.operations_root);assert.equal(task.state_code,"EN_CURSO");
  await ganttFilter(a.page, "Estado", "EN_CURSO");
  await a.page.getByRole("button",{name:"Abrir tarea Principal de gestión QA",exact:true}).waitFor();
  await a.page.getByRole("button",{name:"Abrir tarea Hija nueva Gantt QA",exact:true}).waitFor();
  await a.page.reload();await waitGantt(a.page);
  await select(a,newChild.id);await a.page.getByRole("button",{name:"Abrir tarea Hija nueva Gantt QA",exact:true}).waitFor();
  await a.page.getByRole("link",{name:"Lista",exact:true}).click();await a.page.locator(".gm-task-list").waitFor();
  const parent=a.page.locator("tr[data-task-id='"+data.operations_root+"']").first();
  const expand=parent.getByRole("button",{name:/Expandir/});if(await expand.count())await expand.first().click();
  await a.page.locator("tr[data-task-id='"+newChild.id+"']").first().waitFor();
  await a.page.getByRole("link",{name:"Tablero",exact:true}).click();await a.page.getByText("Hija nueva Gantt QA",{exact:true}).first().waitFor();
  await a.page.getByText("Principal de gestión QA",{exact:true}).first().click();await dialog(a).locator('section[aria-label="Propiedades de la tarea"]').waitFor();
  const root=await snapshot(a,data.operations_root);assert.equal(root.priority,4);assert.equal(root.labels[0].name,"Competencia remota QA");await close(a);
  await a.page.getByRole("link",{name:"Gantt",exact:true}).click();await waitGantt(a.page);
  await a.page.screenshot({path:path.join(output,"01_gestion_gantt.png")});
  return {gantt_list_board_detail:true,persisted_after_reload:true,own_state:true,parent_preserved:true};
 });
 await check("Acciones del trabajador respetan permisos, sin editor nativo ni progreso",async()=>{
  const worker=await login("worker");await gantt(worker);
  await select(worker,data.operations_root);
  assert.equal(await action(worker).getByRole("button",{name:"Gestionar dependencias",exact:true}).count(),0);
  const forbidden=await api(worker,url(data.operations_null)+"dependencies/","POST",{predecessor_id:data.operations_root});assert.equal(forbidden.status,403);
  await open(worker,data.operations_root);assert.equal(await dialog(worker).locator("button[id$='-responsible_id']").isDisabled(),true);
  const permissions=(await snapshot(worker,data.operations_root)).permissions;assert.equal(permissions.edit,true);
  const priority=await property(worker,"priority");await priority.getByRole("button",{name:"Normal",exact:true}).click();
  await saveProperty(worker,priority,data.operations_root);assert.equal((await snapshot(worker,data.operations_root)).priority,3);touched.add(data.operations_root);
  await close(worker);await gantt(worker,data.readonly_project);await select(worker,data.readonly_task);
  const buttons=await action(worker).getByRole("button").allTextContents();assert.deepEqual(buttons,["Abrir detalle"]);
  assert.equal(await worker.page.locator(".wx-gantt-editor,.wx-progress-marker,.wx-link-handle").count(),0);
  assert.equal(await worker.page.getByRole("button",{name:/Duplicar|Eliminar tarea|Hito|avance/i}).count(),0);
  await worker.page.screenshot({path:path.join(output,"02_permisos_gantt.png")});
  return {worker_dependencies:403,worker_priority:200,assignment_disabled:true,readonly_actions:buttons,native_editor:false,progress_not_inferred:true};
 });
 await check("Reconciliación fallida tras guardar un vínculo se recupera con lecturas dirigidas",async()=>{
  await open(a,data.operations_null,true);
  await a.page.route("**"+url(newRoot.id),async route=>route.request().method()==="GET"?route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({detail:"Lectura posterior no disponible QA"})}):route.continue(),{times:1});
  await link(a,data.operations_null,"blocks",newRoot.id,"Creación Gantt QA editada");
  const alert=dialog(a).getByRole("alert").filter({hasText:"El vínculo se guardó."});await alert.waitFor();
  const count=writes.length;
  await alert.getByRole("button",{name:"Reintentar",exact:true}).click();
  await dialog(a).getByText(/El vínculo se guardó/).waitFor({state:"hidden"});
  assert.equal(writes.length,count);await close(a);
  await graph(a).getByRole("button",{name:"Localizar sucesora Creación Gantt QA editada",exact:true}).waitFor();
  return {write_succeeded:true,reconciliation_error_visible:true,read_only_retry:true,confirmed_graph_recovered:true};
 });
 await check("Cerrar detalle durante una dependencia pendiente no aplica respuesta al siguiente contexto",async()=>{
  const entered=deferred(),gate=deferred();await open(a,data.operations_null,true);const panel=await picker(a,"blocks");
  await panel.getByRole("searchbox",{name:"Buscar tareas",exact:true}).fill("Principal fuera del rango QA");
  await a.page.route("**"+url(data.operations_outside)+"dependencies/",async route=>{const reply=await route.fetch();assert.equal(reply.status(),201);entered.resolve();await gate.promise;await route.fulfill({response:reply});},{times:1});
  await panel.getByRole("button",{name:"Vincular Principal fuera del rango QA",exact:true}).click();await entered.promise;
  await a.page.keyboard.press("Escape");await close(a);
  await open(a,data.operations_root);gate.resolve();
  await dialog(a).getByRole("button",{name:"Editar nombre: Principal de gestión QA",exact:true}).waitFor();
  touched.add(data.operations_null);touched.add(data.operations_outside);
  await close(a);await a.page.reload();await waitGantt(a.page);
  await select(a,data.operations_null);await graph(a).getByRole("button",{name:"Localizar sucesora Principal fuera del rango QA",exact:true}).waitFor();
  return {old_detail_response_discarded:true,server_result_visible_after_explicit_reload:true};
 });
 assert.deepEqual(errors,[]);
}catch(error){
 records.push({name:current,status:"Fallido",error:error.stack?.slice(0,2200)??String(error)});process.exitCode=1;console.error(error);
 if(a){await a.page.screenshot({path:path.join(output,"fallo.png")}).catch(()=>{});await writeFile(path.join(output,"fallo.txt"),await a.page.locator("body").innerText()).catch(()=>{});}
}finally{
 if(b){
  const tasks={};for(const id of touched){try{tasks[id]=await snapshot(b,id);}catch(error){errors.push({name:"ledger",message:error.message});process.exitCode=1;}}
  const dependencies=baseline.dependencies.map(edge=>({project_id:edge.project_id,predecessor_id:edge.predecessor_id,successor_id:edge.successor_id}));
  const currentTasks=(await api(b,collection)).body;
  for(const successor of currentTasks)for(const predecessor of successor.dependencies)dependencies.push({project_id:project,predecessor_id:predecessor,successor_id:successor.id});
  await writeFile(path.join(output,"operations-ledger.json"),JSON.stringify({tasks,created_ids:[...created],creation_names:names,dependencies,dependency_operations:traffic.filter(item=>item.path.endsWith("/dependencies/")&&(item.method==="POST"&&item.status===201||item.method==="DELETE"&&item.status===204))},null,2));
 }
 await writeFile(path.join(output,"browser-operations.json"),JSON.stringify({date:new Date().toISOString(),browser:browser.version(),records,traffic,writes,errors},null,2));
 for(const client of clients)await client.context.close();await browser.close();
}
