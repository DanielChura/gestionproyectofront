import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import AreaProjectsTable from "./AreaProjectsTable";

const CARDS = [0, 1, 2, 3];

export default function StructureSkeleton() {
  return (
    <div aria-busy="true">
      <SkeletonTheme
        baseColor="var(--skeleton-base)"
        highlightColor="var(--skeleton-highlight)"
        enableAnimation={false}
      >
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton width={120} height={16} />
            <Skeleton width={110} height={28} borderRadius={6} />
          </div>
          <div className="flex gap-3 overflow-hidden pb-2">
            {CARDS.map((card) => (
              <div
                key={card}
                className="flex w-44 shrink-0 flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center justify-between mb-2">
                  <Skeleton width={16} height={16} borderRadius={4} />
                  <Skeleton width={16} height={16} borderRadius={4} />
                </div>
                <Skeleton width="75%" height={12} />
                <Skeleton width="45%" height={10} />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Skeleton width={200} height={28} borderRadius={6} />
          <Skeleton width={130} height={28} borderRadius={6} />
          <Skeleton width={130} height={28} borderRadius={6} />
        </div>
      </SkeletonTheme>

      <AreaProjectsTable projects={[]} isLoading={true} />
    </div>
  );
}
