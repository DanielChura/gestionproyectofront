import { useState } from "react";
import type { FormEvent } from "react";
import type { SessionUser } from "../../../core/interfaces/auth.interface";
import { errorText } from "../../../core/api/httpClient";
import { login } from "../../../core/services/authService";
import { useToast } from "../../../hooks/useToast";

export function useLogin(onLogin: (user: SessionUser) => void) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { addToast } = useToast();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const sessionUser = await login(email, password);
      onLogin(sessionUser);
    } catch (failure) {
      addToast({
        icon: "error",
        title: "No se pudo ingresar",
        message: errorText(failure),
      });
    } finally {
      setBusy(false);
    }
  }

  return { email, setEmail, password, setPassword, busy, submit };
}
