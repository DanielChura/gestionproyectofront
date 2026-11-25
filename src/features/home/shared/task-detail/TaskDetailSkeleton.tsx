import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

export default function TaskDetailSkeleton() {
  return (
    <SkeletonTheme
      baseColor="var(--skeleton-base)"
      highlightColor="var(--skeleton-highlight)"
      enableAnimation={false}
    >
      <div
        aria-busy="true"
        className="flex min-h-0 flex-1 overflow-hidden divide-x divide-neutral-200 dark:divide-neutral-800 max-md:flex-col max-md:divide-x-0 max-md:divide-y"
      >
        <div className="flex-[3] min-w-0 space-y-4 overflow-y-auto p-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton width={16} height={16} />
              <Skeleton width={80} height={14} />
            </div>
            <Skeleton width="55%" height={26} />
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-y border-neutral-200 py-3 dark:border-neutral-800">
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1">
                  <Skeleton width={70} height={14} />
                  <Skeleton width={110} height={20} className="rounded-md" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1">
                  <Skeleton width={70} height={14} />
                  <Skeleton width={110} height={20} className="rounded-md" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-neutral-200 p-2.5 dark:border-neutral-800">
            <Skeleton width="100%" height={48} />
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <Skeleton width={14} height={14} />
              <Skeleton width={70} height={14} />
            </div>
            <div className="space-y-1">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md py-2 pl-4 pr-2"
                >
                  <Skeleton width={160} height={16} />
                  <Skeleton width={80} height={16} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-[2] min-w-0 p-4 max-md:hidden">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <Skeleton width={60} height={14} />
            <Skeleton width={40} height={14} />
          </div>
          <div className="space-y-4 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton width={180} height={14} />
                <Skeleton width={60} height={12} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonTheme>
  );
}
