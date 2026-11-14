import VectorIcon from "../../../../shared/icons/VectorIcon";

export default function TaskGroupExpansionFilter({
  expanded,
  disabled,
  onToggle,
}: {
  expanded: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const label = expanded ? "Contraer" : "Expandir";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-label={label}
      title={label}
      className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:cursor-default disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
    >
      <VectorIcon className="size-4" />
    </button>
  );
}
