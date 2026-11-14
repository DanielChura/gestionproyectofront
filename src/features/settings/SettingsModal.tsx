import Modal from "../../shared/components/Modal/Modal";
import AppearanceSettings from "./AppearanceSettings";
import ProfileSettings from "./ProfileSettings";
import SpecialtiesSettings from "./SpecialtiesSettings";
import { useSettings } from "./useSettings";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const settings = useSettings();

  return (
    <Modal title="Ajustes" wide onClose={onClose}>
      <div className="divide-y divide-neutral-200 px-6 dark:divide-neutral-800">
        <ProfileSettings settings={settings} />
        <AppearanceSettings settings={settings} />
        <SpecialtiesSettings settings={settings} />
      </div>
    </Modal>
  );
}
