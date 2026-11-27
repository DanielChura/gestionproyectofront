import { useState } from "react";
import type {
  Worker,
  WorkerUpdateData,
} from "../../../core/interfaces/worker.interface";

export interface WorkerFormData {
  first_names: string;
  last_names: string;
  email: string;
  weekly_hours: string;
  areaSelection: string;
}

export function useWorkerForm(worker: Worker) {
  const initialArea = worker.all_areas
    ? "all"
    : worker.area != null
      ? String(worker.area)
      : "all";

  const [formData, setFormData] = useState<WorkerFormData>({
    first_names: worker.first_names || "",
    last_names: worker.last_names || "",
    email: worker.email || "",
    weekly_hours: worker.weekly_hours || "40.00",
    areaSelection: initialArea,
  });

  const updateField = (field: keyof WorkerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toUpdateData = (): WorkerUpdateData => {
    const isAll = formData.areaSelection === "all" || !formData.areaSelection;
    return {
      code: worker.code || "",
      first_names: formData.first_names.trim(),
      last_names: formData.last_names.trim(),
      email: formData.email.trim(),
      area: isAll ? null : Number(formData.areaSelection),
      all_areas: isAll,
      weekly_hours: formData.weekly_hours,
      active: worker.active ?? true,
    };
  };

  return { formData, updateField, toUpdateData };
}
