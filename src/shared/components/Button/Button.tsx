import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonSize = "base" | "sm";
type ButtonVariant = "primary" | "secondary";

const SIZES: Record<ButtonSize, string> = {
  base: "px-3 py-1.5 text-xs",
  sm: "inline-flex items-center gap-1.5 px-2 py-1 text-xs",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-neutral-900 text-neutral-100 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200",
  secondary:
    "border border-neutral-200 text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800",
};

interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "size"
> {
  children?: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

function Button({
  children,
  className = "",
  size = "base",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-md font-medium disabled:cursor-not-allowed disabled:opacity-50 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
