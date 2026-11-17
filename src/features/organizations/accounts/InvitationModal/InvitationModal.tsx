import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, errorText } from "../../../../core/api/httpClient";
import { createInvitation } from "../../../../core/services/authService";
import type { SessionArea } from "../../../../core/interfaces/auth.interface";
import { useToast } from "../../../../hooks/useToast";
import Form from "../../../../shared/components/Form/Form";
import Input from "../../../../shared/components/Input/Input";
import Select from "../../../../shared/components/Select/Select";
import SecondaryButton from "../../../../shared/components/Button/SecondaryButton";
import { accountRoles } from "../../../auth/roles";
import { GMAIL_PATTERN, GMAIL_TITLE } from "../../../../utils/gmail";

interface InvitationModalProps {
  areas: SessionArea[];
  onClose: () => void;
  onUpdate: () => void | Promise<void>;
}

interface AreaSelection {
  key: number;
  value: string;
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
      const result = await createInvitation({
        first_names: firstNames,
        last_names: lastNames,
        email,
        role,
        all_areas: allAreas,
        area_ids: allAreas
          ? []
          : selections.map((item) => Number(item.value)),
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
      <div className="col-span-1 grid gap-1.5">
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
      <div className="col-span-1 grid gap-1.5">
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
      <div className="col-span-1 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Correo electrónico
        </label>
        <Input
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          pattern={GMAIL_PATTERN}
          title={GMAIL_TITLE}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="col-span-1 grid gap-1.5">
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
      {selections.map((selection, index) => (
        <div className="col-span-2 grid gap-1.5" key={selection.key}>
          <label className="text-xs text-neutral-800 dark:text-neutral-100">
            {index === 0 ? "Área o áreas" : `Área ${index + 1}`}
          </label>
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 min-w-0">
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
            </div>
            {index > 0 && (
              <SecondaryButton
                type="button"
                className="px-2.5 py-1 text-xs shrink-0"
                onClick={() =>
                  setSelections((current) =>
                    current.filter((item) => item.key !== selection.key),
                  )
                }
              >
                Retirar
              </SecondaryButton>
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
        <div className="col-span-2">
          <SecondaryButton
            type="button"
            onClick={addArea}
            className="px-2.5 py-1 text-xs"
          >
            Agregar área
          </SecondaryButton>
        </div>
      )}
      {areas.length === 0 && (
        <p
          className="col-span-2 m-0 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400"
          role="status"
        >
          No hay áreas activas disponibles para registrar cuentas.
        </p>
      )}
    </Form>
  );
}
