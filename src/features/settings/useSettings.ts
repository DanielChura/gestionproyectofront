import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MySpecialty } from "../../core/interfaces/worker.interface";
import { useTheme } from "../../hooks/useTheme";
import { useAccentColor } from "../../hooks/useAccentColor";
import { useToast } from "../../hooks/useToast";
import {
  getSessionProfile,
  updateSessionProfile,
} from "../../core/services/authService";
import {
  addMySpecialty,
  listMySpecialties,
  removeMySpecialty,
} from "../../core/services/workerService";
import { listSpecialties } from "../../core/services/organizationService";

type ProfilePayload = {
  first_names: string;
  last_names: string;
  email: string;
  password?: string;
};

export function useSettings() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent, options: accentOptions } = useAccentColor();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["sessionProfile"],
    queryFn: getSessionProfile,
  });
  const specialtiesQuery = useQuery({
    queryKey: ["mySpecialties"],
    queryFn: listMySpecialties,
  });
  const catalogQuery = useQuery({
    queryKey: ["specialties"],
    queryFn: listSpecialties,
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [lastNameTouched, setLastNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");

  const loadErrorNotified = useRef(false);
  useEffect(() => {
    if (
      !loadErrorNotified.current &&
      (profileQuery.error || specialtiesQuery.error || catalogQuery.error)
    ) {
      loadErrorNotified.current = true;
      addToast({
        icon: "error",
        title: "No se pudo cargar la información",
        message: "Revisa tu conexión e inténtalo de nuevo.",
      });
    }
  }, [
    profileQuery.error,
    specialtiesQuery.error,
    catalogQuery.error,
    addToast,
  ]);

  const profile = profileQuery.data ?? null;
  const specialties = specialtiesQuery.data ?? [];
  const catalog = (catalogQuery.data ?? []).filter(
    (item) => !specialties.some((mine) => mine.id === item.id),
  );

  const nameParts = (profile?.name ?? "").trim().split(/\s+/u);
  const currentFirstName = firstNameTouched ? firstName : (nameParts[0] ?? "");
  const currentLastName = lastNameTouched
    ? lastName
    : nameParts.slice(1).join(" ");
  const currentEmail = emailTouched ? email : (profile?.email ?? "");
  const currentName =
    `${currentFirstName} ${currentLastName}`.trim() || (profile?.name ?? "");

  const saveMutation = useMutation({
    mutationFn: (payload: ProfilePayload) => updateSessionProfile(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sessionProfile"] }),
        queryClient.invalidateQueries({ queryKey: ["workers"] }),
      ]);
      setPassword("");
      setFirstNameTouched(false);
      setLastNameTouched(false);
      setEmailTouched(false);
      addToast({
        icon: "success",
        title: "Perfil actualizado",
        message: "Los cambios se guardaron.",
      });
    },
    onError: () => {
      addToast({
        icon: "error",
        title: "No se pudo guardar",
        message: "Revisa los datos e inténtalo de nuevo.",
      });
    },
  });

  const addSpecialtyMutation = useMutation({
    mutationFn: (specialtyId: number) =>
      addMySpecialty({ specialty_id: specialtyId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mySpecialties"] });
      setSelectedSpecialty("");
    },
    onError: () => {
      addToast({
        icon: "error",
        title: "No se pudo agregar",
        message: "Inténtalo de nuevo.",
      });
    },
  });

  const removeSpecialtyMutation = useMutation({
    mutationFn: (specialtyId: number) => removeMySpecialty(specialtyId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mySpecialties"] });
    },
    onError: () => {
      addToast({
        icon: "error",
        title: "No se pudo quitar",
        message: "Inténtalo de nuevo.",
      });
    },
  });

  function saveProfile(event?: FormEvent) {
    event?.preventDefault();
    saveMutation.mutate({
      first_names: currentFirstName.trim(),
      last_names: currentLastName.trim(),
      email: currentEmail.trim(),
      password: password || undefined,
    });
  }

  return {
    profile,
    profileLoading: profileQuery.isLoading,
    theme,
    setTheme,
    accent,
    setAccent,
    accentOptions,
    currentName,
    firstName: currentFirstName,
    lastName: currentLastName,
    email: currentEmail,
    password,
    setPassword,
    updateFirstName: (value: string) => {
      setFirstNameTouched(true);
      setFirstName(value);
    },
    updateLastName: (value: string) => {
      setLastNameTouched(true);
      setLastName(value);
    },
    updateEmail: (value: string) => {
      setEmailTouched(true);
      setEmail(value);
    },
    savingProfile: saveMutation.isPending,
    saveProfile,
    loading: specialtiesQuery.isLoading || catalogQuery.isLoading,
    specialties,
    catalog,
    saving: addSpecialtyMutation.isPending || removeSpecialtyMutation.isPending,
    selectedSpecialty,
    setSelectedSpecialty,
    addSpecialty: () => {
      if (!selectedSpecialty) return;
      addSpecialtyMutation.mutate(Number(selectedSpecialty));
    },
    removeSpecialty: (specialty: MySpecialty) =>
      removeSpecialtyMutation.mutate(specialty.id),
  };
}

export type SettingsController = ReturnType<typeof useSettings>;
