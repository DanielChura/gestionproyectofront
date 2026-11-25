import { useEffect, useRef, useState } from "react";
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
  const [weeklyHours, setWeeklyHours] = useState("");
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [lastNameTouched, setLastNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [weeklyHoursTouched, setWeeklyHoursTouched] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("1");

  const loadErrorNotified = useRef(false);
  useEffect(() => {
    if (
      !loadErrorNotified.current &&
      profileQuery.error &&
      !profileQuery.data
    ) {
      loadErrorNotified.current = true;
      addToast({
        icon: "error",
        title: "No se pudo cargar el perfil",
        message: "Revisa tu conexión e inténtalo de nuevo.",
      });
    }
  }, [profileQuery.error, profileQuery.data, addToast]);

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
  const currentWeeklyHours = weeklyHoursTouched
    ? weeklyHours
    : (profile?.weekly_hours ?? "");
  const currentName =
    `${currentFirstName} ${currentLastName}`.trim() || (profile?.name ?? "");

  const addSpecialtyMutation = useMutation({
    mutationFn: ({ specialtyId, level }: { specialtyId: number; level: number }) =>
      addMySpecialty({ specialty_id: specialtyId, level }),
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

  async function saveFirstName() {
    if (!firstNameTouched) return;
    try {
      await updateSessionProfile({ first_names: currentFirstName.trim() });
      await queryClient.invalidateQueries({ queryKey: ["sessionProfile"] });
      setFirstNameTouched(false);
    } catch {
      addToast({
        icon: "error",
        title: "No se pudo guardar",
        message: "Revisa los datos e inténtalo de nuevo.",
      });
    }
  }

  async function saveLastName() {
    if (!lastNameTouched) return;
    try {
      await updateSessionProfile({ last_names: currentLastName.trim() });
      await queryClient.invalidateQueries({ queryKey: ["sessionProfile"] });
      setLastNameTouched(false);
    } catch {
      addToast({
        icon: "error",
        title: "No se pudo guardar",
        message: "Revisa los datos e inténtalo de nuevo.",
      });
    }
  }

  async function saveEmail() {
    if (!emailTouched) return;
    try {
      await updateSessionProfile({ email: currentEmail.trim() });
      await queryClient.invalidateQueries({ queryKey: ["sessionProfile"] });
      setEmailTouched(false);
    } catch {
      addToast({
        icon: "error",
        title: "No se pudo guardar",
        message: "Revisa los datos e inténtalo de nuevo.",
      });
    }
  }

  async function saveWeeklyHours() {
    if (!weeklyHoursTouched) return;
    try {
      await updateSessionProfile({
        weekly_hours: currentWeeklyHours.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["sessionProfile"] });
      setWeeklyHoursTouched(false);
    } catch {
      addToast({
        icon: "error",
        title: "No se pudo guardar",
        message: "Revisa los datos e inténtalo de nuevo.",
      });
    }
  }

  async function savePassword() {
    if (!password) return;
    try {
      await updateSessionProfile({ password });
      await queryClient.invalidateQueries({ queryKey: ["sessionProfile"] });
      setPassword("");
      addToast({
        icon: "success",
        title: "Contraseña actualizada",
        message: "Los cambios se guardaron.",
      });
    } catch {
      addToast({
        icon: "error",
        title: "No se pudo guardar",
        message: "Revisa los datos e inténtalo de nuevo.",
      });
    }
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
    saveFirstName,
    saveLastName,
    saveEmail,
    saveWeeklyHours,
    savePassword,
    weeklyHours: currentWeeklyHours,
    updateWeeklyHours: (value: string) => {
      setWeeklyHoursTouched(true);
      setWeeklyHours(value);
    },
    selectedLevel,
    setSelectedLevel,
    loading: specialtiesQuery.isLoading || catalogQuery.isLoading,
    specialties,
    catalog,
    saving: addSpecialtyMutation.isPending || removeSpecialtyMutation.isPending,
    selectedSpecialty,
    setSelectedSpecialty,
    addSpecialty: () => {
      if (!selectedSpecialty) return;
      addSpecialtyMutation.mutate({
        specialtyId: Number(selectedSpecialty),
        level: Number(selectedLevel) || 1,
      });
    },
    removeSpecialty: (specialty: MySpecialty) =>
      removeSpecialtyMutation.mutate(specialty.id),
  };
}

export type SettingsController = ReturnType<typeof useSettings>;
