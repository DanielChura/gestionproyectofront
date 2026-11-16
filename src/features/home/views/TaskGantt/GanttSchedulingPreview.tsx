import { scheduleLabel } from "../../utils/taskSchedule";
import { ganttRangeLabel } from "./ganttRangeLabel";
import type { useGanttScheduling } from "./useGanttScheduling";
export default function GanttSchedulingPreview({
  preview,
}: {
  preview: ReturnType<typeof useGanttScheduling>;
}) {
  if (!preview) return null;
  const dragging = preview.width !== undefined;
  return (
    <div
      className="gm-gantt-program-preview"
      data-gantt-programming={preview.id}
      data-dragging={dragging || undefined}
      style={{
        left: preview.x,
        top: preview.y - (dragging ? 12 : 4),
        width: preview.width,
      }}
    >
      <span role="tooltip">
        {dragging && preview.proposal
          ? preview.proposal.schedule
            ? scheduleLabel({ schedule: preview.proposal.schedule })
            : ganttRangeLabel(
                preview.proposal.start_date,
                preview.proposal.due_date,
              )
          : "Arrastra para programar; clic para completar fechas"}
      </span>
    </div>
  );
}
