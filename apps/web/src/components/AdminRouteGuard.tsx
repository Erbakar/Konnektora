import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ApiHttpError, clearAdminToken, getAdminDashboard, getAdminToken } from "../lib/api";
import { ServiceFeedback } from "./ServiceFeedback";

export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = getAdminToken();
  const access = useQuery({
    queryKey: ["admin-route-access", token],
    queryFn: getAdminDashboard,
    enabled: Boolean(token),
    retry: false,
    staleTime: 60_000,
  });
  const denied =
    access.error instanceof ApiHttpError &&
    (access.error.status === 401 || access.error.status === 403);

  useEffect(() => {
    if (denied) clearAdminToken();
  }, [denied]);

  if (!token || denied) {
    return <Navigate replace state={{ from: location.pathname }} to="/admin" />;
  }

  if (access.isLoading) {
    return <div className="page route-loading" role="status">Admin oturumu doğrulanıyor…</div>;
  }

  if (access.isError) {
    return (
      <section className="page">
        <h1>Admin paneline bağlanılamadı</h1>
        <ServiceFeedback error={access.error} onRetry={() => void access.refetch()} />
      </section>
    );
  }

  return children;
}
