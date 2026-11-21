import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

export default function SpecialtiesSkeleton() {
  return (
    <SkeletonTheme
      baseColor="var(--skeleton-base)"
      highlightColor="var(--skeleton-highlight)"
      enableAnimation={false}
    >
      <div className="grid gap-4" aria-busy="true">
        <div className="flex flex-wrap gap-1.5">
          <Skeleton width={90} height={22} borderRadius={9999} />
          <Skeleton width={110} height={22} borderRadius={9999} />
          <Skeleton width={80} height={22} borderRadius={9999} />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1">
            <Skeleton height={30} borderRadius={6} />
          </div>
          <Skeleton width={80} height={30} borderRadius={6} />
        </div>
      </div>
    </SkeletonTheme>
  );
}
