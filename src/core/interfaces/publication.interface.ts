export type PublicationStateCode =
  "BORRADOR" | "ABIERTA" | "CERRADA" | "CANCELADA";

export interface PublicationProject {
  id: number;
  code: string;
  name: string;
}

export interface PublicationSpecialty {
  id: number;
  name: string;
}

export interface PublicationRequirementWriteData {
  specialty_id: number;
  minimum_level: number;
}

export interface PublicationRequirement extends PublicationRequirementWriteData {
  specialty_name: string;
}

export interface Publication {
  id: number;
  project: PublicationProject;
  title: string;
  description: string;
  vacancies: number;
  filled_vacancies: number;
  available_vacancies: number;
  weekly_hours: string;
  opening_date: string;
  closing_date: string;
  state: PublicationStateCode;
  requirements: PublicationRequirement[];
  allowed_states: PublicationStateCode[];
  permissions: {
    edit: boolean;
    change_state: boolean;
  };
  applied?: boolean;
  can_apply?: boolean;
}

export interface PublicationCatalogs {
  levels: number[];
  specialties: PublicationSpecialty[];
  projects: PublicationProject[];
}

export interface PublicationFilters {
  project_id?: number;
  state?: PublicationStateCode;
  search?: string;
}

export interface PublicationCreateData {
  project_id: number;
  title: string;
  description: string;
  vacancies: number;
  weekly_hours: string;
  opening_date: string;
  closing_date: string;
  state?: PublicationStateCode;
  requirements: PublicationRequirementWriteData[];
}

export type PublicationUpdateData = Omit<PublicationCreateData, "project_id">;
