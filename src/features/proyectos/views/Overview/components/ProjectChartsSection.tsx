import { useMemo } from "react";
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line, Pie } from "react-chartjs-2";
import CalendarIcon from "../../../../../shared/icons/CalendarIcon";

ChartJS.register(
  ArcElement,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

const STATUS_COLORS_500: Record<string, string> = {
  completada: "#22c55e",
  completadas: "#22c55e",
  done: "#22c55e",
  cerrado: "#16a34a",
  cerrada: "#16a34a",
  cerradas: "#16a34a",
  closed: "#16a34a",
  "en curso": "#3b82f6",
  "en proceso": "#3b82f6",
  proceso: "#3b82f6",
  progreso: "#3b82f6",
  activa: "#3b82f6",
  activas: "#3b82f6",
  bloqueada: "#ef4444",
  bloqueado: "#ef4444",
  "en revisión": "#a855f7",
  "en revision": "#a855f7",
  revisión: "#a855f7",
  revision: "#a855f7",
  review: "#a855f7",
  pendiente: "#64748b",
  pendientes: "#64748b",
  "por hacer": "#64748b",
  todo: "#64748b",
  "no iniciada": "#64748b",
  "no iniciadas": "#64748b",
  cancelada: "#737373",
  cancelado: "#737373",
};

function getStatusColor(label: string): string {
  const norm = label.toLowerCase().trim();
  for (const [key, color] of Object.entries(STATUS_COLORS_500)) {
    if (norm.includes(key)) return color;
  }
  return "#64748b";
}

function formatDateLabel(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const months = [
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul",
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
      ];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parseInt(parts[2], 10)} ${months[mIdx] ?? parts[1]}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

interface Props {
  charts: {
    timeline: {
      labels: string[];
      datasets: { label: string; data: number[] }[];
    };
    status_distribution: { labels: string[]; datasets: { data: number[] }[] };
  };
  totalTasks: number;
}

export default function ProjectChartsSection({ charts, totalTasks }: Props) {
  const chartTextColor = "#737373";

  const timelineChartData = useMemo(() => {
    if (!charts?.timeline) return null;
    const { labels, datasets } = charts.timeline;
    const formattedLabels = labels.map(formatDateLabel);

    const createdDataset =
      datasets.find((d) => d.label.toLowerCase().includes("cread")) ??
      datasets[0];
    const completedDataset =
      datasets.find((d) => d.label.toLowerCase().includes("complet")) ??
      datasets[1];

    return {
      labels: formattedLabels,
      datasets: [
        {
          label: "Creadas (acumulado)",
          data: createdDataset?.data ?? [],
          borderColor: "#64748b",
          backgroundColor: "rgba(100, 116, 139, 0.08)",
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3.5,
          pointHoverRadius: 5.5,
          pointBackgroundColor: "#64748b",
        },
        {
          label: "Completadas (acumulado)",
          data: completedDataset?.data ?? [],
          borderColor: "#22c55e",
          backgroundColor: "rgba(34, 197, 94, 0.12)",
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#22c55e",
        },
      ],
    };
  }, [charts?.timeline]);

  const statusPieData = useMemo(() => {
    if (!charts?.status_distribution) return null;
    const { labels, datasets } = charts.status_distribution;
    const colors = labels.map(getStatusColor);

    return {
      labels,
      datasets: [
        {
          data: datasets[0]?.data ?? [],
          backgroundColor: colors,
          borderWidth: 0,
          hoverBorderWidth: 0,
          spacing: 2, // Espaciado real limpio
          borderRadius: 2, // Puntas redondeadas
          hoverOffset: 4,
        },
      ],
    };
  }, [charts?.status_distribution]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        align: "end" as const,
        labels: {
          color: chartTextColor,
          boxWidth: 6,
          boxHeight: 6,
          usePointStyle: true,
          pointStyle: "circle" as const,
          font: { size: 10, family: "Inter" },
        },
      },
      tooltip: {
        padding: 8,
        cornerRadius: 6,
        bodyFont: { size: 11 },
        titleFont: { size: 11 },
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: "rgba(115, 115, 115, 0.12)",
          drawTicks: false,
        },
        border: { display: false },
        ticks: { color: chartTextColor, font: { size: 10 } },
      },
      y: {
        grid: { display: true, color: "rgba(115, 115, 115, 0.12)" },
        border: { display: false },
        ticks: {
          color: chartTextColor,
          font: { size: 10 },
          stepSize: 1,
          precision: 0,
        },
        beginAtZero: true,
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    radius: "80%",
    cutout: "65%", // Dona moderna con espacio central
    plugins: {
      legend: {
        position: "bottom" as const,
        borderWidth: 0,
        labels: {
          color: chartTextColor,
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: "circle" as const,
          font: { size: 10, family: "Inter" },
          padding: 10,
        },
      },
      tooltip: {
        padding: 8,
        cornerRadius: 6,
        bodyFont: { size: 11 },
        titleFont: { size: 11 },
      },
    },
  };

  return (
    <section
      className="grid grid-cols-1 gap-3.5 lg:grid-cols-12"
      aria-label="Evolución y estados"
    >
      {/* Gráfico de Líneas */}
      <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs  text-neutral-800 dark:text-neutral-100">
            Velocidad de entrega
          </h2>
          <div className="flex items-center gap-1 text-[10px] text-neutral-500">
            <CalendarIcon className="size-3.5 text-neutral-400" />
            {charts.timeline.labels.length} cortes temporales
          </div>
        </div>
        <div className="h-72 w-full">
          {timelineChartData && (
            <Line data={timelineChartData} options={lineOptions} />
          )}
        </div>
      </div>

      {/* Gráfico de Pastel / Dona */}
      <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs  text-neutral-800 dark:text-neutral-100">
            Distribución de estados
          </h2>
          <div className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px]  text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {totalTasks} tareas
          </div>
        </div>
        <div className="flex h-72 w-full items-center justify-center">
          {statusPieData && <Pie data={statusPieData} options={pieOptions} />}
        </div>
      </div>
    </section>
  );
}
