import FolderIcon from "../../../../shared/icons/FolderIcon";
import XIcon from "../../../../shared/icons/XIcon";

interface TaskHeaderProps {
  projectName: string;
  parentName?: string;
  onNavigateParent?: () => void;
  onClose: () => void;
}

export default function TaskHeader({
  projectName,
  parentName,
  onNavigateParent,
  onClose,
}: TaskHeaderProps) {
  return (
    <header className="flex h-11 w-full shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40">
      <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <FolderIcon className="size-3.5 text-neutral-400" />
        <span className="truncate font-medium text-neutral-700 dark:text-neutral-300">
          {projectName}
        </span>
        {parentName && (
          <>
            <span>/</span>
            <button
              type="button"
              onClick={onNavigateParent}
              className="cursor-pointer truncate hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              {parentName}
            </button>
          </>
        )}
      </div>
      <button
        type="button"
        aria-label="Cerrar modal"
        onClick={onClose}
        className="cursor-pointer rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
      >
        <XIcon className="size-4" />
      </button>
    </header>
  );
}
