import { useState } from "react";
import XIcon from "../../../shared/icons/XIcon";
import { errorText } from "../../auth/api";
import { useProfile } from "./useProfile";

interface ProfileModalProps {
  onClose: () => void;
}

function ProfileModal({ onClose }: ProfileModalProps) {
  const {
    profile,
    specialties,
    catalog,
    loading,
    error,
    saving,
    addSpecialty,
    dropSpecialty,
  } = useProfile();
  const [selectedId, setSelectedId] = useState("");
  const [formError, setFormError] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setFormError("");
    try {
      await addSpecialty(Number(selectedId));
      setSelectedId("");
    } catch (failure) {
      setFormError(errorText(failure));
    }
  };

  const handleDrop = async (id: number, name: string) => {
    setFormError("");
    try {
      await dropSpecialty({ id, name, level: 0 });
    } catch (failure) {
      setFormError(errorText(failure));
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg">
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <h3 className="m-0 text-sm text-neutral-800">Mis especialidades</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 rounded-full cursor-pointer inline-flex items-center justify-center"
          >
            <XIcon className="size-4" />
          </button>
        </header>

        {loading ? (
          <p role="status" className="m-0 p-4 text-sm text-neutral-600">
            Cargando especialidades…
          </p>
        ) : error != null || profile == null ? (
          <p role="alert" className="m-0 p-4 text-sm text-neutral-600">
            No se pudieron cargar tus especialidades.
          </p>
        ) : (
          <form onSubmit={handleAdd} className="grid gap-3 p-4">
            {specialties.length > 0 && (
              <ul className="m-0 p-0 list-none flex flex-wrap gap-1.5">
                {specialties.map((item) => (
                  <li
                    key={item.id}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs  text-white bg-sky-600 rounded-full"
                  >
                    {item.name}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleDrop(item.id, item.name)}
                      aria-label={`Quitar ${item.name}`}
                      className="text-white hover:text-neutral-100 cursor-pointer disabled:opacity-50 leading-none inline-flex items-center"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid gap-1.5">
              <label
                htmlFor="profile-specialty"
                className="text-sm text-neutral-800"
              >
                Añadir especialidad
              </label>
              <select
                id="profile-specialty"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-white border border-neutral-200 text-neutral-800 px-3 py-1.5 text-sm rounded-lg focus:border-neutral-400 focus:outline-none cursor-pointer"
              >
                <option value="">Selecciona una especialidad</option>
                {catalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {formError && (
              <p role="alert" className="m-0 text-sm text-neutral-600">
                {formError}
              </p>
            )}

            <footer className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                className="bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-100 px-3 py-1.5 text-xs rounded-lg cursor-pointer"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !selectedId}
                className="bg-neutral-800 text-white hover:bg-neutral-700 px-3 py-1.5 text-xs rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Guardando…" : "Agregar"}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}

export default ProfileModal;
