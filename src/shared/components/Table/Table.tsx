import type { ComponentType, ReactNode } from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  headerClassName?: string;
  cellClassName?: string;
  skeletonWidth?: string | number;
  render: (item: T) => ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  skeletonRows?: number;
  emptyMessage?: string;
}

export default function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  skeletonRows = 6,
  emptyMessage = "No hay registros disponibles.",
}: TableProps<T>) {
  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="w-full overflow-x-auto">
        <table
          className="w-full border-collapse text-left text-xs text-neutral-600 dark:text-neutral-400"
          aria-busy={isLoading ? "true" : undefined}
        >
          <thead className="border-b border-neutral-200 text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`p-3 ${col.headerClassName ?? ""}`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.icon && <col.icon className="size-4" />}
                    {col.header}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonTheme
                baseColor="var(--skeleton-base)"
                highlightColor="var(--skeleton-highlight)"
                enableAnimation={false}
              >
                {Array.from({ length: skeletonRows }, (_, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 ${col.cellClassName ?? ""}`}
                      >
                        <Skeleton
                          width={col.skeletonWidth ?? "80%"}
                          height={12}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </SkeletonTheme>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className="border-b border-neutral-200 hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800 last:border-b-0"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-2.5 ${col.cellClassName ?? ""}`}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!isLoading && data.length === 0 && (
        <p
          role="status"
          className="m-0 px-3 py-8 text-center text-xs text-neutral-600 dark:text-neutral-400"
        >
          {emptyMessage}
        </p>
      )}
    </section>
  );
}
