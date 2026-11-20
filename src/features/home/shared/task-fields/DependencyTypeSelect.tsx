import { dependencyTypes } from "../../utils/taskSchedule";
import type { DependencyType } from "../../types";

export default function DependencyTypeSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: DependencyType | "";
  onChange: (value: DependencyType | "") => void;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-1 text-xs">
      Tipo de dependencia
      <select
        className="cursor-pointer rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs focus-visible:outline-2 dark:border-neutral-600 dark:bg-neutral-900"
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value as DependencyType | "")
        }
      >
        <option value="">Selecciona un tipo</option>
        {Object.entries(dependencyTypes).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
