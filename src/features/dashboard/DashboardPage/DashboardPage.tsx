import type { CSSProperties } from "react";
import {
  kpis,
  portfolioSummary,
  priorityActivities,
  projectProgress,
  projectStatusSummary,
  teamWorkload,
} from "../mockData";
import DashboardSection from "../DashboardSection/DashboardSection";
import KpiCard from "../KpiCard/KpiCard";
import ProgressBar from "../../../shared/ProgressBar/ProgressBar";
import StatusBadge from "../../../shared/StatusBadge/StatusBadge";

export interface DashboardPageProps {
  onCreateProject?: () => void;
  creationDisabled?: boolean;
}

const statusFillStyles: Record<string, string> = {
  green: "bg-green-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  neutral: "bg-neutral-1000",
};

function DashboardPage({
  onCreateProject,
  creationDisabled = false,
}: DashboardPageProps) {
  return (
    <main id="main-content" className="min-h-full  text-neutral-900 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="max-w-2xl">
          <nav
            className="text-xs text-neutral-600"
            aria-label="Ruta de navegación"
          >
            <ol className="flex gap-2 m-0 p-0 list-none">
              <li aria-current="page">Inicio</li>
            </ol>
          </nav>
          <h1 className="m-0 mt-1 text-xl text-neutral-900">Resumen general</h1>
          <p className="m-0 mt-1 text-sm text-neutral-600">
            Supervisa el avance de los proyectos y la disponibilidad de los
            equipos desde un solo lugar.
          </p>
        </div>
        {onCreateProject && (
          <button
            className="px-4 py-2 bg-neutral-900 text-neutral-100 text-sm shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            disabled={creationDisabled}
            onClick={onCreateProject}
          >
            <span aria-hidden="true">+</span> Nuevo proyecto
          </button>
        )}
      </header>

      <section className="mb-5" aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">
          Indicadores principales
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.id} {...kpi} />
          ))}
        </div>
      </section>

      <DashboardSection
        title="Resumen de proyectos"
        description="Estado y avance del portafolio activo."
      >
        <div className="grid grid-cols-1 lg:grid-cols-[0.76fr_1.8fr]">
          <div className="min-w-0 p-5 border-b border-neutral-200 lg:border-b-0 lg:border-r">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="m-0 text-sm text-neutral-900 font-">
                  Distribución por estado
                </h3>
                <p className="m-0 mt-1 text-xs text-neutral-600">
                  {portfolioSummary.totalProjects} proyectos registrados
                </p>
              </div>
            </div>

            <div
              className="flex h-2 gap-1 overflow-hidden bg-neutral-200"
              role="img"
              aria-label="Distribución porcentual de proyectos"
            >
              {projectStatusSummary.map((status) => (
                <span
                  key={status.id}
                  className={`min-w-1 ${statusFillStyles[status.tone] ?? statusFillStyles.neutral}`}
                  style={{ width: `${status.percentage}%` } as CSSProperties}
                  title={`${status.label}: ${status.percentage}%`}
                />
              ))}
            </div>

            <ul className="grid gap-1 m-0 mt-4 p-0 list-none">
              {projectStatusSummary.map((status) => (
                <li
                  key={status.id}
                  className="grid grid-cols-[8px_1fr_auto_36px] items-center gap-2 min-h-[34px] text-xs text-neutral-600"
                >
                  <span
                    className={`w-[7px] h-[7px] rounded-full ${statusFillStyles[status.tone] ?? statusFillStyles.neutral}`}
                    aria-hidden="true"
                  />
                  <span>{status.label}</span>
                  <strong className="text-neutral-900 text-xs">
                    {status.count}
                  </strong>
                  <small className="text-neutral-600 text-xs text-right">
                    {status.percentage}%
                  </small>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="m-0 text-sm text-neutral-900 font-">
                  Avance general
                </h3>
                <p className="m-0 mt-1 text-xs text-neutral-600">
                  Proyectos que requieren seguimiento
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              {projectProgress.map((project) => (
                <article className="min-w-0" key={project.id}>
                  <div className="flex items-end justify-between gap-4 mb-2">
                    <div className="min-w-0">
                      <h4 className="m-0 text-sm text-neutral-900 font-">
                        {project.name}
                      </h4>
                      <span className="block mt-0.5 text-xs text-neutral-600">
                        {project.stage}
                      </span>
                    </div>
                    <strong className="text-xs text-neutral-900">
                      {project.progress}%
                    </strong>
                  </div>
                  <ProgressBar
                    value={project.progress}
                    tone={project.tone}
                    label={`Avance de ${project.name}`}
                  />
                </article>
              ))}
            </div>
          </div>
        </div>
      </DashboardSection>

      <div className="mt-4">
        <DashboardSection
          title="Seguimiento operativo"
          description="Prioridades inmediatas y carga actual de los equipos."
        >
          <div className="grid grid-cols-1 lg:grid-cols-[2.15fr_0.85fr]">
            <div className="min-w-0 p-5 border-b border-neutral-200 lg:border-b-0 lg:border-r">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="m-0 text-sm text-neutral-900 font-">
                    Actividades prioritarias
                  </h3>
                  <p className="m-0 mt-1 text-xs text-neutral-600">
                    Vencidas o próximas a su fecha límite
                  </p>
                </div>
                <span className="px-2 py-1 text-neutral-600 bg-white text-xs rounded-lg border border-neutral-200">
                  {priorityActivities.length} actividades
                </span>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-xs text-neutral-600 text-left">
                  <caption className="sr-only">
                    Actividades prioritarias o próximas a su fecha límite
                  </caption>
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="px-3 pb-2 text-neutral-600 text-xs uppercase tracking-wide whitespace-nowrap"
                      >
                        Actividad
                      </th>
                      <th
                        scope="col"
                        className="px-3 pb-2 text-neutral-600 text-xs uppercase tracking-wide whitespace-nowrap"
                      >
                        Proyecto
                      </th>
                      <th
                        scope="col"
                        className="px-3 pb-2 text-neutral-600 text-xs uppercase tracking-wide whitespace-nowrap"
                      >
                        Responsable
                      </th>
                      <th
                        scope="col"
                        className="px-3 pb-2 text-neutral-600 text-xs uppercase tracking-wide whitespace-nowrap"
                      >
                        Fecha
                      </th>
                      <th
                        scope="col"
                        className="px-3 pb-2 text-neutral-600 text-xs uppercase tracking-wide whitespace-nowrap"
                      >
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {priorityActivities.map((item) => (
                      <tr key={item.id} className="border-t border-neutral-200">
                        <td className="px-3 py-3 max-w-[190px] leading-snug">
                          <strong className="text-neutral-900 text-xs font-">
                            {item.activity}
                          </strong>
                        </td>
                        <td className="px-3 py-3 max-w-[190px]">
                          {item.project}
                        </td>
                        <td className="px-3 py-3 max-w-[190px]">
                          {item.owner}
                        </td>
                        <td className="px-3 py-3 max-w-[190px]">
                          {item.dueDate}
                        </td>
                        <td className="px-3 py-3 max-w-[190px]">
                          <StatusBadge tone={item.tone}>
                            {item.status}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className=" p-5" aria-labelledby="workload-heading">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3
                    id="workload-heading"
                    className="m-0 text-sm text-neutral-900 font-"
                  >
                    Carga por equipo
                  </h3>
                  <p className="m-0 mt-1 text-xs text-neutral-600">
                    Ocupación estimada de la semana
                  </p>
                </div>
              </div>
              <div className="grid gap-4">
                {teamWorkload.map((team) => (
                  <article className="min-w-0" key={team.id}>
                    <div className="flex items-end justify-between gap-4 mb-2">
                      <div className="min-w-0">
                        <h4 className="m-0 text-sm text-neutral-900 font-">
                          {team.name}
                        </h4>
                        <span className="block mt-0.5 text-xs text-neutral-600">
                          {team.label}
                        </span>
                      </div>
                      <strong className="text-xs text-neutral-900">
                        {team.value}%
                      </strong>
                    </div>
                    <ProgressBar
                      value={team.value}
                      tone={team.tone}
                      label={`Carga de ${team.name}`}
                    />
                  </article>
                ))}
              </div>
              <p className="m-0 mt-5 pt-3 text-neutral-600 text-xs leading-relaxed border-t border-neutral-200">
                La carga es referencial y utiliza datos simulados.
              </p>
            </aside>
          </div>
        </DashboardSection>
      </div>
    </main>
  );
}

export default DashboardPage;
