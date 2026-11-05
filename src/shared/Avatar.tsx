import type { HTMLAttributes } from "react";

export function avatarFor(name: string): string {
  return name
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toLocaleUpperCase("es");
}

interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  className?: string;
}

export default function Avatar({
  name,
  className = "size-7 text-xs",
  ...props
}: AvatarProps) {
  return (
    <span
      {...props}
      className={`inline-grid shrink-0 place-items-center rounded-full bg-sky-600  text-neutral-100 ${className}`}
    >
      {avatarFor(name)}
    </span>
  );
}
