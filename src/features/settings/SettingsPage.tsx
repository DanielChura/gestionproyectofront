import { useState } from "react";
import type { FormEvent } from "react";
import { useTheme } from "../../hooks/useTheme";
import ThemePreview from "./ThemePreview";
import type { Theme } from "../../hooks/useTheme";
import { useProfile } from "../profile/ProfileModal/useProfile";
import { updateSessionProfile } from "../../features/auth/api";
import { useToast } from "../../hooks/useToast";
import Avatar from "../../shared/Avatar";
import UserIcon from "../../shared/Icons/UserIcon";
import AtIcon from "../../shared/Icons/AtIcon";
import KeyIcon from "../../shared/Icons/KeyIcon";

const appearanceOptions: Array<{
  value: Theme;
  label: string;
}> = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Automática" },
];

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const {
    profile,
    specialties,
    catalog,
    loading,
    error,
    saving,
    addSpecialty,
    dropSpecialty,
    reload,
  } = useProfile();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [lastNameTouched, setLastNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const { addToast } = useToast();

  const currentFirstName = firstNameTouched
    ? firstName
    : ((profile?.name ?? "").split(" ")[0] ?? "");
  const currentLastName = lastNameTouched
    ? lastName
    : (profile?.name ?? "").split(" ").slice(1).join(" ");
  const currentName =
    `${currentFirstName} ${currentLastName}`.trim() || (profile?.name ?? "");
  const currentEmail = emailTouched ? email : (profile?.email ?? "");
  async function saveProfile(event?: FormEvent) {
    event?.preventDefault();
    setSavingProfile(true);
    try {
      await updateSessionProfile({
        first_names: currentFirstName,
        last_names: currentLastName,
        email: currentEmail,
        password: password || undefined,
      });
      await reload();
      setPassword("");
      addToast({
        icon: "success",
        title: "Perfil actualizado",
        message: "Los cambios se guardaron.",
      });
    } catch (failure) {
      addToast({
        icon: "error",
        title: "No se pudo guardar",
        message: String(failure),
      });
    } finally {
      setSavingProfile(false);
    }
  }

  const allSpecialties = [...specialties, ...catalog].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const isMine = (id: number) => specialties.some((s) => s.id === id);

  const toggleSpecialty = async (id: number) => {
    const mine = specialties.find((s) => s.id === id);
    if (mine) {
      await dropSpecialty(mine);
    } else {
      await addSpecialty(id);
    }
  };

  return (
    <main
      className="min-h-full max-w-4xl mx-auto text-neutral-800 dark:text-neutral-100 pb-16"
      id="main-content"
    >
      <header className="mb-6">
        <h1 className="text-xl  text-neutral-900 dark:text-neutral-100">
          Mis ajustes
        </h1>
      </header>

      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {/* Sección: Perfil */}
        <section className="flex flex-col md:flex-row  gap-12 py-6">
          <div className="md:flex-1">
            <h2 className="text-sm  text-neutral-900 dark:text-neutral-100">
              Perfil
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Tu información personal y los ajustes de seguridad de tu cuenta en
              la plataforma.
            </p>
          </div>

          <form className="md:flex-2 max-w-xl space-y-4" onSubmit={saveProfile}>
            <div>
              <div className="flex items-center gap-3">
                {profile && (
                  <Avatar
                    name={currentName}
                    className="size-14 text-base ring-2 ring-neutral-300 dark:ring-neutral-700 select-none"
                  />
                )}
              </div>
              <p className="mt-4 text-xs  text-neutral-800 dark:text-neutral-200">
                {currentName}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="profile-first-name"
                  className="block text-xs  text-neutral-700 dark:text-neutral-300 mb-1.5"
                >
                  Nombre
                </label>
                <div className="relative flex items-center">
                  <UserIcon className="absolute left-3 size-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
                  <input
                    id="profile-first-name"
                    type="text"
                    value={currentFirstName}
                    onChange={(e) => {
                      setFirstNameTouched(true);
                      setFirstName(e.target.value);
                    }}
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 pl-9 pr-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 dark:focus:border-neutral-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="profile-last-name"
                  className="block text-xs  text-neutral-700 dark:text-neutral-300 mb-1.5"
                >
                  Apellidos
                </label>
                <div className="relative flex items-center">
                  <UserIcon className="absolute left-3 size-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
                  <input
                    id="profile-last-name"
                    type="text"
                    value={currentLastName}
                    onChange={(e) => {
                      setLastNameTouched(true);
                      setLastName(e.target.value);
                    }}
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 pl-9 pr-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 dark:focus:border-neutral-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="block text-xs  text-neutral-700 dark:text-neutral-300 mb-1.5"
              >
                Correo electrónico
              </label>
              <div className="relative flex items-center">
                <AtIcon className="absolute left-3 size-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
                <input
                  id="profile-email"
                  type="email"
                  value={currentEmail}
                  onChange={(e) => {
                    setEmailTouched(true);
                    setEmail(e.target.value);
                  }}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 pl-9 pr-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 dark:focus:border-neutral-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-password"
                className="block text-xs  text-neutral-700 dark:text-neutral-300 mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative flex items-center">
                <KeyIcon className="absolute left-3 size-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
                <input
                  id="profile-password"
                  type="password"
                  placeholder="Introduce una nueva contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-500 pl-9 pr-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 dark:focus:border-neutral-600 focus:outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex cursor-pointer items-center rounded-lg bg-neutral-800 px-3 py-1.5 text-xs  text-neutral-100 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingProfile ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>
        </section>

        {/* Sección: Apariencia */}
        <section className="flex flex-col md:flex-row  gap-12 py-6">
          <div className="md:flex-1">
            <h2 className="text-sm  text-neutral-900 dark:text-neutral-100">
              Apariencia
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Elige el modo claro u oscuro, o cambia el modo automáticamente
              según tu sistema.
            </p>
          </div>

          <div className="md:flex-2 flex flex-wrap items-start gap-4">
            {appearanceOptions.map((option) => {
              const active = theme === option.value;
              return (
                <div key={option.value} className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setTheme(option.value)}
                    className={`w-32 rounded-xl border p-1 text-left cursor-pointer overflow-hidden ${
                      active
                        ? "border-neutral-900 dark:border-white ring-2 ring-neutral-900 dark:ring-white bg-neutral-50 dark:bg-neutral-800"
                        : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600"
                    }`}
                  >
                    <ThemePreview
                      theme={option.value}
                      className="w-full aspect-video rounded-lg overflow-hidden"
                    />
                  </button>
                  <span className="mt-2 text-xs  text-neutral-800 dark:text-neutral-200">
                    {option.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Sección: Mis especialidades */}
        <section className="flex flex-col md:flex-row  gap-12 py-6">
          <div className="md:flex-1">
            <h2 className="text-sm  text-neutral-900 dark:text-neutral-100">
              Mis especialidades
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Marca las especialidades y competencias que dominas para la
              asignación de proyectos.
            </p>
          </div>

          <div className="md:flex-2 max-w-xl">
            {loading ? null : error ? (
              <p
                role="alert"
                className="text-xs text-neutral-600 dark:text-neutral-400"
              >
                No se pudieron cargar tus especialidades.
              </p>
            ) : allSpecialties.length === 0 ? (
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                No hay especialidades disponibles.
              </p>
            ) : (
              <ul className="m-0 p-0 list-none grid gap-2 sm:grid-cols-2">
                {allSpecialties.map((item) => {
                  const checked = isMine(item.id);
                  return (
                    <li key={item.id}>
                      <label className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={saving}
                          onChange={() => void toggleSpecialty(item.id)}
                          className="accent-neutral-800 dark:accent-neutral-100 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span className="text-xs text-neutral-800 dark:text-neutral-100">
                          {item.name}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default SettingsPage;
