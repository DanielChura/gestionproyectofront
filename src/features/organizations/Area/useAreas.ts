import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  createArea,
  listAreas,
  updateArea,
} from "../../../core/services/organizationService";
import type {
  Area,
  AreaWriteData,
} from "../../../core/interfaces/organization.interface";
import { useToast } from "../../../hooks/useToast";

export type AreaModalState =
  | { mode: "create" }
  | { mode: "edit"; area: Area }
  | null;

export const useAreas = () => {
  const [data, setData] = useState<Area[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<"asc" | "desc" | "code">("asc");
  const [modal, setModal] = useState<AreaModalState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();

  const fetch = async () => {
    try {
      const response = await listAreas();
      setData(Array.isArray(response) ? response : []);
    } catch {
      setData([]);
    }
  };

  useEffect(() => {
    Promise.resolve().then(fetch);
  }, []);

  useEffect(() => {
    if (searchParams.get("nuevo") !== "area") return;
    setModal({ mode: "create" });
    const next = new URLSearchParams(searchParams);
    next.delete("nuevo");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const filteredAreas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((a) => {
        const matchesSearch =
          !q ||
          a.name.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q);
        const matchesStatus =
          status === "" ? true : String(a.active) === status;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sort === "desc") return b.name.localeCompare(a.name);
        if (sort === "code") return a.code.localeCompare(b.code);
        return a.name.localeCompare(b.name);
      });
  }, [data, search, status, sort]);

  const stats = useMemo(() => {
    const total = data.length;
    const active = data.filter((a) => a.active).length;
    return { total, active, inactive: total - active };
  }, [data]);

  const saveArea = async (formData: AreaWriteData) => {
    if (modal == null) return;
    setSubmitting(true);
    try {
      if (modal.mode === "edit") {
        await updateArea(modal.area.id, formData);
        addToast({
          icon: "success",
          title: "Área actualizada",
          message: `El área "${formData.name}" se actualizó correctamente.`,
        });
      } else {
        await createArea(formData);
        addToast({
          icon: "success",
          title: "Área creada",
          message: `El área "${formData.name}" se registró con éxito.`,
        });
      }
      setModal(null);
      await fetch();
    } catch {
      addToast({
        icon: "error",
        title: "Error al guardar",
        message: "No fue posible procesar la solicitud del área.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (area: Area) => {
    try {
      const updated = !area.active;
      await updateArea(area.id, {
        code: area.code,
        name: area.name,
        active: updated,
      });
      addToast({
        icon: "info",
        title: "Estado modificado",
        message: `El área "${area.name}" ahora está ${updated ? "activa" : "inactiva"}.`,
      });
      await fetch();
    } catch {
      addToast({
        icon: "error",
        title: "No se pudo cambiar el estado del área",
        message: "Revisa la conexión e inténtalo de nuevo.",
      });
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setSort("asc");
  };

  return {
    areas: filteredAreas,
    total: data.length,
    stats,
    search,
    setSearch,
    status,
    setStatus,
    sort,
    setSort,
    hasFilters: search !== "" || status !== "" || sort !== "asc",
    resetFilters,
    modal,
    setModal,
    submitting,
    saveArea,
    toggleStatus,
    refetch: fetch,
  };
};
