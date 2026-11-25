const gridDots: Array<{ x: number; y: number }> = [];

for (let x = 24; x <= 496; x += 48) {
  for (let y = 24; y <= 240; y += 48) {
    gridDots.push({ x, y });
  }
}

export default function NotFoundArt() {
  return (
    <svg
      viewBox="0 0 520 260"
      fill="none"
      aria-hidden="true"
      className="h-auto w-full text-neutral-700 dark:text-neutral-100"
    >
      <g
        fill="currentColor"
        opacity="0.8"
        className="text-neutral-200 dark:text-neutral-700"
      >
        {gridDots.map((dot) => (
          <circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r="1.2" />
        ))}
      </g>

      <ellipse
        cx="254"
        cy="132"
        rx="104"
        ry="40"
        transform="rotate(-14 254 132)"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="2 7"
        className="text-neutral-400 dark:text-neutral-600"
      />

      <g
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M126 24 L26 168 H146" />
        <path d="M126 24 V240" />
        <ellipse cx="254" cy="132" rx="64" ry="108" />
        <path d="M470 24 L370 168 H490" />
        <path d="M470 24 V240" />
      </g>

      <ellipse
        cx="254"
        cy="132"
        rx="36"
        ry="72"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="2 9"
        className="text-neutral-400 dark:text-neutral-600"
      />

      <circle
        cx="355"
        cy="107"
        r="4"
        fill="currentColor"
        className="text-neutral-400 dark:text-neutral-600"
      />

      <path
        d="M20 248 H500"
        stroke="currentColor"
        strokeWidth="1"
        className="text-neutral-300 dark:text-neutral-700"
      />
    </svg>
  );
}
