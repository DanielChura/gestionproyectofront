import Input from "../../../../shared/components/Input/Input";
import type { ProjectCreationEditor } from "./useProjectCreation";
export default function ProjectTextFields({ editor, }: {
    editor: ProjectCreationEditor;
}) {
    const { draft, fields, update } = editor;
    return (<>
      <div className="grid min-w-0 content-start gap-1.5">
        <label htmlFor="project-name">Nombre *</label>
        <Input id="project-name" data-initial-focus name="name" autoComplete="off" required maxLength={180} value={draft.name} aria-invalid={!!fields.name} aria-describedby={fields.name ? "project-name-error" : undefined} onChange={(event) => update({ name: event.target.value })}/>
        {fields.name && (<p id="project-name-error" role="alert" className="text-red-700 dark:text-red-400">
            {fields.name}
          </p>)}
      </div>
      <div className="grid min-w-0 content-start gap-1.5">
        <label htmlFor="project-description">
          Descripción{" "}
          <span className="text-neutral-600 dark:text-neutral-400">
            (opcional)
          </span>
        </label>
        <textarea id="project-description" name="description" rows={2} maxLength={10000} value={draft.description} aria-invalid={!!fields.description} aria-describedby={fields.description ? "project-description-error" : undefined} onChange={(event) => update({ description: event.target.value })} className="w-full min-w-0 resize-y rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"/>
        {fields.description && (<p id="project-description-error" role="alert" className="text-red-700 dark:text-red-400">
            {fields.description}
          </p>)}
      </div>
    </>);
}
