import { useEffect, type ComponentType } from "react";
import type {
  Toast as ToastData,
  ToastIcon,
} from "../../../context/toastState";
import { useToast } from "../../../hooks/useToast";
import AlertIcon from "../../icons/AlertIcon";
import ErrorIcon from "../../icons/ErrorIcon";
import InfoIcon from "../../icons/InfoIcon";
import SuccessIcon from "../../icons/SuccessIcon";
import XIcon from "../../icons/XIcon";
import type { IconProps } from "../../icons/types";

const toastIcons: Record<
  ToastIcon,
  { Icon: ComponentType<IconProps>; color: string }
> = {
  alert: { Icon: AlertIcon, color: "text-yellow-600" },
  error: { Icon: ErrorIcon, color: "text-red-600" },
  info: { Icon: InfoIcon, color: "text-blue-600" },
  success: { Icon: SuccessIcon, color: "text-green-500" },
};

function ToastItem({
  toast,
  onClose,
}: {
  toast: ToastData;
  onClose: (id: string) => void;
}) {
  const { Icon, color } = toastIcons[toast.icon];

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onClose(toast.id);
    }, 6000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [toast.id, onClose]);

  return (
    <div
      role="status"
      className="bg-white border border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800 shadow-md rounded-xl p-3"
    >
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${color}`} fill={true} />
        <p className="m-0 flex-1 text-xs font-medium text-neutral-800 dark:text-neutral-400">
          {toast.title}
        </p>
        <button
          type="button"
          aria-label="Cerrar notificación"
          onClick={() => onClose(toast.id)}
          className="text-neutral-600 cursor-pointer"
        >
          <XIcon className="size-4" />
        </button>
      </div>
      <p className="m-0 mt-2 pl-6 text-xs text-neutral-500">{toast.message}</p>
    </div>
  );
}

export function Toast() {
  const { removeToast, toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
}
