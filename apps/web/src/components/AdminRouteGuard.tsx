import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ApiHttpError, clearAdminToken, getAdminDashboard, getAdminToken } from "../lib/api";
import { ServiceFeedback } from "./ServiceFeedback";
import { useLanguage } from "../lib/i18n";

export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
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
    return <div className="page route-loading" role="status">{t("Admin oturumu doğrulanıyor…", "Verifying administrator session…")}</div>;
  }

  if (access.isError) {
    return (
      <section className="page">
        <h1>{t("Admin paneline bağlanılamadı", "Could not connect to the administration panel")}</h1>
        <ServiceFeedback error={access.error} onRetry={() => void access.refetch()} />
      </section>
    );
  }

  return children;
}
