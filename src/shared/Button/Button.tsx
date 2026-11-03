import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

function Button({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`bg-neutral-800 text-neutral-100 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-800 dark:hover:bg-neutral-200 px-3 py-1.5 text-xs  rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
