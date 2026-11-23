import { Link } from "react-router";
import AuthField from "./AuthField";
import AuthLayout from "./AuthLayout";
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
          className="m-0 text-sm text-green-700 dark:text-green-400"
          role="status"
        >
          {message}
        </p>
      ) : (
        <form className="grid gap-4" onSubmit={submit}>
          <AuthField
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" disabled={busy} className="w-full py-2 text-sm">
            {busy ? "Enviando…" : "Solicitar revisión"}
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
