import { Link } from "react-router";
import AuthLayout from "./AuthLayout";
import Input from "../../../shared/components/Input/Input";
import Button from "../../../shared/components/Button/Button";
import UserIcon from "../../../shared/icons/UserIcon";
import { usePasswordReset } from "../hooks/usePasswordReset";
import type { PasswordMode } from "../../../core/services/authService";

interface PasswordPageProps {
  mode: PasswordMode;
}

export default function PasswordPage({ mode }: PasswordPageProps) {
  const {
    activation,
    password,
    setPassword,
    confirmation,
    setConfirmation,
    busy,
    message,
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
          className="m-0 text-xs text-green-700 dark:text-green-400"
          role="status"
        >
          {message}
        </p>
      ) : (
        <form className="grid gap-4" onSubmit={submit}>
          {details && (
            <div className="flex items-start gap-2 rounded-md border border-neutral-200 bg-neutral-100 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
              <UserIcon className="mt-0.5 size-4 shrink-0" />
              <span className="grid gap-0.5">
                <span className="font-medium text-neutral-800 dark:text-neutral-100">
                  {details.first_names} {details.last_names}
                </span>
                <span>{details.email}</span>
              </span>
            </div>
          )}
          <label className="grid gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Contraseña
            <Input
              type="password"
              autoComplete="new-password"
              maxLength={1024}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <span className="font-normal text-neutral-500 dark:text-neutral-400">
              Mínimo 12 caracteres.
            </span>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Confirmar contraseña
            <Input
              type="password"
              autoComplete="new-password"
              maxLength={1024}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          <Button
            type="submit"
            disabled={busy}
            className="w-full px-3 py-1.5 text-sm font-medium"
          >
            {busy ? "Guardando…" : "Guardar contraseña"}
          </Button>
        </form>
      )}
      <Link
        className="w-fit cursor-pointer text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        to="/"
      >
        Volver al acceso
      </Link>
    </AuthLayout>
  );
}
