import type { IconProps } from "./types";
function SettingsIcon({ className }: IconProps) {
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
      <path d="M3 7h4m6 0h8M3 17h10m6 0h2" />
      <circle cx="10" cy="7" r="3" />
      <circle cx="16" cy="17" r="3" />
    </svg>
  );
}

export default SettingsIcon;
