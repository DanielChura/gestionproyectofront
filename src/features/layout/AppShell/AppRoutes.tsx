import { Suspense } from "react";
import { Route, Routes } from "react-router";
import { allRoutes } from "../../../routes";
import NotAvailable from "../NotAvailable/NotAvailable";

export default function AppRoutes({ canManage }: { canManage: boolean }) {
  return (
    <Suspense fallback={null}>
      <Routes>
        {allRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              route.requiresAdmin && !canManage ? (
                <NotAvailable />
              ) : (
                <route.Component canManage={canManage} />
              )
            }
          />
        ))}
        <Route path="*" element={<NotAvailable />} />
      </Routes>
    </Suspense>
  );
}
