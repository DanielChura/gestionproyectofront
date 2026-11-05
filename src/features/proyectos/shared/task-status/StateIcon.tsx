import CheckIcon from "../../../../shared/icons/CheckIcon";
import CircleDashedIcon from "../../../../shared/icons/CircleDashedIcon";
import CircleDotIcon from "../../../../shared/icons/CircleDotIcon";
import CircleHalfIcon from "../../../../shared/icons/CircleHalfIcon";
import CircleMinusIcon from "../../../../shared/icons/CircleMinusIcon";
import SuccessIcon from "../../../../shared/icons/SuccessIcon";
import XIcon from "../../../../shared/icons/XIcon";
import type { ProjectTaskState } from "../../../../core/interfaces/project.interface";
import { categoryValue, stateCategories } from "../../utils/stateGroups";

export default function StateIcon({
  code,
  name,
  category,
  color,
}: Pick<ProjectTaskState, "code" | "category" | "color"> & { name?: string }) {
  const value = categoryValue({ code, name: "", category });
  const stateName = (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleUpperCase("es");
  const tone =
    color ??
    (code === "CANCELADA" || stateName === "CANCELADA"
      ? "#a42a28"
      : stateCategories.find((item) => item.value === value)?.color);
  const Icon =
    code === "CANCELADA" || stateName === "CANCELADA"
      ? XIcon
      : code === "BLOQUEADA" || stateName.startsWith("BLOQUEAD")
        ? CircleMinusIcon
        : code === "EN_REVISION" || stateName.includes("REVISION")
          ? CircleHalfIcon
          : code === "EN_CURSO" ||
              stateName === "EN CURSO" ||
              stateName === "EN PROGRESO"
            ? CircleDotIcon
            : code === "PENDIENTE" || stateName === "PENDIENTE"
              ? CircleDashedIcon
              : value === "done"
                ? SuccessIcon
                : value === "closed"
                  ? CheckIcon
                  : value === "active"
                    ? CircleDotIcon
                    : CircleDashedIcon;

  return (
    <span
      className="inline-flex shrink-0"
      style={tone ? { color: tone } : undefined}
    >
      <Icon className="size-4" fill />
    </span>
  );
}

