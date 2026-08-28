import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Crown, Sparkles, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { changeMemberPlan, getFinanceDashboard, getUserSession } from "../lib/api";
import { useLanguage } from "../lib/i18n";

export function StorePage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => (language === "tr" ? tr : en);
  const user = getUserSession();
  const client = useQueryClient();
  const plans = [
    {
      id: "free" as const,
      name: t("Ücretsiz", "Free"),
      price: t("₺0", "TRY 0"),
      icon: <Store />,
      features: [
        t("Topluluğu ve içerikleri keşfet", "Discover the community and content"),
        t("Etkinliklere katıl", "Join events"),
        t("Temel profil ve mesajlaşma", "Core profile and messaging"),
      ],
    },
    {
      id: "plus" as const,
      name: "Plus",
      price: t("₺99 / ay", "TRY 99 / month"),
      icon: <Sparkles />,
      features: [
        t("Gelişmiş kişi ve etkinlik önerileri", "Advanced people and event recommendations"),
        t("Daha fazla profil medyası", "More profile media"),
        t("Öncelikli destek", "Priority support"),
      ],
    },
    {
      id: "premium" as const,
      name: "Premium",
      price: t("₺249 / ay", "TRY 249 / month"),
      icon: <Crown />,
      features: [
        t("Tüm Plus özellikleri", "All Plus features"),
        t("Gelişmiş eşleşme içgörüleri", "Advanced matching insights"),
        t("Özel topluluk avantajları", "Exclusive community benefits"),
      ],
    },
  ];
  const finance = useQuery({
    queryKey: ["finance"],
    queryFn: getFinanceDashboard,
    enabled: Boolean(user),
  });
  const select = useMutation({
    mutationFn: (plan: "free" | "plus" | "premium") =>
      changeMemberPlan(
        plan,
        plan === "free" ? undefined : `pm_sandbox_${crypto.randomUUID()}`,
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ["finance"] }),
  });

  return (
    <div className="page member-store">
      <header>
        <span className="eyebrow">{t("Konnektora mağaza", "Konnektora store")}</span>
        <h1>{t("Deneyimini sana uygun paketle güçlendir.", "Enhance your experience with the right plan.")}</h1>
        <p>{t("Ücretsiz başla; daha gelişmiş keşif ve topluluk araçlarına ihtiyaç duyduğunda paketini değiştir.", "Start free and change your plan when you need more advanced discovery and community tools.")}</p>
      </header>
      <section>
        {plans.map((plan) => (
          <article className={finance.data?.member.plan === plan.id ? "selected" : ""} key={plan.id}>
            {plan.icon}
            <h2>{plan.name}</h2>
            <strong>{plan.price}</strong>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}><Check size={16} />{feature}</li>
              ))}
            </ul>
            {user ? (
              <button
                className={finance.data?.member.plan === plan.id ? "secondary-action" : "primary-action"}
                disabled={select.isPending || finance.data?.member.plan === plan.id}
                onClick={() => select.mutate(plan.id)}
              >
                {finance.data?.member.plan === plan.id ? t("Aktif paket", "Active plan") : t("Paketi seç", "Select plan")}
              </button>
            ) : (
              <Link className="primary-action" to="/login">{t("Giriş yap ve seç", "Sign in and select")}</Link>
            )}
          </article>
        ))}
      </section>
      {select.isSuccess ? <p className="form-success">{t("Paketin başarıyla güncellendi.", "Your plan was updated successfully.")}</p> : null}
      {select.isError ? <p className="form-error">{t("Paket güncellenemedi.", "The plan could not be updated.")}</p> : null}
    </div>
  );
}
