import { lazy, Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import UserPlusIcon from "../../../../shared/icons/UserPlusIcon";
import { useActiveAreas } from "../../../organizations/accounts/useAccounts";

const InvitationModal = lazy(
  () =>
    import("../../../organizations/accounts/InvitationModal/InvitationModal"),
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
        className={`sidebar-item ${
          !canManage ? "cursor-not-allowed opacity-30" : ""
        }`}
      >
        <UserPlusIcon className="size-5" />
        <span className="max-w-full min-w-0">Invitar</span>
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
