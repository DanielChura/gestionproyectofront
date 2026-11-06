import type { IconProps } from "./types";
function DotsIcon({ className, fill = false }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M11 19a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M11 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    </svg>
  );
}

export default DotsIcon;
