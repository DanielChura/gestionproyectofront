import type { HTMLAttributes } from "react";
import { avatarFor } from "./avatarUtils";
import { initialColor } from "../utils/initialColor";

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
      className={`inline-grid shrink-0 place-items-center text-neutral-100 ${initialColor(name)} ${className}`}
    >
      {avatarFor(name)}
    </span>
  );
}
