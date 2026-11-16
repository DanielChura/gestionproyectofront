import Button from "../../../../shared/components/Button/Button";
import type { ProjectCreationEditor } from "./useProjectCreation";
export default function ProjectCreationFooter({ editor, }: {
    editor: ProjectCreationEditor;
}) {
    return (<footer className="shrink-0 border-t border-neutral-200 bg-white px-6 py-3 dark:border-neutral-700 dark:bg-neutral-900 max-sm:px-4">
      {editor.error && (<p role="alert" data-project-error tabIndex={-1} className="mb-3 break-words text-red-700 dark:text-red-400">
          {editor.error}
        </p>)}
      {editor.ambiguous && (<div className="mb-3 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void editor.check()}>
            Consultar antes de reintentar
          </Button>
          {editor.checked && (<Button type="button" onClick={editor.authorizeRetry}>
              Autorizar nueva creación
            </Button>)}
        </div>)}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {editor.step === 2 && (<button type="button" disabled={editor.busy || editor.ambiguous} onClick={() => editor.setStep(1)} className="cursor-pointer rounded-lg border border-neutral-200 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
            Volver
          </button>)}
        <Button type="submit" disabled={editor.busy || editor.ambiguous || !editor.catalogs.data}>
          {editor.busy
            ? "Creando…"
            : editor.step === 1
                ? "Continuar"
                : editor.draft.mode === "available"
                    ? "Publicar dentro del sistema"
                    : "Crear con asignados"}
        </Button>
      </div>
    </footer>);
}
