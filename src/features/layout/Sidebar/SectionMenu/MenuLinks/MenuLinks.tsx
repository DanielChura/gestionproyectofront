import { Link } from "react-router";
import type { SubRoute } from "../../../../../routes";

interface MenuLinksProps {
  items: SubRoute[];
  pathname: string;
}

export default function MenuLinks({ items, pathname }: MenuLinksProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {items.map((item) => {
        const Icon = item.Icon;
        const active = pathname === item.path;

        return (
          <li key={item.path}>
            <Link
              to={item.path}
              aria-current={active ? "page" : undefined}
              className={`badge ${
                active
                  ? "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
                  : ""
              }`}
            >
              <Icon className="size-4 shrink-0" fill={false} />
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
