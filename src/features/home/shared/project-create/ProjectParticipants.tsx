import type { ProjectCreationEditor } from "./useProjectCreation";
import ProjectPermissions from "./ProjectPermissions";
import ProjectMemberPicker from "./ProjectMemberPicker";
export default function ProjectParticipants({ editor, }: {
    editor: ProjectCreationEditor;
}) {
    const { draft, update, fields } = editor;
    return (<>
      <div className="grid min-w-0 gap-1 break-words">
        <p className="text-sm font-medium">{draft.name}</p>
        <p className="text-neutral-600 dark:text-neutral-400">
          {editor.catalogs.data?.areas.find((area) => area.id === draft.areaIds[0])?.name}
        </p>
      </div>
      <ProjectPermissions editor={editor}/>
      <div className={draft.mode === "assigned"
            ? "grid items-start gap-4 sm:grid-cols-2"
            : "grid items-start gap-4"}>
        <fieldset id="project-mode" tabIndex={-1} aria-invalid={!!fields.mode} className="grid min-w-0 content-start gap-2.5 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
          <legend className="px-1 font-medium">Modalidad</legend>
          <label className="flex cursor-pointer items-start gap-2">
            <input type="radio" name="mode" checked={draft.mode === "available"} onChange={() => update({ mode: "available", workerIds: [], teamIds: [] })}/>
            <span>
              Publicar proyecto disponible
              <small className="mt-1 block text-neutral-600 dark:text-neutral-400">
                Visible para trabajadores autorizados del área seleccionada. Sin
                asignaciones automáticas.
              </small>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2">
            <input type="radio" name="mode" checked={draft.mode === "assigned"} onChange={() => update({ mode: "assigned" })}/>
            <span>Crear proyecto con trabajadores asignados</span>
          </label>
          {fields.mode && (<p role="alert" className="text-red-700 dark:text-red-400">
              {fields.mode}
            </p>)}
        </fieldset>
        {draft.mode === "assigned" && <ProjectMemberPicker editor={editor}/>}
      </div>
    </>);
}
