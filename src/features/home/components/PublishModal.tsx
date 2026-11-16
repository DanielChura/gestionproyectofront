import { useState } from "react";
import type { FormEvent } from "react";
import Form from "../../../shared/components/Form/Form";
import Input from "../../../shared/components/Input/Input";

interface PublishModalProps {
  projectName: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: { title: string; content: string }) => Promise<unknown>;
}

export default function PublishModal({
  projectName,
  submitting,
  onClose,
  onSubmit,
}: PublishModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    void onSubmit({ title: title.trim(), content: content.trim() });
  };

  return (
    <Form
      title={`Publicar en ${projectName}`}
      submitLabel="Publicar ahora"
      submitting={submitting}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className="col-span-2">
        <label className="mb-1 block text-xs  text-neutral-700 dark:text-neutral-300">
          Título de la publicación
        </label>
        <Input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Lanzamiento de la versión 2.0"
          autoFocus
        />
      </div>

      <div className="col-span-2">
        <label className="mb-1 block text-xs  text-neutral-700 dark:text-neutral-300">
          Contenido
        </label>
        <textarea
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe el mensaje o actualización para el equipo..."
          rows={3}
          className="w-full rounded-lg border border-neutral-200 p-2.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none dark:border-neutral-800 dark:text-neutral-100"
        />
      </div>
    </Form>
  );
}
