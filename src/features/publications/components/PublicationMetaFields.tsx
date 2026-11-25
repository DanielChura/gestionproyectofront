import type {
  Publication,
  PublicationCatalogs,
  PublicationStateCode,
} from "../../../core/interfaces/publication.interface";
import Select from "../../../shared/components/Select/Select";
import { PUBLICATION_STATE_LABELS } from "../utils/publication";

interface PublicationMetaFieldsProps {
  publication?: Publication;
  catalogs: PublicationCatalogs;
  projectId: string;
  state: PublicationStateCode;
  onProject: (value: string) => void;
  onState: (value: PublicationStateCode) => void;
}

export default function PublicationMetaFields({
  publication,
  catalogs,
  projectId,
  state,
  onProject,
  onState,
}: PublicationMetaFieldsProps) {
  const states: PublicationStateCode[] = publication
    ? Array.from(new Set([publication.state, ...publication.allowed_states]))
    : ["BORRADOR", "ABIERTA", "CANCELADA"];

  return (
    <>
      <label className="col-span-2 grid gap-1.5">
        <span className="text-xs text-neutral-700 dark:text-neutral-100">
          Proyecto
        </span>
        {publication ? (
          <span className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs text-neutral-700 dark:border-neutral-800 dark:text-neutral-100">
            {publication.project.name}
          </span>
        ) : (
          <Select
            value={projectId}
            onChange={(event) => onProject(event.target.value)}
          >
            <option value="">Selecciona un proyecto</option>
            {catalogs.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        )}
      </label>
      <label className="col-span-1 grid gap-1.5">
        <span className="text-xs text-neutral-700 dark:text-neutral-100">
          Estado
        </span>
        <Select
          value={state}
          onChange={(event) =>
            onState(event.target.value as PublicationStateCode)
          }
        >
          {states.map((item) => (
            <option key={item} value={item}>
              {PUBLICATION_STATE_LABELS[item]}
            </option>
          ))}
        </Select>
      </label>
    </>
  );
}
