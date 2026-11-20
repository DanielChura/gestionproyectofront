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
      aria-label="Ajustes"
      title="Ajustes"
      className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
    >
      <DotsIcon className="size-4" />
    </button>
  );
}
