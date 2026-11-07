import type { IconProps } from "./types";
function CircleDashedIcon({ className, fill = false }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={fill ? 2.5 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <circle
        cx="12"
        cy="12"
        r="9.5"
        strokeDasharray={fill ? "4.2 3.65" : "3.6 4.25"}
      />
    </svg>
  );
}

export default CircleDashedIcon;
