import VectorIcon from "../../../shared/icons/VectorIcon";

export default function TaskGroupExpansionControl({
  expanded,
  disabled,
  controls,
  onToggle,
}: {
  expanded: boolean;
  disabled: boolean;
  controls: string;
  onToggle: () => void;
}) {
  const label = expanded ? "Contraer" : "Expandir";
  return (
    <button
      type="button"
      aria-label={expanded ? "Contraer grupos" : "Expandir grupos"}
      aria-expanded={expanded}
      aria-controls={controls || undefined}
      disabled={disabled}
      onClick={onToggle}
      className="inline-flex cursor-pointer items-center gap-1.5 p-1.5 text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 disabled:opacity-50"
    >
      <span className={`block size-4 `}>
        <VectorIcon className="size-4" />
      </span>
      <span className="text-xs">{label}</span>
    </button>
  );
}
