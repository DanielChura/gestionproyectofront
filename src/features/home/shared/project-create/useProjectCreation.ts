import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProject,
  getProjectCatalogs,
  getProjectPage,
  getProjectTeamCandidates,
  getWorkerCandidates,
} from "../../../../core/services/projectService";
import type { Project, ProjectDraft } from "../../types";
import {
  ApiError,
  errorText,
  sessionVersion,
} from "../../../../core/api/httpClient";
import { apiFieldErrors } from "../../utils/formErrors";
import { projectCreationValidation } from "./projectCreationValidation";
export function useProjectCreation(
  areaId: number | undefined,
  onCreated: (project: Project) => void,
) {
  const epoch = sessionVersion(),
    queryClient = useQueryClient(),
    alive = useRef(false),
    pending = useRef(false),
    focusRequested = useRef(false),
    form = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(1),
    [search, setSearch] = useState(""),
    [term, setTerm] = useState(""),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [ambiguous, setAmbiguous] = useState(false),
    [checked, setChecked] = useState(false);
  const [draft, setDraft] = useState<ProjectDraft>(() => ({
    name: "",
    description: "",
    endDate: "",
    areaIds: areaId ? [areaId] : [],
    mode: "available",
    workerIds: [],
    teamIds: [],
    participantSource: "workers",
    workerContribute: false,
  }));
  const bindForm = useCallback((node: HTMLFormElement | null) => {
    form.current = node;
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const catalogs = useQuery({
    queryKey: ["projectCatalogs", epoch],
    queryFn: getProjectCatalogs,
    retry: false,
  });
  const assigned = step === 2 && draft.mode === "assigned",
    area = draft.areaIds[0];
  const workers = useQuery({
    queryKey: ["project-candidates", epoch, area, term],
    queryFn: () => getWorkerCandidates([area], term),
    enabled: assigned && !!area && draft.participantSource !== "teams",
    retry: false,
  });
  const teams = useQuery({
    queryKey: ["project-teams", epoch, area],
    queryFn: () => getProjectTeamCandidates(area),
    enabled: assigned && !!area && draft.participantSource === "teams",
    retry: false,
  });
  const mutation = useMutation({ mutationFn: createProject, retry: false });
  useEffect(() => {
    form.current
      ?.querySelector<HTMLElement>(
        step === 1 ? "#project-name" : "#project-permission",
      )
      ?.focus();
  }, [step]);
  useEffect(() => {
    if (mutation.isPending || !focusRequested.current) return;
    focusRequested.current = false;
    const invalid = form.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    if (Object.keys(fields).length) invalid?.focus();
    else if (error)
      form.current?.querySelector<HTMLElement>("[data-project-error]")?.focus();
  }, [fields, error, step, mutation.isPending]);
  function update(changes: Partial<ProjectDraft>) {
    setDraft((value) => ({
      ...value,
      ...changes,
      ...(changes.areaIds ? { workerIds: [], teamIds: [] } : {}),
    }));
    const names: Record<string, string> = {
      areaIds: "area_ids",
      endDate: "end_date",
      workerIds: "worker_ids",
      teamIds: "worker_ids",
      participantSource: "worker_ids",
      workerContribute: "worker_contribute",
      initialTaskStates: "initial_task_states",
    };
    const changed = new Set(
      Object.keys(changes).map((key) => names[key] ?? key),
    );
    setFields((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !changed.has(key)),
      ),
    );
  }
  function complete(project: Project) {
    void queryClient.invalidateQueries({ queryKey: ["project-navigation"] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    onCreated(project);
  }
  async function check() {
    setError("");
    try {
      const page = await getProjectPage({
        area_id: area,
        q: draft.name.trim(),
      });
      if (!alive.current || epoch !== sessionVersion()) return;
      const matches = page.results.filter(
        (item) => item.name === draft.name.trim(),
      );
      setChecked(true);
      setError(
        matches.length
          ? "Hay proyectos con ese nombre. Consulta el registro antes de decidir si deseas crear otro."
          : "No se encontró el proyecto en la consulta. Puedes autorizar un nuevo intento de creación.",
      );
    } catch (failure) {
      if (alive.current) setError(errorText(failure));
    }
  }
  async function submit() {
    if (pending.current || ambiguous) return;
    const invalid = projectCreationValidation(draft, catalogs.data, step);
    setFields(invalid);
    setError("");
    if (Object.keys(invalid).length) {
      focusRequested.current = true;
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }
    pending.current = true;
    try {
      const result = await mutation.mutateAsync({
        name: draft.name.trim(),
        description: draft.description.trim(),
        end_date: draft.endDate || null,
        area_ids: draft.areaIds,
        mode: draft.mode,
        worker_contribute: draft.workerContribute,
        participant_source: draft.participantSource ?? "workers",
        worker_ids:
          assigned && draft.participantSource !== "teams"
            ? draft.workerIds
            : [],
        team_ids:
          assigned && draft.participantSource === "teams"
            ? (draft.teamIds ?? [])
            : [],
        ...(draft.initialTaskStates
          ? {
              initial_task_states: draft.initialTaskStates.map(
                ({ name, category, tema_id, tema }) => ({
                  name,
                  category,
                  tema_id: tema_id ?? tema?.id,
                }),
              ),
            }
          : {}),
      });
      if (alive.current && epoch === sessionVersion()) complete(result);
    } catch (failure) {
      if (alive.current && epoch === sessionVersion()) {
        focusRequested.current = true;
        const errors = apiFieldErrors(failure, {
          name: "name",
          description: "description",
          mode: "mode",
          worker_contribute: "worker_contribute",
          team_ids: "worker_ids",
          participant_source: "worker_ids",
          area_ids: "area_ids",
          end_date: "end_date",
          worker_ids: "worker_ids",
          initial_task_states: "initial_task_states",
        });
        setFields(errors);
        if (
          [
            "name",
            "description",
            "area_ids",
            "end_date",
            "initial_task_states",
          ].some((key) => errors[key])
        )
          setStep(1);
        setError(Object.keys(errors).length ? "" : errorText(failure));
        if (
          !(failure instanceof ApiError) ||
          !failure.status ||
          failure.status >= 500
        )
          setAmbiguous(true);
      }
    } finally {
      pending.current = false;
    }
  }
  return {
    bindForm,
    draft,
    update,
    step,
    setStep,
    search,
    setSearch,
    searchWorkers: () =>
      term === search ? void workers.refetch() : setTerm(search),
    catalogs,
    workers,
    teams,
    submit,
    error,
    fields,
    busy: mutation.isPending,
    ambiguous,
    checked,
    check,
    authorizeRetry: () => {
      setAmbiguous(false);
      setChecked(false);
    },
  };
}
export type ProjectCreationEditor = Omit<
  ReturnType<typeof useProjectCreation>,
  "bindForm"
>;
