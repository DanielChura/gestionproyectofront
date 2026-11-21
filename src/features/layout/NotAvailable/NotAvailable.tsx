import { Link } from "react-router";

function NotAvailable() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 text-center text-neutral-900 dark:text-neutral-100">
      <div className="flex flex-col items-center max-w-sm">
        <p className="text-6xl sm:text-7xl  tracking-tight text-neutral-900 dark:text-neutral-100 leading-none select-none">
          404
        </p>

        <h1 className="mt-4 text-lg sm:text-xl  tracking-tight text-neutral-950 dark:text-neutral-100">
          Página no encontrada
        </h1>

        <p className="mt-2 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
          El enlace que buscas no existe, fue eliminado o cambió de dirección.
        </p>

        <div className="mt-6 flex items-center justify-center gap-4">
          <Link
            to="/"
            className="px-4 py-2 rounded-full bg-neutral-900 dark:bg-white text-neutral-100 dark:text-neutral-900 text-xs  hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer"
          >
            Ir al inicio
          </Link>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 py-2 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs  hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            Regresar
          </button>
        </div>
      </div>
    </main>
  );
}

export default NotAvailable;
