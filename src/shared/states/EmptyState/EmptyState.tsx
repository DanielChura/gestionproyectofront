import type { ComponentType } from "react";
import type { IconProps } from "../../icons/types";
import FileIcon from "../../icons/FileIcon";
import FolderIcon from "../../icons/FolderIcon";
import ProjectsIcon from "../../icons/ProjectsIcon";
import TeamsIcon from "../../icons/TeamsIcon";

interface EmptyStateProps {
  iconName: EmptyStateIconName;
  message: string;
  style?: "normal" | "small";
}

export type EmptyStateIconName = "areas" | "teams" | "specialties" | "projects";

const emptyStateIcons: Record<EmptyStateIconName, ComponentType<IconProps>> = {
  areas: FolderIcon,
  teams: TeamsIcon,
  specialties: FileIcon,
  projects: ProjectsIcon,
};

function EmptyState({ iconName, message, style = "normal" }: EmptyStateProps) {
  const Icon = emptyStateIcons[iconName];
  const small = style === "small";

  return (
    <div
      role="status"
      className="flex flex-1 flex-col items-center justify-center px-2.5 py-8 text-center"
    >
      <span
        className="text-neutral-600 dark:text-neutral-400"
        aria-hidden="true"
      >
        <Icon className={small ? "size-6" : "size-8"} fill={false} />
      </span>
      <p
        className={`m-0 mt-2 ${
          small ? "text-[11px]" : "text-xs"
        } text-neutral-600 dark:text-neutral-400`}
      >
        {message}
      </p>
    </div>
  );
}

export default EmptyState;
