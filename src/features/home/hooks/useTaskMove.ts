import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { errorText } from "../../../core/api/httpClient";
import { getTasks, moveTask } from "../services";
import type { Project, Task } from "../types";

interface Movement {
  task: Task;
  state: string;
  before: number | null;
  parent?: number | null;
}

export interface DropPosition {
  state: string;
  before: number | null;
  top: number;
  left: number;
  width: number;
  parent?: number | null;
  receiver?: number;
}

export function useTaskMove(
  project: Project,
  onConfirmed: ((tasks: Task[]) => void) | undefined,
  region: RefObject<HTMLDivElement | null>,
  tasks: Task[],
  hierarchy = false,
) {
  const [dragging, setDragging] = useState<Task | null>(null),
    [drop, setDrop] = useState<DropPosition | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false),
    alive = useRef(true),
    activeDrag = useRef<Task | null>(null),
    point = useRef({ x: 0, y: 0 });
  const [queued, setQueued] = useState(0);
  const queue = useRef<Array<Movement & { interaction: number }>>([]),
    confirmed = useRef(tasks),
    needsRefresh = useRef(false),
    interaction = useRef(0);
  const session = useRef(0);

  useEffect(() => {
    if (!pending.current) confirmed.current = tasks;
  }, [tasks]);

  useEffect(() => {
    alive.current = true;
    const generation = ++session.current;
    return () => {
      alive.current = false;
      session.current = generation + 1;
      activeDrag.current = null;
      queue.current = [];
    };
  }, [project.id]);

  useEffect(() => {
    if (!dragging) return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        end();
      }
    };
    const outside = (event: DragEvent) => {
      if (
        !(event.target instanceof Node) ||
        !region.current?.contains(event.target)
      )
        end();
    };
    const blur = (event: FocusEvent) => {
      if (event.target === window) end();
    };
    document.addEventListener("keydown", cancel, true);
    document.addEventListener("drop", outside);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("keydown", cancel, true);
      document.removeEventListener("drop", outside);
      window.removeEventListener("blur", blur);
    };
  }, [dragging, region]);

  useEffect(() => {
    if (!dragging) return;
    let frame = 0;
    const scroll = () => {
      const node = region.current;
      if (!activeDrag.current || !node) return;
      const bounds = node.getBoundingClientRect(),
        { x, y } = point.current;
      const delta = y < bounds.top + 36 ? -10 : y > bounds.bottom - 36 ? 10 : 0;
      const horizontal =
        x < bounds.left + 24 ? -8 : x > bounds.right - 24 ? 8 : 0;
      if (y >= bounds.top - 20 && y <= bounds.bottom + 20) {
        node.scrollTop += delta;
        node.scrollLeft += horizontal;
      }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [dragging, region]);

  function permitted(task: Task, state: string) {
    if (hierarchy)
      return Boolean(
        onConfirmed &&
        task.move_revision &&
        task.permissions.edit &&
        task.state_code === state,
      );
    return Boolean(
      onConfirmed &&
      task.move_revision &&
      task.permissions.state &&
      (task.state_code === state ||
        (task.move_targets
          ? task.move_targets.includes(state)
          : task.transitions.some((item) => item.target === state))),
    );
  }

  function end() {
    activeDrag.current = null;
    setDragging(null);
    setDrop(null);
  }

  async function execute(movement: Movement) {
    if (!alive.current) return;
    queue.current.push({ ...movement, interaction: interaction.current });
    setQueued(queue.current.length);
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const requestSession = session.current;
    const currentSession = () =>
      alive.current && requestSession === session.current;
    try {
      if (needsRefresh.current) {
        const result = await getTasks(project.id);
        if (!currentSession()) return;
        confirmed.current = result;
        onConfirmed?.(result);
        needsRefresh.current = false;
      }
      while (queue.current.length && currentSession()) {
        const intent = queue.current.shift()!;
        setQueued(queue.current.length);
        const task = confirmed.current.find(
          (item) => item.id === intent.task.id,
        );
        const anchor =
          intent.before === null
            ? null
            : confirmed.current.find((item) => item.id === intent.before);
        if (
          !task ||
          task.parent_id !== intent.task.parent_id ||
          !permitted(task, intent.state) ||
          (intent.before !== null &&
            (!anchor ||
              anchor.parent_id !==
                (hierarchy ? intent.parent : task.parent_id) ||
              (!hierarchy && anchor.state_code !== intent.state)))
        ) {
          throw new Error(
            "La tarea o su posición de destino cambió. Comprueba la lista antes de moverla.",
          );
        }
        const result = await moveTask(project.id, task.id, {
          state_code: intent.state,
          before_id: intent.before,
          expected_revision: task.move_revision!,
          ...(hierarchy
            ? { mode: "hierarchy", parent_id: intent.parent ?? null }
            : {}),
        });
        if (!currentSession()) return;
        confirmed.current = result;
        onConfirmed?.(result);
        const focusSession = intent.interaction;
        requestAnimationFrame(() => {
          if (
            currentSession() &&
            focusSession === interaction.current &&
            !pending.current &&
            !activeDrag.current &&
            document.activeElement === document.body
          )
            document
              .querySelector<HTMLButtonElement>(
                `tr[data-task-id="${task.id}"]:not([data-context]) button[data-task-drag-surface]`,
              )
              ?.focus({ preventScroll: true });
        });
      }
    } catch (failure) {
      if (currentSession()) {
        const waiting = queue.current.length;
        queue.current = [];
        needsRefresh.current = true;
        const stopped =
          waiting === 1
            ? " Se detuvo un movimiento en espera."
            : waiting
              ? ` Se detuvieron ${waiting} movimientos en espera.`
              : "";
        setError(
          `${errorText(
            failure,
          )}${stopped} El próximo movimiento consultará la lista antes de guardar.`,
        );
      }
    } finally {
      pending.current = false;
      if (currentSession()) {
        setBusy(false);
        setQueued(0);
      }
    }
  }

  function propose(
    task: Task,
    state: string,
    before: number | null,
    parent?: number | null,
  ) {
    if (!permitted(task, state)) return;
    void execute({ task, state, before, parent });
  }

  async function refresh() {
    if (pending.current) return;
    const generation = session.current,
      gesture = interaction.current;
    const currentRead = () =>
      alive.current &&
      generation === session.current &&
      gesture === interaction.current &&
      !pending.current;
    try {
      const result = await getTasks(project.id);
      if (!currentRead()) return;
      confirmed.current = result;
      needsRefresh.current = false;
      onConfirmed?.(result);
      setError("");
    } catch (failure) {
      if (currentRead()) setError(errorText(failure));
    }
  }

  return {
    dragging,
    drop,
    busy,
    queued,
    error,
    prepare: () => {
      interaction.current++;
    },
    permitted,
    propose,
    execute,
    end,
    start: (task: Task, x: number, y: number) => {
      activeDrag.current = task;
      point.current = { x, y };
      setDragging(task);
    },
    track: (x: number, y: number) => {
      point.current = { x, y };
    },
    over: setDrop,
    refresh,
  };
}
