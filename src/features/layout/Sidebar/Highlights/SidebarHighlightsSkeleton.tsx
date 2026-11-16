import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

const SKELETON_WIDTHS = [112, 88, 132, 96, 120, 104];

export default function SidebarHighlightsSkeleton() {
  return (
    <SkeletonTheme
      baseColor="var(--skeleton-base)"
      highlightColor="var(--skeleton-highlight)"
    >
      {SKELETON_WIDTHS.map((width, index) => (
        <li key={index} className="shrink-0">
          <Skeleton inline width={width} height={30} borderRadius={8} />
        </li>
      ))}
    </SkeletonTheme>
  );
}
