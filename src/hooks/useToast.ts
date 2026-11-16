import { useContext } from "react";
import { ToastContext } from "../context/toastState";

export function useToast() {
  const context = useContext(ToastContext);

  if (context === null) {
    throw new Error("useToast debe utilizarse dentro de ToastProvider");
  }

  return context;
}
