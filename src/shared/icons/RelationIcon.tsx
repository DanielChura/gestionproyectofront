import type { IconProps } from "./types";
function RelationIcon({ className }: IconProps) {
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
      <path d="M8 4l-4 4l4 4M4 8h11a5 5 0 0 1 5 5m-4 7l4 -4l-4 -4m4 4H9a5 5 0 0 1 -5 -5" />
    </svg>
  );
}

export default RelationIcon;
