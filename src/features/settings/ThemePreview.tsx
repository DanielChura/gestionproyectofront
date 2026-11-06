import DarkThemeIcon from "../../shared/Icons/DarkThemeIcon";
import LightThemeIcon from "../../shared/Icons/LightThemeIcon";
import SystemThemeIcon from "../../shared/Icons/SystemThemeIcon";

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
