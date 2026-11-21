import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import SkeletonCards from "../../shared/states/SkeletonCards/SkeletonCards";

export default function TeamDetailSkeleton() {
  return (
    <main
      id="main-content"
      className="min-h-full text-neutral-800 dark:text-neutral-100"
      aria-busy="true"
    >
      <SkeletonTheme
        baseColor="var(--skeleton-base)"
        highlightColor="var(--skeleton-highlight)"
        enableAnimation={false}
      >
        <div className="-mx-4 -mt-4 mb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-4 px-4 py-3">
            <Skeleton width={28} height={28} borderRadius={8} />
            <Skeleton width={32} height={32} borderRadius={6} />
            <Skeleton width={160} height={16} />
          </div>
        </div>
        <div className="flex items-center justify-between pb-4">
          <Skeleton width={120} height={16} />
          <Skeleton width={200} height={28} borderRadius={6} />
        </div>
      </SkeletonTheme>
      <SkeletonCards count={6} />
    </main>
  );
}
