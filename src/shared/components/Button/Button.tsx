import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "base" | "sm";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary:
    "border border-neutral-200 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-800",
};

const SIZES: Record<ButtonSize, string> = {
  base: "px-3 py-1.5 text-sm",
  sm: "px-2.5 py-1.5 text-xs",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

function Button({
  children,
  className = "",
  variant = "primary",
  size = "sm",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium disabled:cursor-not-allowed disabled:opacity-50 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
