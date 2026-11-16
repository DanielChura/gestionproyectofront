import type { ProjectCreationEditor } from "./useProjectCreation";
export default function ProjectPermissions({ editor, }: {
    editor: ProjectCreationEditor;
}) {
    const { draft, fields, update } = editor;
    return (<div className="grid gap-1.5 border-y border-neutral-200 py-3 dark:border-neutral-700">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">Permiso de Trabajador</span>
        <button id="project-permission" type="button" role="switch" aria-label="Permitir edición en el proyecto" aria-checked={draft.workerContribute} aria-invalid={!!fields.worker_contribute} aria-describedby="project-permission-hint" onClick={() => update({ workerContribute: !draft.workerContribute })} className="w-11 shrink-0 cursor-pointer rounded-lg bg-neutral-300 p-1 aria-checked:bg-neutral-800 dark:bg-neutral-700 dark:aria-checked:bg-neutral-100">
          <span aria-hidden="true" className="block size-4 rounded-full bg-white in-aria-checked:ml-auto dark:in-aria-checked:bg-neutral-800"/>
        </button>
      </div>
      <span className="font-medium">
        {draft.workerContribute ? "Edición" : "Solo lectura"}
      </span>
      <p id="project-permission-hint" className="text-neutral-600 dark:text-neutral-400">
        {draft.workerContribute
            ? "Permite a participantes crear tareas propias y cambiar estados autorizados. No permite editar otros datos ni asignar responsables."
            : "Permite consultar la información autorizada, sin crear tareas ni cambiar estados."}
      </p>
      {fields.worker_contribute && (<p role="alert" className="text-red-700 dark:text-red-400">
          {fields.worker_contribute}
        </p>)}
    </div>);
}
