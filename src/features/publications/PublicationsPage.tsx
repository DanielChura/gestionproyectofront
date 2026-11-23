import Button from "../../shared/components/Button/Button";
import PlusIcon from "../../shared/icons/PlusIcon";
import EmptyFilters from "../../shared/states/EmptyFilters/EmptyFilters";
import EmptyState from "../../shared/states/EmptyState/EmptyState";
import SectionHeader from "../layout/SectionHeader/SectionHeader";
import PublicationDetail from "./components/PublicationDetail";
import PublicationForm from "./components/PublicationForm";
import PublicationList from "./components/PublicationList";
import PublicationSkeleton from "./components/PublicationSkeleton";
import PublicationsFilters from "./components/PublicationsFilters";
import { useAuth } from "../../hooks/useAuth";
import { usePublicationsPage } from "./hooks/usePublicationsPage";

export default function PublicationsPage({
  canManage: propCanManage,
}: {
  canManage?: boolean;
}) {
  const { isAdmin } = useAuth();
  const canManage = propCanManage ?? isAdmin;
  const page = usePublicationsPage(canManage);
  const hasFilters = Boolean(
    page.filters.search ||
    page.filters.project_id ||
    page.filters.state !== "ABIERTA",
  );
  const selected = page.selected;

  return (
    <main
      id="main-content"
      className="min-h-full text-neutral-800 dark:text-neutral-100"
    >
      <SectionHeader
        title="Publicaciones"
        action={
          <Button
            type="button"
            disabled={!canManage || !page.catalogs}
            title={!canManage ? "Solo los administradores pueden crear publicaciones" : undefined}
            onClick={() => page.setForm({})}
          >
            <PlusIcon className="size-4" />
            Nueva publicación
          </Button>
        }
      />
      <PublicationsFilters
        filters={{ ...page.filters, search: page.search }}
        projects={page.catalogs?.projects ?? []}
        count={page.data.length}
        onSearch={page.setSearch}
        onChange={page.setFilters}
      />
      <section aria-label="Publicaciones" aria-busy={page.loading}>
        {page.loading ? (
          <PublicationSkeleton />
        ) : page.error && page.data.length === 0 ? (
          <EmptyState
            iconName="projects"
            message="No se pudieron cargar las publicaciones."
          />
        ) : page.data.length === 0 ? (
          hasFilters ? (
            <EmptyFilters />
          ) : (
            <EmptyState
              iconName="projects"
              message="No hay publicaciones abiertas."
            />
          )
        ) : (
          <PublicationList
            publications={page.data}
            onOpen={(item) => page.setDetailId(item.id)}
            onApply={(item) => void page.applyTo(item.id)}
          />
        )}
      </section>
      {selected && (
        <PublicationDetail
          key={selected.id}
          publication={selected}
          applied={selected.applied}
          canManage={canManage}
          onClose={() => page.setDetailId(null)}
          onEdit={() => page.setForm({ publication: selected })}
          onApply={() => page.applyTo(selected.id)}
        />
      )}
      {page.form && page.catalogs && (
        <PublicationForm
          key={page.form.publication?.id ?? "new"}
          publication={page.form.publication}
          catalogs={page.catalogs}
          onClose={() => page.setForm(null)}
          onSubmit={page.save}
        />
      )}
    </main>
  );
}
