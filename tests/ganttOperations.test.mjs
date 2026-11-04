import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { DataStore } from "@svar-ui/gantt-store";

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const plain=value=>JSON.parse(JSON.stringify(value));
const Empty=()=>null;
function hooks(){
 const slots=[],effects=[];let index=0;
 const memo=(fn,deps)=>{const slot=index++,old=slots[slot];if(!old||deps?.some((value,i)=>value!==old.deps[i]))slots[slot]={deps,value:fn()};return slots[slot].value;};
 return {
  react:{
   useState(initial){const slot=index++;if(!(slot in slots))slots[slot]=typeof initial==="function"?initial():initial;return [slots[slot],next=>{slots[slot]=typeof next==="function"?next(slots[slot]):next;}];},
   useRef(initial){const slot=index++;return slots[slot]??={current:initial};},
   useEffect(effect,deps){const slot=index++,old=slots[slot];if(!old||deps?.some((value,i)=>value!==old.deps[i])){old?.cleanup?.();const next={deps,cleanup:undefined};slots[slot]=next;effects.push(()=>{next.cleanup=effect();});}},
   useLayoutEffect(effect,deps){const slot=index++,old=slots[slot];if(!old||deps?.some((value,i)=>value!==old.deps[i])){old?.cleanup?.();const next={deps,cleanup:undefined};slots[slot]=next;effects.push(()=>{next.cleanup=effect();});}},
   useMemo:memo,useCallback:(fn,deps)=>memo(()=>fn,deps),useSyncExternalStore(_subscribe,get){return get();},
  },
  render(fn){index=0;const result=fn();while(effects.length)effects.shift()();return result;},
  unmount(){for(const slot of slots)slot?.cleanup?.();},
 };
}
async function load(file,dependencies={}){
 const source=ts.transpileModule(readFileSync(new URL("../src/features/projects/"+file,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const module=new vm.SourceTextModule(source);
 await module.link(name=>{
  const values={"react/jsx-runtime":runtime,...dependencies}[name];assert.ok(values,name);
  return new vm.SyntheticModule(Object.keys(values),function(){for(const [key,value]of Object.entries(values))this.setExport(key,value);});
 });
 await module.evaluate();return module.namespace;
}
function elements(element){
 if(Array.isArray(element))return element.flatMap(elements);
 if(!element||typeof element!=="object")return [];
 return [element,...elements(element.props?.children),...elements(element.props?.actions)];
}
const pick=(tree,predicate)=>{const result=elements(tree).find(predicate);assert.ok(result,"element expected");return result;};
const button=(tree,label)=>pick(tree,node=>node.type==="button"&&elements(node.props.children).length===0&&node.props.children===label);
const project={id:4,participants:[],start_date:"2026-10-01",end_date:"2026-12-31",permissions:{manage:true,create_tasks:true},task_states:{states:[{code:"PENDIENTE",category:"not_started"}]}};
const baseTask={id:7,name:"Tarea QA",parent_id:null,priority:3,start_date:"2026-10-31",due_date:null,calendar_revision:"9007199254740999",labels:[],assignees:[],transitions:[{target:"EN_CURSO"}],permissions:{edit:true,state:true,create_child:true,dependencies:true}};
const calendar={problem:null,current:null,blocked:false,save:(_values,send)=>send(_values)};
async function formHarness(onSubmit,onCheckCreation){
 const h=hooks();
 const {default:Form}=await load("TaskForm/TaskForm.tsx",{
  react:h.react,"../../auth/api":{errorText:error=>error.message},
  "../CalendarEditFeedback":{default:Empty},"../useTaskCalendarEdit":{calendarProblem:error=>error.status===503?"ambiguous":null,useTaskCalendarEdit:()=>calendar},
  "../LabelList/LabelList":{default:Empty},"../TaskStatusConfiguration/TaskStatusConfiguration":{default:Empty},
  "../formErrors":{apiFieldErrors:error=>error.fields??{}},"../labelSelection":{labelSelection:()=>({labels:[]})},"../taskAssignees":{taskAssignees:()=>[]},
  "./TaskProperties":{default:Empty},"./taskDates":{taskCreationStart:()=>"2026-10-31"},
 });
 const props={project,catalogs:{priorities:[{code:3}]},onSubmit,onCheckCreation,onClose(){},onConfigured(){}};
 const render=()=>h.render(()=>Form(props));
 function name(value){pick(render(),node=>node.props?.id==="task-name").props.onChange({target:{value}});}
 const submit=()=>pick(render(),node=>node.type==="form").props.onSubmit({preventDefault(){}});
 return {...h,render,name,submit};
}

test("Gantt actions expose only authorized existing capabilities and route to shared forms",async()=>{
 const {default:Actions}=await load("TaskGantt/TaskGanttActions.tsx");
 const calls=[],props={task:baseTask,onOpenTask:(...args)=>calls.push(args),onAction:(...args)=>calls.push(args)};
 const tree=Actions(props),markup=renderToStaticMarkup(tree);
 for(const label of ["Abrir detalle","Editar datos","Cambiar estado","Crear subtarea","Gestionar dependencias"])assert.match(markup,new RegExp(label));
 for(const node of elements(tree).filter(node=>node.type==="button"))node.props.onClick();
 assert.deepEqual(calls,[[7],["edit",7],["state",7],["child",7],[7,"relations"]]);
 const readonly=Actions({...props,task:{...baseTask,permissions:{}}});
 assert.deepEqual(elements(readonly).filter(node=>node.type==="button").map(node=>node.props.children),["Abrir detalle", "Ver relaciones"]);
 const child=renderToStaticMarkup(Actions({...props,task:{...baseTask,parent_id:2,permissions:{...baseTask.permissions,dependencies:false}}}));
 assert.doesNotMatch(child,/Gestionar dependencias|progreso|avance|Duplicar|Eliminar|Hito/);
 const disabled=Actions({...props,disabled:true});
 assert.equal(button(disabled,"Editar datos").props.disabled,true);
 assert.equal(button(disabled,"Abrir detalle").props.disabled,undefined);
});

test("native progress, dependencies, duplication, deletion and reparenting cannot mutate the real MIT store",async()=>{
 const {bindGanttReadOnly}=await load("TaskGantt/ganttReadOnly.ts");
 const store=new DataStore();store.init({tasks:[{id:7,text:"Padre",open:true,start:new Date(2026,9,31),end:new Date(2026,10,2)},{id:8,text:"Hija",parent:7,start:new Date(2026,10,1),end:new Date(2026,10,2)}],links:[],durationUnit:"day",lengthUnit:"day",inclusiveEnd:true,scales:[{unit:"day",step:1,format:"%j"}]});
 const api={intercept:store.in.intercept.bind(store.in),detach:store.in.detach.bind(store.in)};
 const clean=bindGanttReadOnly(api);
 await store.in.exec("update-task",{id:7,task:{progress:100,type:"milestone"}});
 await store.in.exec("add-link",{link:{source:7,target:8,type:"e2s"}});
 await store.in.exec("copy-task",{id:7});await store.in.exec("delete-task",{id:7});await store.in.exec("move-task",{id:8,parent:0});
 assert.equal(store.getTask(7).type,"task");assert.notEqual(store.getTask(7).progress,100);
 assert.equal(store.getTask(8).parent,7);assert.equal(store.getState()._tasks.length,2);assert.equal(store.getState()._links.length,0);clean();
});

test("shared task creation admits one pending request and preserves the draft on a known rejection",async()=>{
 const first=deferred(),calls=[];
 const h=await formHarness(data=>{calls.push(plain(data));return first.promise;});
 h.name("Crear QA");
 const one=h.submit(),two=h.submit();assert.equal(calls.length,1);assert.equal(calls[0].parent_id,null);assert.equal("expected_calendar_revision"in calls[0],false);
 first.reject(Object.assign(new Error("Nombre rechazado"),{fields:{"task-name":"Nombre rechazado"},status:400}));
 await Promise.all([one,two]);assert.equal(pick(h.render(),node=>node.props?.id==="task-name").props.value,"Crear QA");
 assert.equal(button(h.render(),"Crear tarea").props.disabled,false);h.unmount();
});

test("unknown creation outcome retains the draft and forbids another POST, including after consultation",async()=>{
 const calls=[],consulted=[];
 const h=await formHarness(data=>{calls.push(data);return Promise.reject(Object.assign(new Error("Respuesta perdida"),{status:503}));},async()=>{consulted.push(true);});
 h.name("No duplicar QA");await h.submit();await h.submit();
 assert.equal(calls.length,1);let tree=h.render();assert.equal(button(tree,"Crear tarea").props.disabled,true);
 assert.equal(pick(tree,node=>node.props?.id==="task-name").props.value,"No duplicar QA");
 button(tree,"Consultar tareas creadas").props.onClick();await flush();tree=h.render();
 assert.equal(consulted.length,1);assert.equal(button(tree,"Crear tarea").props.disabled,true);assert.equal(calls.length,1);h.unmount();
});

test("shared state form cannot double-send an independent state change",async()=>{
 const h=hooks(),wait=deferred(),calls=[];
 const {default:State}=await load("TaskStateForm/TaskStateForm.tsx",{react:h.react,"../../auth/api":{errorText:String},"../ProjectForm/ProjectForm":{default:Empty},"../ProjectForm/formClasses":{fieldClass:"",inputClass:"",labelClass:"",primaryButtonClass:""}});
 const render=()=>h.render(()=>State({task:baseTask,states:[{code:"EN_CURSO",name:"En curso"}],onSubmit:data=>{calls.push(plain(data));return wait.promise;}}));
 pick(render(),node=>node.type==="select").props.onChange({target:{value:"EN_CURSO"}});
 const tree=render(),one=tree.props.onSubmit({preventDefault(){}}),two=tree.props.onSubmit({preventDefault(){}});
 assert.deepEqual(calls,[{state_code:"EN_CURSO"}]);wait.resolve();await Promise.all([one,two]);h.unmount();
});

async function relationHarness(){
 const h=hooks(),calls=[],changed=[],wait=deferred();let current=true,ticket=1;
 const sync={isCurrent:()=>current,token:()=>ticket};
 const services={changeDependency:(...args)=>{calls.push(args);return wait.promise;},createTaskRelation:()=>wait.promise,removeTaskRelation:()=>wait.promise,searchRelatedTasks(){}};
 const {useRelationMutation}=await load("TaskDetail/useTaskRelations.ts",{"../useTaskCalendarEdit":{calendarProblem:error=>error.status===503?"ambiguous":null},react:h.react,"../services":services,"../../auth/api":{errorText:error=>error.message},"../useTaskSync":{useTaskSync:()=>sync},"./useTaskDetail":{useTaskPage(){}}});
 const render=()=>h.render(()=>useRelationMutation({projectId:4,taskId:7},async id=>{changed.push(id);}));
 return {...h,calls,changed,wait,render,invalidate(){current=false;ticket++;}};
}
test("an ambiguous dependency response retains context and blocks another mutation in that intention",async()=>{
 const h=await relationHarness();const one=h.render().link("blocks",8,"");
 h.wait.reject(Object.assign(new Error("Respuesta perdida"),{status:503}));assert.equal(await one,false);
 assert.equal(h.render().uncertain,true);assert.equal(await h.render().link("blocks",8,""),false);
 assert.equal(await h.render().unlink({kind:"blocks",successor_id:8,predecessor_id:7,target_id:8}),false);
 assert.equal(h.calls.length,1);assert.deepEqual(h.changed,[]);
 assert.equal(await h.render().consult(),true);assert.equal(h.calls.length,1);assert.deepEqual(h.changed,[8]);assert.equal(h.render().uncertain,false);h.unmount();
});

test("dependency mutations retain directed IDs, guard duplicate dispatch and reconcile only after success",async()=>{
 const h=await relationHarness();const model=h.render();
 const one=model.link("blocks",8,""),two=model.link("blocks",8,"");
 assert.deepEqual(h.calls,[[4,8,7,false]]);assert.equal(await two,false);assert.deepEqual(h.changed,[]);
 h.wait.resolve();assert.equal(await one,true);assert.deepEqual(h.changed,[8]);h.unmount();
 const reverse=await relationHarness();const removal=reverse.render().unlink({kind:"blocked_by",successor_id:7,predecessor_id:8,target_id:8});
 assert.deepEqual(reverse.calls,[[4,7,8,true]]);reverse.wait.resolve();assert.equal(await removal,true);reverse.unmount();
});

test("failed or out-of-scope dependency responses preserve context without optimistic links or late callbacks",async()=>{
 const failed=await relationHarness();const action=failed.render().link("blocked_by",8,"");failed.wait.reject(new Error("Ciclo rechazado"));assert.equal(await action,false);
 assert.deepEqual(failed.changed,[]);assert.equal(failed.render().error,"Ciclo rechazado");failed.unmount();
 for(const finish of ["unmount","session"]){
  const h=await relationHarness(),pending=h.render().link("blocks",8,"");
  if(finish==="unmount")h.unmount();else h.invalidate();
  h.wait.resolve();assert.equal(await pending,false);assert.deepEqual(h.changed,[]);h.unmount();
 }
});

test("opening dependencies uses the existing detail navigation and normal navigation clears that focus intent",async()=>{
 const h=hooks();
 const {useTaskDetailNavigation}=await load("TaskDetail/useTaskDetail.ts",{react:h.react,"../../auth/api":{errorText:String},"../services":{changeTaskState(){},getTaskActivity(){},getTaskDetail(){},getTaskRelations(){},getTaskSubtasks(){}},"../useTaskSync":{useTaskSync(){}}});
 const render=()=>h.render(useTaskDetailNavigation);
 render().openTaskDetail({projectId:4,taskId:7},"relations");assert.equal(render().initialSection,"relations");assert.equal(render().target.taskId,7);
 render().openTaskDetail({projectId:4,taskId:8});assert.equal(render().initialSection,undefined);assert.equal(render().target.taskId,8);
 render().closeTaskDetail();assert.equal(render().target,null);h.unmount();
});

async function detailHarness() {
 const h=hooks(),reads=[],confirmations=[],updated=[],server=new Map([7,8,9,10].map(id=>[id,{...baseTask,id,name:"Tarea "+id,dependencies:[]}]));
 let failure=null,held=null;
 const sync={isCurrent:()=>true,token:()=>1,guard(){},read:load=>load(),observe:task=>task,observeMany:tasks=>tasks,current:task=>task,
  confirmMany:tasks=>{confirmations.push(tasks.map(task=>task.id));return tasks;},subscribe:()=>()=>{},getVersion:()=>0};
 const services={
  getTaskDetail:async({taskId})=>{reads.push(taskId);if(failure===taskId){failure=null;throw new Error("Consulta fallida");}
   if(held?.id===taskId)await held.gate.promise;
   return {task:server.get(taskId),parent:null};},
  getTaskActivity:async()=>({items:[],next_cursor:null}),getTaskRelations:async()=>({items:[],next_cursor:null}),
  getTaskSubtasks:async()=>({items:[],next_cursor:null,total:0,completed:0}),changeTaskState(){},
 };
 const {useTaskDetail}=await load("TaskDetail/useTaskDetail.ts",{react:h.react,"../../auth/api":{errorText:error=>error.message},"../services":services,"../useTaskSync":{useTaskSync:()=>sync}});
 const render=(taskId=7)=>h.render(()=>useTaskDetail({projectId:4,taskId},task=>updated.push(task)));
 return {...h,reads,updated,confirmations,server,render,fail(id){failure=id;},hold(id){const gate=deferred();held={id,gate};return gate;}};
}

test("post-write reconciliation failure retains a targeted read retry even if the relation page succeeds",async()=>{
 const h=await detailHarness();h.render();await flush();
 h.server.set(8,{...h.server.get(8),dependencies:[7]});
 h.fail(8);let model=h.render();const start=h.reads.length;await model.relationsChanged(8);await flush();model=h.render();
 assert.deepEqual(h.reads.slice(start),[7,8]);assert.match(model.relations.error,/El vínculo se guardó/);
 assert.equal(model.detail.error,"");assert.deepEqual(h.updated,[]);
 const retry=h.reads.length;await model.retryRelations();await flush();model=h.render();
 assert.deepEqual(h.reads.slice(retry),[7,8]);assert.equal(model.relations.error,"");
 assert.deepEqual(h.confirmations,[[7,8]]);assert.deepEqual(h.updated.find(task=>task.id===8).dependencies,[7]);
 const completed=h.reads.length;await model.retryRelations();assert.equal(h.reads.length,completed);
 h.unmount();
});

test("late relation reconciliation from an earlier identity neither updates nor blocks the new identity",async()=>{
 const h=await detailHarness();h.render();await flush();
 const gate=h.hold(8),old=h.render().relationsChanged(8);
 h.render(9);await flush();const current=h.render(9);
 await current.relationsChanged(10);assert.deepEqual(h.confirmations,[[9,10]]);
 gate.resolve();await old;await flush();assert.deepEqual(h.confirmations,[[9,10]]);
 assert.deepEqual(h.updated.map(task=>task.id),[9,10]);h.unmount();
});
