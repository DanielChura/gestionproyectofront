import type { Label } from "../../../core/interfaces/task.interface";

export function labelSelection(labels: Label[]) {
  return {
    specialty_ids: [
      ...new Set(
        labels.flatMap((item) =>
          item.specialty_id == null ? [] : [item.specialty_id],
        ),
      ),
    ],
    retained_label_ids: [
      ...new Set(
        labels.flatMap((item) =>
          item.specialty_id == null && item.id !== undefined ? [item.id] : [],
        ),
      ),
    ],
  };
}

