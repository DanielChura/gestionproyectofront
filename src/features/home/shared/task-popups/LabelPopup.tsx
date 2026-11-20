import { useState } from "react";
import type {
  EditTaskPayload,
  Label,
  ProjectCatalogs,
  Task,
} from "../../types";
import { labelSelection } from "../../utils/labelSelection";
import HashIcon from "../../../../shared/icons/HashIcon";
import LabelEditor from "../task-fields/LabelEditor";
import { usePopup } from "./usePopup";

export default function LabelPopup({
  catalogs,
  task,
  onPatch,
}: {
  catalogs: ProjectCatalogs;
  task: Task;
  onPatch: (task: Task, data: Partial<EditTaskPayload>) => Promise<void>;
}) {
  const { panel, trigger, open, setOpen } = usePopup();
  const [labels, setLabels] = useState<Label[]>(() => task.labels);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        title="Etiquetas"
        disabled={!task.permissions.edit}
        onClick={() => setOpen(!open)}
        className="inline-flex min-w-0 cursor-pointer items-center gap-1 rounded-md border border-neutral-200 p-1 text-xs hover:bg-neutral-100 disabled:cursor-default disabled:opacity-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
      >
        <HashIcon className="size-4" />
        {labels[0] && (
          <span className="truncate">
            {labels.length > 1
              ? `${labels[0].name} +${labels.length - 1}`
              : labels[0].name}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panel}
          className="fixed z-50 w-72 max-w-full overflow-y-auto rounded-md border border-neutral-200 bg-white p-2 text-xs text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
        >
          <LabelEditor
            title="Etiquetas de la tarea"
            labels={labels}
            specialties={catalogs.specialties}
            onChange={(next) => {
              const previous = labels;
              setLabels(next);
              void onPatch(task, labelSelection(next)).catch(() =>
                setLabels(previous),
              );
            }}
          />
        </div>
      )}
    </>
  );
}
