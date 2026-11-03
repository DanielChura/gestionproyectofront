import DotsIcon from "../../../shared/icons/DotsIcon";

export default function TaskStatusSettingsControl({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label="Ajustes de estados"
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-1.5 p-1.5 text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
    >
      <DotsIcon className="size-4" />
      <span className="text-xs">Ajustes</span>
    </button>
  );
}