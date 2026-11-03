import type { ComponentType, ReactNode } from "react";
import { useState } from "react";
import Modal from "../Modal/Modal";
import type { IconProps } from "../../../shared/icons/types";

interface TaskPropertyProps {
  id: string;
  label: string;
  value: string;
  icon?: ComponentType<IconProps> | ReactNode;
  error?: string;
  disabled?: boolean;
  cell?: boolean;
  compact?: boolean;
  appearance?: "detail" | "toolbar" | "list";
  selected?: boolean;
  triggers?: { label: string; content: ReactNode }[];
  content?: ReactNode;
  children: (close: () => void) => ReactNode;
}

export default function TaskProperty({
  id,
  label,
  value,
  icon,
  error,
  disabled,
  cell,
  compact,
  appearance = "list",
  selected,
  triggers,
  content,
  children,
}: TaskPropertyProps) {
  const [open, setOpen] = useState(false);
  const Icon = typeof icon === "function" ? icon : null;
  const items = triggers ?? [
    {
      label: `${label}: ${value}`,
      content: content ?? (
        <>
          {Icon ? <Icon className="size-4" /> : icon}
          <span className="truncate">{value}</span>
        </>
      ),
    },
  ];
  return (
    <div className="h-full min-w-0 max-w-full">
      <div
        className={
          triggers ? "flex flex-wrap items-center gap-0.5 px-1.5" : "contents"
        }
      >
        {items.map((item, index) => (
          <button
            key={index}
            id={index === 0 ? id : `${id}-${index}`}
            type="button"
            className={
              triggers || compact
                ? "inline-flex h-full cursor-pointer items-center justify-center rounded border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                : `inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700${cell ? (appearance === "list" ? " h-12 w-full px-1.5" : " h-full w-full px-1.5") : ""}`
            }
            disabled={disabled}
            aria-label={item.label}
            aria-pressed={compact ? selected : undefined}
            onClick={() => setOpen(true)}
          >
            {item.content}
          </button>
        ))}
      </div>
      {error && (
        <p
          id={`${id}-error`}
          className="mb-0 mt-1 max-w-56 text-xs leading-relaxed text-red-700 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
      {open && (
        <Modal title={label} onClose={() => setOpen(false)}>
          <div className="p-4" data-initial-focus tabIndex={-1}>
            {children(() => setOpen(false))}
          </div>
        </Modal>
      )}
    </div>
  );
}
