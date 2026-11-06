import { useState } from "react";
import Form from "../../../shared/Form/Form";
import Input from "../../../shared/Input/Input";
import { addTeamMember } from "../../../core/services/organizationService";
import { listWorkers } from "../../../core/services/workerService";
import type { Team } from "../../../core/interfaces/organization.interface";

interface TeamMembersModalProps {
  team: Team;
  onClose: () => void;
  onChanged: () => void;
}

function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function TeamMembersModal({ team, onClose, onChanged }: TeamMembersModalProps) {
  const [code, setCode] = useState("");
  const [joinedDate, setJoinedDate] = useState(todayLocal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || !joinedDate) return;
    setBusy(true);
    try {
      const matches = await listWorkers({ search: trimmed });
      const worker =
        matches.find(
          (candidate) => candidate.code.toLowerCase() === trimmed.toLowerCase(),
        ) ?? (matches.length === 1 ? matches[0] : undefined);
      if (!worker) {
        setError("No existe un trabajador con ese código.");
        return;
      }
      await addTeamMember(team.id, {
        worker_id: worker.id,
        joined_date: joinedDate,
      });
      setCode("");
      setError("");
      onChanged();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "No se pudo agregar.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Form
      title={`Añadir a ${team.name}`}
      submitLabel="Añadir"
      submitting={busy}
      onClose={onClose}
      onSubmit={handleAdd}
    >
      {error && (
        <p
          className="col-span-2 m-0 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-xs text-neutral-800 dark:text-neutral-100"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="col-span-2 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Código de trabajador
        </label>
        <Input
          id="member-code"
          name="code"
          type="text"
          required
          value={code}
          maxLength={50}
          placeholder="Ej. T-001"
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      <div className="col-span-2 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Fecha de ingreso
        </label>
        <Input
          id="member-date"
          name="joined_date"
          type="date"
          required
          value={joinedDate}
          max={todayLocal()}
          onChange={(e) => setJoinedDate(e.target.value)}
        />
      </div>
    </Form>
  );
}

export default TeamMembersModal;
