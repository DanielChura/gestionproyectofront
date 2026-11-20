import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

const AREAS = [0, 1, 2];
const PROJECT_COUNTS = [3, 2, 4];

export default function ProjectsByAreaSkeleton() {
  return (
    <SkeletonTheme
      baseColor="var(--skeleton-base)"
      highlightColor="var(--skeleton-highlight)"
      enableAnimation={false}
    >
      <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-busy="true">
        {AREAS.map((area) => (
          <li key={area} className="min-w-0">
            <div className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5">
              <Skeleton width={20} height={20} borderRadius={6} />
              <Skeleton width="60%" height={12} />
            </div>
            <ul className="m-0 ml-4 mt-1 flex list-none flex-col gap-1 p-0">
              {Array.from({ length: PROJECT_COUNTS[area] }, (_, project) => (
                <li
                  key={project}
                  className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5"
                >
                  <Skeleton width={16} height={16} borderRadius={4} />
                  <Skeleton
                    width={`${65 + ((project * 9) % 30)}%`}
                    height={12}
                  />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </SkeletonTheme>
  );
}
