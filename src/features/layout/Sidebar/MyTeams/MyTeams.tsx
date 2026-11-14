import EmptyState from "../../../../shared/states/EmptyState/EmptyState";

// shortcut: my-teams endpoint not wired; replace with a query when available.
export default function MyTeams() {
  return (
    <div className="mx-2 rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <EmptyState
        style="small"
        iconName="teams"
        message="Cuando te añadan a un equipo, lo verás aquí."
      />
    </div>
  );
}
