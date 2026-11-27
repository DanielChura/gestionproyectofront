import { Link } from "react-router";
import AuthLayout from "./AuthLayout";
import Input from "../../../shared/components/Input/Input";
import Button from "../../../shared/components/Button/Button";
import { useLogin } from "../hooks/useLogin";

export default function LoginPage() {
  const { email, setEmail, password, setPassword, busy, submit } = useLogin();

  return (
    <AuthLayout
      title="Iniciar sesión"
      intro="Ingresa con tu correo de trabajador y contraseña."
    >
      <form className="grid gap-4" onSubmit={submit}>
        <label className="grid gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
          Correo electrónico
          <Input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
          Contraseña
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <Button
          type="submit"
          disabled={busy}
          className="w-full px-3 py-1.5 text-sm font-medium"
        >
          {busy ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>
      <Link
        className="w-fit cursor-pointer text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        to="/recuperar"
      >
        ¿Olvidaste tu contraseña?
      </Link>
    </AuthLayout>
  );
}
