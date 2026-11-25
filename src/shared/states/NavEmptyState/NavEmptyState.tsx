import type { ComponentType } from "react";
import type { IconProps } from "../../icons/types";
import TeamsIcon from "../../icons/TeamsIcon";
import ProjectsIcon from "../../icons/ProjectsIcon";
import FolderIcon from "../../icons/FolderIcon";
import FileIcon from "../../icons/FileIcon";
import UserIcon from "../../icons/UserIcon";
import TaskListIcon from "../../icons/TaskListIcon";

export interface NavEmptyStateProps {
  iconName: string;
  title: string;
  color: string;
  className?: string;
}

const iconMap: Record<string, ComponentType<IconProps>> = {
  teams: TeamsIcon,
  projects: ProjectsIcon,
  folders: FolderIcon,
  folder: FolderIcon,
  areas: FolderIcon,
  files: FileIcon,
  file: FileIcon,
  users: UserIcon,
  user: UserIcon,
  tasks: TaskListIcon,
  task: TaskListIcon,
};

export default function NavEmptyState({
  iconName,
  title,
  color,
  className = "",
}: NavEmptyStateProps) {
  const Icon = iconMap[iconName] ?? TeamsIcon;

  return (
    <div
      role="status"
      className={`relative overflow-hidden rounded-xl border border-neutral-200/70 bg-neutral-100/50 p-4 text-center dark:border-neutral-800 dark:bg-neutral-950 ${className}`}
    >
      <Icon
        className="pointer-events-none absolute -left-1 -top-1 size-5 -rotate-12 text-neutral-400 opacity-10 dark:text-neutral-400 dark:opacity-20"
        aria-hidden="true"
        fill={true}
      />
      <Icon
        className="pointer-events-none absolute -right-1 top-2 size-5 rotate-12 text-neutral-400 opacity-10 dark:text-neutral-400 dark:opacity-20"
        aria-hidden="true"
        fill={true}
      />
      <Icon
        className="pointer-events-none absolute bottom-1 left-6 size-5 rotate-6 text-neutral-400 opacity-10 dark:text-neutral-400 dark:opacity-20"
        aria-hidden="true"
        fill={true}
      />
      <Icon
        className="pointer-events-none absolute -bottom-1 right-5 size-5 -rotate-45 text-neutral-400 opacity-10 dark:text-neutral-400 dark:opacity-20"
        aria-hidden="true"
        fill={true}
      />

      <div className="relative z-10 flex flex-col items-center justify-center">
        <div
          className="flex size-7 items-center justify-center rounded-md"
          style={{ backgroundColor: color }}
        >
          <Icon className="size-4 text-neutral-800" fill={true} />
        </div>
        <p className="m-0 mt-2.5 text-xs text-neutral-600 dark:text-neutral-400">
          {title}
        </p>
      </div>
    </div>
  );
}
