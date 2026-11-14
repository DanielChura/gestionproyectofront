import DarkThemeIcon from "../../shared/icons/DarkThemeIcon";
import LightThemeIcon from "../../shared/icons/LightThemeIcon";
import SystemThemeIcon from "../../shared/icons/SystemThemeIcon";

interface ThemePreviewProps {
  theme: "system" | "light" | "dark";
  className?: string;
}

export default function ThemePreview({
  theme,
  className = "",
}: ThemePreviewProps) {
  const Icon =
    theme === "dark"
      ? DarkThemeIcon
      : theme === "light"
        ? LightThemeIcon
        : SystemThemeIcon;
  return <Icon className={className} />;
}
