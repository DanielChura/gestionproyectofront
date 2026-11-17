import { useState } from "react";
import type { FormEvent } from "react";
import type { MySpecialty } from "../../core/interfaces/worker.interface";
import { useTheme } from "../../hooks/useTheme";
import { useToast } from "../../hooks/useToast";
import { updateSessionProfile } from "../../core/services/authService";
import { useProfile } from "../profile/ProfileModal/useProfile";

export function useSettings() {
  const { theme, setTheme } = useTheme();
  const profileState = useProfile();
  const { addToast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [lastNameTouched, setLastNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");

  const nameParts = (profileState.profile?.name ?? "").trim().split(/\s+/u);
  const currentFirstName = firstNameTouched ? firstName : (nameParts[0] ?? "");
  const currentLastName = lastNameTouched
    ? lastName
    : nameParts.slice(1).join(" ");
  const currentEmail = emailTouched
    ? email
    : (profileState.profile?.email ?? "");
  const currentName =
    `${currentFirstName} ${currentLastName}`.trim() ||
    (profileState.profile?.name ?? "");

  async function saveProfile(event?: FormEvent) {
    event?.preventDefault();
    setSavingProfile(true);
    try {
      await updateSessionProfile({
        first_names: currentFirstName.trim(),
        last_names: currentLastName.trim(),
        email: currentEmail.trim(),
        password: password || undefined,
      });
      await profileState.reload();
      setPassword("");
      setFirstNameTouched(false);
      setLastNameTouched(false);
      setEmailTouched(false);
      addToast({
        icon: "success",
        title: "Perfil actualizado",
        message: "Los cambios se guardaron.",
      });
    } catch {
      addToast({
        icon: "error",
        title: "No se pudo guardar",
        message: "Revisa los datos e inténtalo de nuevo.",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function addSpecialty() {
    if (!selectedSpecialty) return;
    try {
      await profileState.addSpecialty(Number(selectedSpecialty));
      setSelectedSpecialty("");
    } catch {
      addToast({
        icon: "error",
        title: "No se pudo agregar",
        message: "Inténtalo de nuevo.",
      });
    }
  }

  async function removeSpecialty(specialty: MySpecialty) {
    try {
      await profileState.dropSpecialty(specialty);
    } catch {
      addToast({
        icon: "error",
        title: "No se pudo quitar",
        message: "Inténtalo de nuevo.",
      });
    }
  }

  return {
    ...profileState,
    theme,
    setTheme,
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
    savingProfile,
    saveProfile,
    selectedSpecialty,
    setSelectedSpecialty,
    addSpecialty,
    removeSpecialty,
  };
}

export type SettingsController = ReturnType<typeof useSettings>;
