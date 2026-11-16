import type {
  TeamOption,
  WorkerCandidate,
} from "../../../core/interfaces/task.interface";

export type ParticipantSource = "workers" | "teams";

export interface ParticipantsPickerState {
  areaId: number | null;
  source: ParticipantSource;
  onSourceChange: (source: ParticipantSource) => void;
  workers: WorkerCandidate[];
  teams: TeamOption[];
  selectedWorkerIds: number[];
  selectedTeamIds: number[];
  onToggleWorker: (id: number) => void;
  onToggleTeam: (id: number) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export interface ProjectFormProps {
  projectId?: number;
  onClose: () => void;
}
