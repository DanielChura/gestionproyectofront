import { useState } from "react";
import type { FormEvent } from "react";
import Form from "../../../shared/components/Form/Form";
import Input from "../../../shared/components/Input/Input";

interface CreateTaskModalProps {
  projectName: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description: string;
    priority: number;
    due_date?: string;
  }) => Promise<unknown>;
}

export default function CreateTaskModal({
  projectName,
  submitting,
  onClose,
  onSubmit,
}: CreateTaskModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(3);
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    void onSubmit({
      name: name.trim(),
      description: description.trim(),
      priority,
      due_date: dueDate || undefined,
    });
  };

  return (
    <Form
      title={`Nueva tarea — ${projectName}`}
      submitLabel="Crear tarea"
      submitting={submitting}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className="col-span-2">
        <label className="mb-1 block text-xs  text-neutral-700 dark:text-neutral-300">
          Nombre de la tarea
        </label>
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Rediseñar cabecera"
          autoFocus
        />
      </div>

      <div className="col-span-2">
        <label className="mb-1 block text-xs  text-neutral-700 dark:text-neutral-300">
          Descripción
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalles u objetivos..."
          rows={3}
          className="w-full rounded-lg border border-neutral-200 bg-white p-2.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs  text-neutral-700 dark:text-neutral-300">
          Prioridad
        </label>
        <select
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs  text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
        >
          <option value={1}>Urgente</option>
          <option value={2}>Alta</option>
          <option value={3}>Normal</option>
          <option value={4}>Baja</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs  text-neutral-700 dark:text-neutral-300">
          Fecha límite
        </label>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
    </Form>
  );
}
