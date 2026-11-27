import { useState } from "react";
import Modal from "../../shared/components/Modal/Modal";
import UserIcon from "../../shared/icons/UserIcon";
import SparkleIcon from "../../shared/icons/SparkleIcon";
import BriefcaseIcon from "../../shared/icons/BriefcaseIcon";
import ProfileSettings from "./ProfileSettings";
import AppearanceSettings from "./AppearanceSettings";
import SpecialtiesSettings from "./SpecialtiesSettings";
import { useSettings } from "./useSettings";
import type { SettingsController } from "./useSettings";

type SectionId = "profile" | "appearance" | "specialties";

const NAV: Array<{ id: SectionId; label: string; icon: typeof UserIcon }> = [
  { id: "profile", label: "Información personal", icon: UserIcon },
  { id: "appearance", label: "Apariencia", icon: SparkleIcon },
  { id: "specialties", label: "Especialidades", icon: BriefcaseIcon },
];

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const settings = useSettings();

  return (
    <Modal title="Ajustes de cuenta" wide onClose={onClose}>
      <div className="flex flex-col md:flex-row min-h-96">
        <nav
          aria-label="Secciones de ajustes"
          className="flex shrink-0 gap-1 border-b border-neutral-200 p-2 max-md:overflow-x-auto md:w-48 md:flex-col md:border-b-0 md:border-r md:p-3 dark:border-neutral-800"
        >
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-left ${
                  active
                    ? "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-200"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </nav>
        <div className="flex-1 px-6 py-2 overflow-y-auto">
          {activeSection === "profile" && (
            <ProfileSettings settings={settings} />
          )}
          {activeSection === "appearance" && (
            <AppearanceSettings settings={settings} />
          )}
          {activeSection === "specialties" && (
            <SpecialtiesSettings settings={settings} />
          )}
        </div>
      </div>
    </Modal>
  );
}

export type { SettingsController };
