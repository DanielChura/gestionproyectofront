import { useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../../core/api/httpClient";
import { requestRecovery } from "../../../core/services/authService";
import { useToast } from "../../../hooks/useToast";

export function useRecovery() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { addToast } = useToast();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await requestRecovery(email);
      setMessage(result.detail);
    } catch (failure) {
      addToast({
        icon: "error",
        title: "No se pudo enviar",
        message: errorText(failure),
      });
    } finally {
      setBusy(false);
    }
  }

  return { email, setEmail, busy, message, submit };
}
