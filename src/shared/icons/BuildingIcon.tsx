import type { IconProps } from "./types";
function BuildingIcon({ className, fill = false }: IconProps) {
  if (fill) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
      >
        <path
          fillRule="evenodd"
          d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5zm4 2h2v2H8V7zm6 0h2v2h-2V7zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-4 4h4v6h-4v-6z"
        />
      </svg>
    );
  }
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
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h2m4 0h2M8 11h2m4 0h2M10 21v-6h4v6" />
    </svg>
  );
}

export default BuildingIcon;
