import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

interface PublicationSkeletonProps {
  count?: number;
}

export default function PublicationSkeleton({
  count = 8,
}: PublicationSkeletonProps) {
  return (
    <SkeletonTheme
      baseColor="var(--skeleton-base)"
      highlightColor="var(--skeleton-highlight)"
      enableAnimation={false}
    >
      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        aria-busy="true"
      >
        {Array.from({ length: count }, (_, index) => (
          <article
            key={index}
            className="flex h-70 flex-col rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex flex-col text-left">
              <Skeleton circle width={32} height={32} />
              <div className="mt-2.5">
                <Skeleton width="45%" height={12} />
              </div>
              <div className="mt-1.5 flex flex-col gap-1">
                <Skeleton width="90%" height={16} />
                <Skeleton width="65%" height={16} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Skeleton width={56} height={20} borderRadius={4} />
                <Skeleton width={72} height={20} borderRadius={4} />
              </div>
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200/60 pt-3 dark:border-neutral-800/60">
              <div className="flex items-center gap-2">
                <Skeleton width={44} height={12} />
                <Skeleton width={54} height={12} />
              </div>
              <Skeleton width={82} height={26} borderRadius={6} />
            </div>
          </article>
        ))}
      </div>
    </SkeletonTheme>
  );
}
