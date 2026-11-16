import { lazy, Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import UserPlusIcon from "../../../../shared/icons/UserPlusIcon";
import { useActiveAreas } from "../../../organizations/accounts/useAccounts";

const InvitationModal = lazy(
  () =>
    import("../../../organizations/accounts/InvitationModal/InvitationModal"),
);

export default function InviteButton() {
  const [open, setOpen] = useState(false);
  const { data: areas = [], refetch } = useActiveAreas();
  const queryClient = useQueryClient();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void refetch();
          setOpen(true);
        }}
        className="sidebar-item"
      >
        <UserPlusIcon className="size-5" />
        <span className="max-w-full min-w-0">Invitar</span>
      </button>

      {open && (
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
