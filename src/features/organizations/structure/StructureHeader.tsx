import { Link } from "react-router";
import PlusIcon from "../../../shared/icons/PlusIcon";

export default function StructureHeader() {
  return (
    <header className="mb-2">
      <div className="flex items-center justify-between gap-4">
        <h1 className="m-0 text-lg font-medium text-neutral-800 dark:text-neutral-100">
          Áreas y proyectos
        </h1>
        <Link
          to="/organizaciones/estructura?modal=proyecto"
          className="badge bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          <PlusIcon className="size-3.5" />
          <span>Nuevo proyecto</span>
        </Link>
      </div>
      <hr className="-mx-4 my-4 border-neutral-200 dark:border-neutral-800" />
    </header>
  );
}
