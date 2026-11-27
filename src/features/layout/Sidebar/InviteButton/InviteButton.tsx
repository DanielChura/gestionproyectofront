import { lazy, Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import UserPlusIcon from "../../../../shared/icons/UserPlusIcon";
import { useActiveAreas } from "../../../organization/accounts/useAccounts";

const InvitationModal = lazy(
  () =>
    import("../../../organization/accounts/InvitationModal/InvitationModal"),
);

interface InviteButtonProps {
  canManage?: boolean;
}

export default function InviteButton({ canManage = false }: InviteButtonProps) {
  const [open, setOpen] = useState(false);
  const { data: areas = [], refetch } = useActiveAreas();
  const queryClient = useQueryClient();

  return (
    <>
      <button
        type="button"
        disabled={!canManage}
        title={!canManage ? "Solo los administradores pueden invitar nuevos usuarios" : undefined}
        onClick={() => {
          if (!canManage) return;
          void refetch();
          setOpen(true);
        }}
        className={`sidebar-item group ${
          !canManage ? "cursor-not-allowed opacity-30" : ""
        }`}
      >
        <span className="flex items-center justify-center rounded-md p-1.5 group-hover:bg-white/10">
          <UserPlusIcon className="size-5" />
        </span>
        <span>Invitar</span>
      </button>

      {open && canManage && (
        <Suspense fallback={null}>
          <InvitationModal
            areas={areas}
            onClose={() => setOpen(false)}
            onUpdate={() =>
              queryClient.invalidateQueries({ queryKey: ["accounts"] })
            }
          />
        </Suspense>
      )}
    </>
  );
}
