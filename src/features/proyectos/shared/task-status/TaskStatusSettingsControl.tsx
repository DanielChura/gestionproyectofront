import DotsIcon from "../../../../shared/icons/DotsIcon";

export default function TaskStatusSettingsControl({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
    >
      <DotsIcon className="size-4" />
      <span>Ajustes</span>
    </button>
  );
}
