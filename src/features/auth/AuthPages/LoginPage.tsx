import { Link } from "react-router";
import AuthField from "./AuthField";
import AuthLayout from "./AuthLayout";
import Button from "../../../shared/components/Button/Button";
import { useLogin } from "../hooks/useLogin";
import type { SessionUser } from "../../../core/interfaces/auth.interface";

interface LoginPageProps {
  onLogin: (user: SessionUser) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { email, setEmail, password, setPassword, busy, submit } =
    useLogin(onLogin);

  return (
    <AuthLayout
      title="Iniciar sesión"
      intro="Ingresa con tu correo de trabajador y contraseña."
    >
      <form className="grid gap-4" onSubmit={submit}>
        <AuthField
          label="Correo electrónico"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <AuthField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" disabled={busy} className="w-full py-2 text-sm">
          {busy ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>
      <Link
        className="w-fit cursor-pointer text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        to="/recuperar"
      >
        ¿Olvidaste tu contraseña?
      </Link>
    </AuthLayout>
  );
}
