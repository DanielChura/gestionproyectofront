import { Link } from "react-router";
import AuthField from "./AuthField";
import AuthLayout from "./AuthLayout";
import Button from "../../../shared/components/Button/Button";
import { usePasswordReset } from "../hooks/usePasswordReset";
import type { PasswordMode } from "../../../core/services/authService";

interface PasswordPageProps {
  mode: PasswordMode;
}

export default function PasswordPage({ mode }: PasswordPageProps) {
  const {
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
    submit,
  } = usePasswordReset(mode);

  return (
    <AuthLayout
      title={activation ? "Activa tu cuenta" : "Restablece tu contraseña"}
      intro={
        activation
          ? "Define la contraseña de tu cuenta."
          : "Define una nueva contraseña para recuperar el acceso."
      }
    >
      {message ? (
        <p
          className="m-0 text-sm text-green-700 dark:text-green-400"
          role="status"
        >
          {message}
        </p>
      ) : (
        <form className="grid gap-4" onSubmit={submit}>
          {activation && details && (
            <p className="m-0 text-sm text-neutral-600 dark:text-neutral-400">
              {details.first_names} {details.last_names} · {details.email}
            </p>
          )}
          {!token && (
            <p
              className="m-0 text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              El enlace no contiene un token válido.
            </p>
          )}
          {error && (
            <p
              className="m-0 text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {error}
            </p>
          )}
          <AuthField
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={1024}
            hint="Mínimo 12 caracteres."
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <AuthField
            label="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={1024}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <Button
            type="submit"
            disabled={busy || !token}
            className="w-full py-2 text-sm"
          >
            {busy ? "Guardando…" : "Guardar contraseña"}
          </Button>
        </form>
      )}
      <Link
        className="w-fit cursor-pointer text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        to="/"
      >
        Volver al acceso
      </Link>
    </AuthLayout>
  );
}
