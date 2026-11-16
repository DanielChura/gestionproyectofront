import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ToastContext } from "./toastState";
import type { Toast, ToastContextValue, ToastIcon } from "./toastTypes";

export type { Toast, ToastContextValue, ToastIcon };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const newToast: Toast = { ...toast, id: crypto.randomUUID() };
    setToasts((current) => [...current, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      addToast,
      removeToast,
    }),
    [toasts, addToast, removeToast],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}
