import ProjectTextFields from "./ProjectTextFields";
import ProjectEndDateSelector from "../task-fields/ProjectEndDateSelector";
import ProjectAreaSelector from "./ProjectAreaSelector";
import type { ProjectCreationEditor } from "./useProjectCreation";
export default function ProjectGeneralFields({
  editor,
  onConfigure,
  flowName,
}: {
  editor: ProjectCreationEditor;
  onConfigure: () => void;
  flowName: string;
}) {
  const { draft, catalogs, fields, update } = editor;
  return (
    <>
      <ProjectTextFields editor={editor} />
      <div
        className="flex flex-wrap items-start gap-2"
        aria-label="Características del proyecto"
      >
        <ProjectAreaSelector
          options={catalogs.data?.areas ?? []}
          selected={draft.areaIds}
          error={fields.area_ids}
          onChange={(areaIds) => update({ areaIds })}
        />
        <ProjectEndDateSelector
          fitViewport
          value={draft.endDate}
          min={catalogs.data?.creation_date}
          error={fields.end_date}
          onChange={(endDate) => update({ endDate })}
        />
      </div>
      <div
        id="project-flow"
        tabIndex={-1}
        aria-invalid={!!fields.initial_task_states}
        className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-700"
      >
        <div>
          <span>Flujo de tareas</span>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            {flowName} ·{" "}
            {draft.initialTaskStates?.length ??
              catalogs.data?.states.length ??
              0}{" "}
            estados
          </p>
        </div>
        <button
          type="button"
          onClick={onConfigure}
          className="cursor-pointer rounded-md border border-neutral-200 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Configurar
        </button>
        {fields.initial_task_states && (
          <p role="alert" className="basis-full text-red-700 dark:text-red-400">
            {fields.initial_task_states}
          </p>
        )}
      </div>
    </>
  );
}
