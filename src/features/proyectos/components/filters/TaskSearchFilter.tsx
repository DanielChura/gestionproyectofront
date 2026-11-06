import SearchIcon from "../../../../shared/Icons/SearchIcon";

export default function TaskSearchFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative flex min-w-0 items-center">
      <SearchIcon className="pointer-events-none absolute left-2.5 size-4 text-neutral-400" />
      <input
        type="search"
        placeholder="Buscar tareas…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-48 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-8 pr-3 py-1.5 text-xs font-medium text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
      />
    </div>
  );
}
