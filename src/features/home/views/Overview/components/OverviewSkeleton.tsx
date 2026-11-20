import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

const ROWS = [0, 1, 2, 3];

export default function OverviewSkeleton() {
  return (
    <SkeletonTheme
      baseColor="var(--skeleton-base)"
      highlightColor="var(--skeleton-highlight)"
    >
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ROWS.map((card) => (
            <div
              key={card}
              className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <Skeleton width="45%" height={12} />
              <div className="my-3">
                <Skeleton width="60%" height={24} />
              </div>
              <Skeleton width="50%" height={12} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-8">
            <Skeleton width={140} height={14} />
            <div className="mt-3">
              <Skeleton height={288} borderRadius={12} />
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-4">
            <Skeleton width={140} height={14} />
            <div className="mt-3">
              <Skeleton height={288} borderRadius={12} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <Skeleton width={180} height={14} />
          <div className="mt-3 flex flex-col gap-2">
            {ROWS.map((row) => (
              <Skeleton key={row} height={32} />
            ))}
          </div>
        </div>
      </div>
    </SkeletonTheme>
  );
}
