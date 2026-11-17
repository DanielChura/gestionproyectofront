import type { ButtonHTMLAttributes, ReactNode } from "react";

interface SecondaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

function SecondaryButton({
  children,
  className = "",
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      className={`border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100
        font-medium dark:hover:bg-neutral-900 px-3 py-1.5 text-xs rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default SecondaryButton;
