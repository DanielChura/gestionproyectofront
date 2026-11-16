import PublicationsManager from "./PublicationsManager";
import PublicationsView from "./PublicationsView";

interface PublicationsPageProps {
  canManage?: boolean;
}

export default function PublicationsPage({
  canManage = false,
}: PublicationsPageProps) {
  return canManage ? <PublicationsManager /> : <PublicationsView />;
}
