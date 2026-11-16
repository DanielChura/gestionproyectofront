import { useState } from "react";
import type { DependencyType, TaskRelation } from "../../types";
import DependencyTypeSelect from "../task-fields/DependencyTypeSelect";

export default function DependencyConversion({ relation, busy, onConvert }: { relation: TaskRelation; busy: boolean; onConvert: (relation: TaskRelation, type: DependencyType) => Promise<boolean> }) {
  const [type, setType] = useState<DependencyType | "">("");
  return <div className="flex min-w-0 flex-wrap items-end gap-2">
    <DependencyTypeSelect value={type} onChange={setType} disabled={busy} />
    <button type="button" className="cursor-pointer rounded-lg border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-50 dark:border-neutral-600" disabled={busy || !type || type === relation.dependency_type} onClick={() => { if (type) void onConvert(relation, type).then(saved => { if (saved) setType(""); }); }}>Confirmar tipo</button>
    {relation.legacy && <span className="text-xs">Legado informativo; convertir activará las restricciones.</span>}
  </div>;
}
