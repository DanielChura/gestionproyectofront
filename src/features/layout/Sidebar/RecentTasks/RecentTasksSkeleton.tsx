import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

const ROWS = Array.from({ length: 6 }, (_, index) => index);

export default function RecentTasksSkeleton() {
  return (
    <SkeletonTheme
      baseColor="var(--skeleton-base)"
      highlightColor="var(--skeleton-highlight)"
      enableAnimation={false}
    >
      <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-busy="true">
        {ROWS.map((row) => (
          <li
            key={row}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
          >
            <Skeleton width={16} height={16} />
            <Skeleton width={120} height={12} />
          </li>
        ))}
      </ul>
    </SkeletonTheme>
  );
}
