import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { getProjects } from "../../../core/services/projectService";
import {
  createArea,
  createSpecialty,
  listAreas,
  updateArea,
} from "../../../core/services/organizationService";
import type { ProjectSummary } from "../../../core/interfaces/project.interface";
import type {
  Area,
  AreaWriteData,
  SpecialtyWriteData,
} from "../../../core/interfaces/organization.interface";
import { useToast } from "../../../hooks/useToast";

export type ProjectSort = "asc" | "desc" | "recent" | "oldest";

interface AreaMutationVariables {
  id?: number;
  data: AreaWriteData;
}

export function useAreaProjects() {
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [sort, setSort] = useState<ProjectSort>("asc");
  const [areaModal, setAreaModal] = useState<
    { mode: "create" } | { mode: "edit"; area: Area } | null
  >(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: areas = [], isLoading: areasLoading } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: listAreas,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<
    ProjectSummary[]
  >({
    queryKey: ["projects"],
    queryFn: getProjects,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const projectModal = useMemo(() => {
    const rawEditId = searchParams.get("editar");
    const editId = Number(rawEditId);
    if (rawEditId !== null && Number.isInteger(editId) && editId > 0) {
      return { mode: "edit" as const, projectId: editId };
    }
    if (searchParams.get("modal") === "proyecto") {
      return { mode: "create" as const };
    }
    return null;
  }, [searchParams]);

  const specialtyModal = searchParams.get("modal") === "especialidad";

  const closeProjectModal = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("modal");
    next.delete("editar");
    setSearchParams(next, { replace: true });
  };

  const closeSpecialtyModal = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("modal");
    setSearchParams(next, { replace: true });
  };

  const areaMutation = useMutation({
    mutationFn: ({ id, data }: AreaMutationVariables) =>
      id ? updateArea(id, data) : createArea(data),
    onSuccess: async (_, { id, data }) => {
      setAreaModal(null);
      addToast({
        icon: "success",
        title: id ? "Área actualizada" : "Área creada",
        message: `Área "${data.name}" ${id ? "guardada" : "creada"}.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["areas"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
      ]);
    },
    onError: () => {
      addToast({
        icon: "error",
        title: "No se pudo guardar el área",
        message: "Revisa los datos e inténtalo de nuevo.",
      });
    },
  });

  const specialtyMutation = useMutation({
    mutationFn: createSpecialty,
    onSuccess: (_, data) => {
      closeSpecialtyModal();
      addToast({
        icon: "success",
        title: "Especialidad creada",
        message: `"${data.name}" registrada.`,
      });
    },
    onError: () => {
      addToast({
        icon: "error",
        title: "No se pudo crear la especialidad",
        message: "Revisa los datos e inténtalo de nuevo.",
      });
    },
  });

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects
      .filter((p) => {
        const matchesArea =
          selectedAreaId === null ||
          p.areas?.some((a) => a.id === selectedAreaId);
        const matchesSearch =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q);
        const matchesMode =
          modeFilter === ""
            ? true
            : modeFilter === "available"
              ? p.available
              : !p.available;
        return matchesArea && matchesSearch && matchesMode;
      })
      .sort((a, b) => {
        if (sort === "desc") return b.name.localeCompare(a.name);
        if (sort === "recent")
          return (b.start_date || "").localeCompare(a.start_date || "");
        if (sort === "oldest")
          return (a.start_date || "").localeCompare(b.start_date || "");
        return a.name.localeCompare(b.name);
      });
  }, [projects, selectedAreaId, search, modeFilter, sort]);

  const selectedArea = useMemo(
    () => areas.find((a) => a.id === selectedAreaId) ?? null,
    [areas, selectedAreaId],
  );

  const saveArea = (data: AreaWriteData) => {
    if (!areaModal) return;
    areaMutation.mutate({
      id: areaModal.mode === "edit" ? areaModal.area.id : undefined,
      data,
    });
  };

  const saveSpecialty = (data: SpecialtyWriteData) => {
    specialtyMutation.mutate(data);
  };

  return {
    isLoading: areasLoading || projectsLoading,
    areas,
    projects,
    filteredProjects,
    selectedAreaId,
    setSelectedAreaId,
    selectedArea,
    search,
    setSearch,
    modeFilter,
    setModeFilter,
    sort,
    setSort,
    areaModal,
    setAreaModal,
    specialtyModal,
    closeSpecialtyModal,
    projectModal,
    closeProjectModal,
    submitting: areaMutation.isPending || specialtyMutation.isPending,
    saveArea,
    saveSpecialty,
  };
}
