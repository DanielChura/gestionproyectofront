import { useEffect, type ComponentType } from "react";
import type { Toast as ToastData, ToastIcon } from "../../context/ToastContext";
import { useToast } from "../../hooks/useToast";
import AlertIcon from "../Icons/AlertIcon";
import ErrorIcon from "../Icons/ErrorIcon";
import InfoIcon from "../Icons/InfoIcon";
import SuccessIcon from "../Icons/SuccessIcon";
import XIcon from "../Icons/XIcon";
import type { IconProps } from "../Icons/types";

const toastIcons: Record<
  ToastIcon,
  { Icon: ComponentType<IconProps>; color: string }
> = {
  alert: { Icon: AlertIcon, color: "text-amber-600" },
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
      className="bg-white border border-neutral-200 rounded-xl p-3"
    >
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${color}`} />
        <p className="m-0 flex-1 text-xs font- text-neutral-800">
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
      <p className="m-0 mt-1 pl-6 text-xs text-neutral-600">{toast.message}</p>
    </div>
  );
}

export function Toast() {
  const { removeToast, toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
}
