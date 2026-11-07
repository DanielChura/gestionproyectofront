import type { IconProps } from "./types";
function SparkleIcon({ className, fill = false }: IconProps) {
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
      <path d="M21 12c-6.597 0 -9 2.403 -9 9c0 -6.597 -2.403 -9 -9 -9c6.597 0 9 -2.403 9 -9c0 6.597 2.403 9 9 9" />
    </svg>
  );
}

export default SparkleIcon;
