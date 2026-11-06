import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, apiRequest, errorText, type Area } from "../../auth/api";
import { useToast } from "../../../hooks/useToast";
import Form from "../../../shared/Form/Form";
import Input from "../../../shared/Input/Input";
import Select from "../../../shared/Select/Select";
import { accountRoles } from "../../auth/roles";

interface InvitationModalProps {
  areas: Area[];
  onClose: () => void;
  onUpdate: () => void | Promise<void>;
}

interface AreaSelection {
  key: number;
  value: string;
}
interface InvitationResult {
  detail: string;
}

export default function InvitationModal({
  areas,
  onClose,
  onUpdate,
}: InvitationModalProps) {
  const { addToast } = useToast();
  const nextKey = useRef(1);
  const [firstNames, setFirstNames] = useState("");
  const [lastNames, setLastNames] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("TRABAJADOR");
  const [selections, setSelections] = useState<AreaSelection[]>([
    { key: 0, value: "" },
  ]);
  const [allAreas, setAllAreas] = useState(false);
  const [busy, setBusy] = useState(false);
  const canAdd =
    !allAreas &&
    selections.every((item) => item.value) &&
    selections.length < areas.length;
  const disabled = busy || areas.length === 0;

  function changeArea(key: number, value: string) {
    if (value === "all") {
      setAllAreas(true);
      setSelections([{ key: 0, value: "" }]);
    } else if (allAreas) {
      setAllAreas(false);
      setSelections([{ key: 0, value }]);
    } else {
      setSelections((current) =>
        current.map((item) => (item.key === key ? { ...item, value } : item)),
      );
    }
  }

  function addArea() {
    if (!canAdd) return;
    const key = nextKey.current++;
    setSelections((current) => [...current, { key, value: "" }]);
  }
  function clearForm() {
    setFirstNames("");
    setLastNames("");
    setEmail("");
    setSelections([{ key: 0, value: "" }]);
    setAllAreas(false);
    setRole("TRABAJADOR");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await apiRequest<InvitationResult>("admin/invitations/", {
        method: "POST",
        body: JSON.stringify({
          first_names: firstNames,
          last_names: lastNames,
          email,
          role,
          all_areas: allAreas,
          area_ids: allAreas
            ? []
            : selections.map((item) => Number(item.value)),
        }),
      });
      addToast({
        icon: "success",
        title: "Invitación registrada",
        message: result.detail,
      });
      onClose();
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        failure.status === 503 &&
        failure.payload?.account_id
      )
        clearForm();
      addToast({
        icon: "error",
        title: "No se pudo registrar",
        message: errorText(failure),
      });
    } finally {
      await onUpdate();
      setBusy(false);
    }
  }

  return (
    <Form
      title="Registrar e invitar"
      submitLabel="Registrar e invitar"
      submitting={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="col-span-2 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Nombres
        </label>
        <Input
          autoComplete="given-name"
          required
          maxLength={100}
          value={firstNames}
          onChange={(e) => setFirstNames(e.target.value)}
        />
      </div>
      <div className="col-span-2 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Apellidos
        </label>
        <Input
          autoComplete="family-name"
          required
          maxLength={120}
          value={lastNames}
          onChange={(e) => setLastNames(e.target.value)}
        />
      </div>
      <div className="col-span-2 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Correo electrónico
        </label>
        <Input
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {selections.map((selection, index) => (
        <div className="col-span-2 grid gap-1.5" key={selection.key}>
          <label className="text-xs text-neutral-800 dark:text-neutral-100">
            {index === 0 ? "Área o áreas" : `Área ${index + 1}`}
          </label>
          <div className="flex items-center gap-2">
            <Select
              required
              value={allAreas ? "all" : selection.value}
              onChange={(e) => changeArea(selection.key, e.target.value)}
            >
              <option value="">Selecciona un área</option>
              {index === 0 && <option value="all">Todas</option>}
              {areas
                .filter(
                  (area) =>
                    !selections.some(
                      (item) =>
                        item.key !== selection.key &&
                        item.value === String(area.id),
                    ),
                )
                .map((area) => (
                  <option value={area.id} key={area.id}>
                    {area.name}
                  </option>
                ))}
            </Select>
            {index > 0 && (
              <button
                type="button"
                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 px-3 py-1.5 text-xs rounded-lg cursor-pointer flex-none"
                onClick={() =>
                  setSelections((current) =>
                    current.filter((item) => item.key !== selection.key),
                  )
                }
              >
                Retirar
              </button>
            )}
          </div>
        </div>
      ))}
      {allAreas && (
        <p className="col-span-2 m-0 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
          Acceso a las áreas activas actuales y futuras, sujeto a los permisos y
          asignaciones de la cuenta.
        </p>
      )}
      {canAdd && (
        <button
          type="button"
          onClick={addArea}
          className="col-span-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 px-3 py-1.5 text-xs rounded-lg cursor-pointer justify-self-start"
        >
          Agregar área
        </button>
      )}
      {areas.length === 0 && (
        <p
          className="col-span-2 m-0 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400"
          role="status"
        >
          No hay áreas activas disponibles para registrar cuentas.
        </p>
      )}
      <div className="col-span-2 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Rol global
        </label>
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          {accountRoles.map((item) => (
            <option value={item.value} key={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
    </Form>
  );
}
