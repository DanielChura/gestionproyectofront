import Input from "../../../../shared/components/Input/Input";
import type { ProjectCreationEditor } from "./useProjectCreation";
export default function ProjectWorkerSearch({ editor, }: {
    editor: ProjectCreationEditor;
}) {
    const { workers } = editor;
    return (<>
      <label htmlFor="project-worker-search">Buscar trabajadores</label>
      <div className="flex min-w-0 gap-2">
        <Input id="project-worker-search" name="worker_search" type="search" autoComplete="off" placeholder="Buscar por nombre…" value={editor.search} onChange={(event) => editor.setSearch(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                editor.searchWorkers();
            }
        }}/>
        <button type="button" onClick={editor.searchWorkers} disabled={workers.isFetching} className="cursor-pointer rounded-lg border border-neutral-200 px-3 py-1.5 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
          Buscar
        </button>
      </div>
      <span className="font-medium">Trabajadores del área seleccionada</span>
    </>);
}
