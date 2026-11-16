import { useState } from "react";
import type { Project } from "../../types";
import Modal from "../../../../shared/components/Modal/Modal";
import TaskStatusConfiguration from "../task-status/TaskStatusConfiguration/TaskStatusConfiguration";
import ProjectParticipants from "./ProjectParticipants";
import ProjectGeneralFields from "./ProjectGeneralFields";
import ProjectCreationFooter from "./ProjectCreationFooter";
import { useProjectCreation } from "./useProjectCreation";
export default function CreateProjectDialog({ areaId, onClose, onCreated, }: {
    areaId?: number;
    onClose: () => void;
    onCreated: (project: Project) => void;
}) {
    const { bindForm, ...editor } = useProjectCreation(areaId, onCreated), { draft, catalogs, update } = editor;
    const [flow, setFlow] = useState(false), [flowName, setFlowName] = useState("Estándar");
    return (<>
      <Modal title={`Crear proyecto · Paso ${editor.step} de 2`} projectComposer busy={editor.busy} onClose={onClose}>
        <form ref={bindForm} noValidate aria-busy={editor.busy} onSubmit={(event) => {
            event.preventDefault();
            void editor.submit();
        }} className="flex min-h-0 min-w-0 flex-col text-xs [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-neutral-500">
          <div className="min-h-0 overflow-y-auto overscroll-contain px-6 py-5 max-sm:p-4">
            <fieldset disabled={editor.busy || editor.ambiguous} className="m-0 grid min-w-0 content-start gap-5 border-0 p-0">
              {catalogs.isError ? (<p role="alert">
                  No se pudieron cargar los catálogos.{" "}
                  <button type="button" onClick={() => void catalogs.refetch()} className="cursor-pointer underline">
                    Reintentar
                  </button>
                </p>) : editor.step === 1 ? (<ProjectGeneralFields editor={editor} flowName={flowName} onConfigure={() => setFlow(true)}/>) : (<ProjectParticipants editor={editor}/>)}
            </fieldset>
          </div>
          <ProjectCreationFooter editor={editor}/>
        </form>
      </Modal>
      {flow && catalogs.data && (<TaskStatusConfiguration draft={{
                states: draft.initialTaskStates ?? catalogs.data.states,
                templates: catalogs.data.task_templates ?? [],
                onApply: (states, name) => {
                    update({ initialTaskStates: states });
                    setFlowName(name);
                },
            }} onConfigured={() => undefined} onClose={() => setFlow(false)}/>)}
    </>);
}
