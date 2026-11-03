export interface ChartDataset {
  label: string;
  data: number[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
  percentages?: number[];
  completion_rates?: number[];
}

export interface ProjectChartsSummary {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  not_started_tasks: number;
  closed_tasks: number;
  overdue_tasks: number;
  completion_percent: number;
  average_progress: number;
  estimated_minutes_total: number;
  estimated_minutes_completed: number;
}

export interface ProjectPerson {
  name: string;
  total: number;
  completed: number;
  pending: number;
  completion_rate: number;
}

export interface ProjectChartsTables {
  status: {
    code: string;
    name: string;
    state: string;
    count: number;
    percentage: number;
    percent: number;
  }[];
  category: { code: string; name: string; count: number; percentage: number }[];
  priority: { code: number; name: string; count: number; percentage: number }[];
  people: ProjectPerson[];
  timeline: {
    date: string;
    created: number;
    completed: number;
    cumulative_created: number;
    cumulative_completed: number;
  }[];
}

export interface ProjectChartsResponse {
  project_id: number;
  project_name: string;
  summary: ProjectChartsSummary;
  charts: {
    status_distribution: ChartData;
    category_distribution: ChartData;
    tasks_by_person: ChartData;
    completion_by_person: ChartData;
    priority_distribution: ChartData;
    timeline: ChartData;
  };
  tables: ProjectChartsTables;
}