import type { InputHTMLAttributes } from "react";

type InputStyle = "normal" | "small";

interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "style"
> {
  className?: string;
  style?: InputStyle;
}

export default function Input({
  className = "",
  style = "normal",
  ...props
}: InputProps) {
  return (
    <input
      className={`w-full rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:focus:border-neutral-400 ${
        style === "small" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
      } ${className}`}
      {...props}
    />
  );
}
