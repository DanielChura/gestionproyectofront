import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import gmLogo from "../../../assets/gm-logo.png";
import { useLoading } from "../../../hooks/useLoading";
import type { ActivationDetails, SessionUser } from "../api";
import { apiRequest, errorText, login } from "../api";
import { roleLabel } from "../roles";

interface AuthFrameProps {
  title: string;
  intro: string;
  children: ReactNode;
}

function AuthFrame({ title, intro, children }: AuthFrameProps) {
  return (
    <main className="min-h-screen grid place-items-center bg-white text-neutral-900 p-6">
      <section
        className="w-full max-w-110 p-6 bg-white border-0 shadow-none"
        aria-labelledby="auth-title"
      >
        <img
          className="block w-full max-w-50 h-18 object-contain object-left"
          src={gmLogo}
          alt="GM Ingenieros y Consultores"
        />
        <div className="my-5">
          <h1 id="auth-title" className="m-0 text-neutral-900 text-2xl font-">
            {title}
          </h1>
          <p className="mb-0 text-neutral-600 text-sm leading-relaxed">
            {intro}
          </p>
        </div>
        {children}
      </section>
    </main>
  );
}

export function LoginPage({
  onLogin,
}: {
  onLogin: (user: SessionUser) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { showLoading } = useLoading();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const sessionUser = await login(email, password);
      showLoading();
      onLogin(sessionUser);
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title="Iniciar sesión"
      intro="Ingresa con tu correo de trabajador y contraseña."
    >
      <form className="grid gap-2.5" onSubmit={submit}>
        <label className="text-neutral-900 text-sm " htmlFor="login-email">
          Correo electrónico
        </label>
        <input
          className="w-full min-h-10 px-3 py-2 text-neutral-900 bg-white border border-neutral-200 rounded-lg shadow-none focus:ring-0 focus-visible:outline-none focus:border-neutral-400"
          id="login-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label className="text-neutral-900 text-sm " htmlFor="login-password">
          Contraseña
        </label>
        <input
          className="w-full min-h-10 px-3 py-2 text-neutral-900 bg-white border border-neutral-200 rounded-lg shadow-none focus:ring-0 focus-visible:outline-none focus:border-neutral-400"
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && (
          <p className="px-0 py-2 text-sm text-neutral-900" role="alert">
            {error}
          </p>
        )}
        <button
          className="w-full mt-2 min-h-10 px-4 py-2 bg-neutral-900 text-neutral-100 text-sm rounded-lg shadow-none hover:bg-neutral-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={busy}
        >
          {busy ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
      <Link
        className="inline-block mt-5 text-neutral-600 text-sm hover:text-neutral-900"
        to="/recuperar"
      >
        Solicitar recuperación de acceso
      </Link>
    </AuthFrame>
  );
}

export function RecoveryPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<{ detail: string }>(
        "recovery-requests/",
        { method: "POST", body: JSON.stringify({ email }) },
        false,
      );
      setMessage(result.detail);
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title="Recuperar acceso"
      intro="Un administrador revisará tu solicitud antes de enviarte un enlace."
    >
      <form className="grid gap-2.5" onSubmit={submit}>
        <label className="text-neutral-900 text-sm " htmlFor="recovery-email">
          Correo electrónico
        </label>
        <input
          className="w-full min-h-10 px-3 py-2 text-neutral-900 bg-white border border-neutral-200 rounded-lg shadow-none focus:ring-0 focus-visible:outline-none focus:border-neutral-400"
          id="recovery-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {error && (
          <p className="px-0 py-2 text-sm text-neutral-900" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="px-0 py-2 text-sm text-neutral-900" role="status">
            {message}
          </p>
        )}
        <button
          className="w-full mt-2 min-h-10 px-4 py-2 bg-neutral-900 text-neutral-100 text-sm rounded-lg shadow-none hover:bg-neutral-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={busy}
        >
          {busy ? "Enviando…" : "Solicitar revisión"}
        </button>
      </form>
      <Link
        className="inline-block mt-5 text-neutral-600 text-sm hover:text-neutral-900"
        to="/"
      >
        Volver al acceso
      </Link>
    </AuthFrame>
  );
}

export function PasswordPage({ mode }: { mode: "activar" | "restablecer" }) {
  const location = useLocation();
  const navigate = useNavigate();
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
  const activation = mode === "activar";
  const endpoint = activation ? "activate" : "reset";

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    apiRequest<ActivationDetails>(
      `${endpoint}/preview/`,
      { method: "POST", body: JSON.stringify({ token }) },
      false,
    )
      .then((snapshot) => {
        if (mounted) setDetails(snapshot);
      })
      .catch((failure) => {
        if (mounted) setError(errorText(failure));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [endpoint, token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 12 || password !== confirmation) {
      setError(
        password.length < 12
          ? "La contraseña debe tener al menos 12 caracteres"
          : "Las contraseñas no coinciden",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = { token, password, password_confirmation: confirmation };
      await apiRequest<unknown>(
        `${endpoint}/validate-password/`,
        { method: "POST", body: JSON.stringify(payload) },
        false,
      );
      const result = await apiRequest<{ detail: string }>(
        `${endpoint}/`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        false,
      );
      setMessage(result.detail);
      setPassword("");
      setConfirmation("");
      navigate(location.pathname, { replace: true });
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title={activation ? "Activar cuenta" : "Nueva contraseña"}
      intro="Define una contraseña segura para tu cuenta."
    >
      {!token && (
        <p className="px-0 py-2 text-sm text-neutral-900" role="alert">
          El enlace no contiene un token válido.
        </p>
      )}
      {loading && <p role="status">Comprobando enlace…</p>}
      {error && (
        <p className="px-0 py-2 text-sm text-neutral-900" role="alert">
          {error}
        </p>
      )}
      {details && !message && (
        <>
          {activation && (
            <dl className="grid gap-3 m-0 mb-5 p-0 bg-white border-0 shadow-none">
              <div>
                <dt>Nombres</dt>
                <dd>{details.first_names}</dd>
              </div>
              <div>
                <dt>Apellidos</dt>
                <dd>{details.last_names}</dd>
              </div>
              <div>
                <dt>Correo</dt>
                <dd>{details.email}</dd>
              </div>
              <div>
                <dt>Áreas</dt>
                <dd>
                  {details.all_areas
                    ? "Todas las áreas activas actuales y futuras"
                    : details.areas.map((area) => area.name).join(", ")}
                </dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>{roleLabel(details.role)}</dd>
              </div>
            </dl>
          )}
          <form className="grid gap-2.5" onSubmit={submit}>
            <label className="text-neutral-900 text-sm " htmlFor="new-password">
              Contraseña
            </label>
            <input
              className="w-full min-h-10 px-3 py-2 text-neutral-900 bg-white border border-neutral-200 rounded-lg shadow-none focus:ring-0 focus-visible:outline-none focus:border-neutral-400"
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={1024}
              aria-describedby="password-hint"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p
              className="m-0 text-xs text-neutral-600 leading-relaxed"
              id="password-hint"
            >
              Usa al menos 12 caracteres. Evita contraseñas comunes o parecidas
              a tu nombre o correo.
            </p>
            <label
              className="text-neutral-900 text-sm "
              htmlFor="confirm-password"
            >
              Confirmar contraseña
            </label>
            <input
              className="w-full min-h-10 px-3 py-2 text-neutral-900 bg-white border border-neutral-200 rounded-lg shadow-none focus:ring-0 focus-visible:outline-none focus:border-neutral-400"
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={1024}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            <button
              className="w-full mt-2 min-h-10 px-4 py-2 bg-neutral-900 text-neutral-100 text-sm rounded-lg shadow-none hover:bg-neutral-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={busy}
            >
              {busy ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        </>
      )}
      {message && (
        <p className="px-0 py-2 text-sm text-neutral-900" role="status">
          {message}
        </p>
      )}
      <Link
        className="inline-block mt-5 text-neutral-600 text-sm hover:text-neutral-900"
        to="/"
      >
        Ir al acceso
      </Link>
    </AuthFrame>
  );
}
