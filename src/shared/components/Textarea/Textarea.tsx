import type { TextareaHTMLAttributes } from "react";

export default function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full resize-y rounded-md border border-neutral-200 px-2 py-1.5 text-xs text-neutral-700 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:text-neutral-100 dark:placeholder:text-neutral-400 ${className}`}
      {...props}
    />
  );
}
