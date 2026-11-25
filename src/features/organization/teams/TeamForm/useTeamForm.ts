import { useState } from "react";
import type { TeamWriteData } from "../../../../core/interfaces/organization.interface";

export interface TeamFormState {
  area: string;
  name: string;
  active: boolean;
}

export function useTeamForm(initial: TeamFormState) {
  const [formData, setFormData] = useState<TeamFormState>(initial);

  const updateField = (field: keyof TeamFormState, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toWriteData = (): TeamWriteData => ({
    area: Number(formData.area),
    name: formData.name,
    active: formData.active,
  });

  return { formData, updateField, toWriteData };
}
