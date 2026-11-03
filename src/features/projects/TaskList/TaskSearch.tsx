import SearchIcon from "../../../shared/icons/SearchIcon";
import Input from "../../../shared/Input/Input";

export default function TaskSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative flex min-w-0 items-center">
      <SearchIcon className="pointer-events-none absolute left-2.5 size-4 text-neutral-600 dark:text-neutral-400" />
      <Input
        type="search"
        aria-label="Buscar tareas"
        placeholder="Buscar tareas…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pl-8"
      />
    </div>
  );
}