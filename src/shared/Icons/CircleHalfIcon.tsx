import type { IconProps } from "./types";
function CircleHalfIcon({ className, fill = false }: IconProps) {
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
      {fill ? (
        <path
          fill="currentColor"
          fillRule="evenodd"
          stroke="none"
          d="M12 2a10 10 0 1 1 0 20a10 10 0 0 1 0-20zM12 3.75a8.25 8.25 0 1 0 0 16.5a8.25 8.25 0 0 0 0-16.5zM12 4.75a7.25 7.25 0 0 1 0 14.5z"
        />
      ) : (
        <>
          <circle cx="12" cy="12" r="10" />
          <path
            d="M12 4.5a7.5 7.5 0 0 1 0 15z"
            fill="currentColor"
            stroke="none"
          />
        </>
      )}
    </svg>
  );
}

export default CircleHalfIcon;
