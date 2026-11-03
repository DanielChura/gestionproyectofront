import { useEffect, useId, useRef, useState } from "react";
import ChevronDownIcon from "../../../shared/icons/ChevronIcon";
import DotsIcon from "../../../shared/icons/DotsIcon";
import InfoIcon from "../../../shared/icons/InfoIcon";
import PlusIcon from "../../../shared/icons/PlusIcon";
import Modal from "../Modal/Modal";
import CheckIcon from "../../../shared/icons/CheckIcon";
import SettingsIcon from "../../../shared/icons/SettingsIcon";
import { categoryValue, stateCategories } from "../stateGroups";
import { StateIcon } from "../TaskList/TaskCell";
import type {
  Project,
  ProjectTaskConfiguration,
  ProjectTaskState,
  StateCategory,
} from "../types";
import { emptyState, moveState } from "./stateDraft";
import type { TaskFlowDraft } from "./useTaskStatusConfiguration";
import { useTaskStatusConfiguration } from "./useTaskStatusConfiguration";

const styles = {
  root: "flex min-h-0 flex-1 flex-col text-xs text-neutral-800 dark:text-neutral-100",
  body: "grid min-h-0 flex-1 grid-cols-3 max-sm:flex max-sm:flex-col max-sm:overflow-y-auto",
  side: "relative border-r border-neutral-200 p-5 max-sm:shrink-0 max-sm:border-r-0 max-sm:border-b max-sm:p-4 dark:border-neutral-800",
  list: "min-h-0 space-y-6 overflow-y-auto overscroll-contain p-5 max-sm:overflow-visible max-sm:p-4",
  icon: "inline-flex shrink-0 items-center justify-center rounded-lg p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 pointer-coarse:p-3 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
  secondary:
    "rounded-lg border border-neutral-200 bg-white px-3 py-1.5  text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800",
  primary:
    "rounded-lg bg-neutral-800 px-3 py-1.5  text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-800 dark:hover:bg-neutral-200",
  input:
    "min-w-0 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-600 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100",
  menu: "absolute z-20 grid w-48 max-w-96 rounded-lg border border-neutral-200 bg-white p-1 text-xs text-neutral-800 *:flex *:w-full *:items-center *:gap-2 *:rounded-lg *:px-3 *:py-2 *:text-left hover:*:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:*:bg-neutral-800",
};

export default function TaskStatusConfiguration({
  project,
  onConfigured,
  onClose,
  draft,
}: {
  project?: Project;
  draft?: TaskFlowDraft;
  onConfigured: (value: ProjectTaskConfiguration) => void;
  onClose: () => void;
}) {
  const editor = useTaskStatusConfiguration(
    project,
    onConfigured,
    onClose,
    draft,
  );
  const [templateOpen, setTemplateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{
    code: string;
    original: string | null;
  } | null>(null);
  const [savingName, setSavingName] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [dismissedHelp, setDismissedHelp] = useState<StateCategory | null>(
    null,
  );
  const drag = useRef<string | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const id = useId();
  const allowed =
    editor.configuration.can_configure &&
    Boolean(draft || project?.permissions.manage);
  const namingTemplate = savingName !== null;

  useEffect(() => {
    if (editor.error)
      document
        .getElementById(`${id}-error-${namingTemplate ? "name" : "main"}`)
        ?.focus();
  }, [editor.error, id, namingTemplate]);
  useEffect(() => {
    const category = Object.keys(editor.categoryErrors)[0];
    if (category)
      document.getElementById(`${id}-category-${category}`)?.focus();
  }, [editor.categoryErrors, id]);

  useEffect(() => {
    if (pendingFocus.current) {
      document.getElementById(pendingFocus.current)?.focus();
      pendingFocus.current = null;
    }
  }, [editor.states]);

  function update(code: string, change: Partial<ProjectTaskState>) {
    editor.setStates((states) =>
      states.map((state) =>
        state.code === code ? { ...state, ...change } : state,
      ),
    );
    editor.setError("");
  }

  function add(category: StateCategory) {
    if (editor.states.length >= 50) {
      editor.setError("El flujo admite hasta 50 estados.");
      return;
    }
    if (
      editing &&
      !editor.states.find((state) => state.code === editing.code)?.name.trim()
    ) {
      editor.setError(
        "Debes especificar el nombre del estado antes de añadir otro.",
      );
      document.getElementById(`${id}-${editing.code}`)?.focus();
      return;
    }
    const state = emptyState(category);
    editor.setStates((states) => [...states, state]);
    setEditing({ code: state.code, original: null });
    editor.setError("");
  }

  function move(code: string, offset: number) {
    const state = editor.states.find((item) => item.code === code)!;
    const group = editor.states.filter(
      (item) => categoryValue(item) === categoryValue(state),
    );
    const destination =
      group[group.findIndex((item) => item.code === code) + offset];
    if (!destination) return;
    editor.setStates((states) => moveState(states, code, destination.code));
    setNotice(
      `${state.name}: posición ${group.indexOf(destination) + 1} de ${group.length}.`,
    );
  }

  function menuAction(
    event: React.MouseEvent<HTMLElement>,
    action: () => void,
  ) {
    const details = event.currentTarget.closest("details");
    if (details) details.open = false;
    action();
  }

  function remove(state: ProjectTaskState) {
    const group = editor.states.filter(
      (item) => categoryValue(item) === categoryValue(state),
    );
    const index = group.findIndex((item) => item.code === state.code);
    const next = group[index + 1] ?? group[index - 1];
    pendingFocus.current = next
      ? `${id}-name-${next.code}`
      : `${id}-add-${categoryValue(state)}`;
    editor.setStates((items) =>
      items.filter((item) => item.code !== state.code),
    );
  }

  return (
    <Modal
      title="Modifica los estados de Tareas"
      busy={editor.busy}
      onClose={editor.close}
      statusComposer
    >
      <div
        className={styles.root}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          const details =
            event.target instanceof HTMLElement
              ? event.target.closest("details[open]")
              : null;
          if (details instanceof HTMLDetailsElement) {
            details.open = false;
            details.querySelector("summary")?.focus();
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <p role="status" aria-live="polite" className="sr-only">
          {notice}
        </p>
        {editor.loading ? (
          <p role="status" className="p-5">
            Cargando plantillas…
          </p>
        ) : (
          <fieldset
            disabled={editor.busy || !allowed}
            className={`${styles.body} m-0 border-0 p-0`}
          >
            <aside className={styles.side}>
              <label
                id={`${id}-template-label`}
                className="mb-2 block text-neutral-600"
              >
                Plantilla de estado
              </label>
              <div
                className="relative"
                onBlur={(event) => {
                  if (
                    event.relatedTarget instanceof Node &&
                    !event.currentTarget.contains(event.relatedTarget)
                  )
                    setTemplateOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && templateOpen) {
                    event.preventDefault();
                    event.stopPropagation();
                    setTemplateOpen(false);
                    document.getElementById(`${id}-template`)?.focus();
                  }
                }}
              >
                <button
                  id={`${id}-template`}
                  type="button"
                  data-initial-focus
                  aria-labelledby={`${id}-template-label ${id}-selected-template`}
                  aria-haspopup="dialog"
                  aria-expanded={templateOpen}
                  aria-controls={`${id}-templates`}
                  onClick={() => setTemplateOpen(!templateOpen)}
                  className={`${styles.secondary} flex w-full items-center justify-between gap-2 text-left`}
                >
                  <span id={`${id}-selected-template`} className="truncate">
                    {editor.selected?.name ?? "Personalizado"}
                  </span>
                  <ChevronDownIcon className="size-4 shrink-0" />
                </button>
                {templateOpen && (
                  <div
                    id={`${id}-templates`}
                    role="dialog"
                    aria-label="Plantillas de estado"
                    className="absolute left-0 top-full z-20 mt-1 w-full rounded-lg border border-neutral-200 bg-white p-1"
                  >
                    <input
                      aria-label="Buscar plantillas"
                      name="template_search"
                      autoComplete="off"
                      type="search"
                      placeholder="Buscar…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className={`${styles.input} w-full`}
                    />
                    <div className="my-1 max-h-72 overflow-y-auto">
                      {editor.templates
                        .filter((item) =>
                          item.name
                            .toLocaleLowerCase("es")
                            .includes(search.trim().toLocaleLowerCase("es")),
                        )
                        .map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            aria-pressed={editor.selected?.id === item.id}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-neutral-50 aria-pressed:bg-neutral-100"
                            onClick={() => {
                              if (editor.select(item)) {
                                setTemplateOpen(false);
                                setEditing(null);
                              }
                            }}
                          >
                            <span className="truncate">{item.name}</span>
                            {editor.selected?.id === item.id && (
                              <CheckIcon className="size-4" />
                            )}
                          </button>
                        ))}
                      {!editor.templates.some((item) =>
                        item.name
                          .toLocaleLowerCase("es")
                          .includes(search.trim().toLocaleLowerCase("es")),
                      ) && (
                        <p role="status" className="px-3 py-2 text-neutral-600">
                          No hay plantillas que coincidan.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 border-t border-neutral-200 px-3 py-2 text-left hover:bg-neutral-50"
                      onClick={() => {
                        if (editor.select(null)) {
                          setTemplateOpen(false);
                          setEditing(null);
                        }
                      }}
                    >
                      <PlusIcon className="size-4" />
                      Nueva plantilla
                    </button>
                  </div>
                )}
              </div>
            </aside>
            <div className={styles.list} data-state-scroll>
              {stateCategories.map((category) => {
                const states = editor.states.filter(
                  (state) => categoryValue(state) === category.value,
                );
                return (
                  <section key={category.value} aria-label={category.label}>
                    <header className="mb-2 flex items-center justify-between gap-2 text-neutral-600">
                      <h3 className="m-0 flex items-center gap-1 text-xs ">
                        {category.label}
                        <span className="group relative inline-flex">
                          <button
                            type="button"
                            className={styles.icon}
                            aria-label={`Información: ${category.label}`}
                            aria-describedby={`${id}-${category.value}-help`}
                            onFocus={() => setDismissedHelp(null)}
                            onMouseEnter={() => setDismissedHelp(null)}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                event.preventDefault();
                                event.stopPropagation();
                                setDismissedHelp(category.value);
                              }
                            }}
                          >
                            <span aria-hidden="true">
                              <InfoIcon className="size-4" />
                            </span>
                          </button>
                          <span
                            id={`${id}-${category.value}-help`}
                            role="tooltip"
                            hidden={dismissedHelp === category.value}
                            className="invisible absolute left-0 top-full z-10 w-48 rounded-lg border border-neutral-200 bg-white p-2 font-normal text-neutral-800 group-hover:visible group-focus-within:visible"
                          >
                            {category.help}
                          </span>
                        </span>
                      </h3>
                      <button
                        id={`${id}-add-${category.value}`}
                        type="button"
                        className={styles.icon}
                        aria-label={`Añadir estado a ${category.label}`}
                        aria-describedby={
                          editor.categoryErrors[category.value]
                            ? `${id}-category-${category.value}`
                            : undefined
                        }
                        onClick={() => add(category.value)}
                      >
                        <PlusIcon className="size-4" />
                      </button>
                    </header>
                    {editor.categoryErrors[category.value] && (
                      <p
                        id={`${id}-category-${category.value}`}
                        tabIndex={-1}
                        role="alert"
                        className="mb-2 text-xs text-red-700"
                      >
                        {editor.categoryErrors[category.value]}
                      </p>
                    )}
                    <ol className="m-0 grid list-none gap-2 p-0">
                      {states.map((state, index) => (
                        <li
                          key={state.code}
                          className="relative flex min-w-0 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-1 py-0.5 focus-within:border-neutral-500"
                          onDragOver={(event) => {
                            if (
                              drag.current &&
                              states.some((item) => item.code === drag.current)
                            )
                              event.preventDefault();
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            if (drag.current)
                              editor.setStates((items) =>
                                moveState(items, drag.current!, state.code),
                              );
                            drag.current = null;
                          }}
                        >
                          <button
                            type="button"
                            draggable
                            className={`${styles.icon} cursor-grab!`}
                            aria-label={`Reordenar ${state.name || "nuevo estado"}. Alt y flechas arriba o abajo.`}
                            title="Reordenar: Alt + ↑ o ↓"
                            onDragStart={(event) => {
                              drag.current = state.code;
                              event.dataTransfer.setData(
                                "text/plain",
                                state.code,
                              );
                              event.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={() => {
                              drag.current = null;
                            }}
                            onKeyDown={(event) => {
                              if (
                                event.altKey &&
                                (event.key === "ArrowUp" ||
                                  event.key === "ArrowDown")
                              ) {
                                event.preventDefault();
                                move(
                                  state.code,
                                  event.key === "ArrowUp" ? -1 : 1,
                                );
                              }
                            }}
                          >
                            <span
                              aria-hidden="true"
                              className="relative block size-4"
                            >
                              <DotsIcon className="absolute -left-0.5 size-4" />
                              <DotsIcon className="absolute left-0.5 size-4" />
                            </span>
                          </button>
                          <span
                            aria-hidden="true"
                            className="inline-flex shrink-0"
                          >
                            <StateIcon
                              code={state.code}
                              name={state.name}
                              category={category.value}
                              color={state.color ?? category.color}
                            />
                          </span>
                          {editing?.code === state.code ? (
                            <input
                              id={`${id}-${state.code}`}
                              aria-label="Nombre del estado"
                              name="state_name"
                              autoComplete="off"
                              placeholder="Nombre del estado…"
                              autoFocus
                              maxLength={70}
                              value={state.name}
                              className="min-w-0 flex-1 bg-white px-1 py-1.5 text-xs uppercase placeholder:normal-case"
                              aria-invalid={!state.name.trim()}
                              onChange={(event) =>
                                update(state.code, { name: event.target.value })
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  if (state.name.trim()) setEditing(null);
                                  else
                                    editor.setError(
                                      "Debes especificar el nombre del estado.",
                                    );
                                }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  if (editing.original === null)
                                    editor.setStates((items) =>
                                      items.filter(
                                        (item) => item.code !== state.code,
                                      ),
                                    );
                                  else
                                    update(state.code, {
                                      name: editing.original,
                                    });
                                  setEditing(null);
                                }
                              }}
                            />
                          ) : (
                            <button
                              id={`${id}-name-${state.code}`}
                              type="button"
                              className="min-w-0 flex-1 truncate px-1 py-1.5 text-left uppercase hover:text-neutral-600"
                              title={state.name}
                              onClick={() =>
                                setEditing({
                                  code: state.code,
                                  original: state.name,
                                })
                              }
                            >
                              {state.name}
                            </button>
                          )}
                          <details
                            className="relative shrink-0"
                            onToggle={(event) => {
                              const details = event.currentTarget;
                              const menu =
                                details.querySelector<HTMLElement>(
                                  "[data-state-menu]",
                                );
                              const scroller = details.closest(
                                "[data-state-scroll]",
                              );
                              if (!details.open || !menu || !scroller) return;
                              const bounds = scroller.getBoundingClientRect();
                              const anchor = details.getBoundingClientRect();
                              const below = bounds.bottom - anchor.bottom - 8;
                              const above = anchor.top - bounds.top - 8;
                              const upward =
                                below < menu.scrollHeight && above > below;
                              menu.style.top = upward ? "auto" : "100%";
                              menu.style.bottom = upward ? "100%" : "auto";
                              menu.style.maxHeight = `${Math.max(80, upward ? above : below)}px`;
                            }}
                          >
                            <summary
                              aria-label={`Opciones de ${state.name || "nuevo estado"}`}
                              className={`${styles.icon} list-none cursor-pointer`}
                            >
                              <span aria-hidden="true">
                                <DotsIcon className="size-4 rotate-90" />
                              </span>
                            </summary>
                            <div
                              data-state-menu
                              className={`${styles.menu} right-0 top-full overflow-y-auto overscroll-contain`}
                            >
                              <button
                                type="button"
                                onClick={(event) =>
                                  menuAction(event, () =>
                                    setEditing({
                                      code: state.code,
                                      original: state.name,
                                    }),
                                  )
                                }
                              >
                                <SettingsIcon className="size-4" />
                                Cambiar nombre
                              </button>
                              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-neutral-50">
                                Cambiar color
                                <input
                                  aria-label={`Color de ${state.name}`}
                                  name="state_color"
                                  type="color"
                                  value={state.color ?? category.color}
                                  className="w-8 cursor-pointer rounded border border-neutral-200 bg-white p-0.5"
                                  onChange={(event) =>
                                    update(state.code, {
                                      color: event.target.value,
                                    })
                                  }
                                />
                              </label>
                              {draft && (
                                <label className="grid gap-1 px-3 py-2">
                                  Categoría
                                  <select
                                    aria-label={`Categoría de ${state.name}`}
                                    value={categoryValue(state)}
                                    className={styles.input}
                                    onChange={(event) =>
                                      update(state.code, {
                                        category: event.target
                                          .value as StateCategory,
                                      })
                                    }
                                  >
                                    {stateCategories.map((item) => (
                                      <option
                                        key={item.value}
                                        value={item.value}
                                      >
                                        {item.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              )}
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={(event) =>
                                  menuAction(event, () => move(state.code, -1))
                                }
                              >
                                Subir estado
                              </button>
                              <button
                                type="button"
                                disabled={index === states.length - 1}
                                onClick={(event) =>
                                  menuAction(event, () => move(state.code, 1))
                                }
                              >
                                Bajar estado
                              </button>
                              <button
                                type="button"
                                onClick={(event) =>
                                  menuAction(event, () => remove(state))
                                }
                              >
                                Eliminar estado
                              </button>
                            </div>
                          </details>
                        </li>
                      ))}
                    </ol>
                    <button
                      type="button"
                      aria-describedby={
                        editor.categoryErrors[category.value]
                          ? `${id}-category-${category.value}`
                          : undefined
                      }
                      className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-left text-neutral-600 hover:bg-neutral-50"
                      onClick={() => add(category.value)}
                    >
                      <PlusIcon className="size-4" />
                      Añadir estado
                    </button>
                  </section>
                );
              })}
            </div>
          </fieldset>
        )}
        <footer className="shrink-0 border-t border-neutral-200 bg-white px-5 py-3 max-sm:px-4">
          {editor.error && (
            <div
              id={`${id}-error-main`}
              tabIndex={-1}
              role="alert"
              className="mb-2 flex flex-wrap items-center gap-2 text-red-700"
            >
              <p className="m-0 flex-1 [overflow-wrap:anywhere]">
                {editor.error}
              </p>
              <button
                type="button"
                className={styles.secondary}
                disabled={editor.busy}
                onClick={editor.retry}
              >
                Recargar
              </button>
            </div>
          )}
          {!allowed && (
            <p role="status">
              No tienes permiso para configurar este proyecto.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-3">
            {!draft && (
              <button
                type="button"
                disabled={editor.loading || editor.busy || !allowed}
                className={styles.secondary}
                onClick={() => setSavingName("")}
              >
                Guardar como plantilla
              </button>
            )}
            {draft && (
              <>
                <p className="m-0 mr-auto text-neutral-600">
                  Solo se guardará al crear el proyecto.
                </p>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={editor.close}
                >
                  Cancelar
                </button>
              </>
            )}
            <button
              type="button"
              disabled={editor.loading || editor.busy || !allowed}
              className={styles.primary}
              onClick={() => {
                void editor.apply();
              }}
            >
              {editor.busy
                ? "Guardando…"
                : draft
                  ? "Usar este flujo"
                  : "Aplicar cambios"}
            </button>
          </div>
        </footer>
        {savingName !== null && (
          <Modal
            title="Nueva plantilla"
            onClose={() => setSavingName(null)}
            busy={editor.busy}
          >
            <form
              className="grid gap-4 p-5"
              onSubmit={(event) => {
                event.preventDefault();
                void editor.saveTemplate(savingName).then((saved) => {
                  if (saved) {
                    setSavingName(null);
                    setNotice(
                      "Plantilla guardada. El flujo del proyecto no ha cambiado.",
                    );
                  }
                });
              }}
            >
              <label htmlFor={`${id}-name`}>Nombre</label>
              <input
                id={`${id}-name`}
                data-initial-focus
                name="template_name"
                autoComplete="off"
                required
                maxLength={70}
                placeholder="Escribe un nombre…"
                value={savingName}
                onChange={(event) => setSavingName(event.target.value)}
                className={styles.input}
                disabled={editor.busy}
              />
              {editor.error && (
                <p
                  id={`${id}-error-name`}
                  tabIndex={-1}
                  role="alert"
                  className="m-0 text-red-700"
                >
                  {editor.error}
                </p>
              )}
              <div className="flex justify-end gap-2 border-t border-neutral-200 pt-3">
                <button
                  type="button"
                  disabled={editor.busy}
                  className={styles.secondary}
                  onClick={() => setSavingName(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editor.busy || !savingName.trim()}
                  className={styles.primary}
                >
                  Guardar
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </Modal>
  );
}
