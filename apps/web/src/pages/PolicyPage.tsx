import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import type { PolicyType } from "@konnektora/shared";
import { getPolicy } from "../lib/api";

const policyRouteTypes: Record<string, PolicyType> = {
  privacy: "privacy",
  terms: "terms",
  cookies: "cookies"
};

const fallbackTitles: Record<PolicyType, string> = {
  privacy: "Privacy Policy",
  terms: "Terms of Use",
  cookies: "Cookie Policy"
};

export function PolicyPage() {
  const { type = "privacy" } = useParams();
  const policyType = policyRouteTypes[type] ?? "privacy";
  const policyQuery = useQuery({
    queryKey: ["policy", policyType],
    queryFn: () => getPolicy(policyType)
  });

  return (
    <section className="page policy-page">
      <div className="policy-header">
        <p className="eyebrow">Konnektora</p>
        <h1>{policyQuery.data?.title ?? fallbackTitles[policyType]}</h1>
        <p>
          {policyQuery.data?.publishedAt
            ? `Son yayın tarihi: ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(policyQuery.data.publishedAt))}`
            : "Bu sayfa admin panelinden yayınlandığında güncel içerik burada görünür."}
        </p>
      </div>
      <article className="policy-content">
        {policyQuery.isLoading ? (
          <p>Yükleniyor...</p>
        ) : policyQuery.data ? (
          policyQuery.data.body.split("\n").map((paragraph, index) => <p key={`${policyType}-${index}`}>{paragraph}</p>)
        ) : (
          <div>
            <p>Bu policy sayfası henüz yayınlanmadı.</p>
            <Link className="corp-link" to="/">
              Ana sayfaya dön
            </Link>
          </div>
        )}
      </article>
    </section>
  );
}
