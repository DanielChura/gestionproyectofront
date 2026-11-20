import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

interface SkeletonCardsProps {
  count?: number;
}

export default function SkeletonCards({ count = 12 }: SkeletonCardsProps) {
  return (
    <SkeletonTheme
      baseColor="var(--skeleton-base)"
      highlightColor="var(--skeleton-highlight)"
      enableAnimation={false}
    >
      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
        aria-busy="true"
      >
        {Array.from({ length: count }, (_, index) => (
          <article
            key={index}
            className="flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800"
          >
            <div className="p-2 pb-0">
              <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800/60">
                <Skeleton width={48} height={28} borderRadius={6} />
              </div>
            </div>
            <div className="flex flex-col gap-4 p-4">
              <div className="flex items-center justify-between gap-2">
                <Skeleton width="65%" height={12} />
                <Skeleton circle width={8} height={8} />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton width={16} height={16} borderRadius={4} />
                  <Skeleton width="50%" height={12} />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton width={16} height={16} borderRadius={4} />
                  <Skeleton width="40%" height={12} />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SkeletonTheme>
  );
}
