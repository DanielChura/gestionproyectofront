import type { IconProps } from "./types";
function VectorIcon({ className, fill = false }: IconProps) {
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
      <path d="M4 7a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
      <path d="M14 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
      <path d="M7 10v4a3 3 0 0 0 3 3h4" />
    </svg>
  );
}

export default VectorIcon;
