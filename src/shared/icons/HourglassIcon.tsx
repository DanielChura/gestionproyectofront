import type { IconProps } from "./types";
function HourglassIcon({ className }: IconProps) {
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
      <path d="M6 3h12M6 21h12M7 3v4c0 3 10 7 10 10v4M17 3v4C17 10 7 14 7 17v4" />
    </svg>
  );
}

export default HourglassIcon;
