import TaskSearchFilter from "../../../components/filters/TaskSearchFilter";

export default function TableroFilters({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return <TaskSearchFilter value={value} onChange={onChange} />;
}
