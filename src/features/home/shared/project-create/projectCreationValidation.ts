import type { ProjectDraft } from "../../types";
import type { ProjectCatalogs } from "../../../../core/interfaces/project.interface";
import { calendarDate } from "../../utils/calendarDate";
export function projectCreationValidation(draft: ProjectDraft, catalogs: ProjectCatalogs | undefined, step: number): Record<string, string> {
    const fields: Record<string, string> = {};
    if (!draft.name.trim())
        fields.name = "Indica el nombre del proyecto.";
    if (draft.areaIds.length !== 1 ||
        !catalogs?.areas.some((area) => area.id === draft.areaIds[0]))
        fields.area_ids = "Selecciona un área activa.";
    if (draft.endDate) {
        try {
            calendarDate(draft.endDate);
            if (draft.endDate < (catalogs?.creation_date ?? ""))
                fields.end_date = "La fecha final no puede preceder al inicio.";
        }
        catch {
            fields.end_date = "Indica una fecha válida.";
        }
    }
    if (step === 2 &&
        draft.mode === "assigned" &&
        !(draft.participantSource === "teams"
            ? draft.teamIds?.length
            : draft.workerIds.length))
        fields.worker_ids = "Selecciona un participante elegible.";
    return fields;
}
