import { Link } from "react-router";

function NotAvailable() {
  return (
    <main
      className="min-h-full text-neutral-900 dark:text-neutral-100 p-6"
      id="main-content"
    >
      <h1 className="m-0 text-xl text-neutral-900 dark:text-neutral-100">
        Acceso no disponible
      </h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        No tienes permiso para ver esta página o la ruta no existe.
      </p>
      <Link
        to="/"
        className="inline-block mt-4 text-sm text-neutral-600 dark:text-neutral-400"
      >
        Volver a Inicio
      </Link>
    </main>
  );
}

export default NotAvailable;
