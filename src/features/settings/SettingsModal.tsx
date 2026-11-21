import { useState } from "react";
import Modal from "../../shared/components/Modal/Modal";
import SettingsNav from "./SettingsNav";
import type { SettingsSectionId } from "./SettingsNav";
import ProfileSection from "./ProfileSection";
import AppearanceSection from "./AppearanceSection";
import SpecialtiesSection from "./SpecialtiesSection";
import { useSettings } from "./useSettings";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("profile");
  const settings = useSettings();

  return (
    <Modal title="Ajustes" wide onClose={onClose}>
      <div className="flex flex-col md:flex-row min-h-[420px]">
        <SettingsNav
          activeSection={activeSection}
          onSelect={setActiveSection}
        />
        <div className="flex-1 px-6 py-2 overflow-y-auto">
          {activeSection === "profile" && (
            <ProfileSection settings={settings} />
          )}
          {activeSection === "appearance" && (
            <AppearanceSection settings={settings} />
          )}
          {activeSection === "specialties" && (
            <SpecialtiesSection settings={settings} />
          )}
        </div>
      </div>
    </Modal>
  );
}
