export type ToastIcon = "alert" | "error" | "info" | "success";

export interface Toast {
  id: string;
  icon: ToastIcon;
  title: string;
  message: string;
}

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}
