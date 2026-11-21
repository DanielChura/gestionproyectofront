import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

export default function ProfileFormSkeleton() {
  return (
    <SkeletonTheme
      baseColor="var(--skeleton-base)"
      highlightColor="var(--skeleton-highlight)"
      enableAnimation={false}
    >
      <div className="grid gap-3.5 sm:grid-cols-2" aria-busy="true">
        <div className="flex items-center gap-3 sm:col-span-2">
          <Skeleton circle width={44} height={44} />
          <Skeleton width={140} height={12} />
        </div>
        <Skeleton height={30} />
        <Skeleton height={30} />
        <div className="sm:col-span-2">
          <Skeleton height={30} />
        </div>
        <div className="sm:col-span-2">
          <Skeleton height={30} />
        </div>
        <Skeleton width={110} height={30} />
      </div>
    </SkeletonTheme>
  );
}
