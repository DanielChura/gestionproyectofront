export interface WorkerSpecialty {
  specialty: number;
  level: number;
}

export interface Worker {
  id: number;
  area: number | null;
  code: string;
  first_names: string;
  last_names: string;
  email: string;
  weekly_hours: string;
  active: boolean;
  all_areas: boolean;
  specialties: WorkerSpecialty[];
}

export interface WorkerUpdateData {
  code: string;
  first_names: string;
  last_names: string;
  email: string;
  area: number | null;
  all_areas: boolean;
  weekly_hours: string;
  active: boolean;
}

export interface WorkerFilters {
  search?: string;
  disponible?: boolean;
}

export interface MySpecialty {
  id: number;
  name: string;
  level: number;
}

export interface MySpecialtyWriteData {
  specialty_id: number;
  level?: number;
}
