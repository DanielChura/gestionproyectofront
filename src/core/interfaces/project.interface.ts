export interface ProjectArea {
  id: number;
  name: string;
}

export interface ProjectSummary {
  id: number;
  name: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  state_code: string;
  available: boolean;
  has_associated_workers: boolean;
  areas: ProjectArea[];
  worker_edit: boolean;
  worker_state: boolean;
  worker_create: boolean;
  permissions: { manage: boolean; create_tasks: boolean };
}

export interface ProjectAreaGroup extends ProjectArea {
  projects: ProjectSummary[];
}

export type StateCategory = "not_started" | "active" | "done" | "closed";

export type Tema = {
  id: number;
  color: string;
  icono: string;
};

export interface ProjectTaskState {
  code: string;
  name: string;
  category?: StateCategory;
  tema_id: number;
  tema: Tema | null;
}

export interface TaskStatusTemplate {
  id: number | string;
  name: string;
  preset: boolean;
  revision: number;
  states: { name: string; category: StateCategory; tema_id: number }[];
}

export interface ProjectCatalogs {
  specialties?: { id: number; name: string }[];
  task_templates?: TaskStatusTemplate[];
  creation_date?: string;
  areas: ProjectArea[];
  states: ProjectTaskState[];
  priorities: { code: number; name: string }[];
}
