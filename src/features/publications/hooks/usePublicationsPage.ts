import { useEffect, useState } from "react";
import type {
  Publication,
  PublicationCreateData,
  PublicationFilters,
  PublicationUpdateData,
} from "../../../core/interfaces/publication.interface";
import { useToast } from "../../../hooks/useToast";
import { usePublicationCatalogs } from "./usePublicationCatalogs";
import { usePublications } from "./usePublications";

export function usePublicationsPage(canManage: boolean) {
  const [filters, setFilters] = useState<PublicationFilters>({
    state: "ABIERTA",
  });
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [form, setForm] = useState<{ publication?: Publication } | null>(null);
  const { data, loading, error, create, update, apply } =
    usePublications(filters);
  const catalogs = usePublicationCatalogs(canManage).data;
  const { addToast } = useToast();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({
        ...current,
        search: search.trim() || undefined,
      }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const selected = data.find((item) => item.id === detailId);

  async function save(payload: PublicationCreateData | PublicationUpdateData) {
    if (form?.publication) {
      await update(form.publication.id, payload as PublicationUpdateData);
      addToast({
        icon: "success",
        title: "Publicación actualizada",
        message: "Los cambios se guardaron correctamente.",
      });
    } else {
      await create(payload as PublicationCreateData);
      addToast({
        icon: "success",
        title: "Publicación creada",
        message: "La oferta quedó en estado borrador.",
      });
    }
  }

  async function applyTo(id: number) {
    try {
      await apply(id);
      addToast({
        icon: "success",
        title: "Postulación enviada",
        message: "Te postulaste correctamente a la oferta.",
      });
    } catch (failure) {
      addToast({
        icon: "error",
        title: "No se pudo postular",
        message:
          failure instanceof Error ? failure.message : "Intenta de nuevo.",
      });
    }
  }

  return {
    filters,
    setFilters,
    search,
    setSearch,
    data,
    loading,
    error,
    catalogs,
    selected,
    detailId,
    setDetailId,
    form,
    setForm,
    save,
    applyTo,
  };
}
