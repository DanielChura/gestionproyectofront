import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { errorText } from "../../../core/api/httpClient";
import {
  previewPassword,
  savePassword,
  validatePassword,
} from "../../../core/services/authService";
import type { PasswordMode } from "../../../core/services/authService";
import type {
  ActivationDetails,
  PasswordPayload,
} from "../../../core/interfaces/auth.interface";
import { useToast } from "../../../hooks/useToast";

export function usePasswordReset(mode: PasswordMode) {
  const location = useLocation();
  const navigate = useNavigate();
  const activation = mode === "activate";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [token] = useState(() =>
    new URLSearchParams(location.hash.slice(1)).get("token"),
  );
  const [details, setDetails] = useState<ActivationDetails | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const { addToast } = useToast();

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    previewPassword(mode, token)
      .then((snapshot) => {
        if (mounted) setDetails(snapshot);
      })
      .catch((failure) => {
        if (mounted) {
          const text = errorText(failure);
          setError(text);
          addToast({ icon: "error", title: "Enlace no válido", message: text });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [mode, token, addToast]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (password.length < 12 || password !== confirmation) {
      const text =
        password.length < 12
          ? "La contraseña debe tener al menos 12 caracteres"
          : "Las contraseñas no coinciden";
      setError(text);
      addToast({ icon: "error", title: "Revisa la contraseña", message: text });
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload: PasswordPayload = {
        token,
        password,
        password_confirmation: confirmation,
      };
      await validatePassword(mode, payload);
      const result = await savePassword(mode, payload);
      setMessage(result.detail);
      setPassword("");
      setConfirmation("");
      navigate(location.pathname, { replace: true });
    } catch (failure) {
      const text = errorText(failure);
      setError(text);
      addToast({ icon: "error", title: "No se pudo guardar", message: text });
    } finally {
      setBusy(false);
    }
  }

  return {
    activation,
    token,
    password,
    setPassword,
    confirmation,
    setConfirmation,
    busy,
    message,
    error,
    details,
    loading,
    submit,
  };
}
