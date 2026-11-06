import CheckIcon from "../../../../shared/Icons/CheckIcon";
import CircleDashedIcon from "../../../../shared/Icons/CircleDashedIcon";
import CircleDotIcon from "../../../../shared/Icons/CircleDotIcon";
import CircleHalfIcon from "../../../../shared/Icons/CircleHalfIcon";
import CircleMinusIcon from "../../../../shared/Icons/CircleMinusIcon";
import SuccessIcon from "../../../../shared/Icons/SuccessIcon";
import XIcon from "../../../../shared/Icons/XIcon";
import type {
  ProjectTaskState,
  StateCategory,
  Tema,
} from "../../../../core/interfaces/project.interface";
import { categoryValue, stateCategories } from "../../utils/stateGroups";

export default function StateIcon({
  code,
  name,
  category,
  color,
  tema,
}: {
  code: string;
  name?: string;
  category?: StateCategory;
  color?: string;
  tema?: Tema | null;
}) {
  const value = categoryValue({ code, name: "", category });
  const stateName = (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleUpperCase("es");
  const tone =
    color ??
    tema?.color ??
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
