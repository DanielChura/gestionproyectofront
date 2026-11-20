import type { ButtonHTMLAttributes, ComponentType, ReactNode } from "react";
import type { IconProps } from "../../../../shared/icons/types";
import { useTaskProperty } from "./useTaskProperty";

interface Props {
  id: string;
  label: string;
  value: string;
  icon?: ComponentType<IconProps> | ReactNode;
  error?: string;
  disabled?: boolean;
  cell?: boolean;
  compact?: boolean;
  selected?: boolean;
  appearance?: string;
  fitViewport?: boolean;
  triggerClassName?: string;
  triggerProps?: Pick<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "draggable" | "onDragStart" | "onDragEnd"
  >;
  triggers?: { label: string; content: ReactNode }[];
  content?: ReactNode;
  children: (close: () => void) => ReactNode;
}
export default function TaskProperty(props: Props) {
  const {
    id,
    label,
    value,
    icon,
    error,
    disabled,
    cell,
    compact,
    selected,
    triggers,
    content,
    children,
    triggerClassName,
    triggerProps,
    appearance,
    fitViewport,
  } = props;
  const {
      panel: panelRef,
      trigger,
      open,
      setOpen,
      close,
      panelId,
    } = useTaskProperty(id, fitViewport),
    Icon = typeof icon === "function" ? icon : null;
  const items = triggers ?? [
    {
      label: `${label}: ${value}`,
      content: content ?? (
        <>
          {Icon ? <Icon className="size-4 shrink-0" /> : icon}
          <span className="truncate">{value}</span>
        </>
      ),
    },
  ];
  return (
    <div
      className={
        cell
          ? "min-w-0 w-full"
          : "inline-flex min-w-0 max-w-full shrink-0 flex-col"
      }
      data-property-appearance={appearance}
    >
      <div
        className={triggers ? "flex flex-wrap items-center gap-1" : "contents"}
      >
        {items.map((item, index) => (
          <button
            key={item.label}
            id={index === 0 ? id : `${id}-${index}`}
            ref={index === 0 ? trigger : undefined}
            type="button"
            popoverTarget={panelId}
            {...triggerProps}
            className={
              triggerClassName ??
              `inline-flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-2 py-1.5 text-xs text-neutral-800 hover:border-neutral-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 disabled:cursor-default dark:text-neutral-200 dark:hover:border-neutral-600 dark:focus-visible:outline-neutral-300 ${cell ? "w-full" : "max-w-full"} ${compact ? "justify-center" : ""}`
            }
            disabled={disabled}
            aria-label={item.label}
            aria-expanded={open}
            aria-controls={panelId}
            aria-pressed={compact ? selected : undefined}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onClick={(event) => {
              trigger.current = event.currentTarget;
            }}
          >
            {item.content}
          </button>
        ))}
      </div>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="m-0 max-w-64 text-xs text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      )}
      <div
        ref={panelRef}
        id={panelId}
        popover="auto"
        role="dialog"
        aria-label={label}
        data-return-focus={id}
        className="fixed inset-auto m-0 w-72 max-w-[calc(100vw-16px)] overflow-y-auto overscroll-contain rounded-md border border-neutral-200 bg-white p-3 text-xs text-neutral-800 backdrop:bg-transparent dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 [&_input:not([type=checkbox]):not([type=radio])]:w-full [&_input:not([type=checkbox]):not([type=radio])]:rounded-md [&_input]:border-neutral-300 [&_input:not([type=checkbox]):not([type=radio])]:px-2 [&_input:not([type=checkbox]):not([type=radio])]:py-1.5 [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-neutral-200 [&_select]:px-2 [&_select]:py-1.5 dark:[&_input]:bg-neutral-900 dark:[&_select]:bg-neutral-900 [&_label]:text-xs"
        onToggle={(event) => setOpen(event.newState === "open")}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
        }}
      >
        {open && children(close)}
      </div>
    </div>
  );
}
