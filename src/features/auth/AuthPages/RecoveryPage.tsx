import { Link } from "react-router";
import AuthLayout from "./AuthLayout";
import Input from "../../../shared/components/Input/Input";
import Button from "../../../shared/components/Button/Button";
import { useRecovery } from "../hooks/useRecovery";

export default function RecoveryPage() {
  const { email, setEmail, busy, message, submit } = useRecovery();

  return (
    <AuthLayout
      title="Recuperar acceso"
      intro="Un administrador revisará tu solicitud antes de enviarte un enlace."
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
          <label className="grid gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Correo electrónico
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <Button
            type="submit"
            disabled={busy}
            className="w-full px-3 py-1.5 text-sm font-medium"
          >
            {busy ? "Enviando…" : "Solicitar revisión"}
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
