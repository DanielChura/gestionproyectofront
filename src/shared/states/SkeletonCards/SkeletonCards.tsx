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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: count }, (_, index) => (
          <article
            key={index}
            className="flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800"
          >
            <div className="p-2 pt-1">
              <Skeleton className="aspect-square w-full" borderRadius={12} />
            </div>

            <div className="flex flex-col gap-2 p-4">
              <Skeleton width="95%" height={12} />

              <div className="flex flex-col gap-2">
                <Skeleton width="85%" height={12} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </SkeletonTheme>
  );
}
