import type { ReactNode } from "react";

export default function TaskTable({
  groupName,
  children,
}: {
  groupName: string;
  children: ReactNode;
}) {
  return (
    <table className="w-full table-fixed border-collapse text-xs text-neutral-800 dark:text-neutral-100">
      <colgroup>
        <col style={{ width: "40%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "12%" }} />
      </colgroup>
      <thead className="border-b border-neutral-200 dark:border-neutral-800 text-left text-neutral-400 dark:text-neutral-500">
        <tr>
          <th scope="col" className="py-2 px-3 text-left">
            Nombre
          </th>
          <th scope="col" className="py-2 px-1.5">
            Persona asignada
          </th>
          <th scope="col" className="py-2 px-1.5">
            Fecha de inicio
          </th>
          <th scope="col" className="py-2 px-1.5">
            Fecha límite
          </th>
          <th scope="col" className="py-2 px-1.5">
            Prioridad
          </th>
          <th scope="col" className="py-2 px-1.5">
            Estado
          </th>
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
