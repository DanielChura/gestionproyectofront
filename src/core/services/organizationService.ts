import { httpClient } from "../../core/api/httpClient";
import type {
  Area,
  AreaWriteData,
  Specialty,
  SpecialtyWriteData,
  Team,
  TeamMember,
  TeamMemberWriteData,
  TeamWriteData,
} from "../interfaces/organization.interface";

export async function listAreas(): Promise<Area[]> {
  const { data } = await httpClient.get<Area[]>("organization/areas/");
  return data;
}

export async function getAreaById(id: number): Promise<Area> {
  const { data } = await httpClient.get<Area>(`organization/areas/${id}/`);
  return data;
}

export async function createArea(payload: AreaWriteData): Promise<Area> {
  const { data } = await httpClient.post<Area>("organization/areas/", payload);
  return data;
}

export async function updateArea(
  id: number,
  payload: AreaWriteData,
): Promise<Area> {
  const { data } = await httpClient.put<Area>(
    `organization/areas/${id}/`,
    payload,
  );
  return data;
}

export async function removeArea(id: number): Promise<void> {
  await httpClient.delete(`organization/areas/${id}/`);
}

export async function listSpecialties(): Promise<Specialty[]> {
  const { data } = await httpClient.get<Specialty[]>(
    "organization/specialties/",
  );
  return data;
}

export async function getSpecialtyById(id: number): Promise<Specialty> {
  const { data } = await httpClient.get<Specialty>(
    `organization/specialties/${id}/`,
  );
  return data;
}

export async function createSpecialty(
  payload: SpecialtyWriteData,
): Promise<Specialty> {
  const { data } = await httpClient.post<Specialty>(
    "organization/specialties/",
    payload,
  );
  return data;
}

export async function updateSpecialty(
  id: number,
  payload: SpecialtyWriteData,
): Promise<Specialty> {
  const { data } = await httpClient.put<Specialty>(
    `organization/specialties/${id}/`,
    payload,
  );
  return data;
}

export async function removeSpecialty(id: number): Promise<void> {
  await httpClient.delete(`organization/specialties/${id}/`);
}

export async function listTeams(): Promise<Team[]> {
  const { data } = await httpClient.get<Team[]>("teams/teams/");
  return data;
}

export async function getTeamById(id: number): Promise<Team> {
  const { data } = await httpClient.get<Team>(`teams/teams/${id}/`);
  return data;
}

export async function createTeam(payload: TeamWriteData): Promise<Team> {
  const { data } = await httpClient.post<Team>("teams/teams/", payload);
  return data;
}

export async function updateTeam(
  id: number,
  payload: TeamWriteData,
): Promise<Team> {
  const { data } = await httpClient.put<Team>(`teams/teams/${id}/`, payload);
  return data;
}

export async function removeTeam(id: number): Promise<void> {
  await httpClient.delete(`teams/teams/${id}/`);
}

export async function listTeamMembers(teamId: number): Promise<TeamMember[]> {
  const { data } = await httpClient.get<TeamMember[]>(
    `teams/teams/${teamId}/members/`,
  );
  return data;
}

export async function addTeamMember(
  teamId: number,
  payload: TeamMemberWriteData,
): Promise<TeamMember> {
  const { data } = await httpClient.post<TeamMember>(
    `teams/teams/${teamId}/members/`,
    payload,
  );
  return data;
}

export async function removeTeamMember(
  teamId: number,
  memberId: number,
): Promise<void> {
  await httpClient.delete(`teams/teams/${teamId}/members/${memberId}/`);
}
