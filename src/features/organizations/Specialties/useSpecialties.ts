import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  createSpecialty,
  listSpecialties,
  updateSpecialty,
} from "../../../core/services/organizationService";
import type {
  Specialty,
  SpecialtyWriteData,
} from "../../../core/interfaces/organization.interface";
import { useToast } from "../../../hooks/useToast";

export type SpecialtyModalState =
  { mode: "create" } | { mode: "edit"; specialty: Specialty } | null;

export const useSpecialties = () => {
  const [data, setData] = useState<Specialty[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [modal, setModal] = useState<SpecialtyModalState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();

  const fetch = async () => {
    try {
      const response = await listSpecialties();
      setData(Array.isArray(response) ? response : []);
    } catch {
      setData([]);
    }
  };

  useEffect(() => {
    Promise.resolve().then(fetch);
  }, []);

  useEffect(() => {
    if (searchParams.get("nuevo") !== "especialidad") return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setModal({ mode: "create" });
      const next = new URLSearchParams(searchParams);
      next.delete("nuevo");
      setSearchParams(next, { replace: true });
    });
    return () => {
      active = false;
    };
  }, [searchParams, setSearchParams]);

  const filteredSpecialties = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) =>
        sort === "desc"
          ? b.name.localeCompare(a.name)
          : a.name.localeCompare(b.name),
      );
  }, [data, search, sort]);

  const saveSpecialty = async (formData: SpecialtyWriteData) => {
    if (modal == null) return;
    setSubmitting(true);
    try {
      if (modal.mode === "edit") {
        await updateSpecialty(modal.specialty.id, formData);
        addToast({
          icon: "success",
          title: "Especialidad actualizada",
          message: `Se actualizaron los datos de "${formData.name}".`,
        });
      } else {
        await createSpecialty(formData);
        addToast({
          icon: "success",
          title: "Especialidad creada",
          message: `Se registró la especialidad "${formData.name}".`,
        });
      }
      setModal(null);
      await fetch();
    } catch {
      addToast({
        icon: "error",
        title: "Error al guardar",
        message: "No fue posible procesar la especialidad.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setSort("asc");
  };

  return {
    specialties: filteredSpecialties,
    total: data.length,
    search,
    setSearch,
    sort,
    setSort,
    hasFilters: search !== "" || sort !== "asc",
    resetFilters,
    modal,
    setModal,
    submitting,
    saveSpecialty,
    refetch: fetch,
  };
};
