import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

export default function SkeletonRows({ count = 8 }: { count?: number }) {
  return (
    <SkeletonTheme
      baseColor="var(--skeleton-base)"
      highlightColor="var(--skeleton-highlight)"
      enableAnimation={false}
    >
      <div
        className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
        aria-busy="true"
      >
        {Array.from({ length: count }, (_, row) => (
          <div
            key={row}
            className="flex items-center gap-4 border-b border-neutral-200 px-3 py-2 last:border-b-0 dark:border-neutral-800"
          >
            <Skeleton width={16} height={12} />
            <Skeleton width={160} height={12} />
          </div>
        ))}
      </div>
    </SkeletonTheme>
  );
}
