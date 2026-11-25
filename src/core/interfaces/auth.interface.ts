export interface SessionArea {
  id: number;
  name: string;
}

export interface SessionUser {
  id: number;
  name: string;
  role: string;
  areas: SessionArea[];
  all_areas: boolean;
  permissions: { manage_accounts: boolean };
}

export interface SessionProfile {
  id: number;
  name: string;
  first_names?: string;
  last_names?: string;
  email: string;
  role: string;
  weekly_hours?: string;
  area_id?: number | null;
  all_areas?: boolean;
  areas?: SessionArea[];
}

export interface Account {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  all_areas: boolean;
  areas: SessionArea[];
  delivery_status: string;
}

export interface RecoveryRequest {
  id: number;
  name: string;
  email: string;
  requested_at: string;
  resolved_at?: string | null;
}

export interface DetailResult {
  detail: string;
}

export interface ActivationDetails {
  first_names: string;
  last_names: string;
  email: string;
  all_areas: boolean;
  areas: SessionArea[];
  role: string;
}

export interface AuthSessionPayload {
  access?: string;
  user: SessionUser;
}

export interface InvitationPayload {
  first_names: string;
  last_names: string;
  email: string;
  role: string;
  all_areas: boolean;
  area_ids: number[];
}

export interface PasswordPayload {
  token: string;
  password: string;
  password_confirmation: string;
}
