import VectorIcon from "../../../../shared/icons/VectorIcon";

export default function TaskGroupExpansionFilter({
  expanded,
  disabled,
  controls,
  onToggle,
}: {
  expanded: boolean;
  disabled: boolean;
  controls?: string;
  onToggle: () => void;
}) {
  const label = expanded ? "Contraer" : "Expandir";

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={expanded ? "Contraer grupos" : "Expandir grupos"}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
      title={label}
      className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:cursor-default disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
    >
      <VectorIcon className="size-4" />
    </button>
  );
}
