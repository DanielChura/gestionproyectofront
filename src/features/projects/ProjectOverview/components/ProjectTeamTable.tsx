import Avatar from "../../../../shared/Avatar";
import ActivityIcon from "../../../../shared/icons/ActivityIcon";
import CalendarIcon from "../../../../shared/icons/CalendarIcon";
import CheckIcon from "../../../../shared/icons/CheckIcon";
import ClockIcon from "../../../../shared/icons/ClockIcon";
import UserIcon from "../../../../shared/icons/UserIcon";
import type { ProjectPerson } from "../../../../core/interfaces/projectOverview.interface";

interface Props {
  people?: ProjectPerson[];
}

export default function ProjectTeamTable({ people }: Props) {
  return (
    <section
      className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      aria-label="Rendimiento del equipo"
    >
      <div className="flex items-center justify-between p-4 pb-3">
        <h2 className="text-xs  text-neutral-800 dark:text-neutral-100">
          Rendimiento del equipo
        </h2>
      </div>

      {people && people.length > 0 ? (
        <div className="max-h-120 min-h-60 w-full overflow-y-auto overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                <th className="px-4 pb-2.5 text-left ">
                  <span className="inline-flex items-center gap-1">
                    <UserIcon className="size-3.5" />
                    Responsable
                  </span>
                </th>
                <th className="px-4 pb-2.5 text-left ">
                  <span className="inline-flex items-center gap-1">
                    <CalendarIcon className="size-3.5" />
                    Tareas asignadas
                  </span>
                </th>
                <th className="px-4 pb-2.5 text-left ">
                  <span className="inline-flex items-center gap-1">
                    <CheckIcon className="size-3.5" fill={false} />
                    Completadas
                  </span>
                </th>
                <th className="px-4 pb-2.5 text-left ">
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon className="size-3.5" />
                    Pendientes
                  </span>
                </th>
                <th className="px-4 pb-2.5 text-left ">
                  <span className="inline-flex items-center gap-1">
                    <ActivityIcon className="size-3.5" />
                    Tasa de completitud
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {people.map((person) => {
                const rate = Math.round(person.completion_rate);
                return (
                  <tr
                    key={person.name}
                    className="hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
                  >
                    <td className="px-4 py-2.5 text-left">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={person.name}
                          className="size-6 text-[10px]"
                        />
                        <p className="truncate  text-neutral-800 dark:text-neutral-200">
                          {person.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-left  tabular-nums text-neutral-800 dark:text-neutral-200">
                      {person.total}
                    </td>
                    <td className="px-4 py-2.5 text-left  tabular-nums text-green-600 dark:text-green-400">
                      {person.completed}
                    </td>
                    <td className="px-4 py-2.5 text-left  tabular-nums text-neutral-600 dark:text-neutral-400">
                      {person.pending}
                    </td>
                    <td className="px-4 py-2.5 text-left">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-36 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${Math.min(100, rate)}%` }}
                          />
                        </div>
                        <small className="w-8 text-left text-[10px]  tabular-nums text-neutral-600 dark:text-neutral-400">
                          {rate}%
                        </small>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="flex items-center justify-center p-6 text-xs text-neutral-500">
          No hay personas asignadas registradas en este proyecto.
        </p>
      )}
    </section>
  );
}
