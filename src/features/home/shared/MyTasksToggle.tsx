import Avatar from "../../../shared/Avatar";
import type { SessionUser } from "../../../core/interfaces/auth.interface";

export default function MyTasksToggle({
  user,
  active,
  onToggle,
}: {
  user: SessionUser | null;
  active: boolean;
  onToggle: () => void;
}) {
  if (!user) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={active ? "Ver todas las tareas" : "Ver solo mis tareas"}
      title={active ? "Ver todas las tareas" : "Ver solo mis tareas"}
      className="inline-flex cursor-pointer items-center justify-center rounded-full"
    >
      <Avatar
        name={user.name}
        className="size-6 rounded-full text-[10px] font-medium"
      />
    </button>
  );
}
