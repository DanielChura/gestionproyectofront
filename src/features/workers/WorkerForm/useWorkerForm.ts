import { useState } from "react";
import type {
  Worker,
  WorkerUpdateData,
} from "../../../core/interfaces/worker.interface";

export interface WorkerFormState {
  first_names: string;
  last_names: string;
  email: string;
  area: string;
  weekly_hours: string;
  active: boolean;
}

export function useWorkerForm(worker: Worker) {
  const [formData, setFormData] = useState<WorkerFormState>({
    first_names: worker.first_names,
    last_names: worker.last_names,
    email: worker.email,
    area: worker.area != null ? String(worker.area) : "",
    weekly_hours: worker.weekly_hours,
    active: worker.active,
  });

  const updateField = (
    field: keyof WorkerFormState,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toUpdateData = (): WorkerUpdateData => ({
    code: worker.code,
    first_names: formData.first_names,
    last_names: formData.last_names,
    email: formData.email,
    area: formData.area ? Number(formData.area) : null,
    weekly_hours: formData.weekly_hours,
    active: formData.active,
  });

  return { formData, updateField, toUpdateData };
}
