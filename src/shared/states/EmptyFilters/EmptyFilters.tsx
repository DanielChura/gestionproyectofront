import SearchIcon from "../../icons/SearchIcon";

interface EmptyFiltersProps {
  message?: string;
}

export default function EmptyFilters({
  message = "No se han encontrado resultados que coincidan.",
}: EmptyFiltersProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center px-2.5 py-8 text-center"
    >
      <SearchIcon
        className="size-8 text-neutral-400 dark:text-neutral-500"
        aria-hidden="true"
      />
      <p className="m-0 mt-2 text-xs text-neutral-600 dark:text-neutral-400">
        {message}
      </p>
    </div>
  );
}
