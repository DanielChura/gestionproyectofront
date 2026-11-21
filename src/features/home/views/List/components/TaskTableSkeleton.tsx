import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

const ROWS = Array.from({ length: 12 }, (_, index) => index);

export default function TaskTableSkeleton() {
  return (
    <SkeletonTheme
      baseColor="var(--skeleton-base)"
      highlightColor="var(--skeleton-highlight)"
      enableAnimation={false}
    >
      <div aria-busy="true">
        <div className="flex items-center gap-2 px-3 py-1">
          <Skeleton width={16} height={16} />
          <Skeleton width={110} height={20} />
        </div>
        <div className="pl-8">
          {ROWS.map((row) => (
            <div
              key={row}
              className="flex items-center gap-4 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800"
            >
              <Skeleton width={16} height={16} />
              <Skeleton width={240} height={16} className="flex-1" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonTheme>
  );
}
