import CheckIcon from "../../shared/icons/CheckIcon";
import type { AccentOption } from "../../hooks/useAccentColor";

interface AccentColorPickerProps {
  currentAccent: string;
  options: AccentOption[];
  onChange: (id: string) => void;
}

export default function AccentColorPicker({
  currentAccent,
  options,
  onChange,
}: AccentColorPickerProps) {
  return (
    <div className="grid gap-2">
      <div>
        <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
          Color de acento
        </span>
        <p className="m-0 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          Personaliza los elementos interactivos y destacados de la interfaz.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {options.map((color) => {
          const active = currentAccent === color.id;
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onChange(color.id)}
              aria-label={color.name}
              aria-pressed={active}
              style={{ backgroundColor: color.hex }}
              className={`flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-white dark:ring-offset-neutral-900 ${
                active
                  ? "ring-2 ring-neutral-900 dark:ring-neutral-100"
                  : "hover:opacity-90"
              }`}
            >
              {active && <CheckIcon className="size-3.5 text-neutral-100" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
