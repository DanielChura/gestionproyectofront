import UserIcon from "../../shared/icons/UserIcon";
import SparkleIcon from "../../shared/icons/SparkleIcon";
import BriefcaseIcon from "../../shared/icons/BriefcaseIcon";

export type SettingsSectionId = "profile" | "appearance" | "specialties";

interface SettingsNavProps {
  activeSection: SettingsSectionId;
  onSelect: (section: SettingsSectionId) => void;
}

const NAV_ITEMS: Array<{
  id: SettingsSectionId;
  label: string;
  icon: typeof UserIcon;
}> = [
  { id: "profile", label: "Perfil", icon: UserIcon },
  { id: "appearance", label: "Apariencia", icon: SparkleIcon },
  { id: "specialties", label: "Especialidades", icon: BriefcaseIcon },
];

export default function SettingsNav({
  activeSection,
  onSelect,
}: SettingsNavProps) {
  return (
    <nav
      aria-label="Secciones de ajustes"
      className="flex shrink-0 gap-1 border-b border-neutral-200 p-2 max-md:overflow-x-auto md:w-44 md:flex-col md:border-b-0 md:border-r md:p-3 dark:border-neutral-800"
    >
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const active = activeSection === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-left ${
              active
                ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-200"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            <span className="whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
