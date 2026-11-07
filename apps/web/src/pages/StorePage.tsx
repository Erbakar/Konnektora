import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPlanCatalog, getMembership, getUserSession, listMyEvents } from "../lib/api";
import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useLanguage } from "../lib/i18n";

export function StorePage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const [audience, setAudience] = useState<"individual" | "corporate">("individual");
  const user = getUserSession();
  const membership = useQuery({ queryKey: ["membership", user?.id], queryFn: getMembership, enabled: Boolean(user) });
  const myEvents = useQuery({ queryKey: ["my-events", user?.id], queryFn: listMyEvents, enabled: Boolean(user && membership.data?.eventInvites.length) });
  const catalog = useQuery({ queryKey: ["plan-catalog"], queryFn: getPlanCatalog });
  const plans = catalog.data?.plans ?? { individual: {}, corporate: {}, researcher: {} };
  const unlimited = t("Sınırsız", "Unlimited");
  const extras = [
    [t("Araştırmacı abonelikleri", "Researcher subscriptions"), Object.values(plans.researcher!).map(p => `${p.name}: ${p.price} USD`).join(" · "), t("50 / 200 / sınırsız etiket ve PDF dışa aktarma", "50 / 200 / unlimited tags and PDF export")],
    [t("Ekstra davet", "Extra invitations"), "20 USD / 2.000", t("2.000 üzeri davet başına 0,01 USD; kalan haklar sonraki aya devreder.", "Above 2,000: USD 0.01 per invitation; unused credits carry over.")],
    [t("Ekstra mesaj", "Extra messages"), audience === "individual" ? "6 USD / 100" : "0,05 USD / " + t("mesaj", "message"), audience === "individual" ? t("Kalan haklar sonraki aya devreder.", "Unused credits carry over.") : t("200 üzerinde özel miktar; kalan haklar sonraki aya devreder.", "Custom quantities above 200; unused credits carry over.")],
    [t("Katılımcılara toplu mesaj", "Bulk attendee messages"), "0,10 USD / " + t("alıcı", "recipient"), t("Etkinlik veya mekân katılımcılarına gönderim.", "Send to event or venue attendees.")],
    ...(audience === "corporate" ? [
      [t("Etkinlik bannerı", "Event banner"), "3 / 7 / 30 " + t("gün", "days") + ": 30 / 50 / 100 USD", t("Seçili şehir veya ülkede gösterim.", "Visibility in a selected city or country.")],
      [t("İlgi alanı sponsorluğu", "Interest sponsorship"), "3 / 7 " + t("gün", "days") + ": 50 / 100 USD", t("Popüler ilgi alanlarında sponsorlu görünürlük.", "Sponsored visibility among popular interests.")],
      [t("Etiket sayfası tasarımı", "Branded tag page"), t("Fiyat daha sonra açıklanacak", "Pricing to be announced"), t("15 veya 30 günlük marka tasarımı.", "Branded styling for 15 or 30 days.")],
    ] : []),
  ];
  return <div className="page member-store">
    <header><span className="eyebrow">Konnektora</span><h1>{t("Mağaza & Fiyatlar", "Store & Pricing")}</h1><p>{t("Paket dönemi 31 gündür. Fiyatlar ABD doları cinsindedir.", "Each plan period is 31 days. Prices are in US dollars.")}</p></header>
    {membership.data && <details className="finance-panel plan-usage" aria-label={t("Paket kullanımın", "Your plan usage")}>
      <summary>{t("Paket kullanımın", "Your plan usage")}: <strong>{plans[user?.accountType === "corporate" ? "corporate" : "individual"]?.[user?.accountType === "corporate" ? membership.data.business.plan : membership.data.member.plan]?.name ?? (user?.accountType === "corporate" ? membership.data.business.plan : membership.data.member.plan)}</strong><ChevronDown size={18}/></summary>
      <p>{t("Dönem sonu", "Period ends")}: {new Date(membership.data.period.end).toLocaleDateString(language === "tr" ? "tr-TR" : "en-GB")}</p>
      {membership.data.gift && <p>{t("Hediye paket", "Gift plan")}: {plans[user?.accountType === "corporate" ? "corporate" : "individual"]?.[membership.data.gift.plan]?.name ?? membership.data.gift.plan} · {new Date(membership.data.gift.expiresAt).toLocaleDateString()}</p>}
      {membership.data.researcherGift && <p>{t("Araştırmacı paketi", "Researcher plan")}: {plans.researcher?.[membership.data.researcherGift.plan]?.name ?? membership.data.researcherGift.plan} · {new Date(membership.data.researcherGift.expiresAt).toLocaleDateString()}</p>}
      <p>{t("Kalan etkinlik hakkı", "Remaining events")}: {membership.data.limits.events == null ? unlimited : Math.max(0, membership.data.limits.events - membership.data.used.events)}</p>
      <p>{t("Kalan farklı etiket analizi", "Remaining distinct tag analyses")}: {membership.data.limits.tags == null ? unlimited : Math.max(0, membership.data.limits.tags - membership.data.used.tags)}</p>
      {membership.data.chats && <><p>{t("Son 24 saat için kalan yeni sohbet", "Remaining new conversations in 24 hours")}: {membership.data.limits.messages == null ? unlimited : Math.max(0, membership.data.limits.messages - membership.data.chats.daily)}</p><p>{t("Son 6 saat için kalan yeni sohbet", "Remaining new conversations in 6 hours")}: {membership.data.limits.sixHours == null ? unlimited : Math.max(0, membership.data.limits.sixHours - membership.data.chats.recent)}</p></>}
      <p>{t("Etkinlik başına davet hakkı", "Invitations per event")}: {membership.data.limits.invites ?? unlimited}</p>
      {membership.data.eventInvites.map(event => <p key={event.eventId}>{myEvents.data?.find(item => item.id === event.eventId) ? <Link to={`/events/${myEvents.data.find(item => item.id === event.eventId)!.slug}`}>{myEvents.data.find(item => item.id === event.eventId)!.title}</Link> : t("Etkinlik davetleri", "Event invitations")}: {membership.data.limits.invites == null ? unlimited : Math.max(0, membership.data.limits.invites - event.used)} {t("davet kaldı", "invitations remaining")}</p>)}
    </details>}
    <div className="store-audience" role="group" aria-label={t("Hizmet türü", "Service type")}>
      <button type="button" aria-pressed={audience === "individual"} onClick={() => setAudience("individual")}>{t("Bireysel hizmetler", "Individual services")}</button>
      <button type="button" aria-pressed={audience === "corporate"} onClick={() => setAudience("corporate")}>{t("Kurumsal hizmetler", "Business services")}</button>
    </div>
    <p role="status">{t("Mevcut üyelikler yeni paketlere taşınmıştır. Yeni paket satın alma henüz açılmadı.", "Existing memberships have moved to the new plans. New plan purchases are not yet available.")}</p>
    {catalog.isPending && <p role="status">{t("Paketler yükleniyor…", "Loading plans…")}</p>}{catalog.isError && <p role="alert">{t("Paketler yüklenemedi.", "Plans could not be loaded.")} <button onClick={() => void catalog.refetch()}>{t("Tekrar dene", "Try again")}</button></p>}
    <section aria-label={t("Abonelikler", "Subscriptions")}>
      {Object.values(plans[audience]!).map(plan => {
        const features = [
          `${plan.events ?? unlimited} ${t("etkinlik / dönem", "events / period")}`,
          `${plan.messages ?? unlimited} ${t("yeni sohbet / gün", "new conversations / day")}`,
          ...(!plan.advanced ? [`${plan.sixHours ?? unlimited} ${t("yeni sohbet / 6 saat", "new conversations / 6 hours")}`, t("Temel filtreler", "Basic filters")] : [t("Gelişmiş filtreler", "Advanced filters"), t("Profil, etkinlik ve mekân istatistikleri ve AI içgörüleri", "Profile, event and venue analytics and AI insights")]),
          `${plan.tags ?? unlimited} ${t("farklı etiket için istatistik ve AI içgörüleri / dönem", "distinct tags with analytics and AI insights / period")}`,
          `${(plan.invites?.toLocaleString(language === "tr" ? "tr-TR" : "en-US") ?? unlimited)} ${t("yönetici daveti / etkinlik", "organizer invitations / event")}`,
          ...(plan.guest ? [t("Guest List yönetimi", "Guest list management")] : []),
          ...(audience === "individual" && plan.price > 0 ? [t("Reklamsız kullanım", "Ad-free experience")] : []),
          ...(plan.name === "Festival" ? [t("Öncelikli iletişim", "Priority communication")] : []),
        ];
        return <article key={`${audience}-${plan.name}`}><h2>{plan.name}</h2><strong>{plan.price ? `${plan.price} USD / ${t("ay", "month")}` : t("Ücretsiz", "Free")}</strong><ul>{features.map(feature => <li key={feature}><Check size={16}/>{feature}</li>)}</ul></article>;
      })}
    </section>
    <p>{t("Davet limitleri etkinlik yöneticisinin mevcut üyelere gönderdiği etkinlik davetleri içindir; katılımcı kapasitesi değildir. Diğer üyelerin davetleri, üyelik davetleri ve henüz üye olmayanlara davetler bu limite dâhil değildir.", "Invitation limits apply to event organizers inviting existing members, not attendee capacity. Invitations from other members, membership invitations and invitations to non-members are excluded.")}</p>
    {audience === "corporate" ? <p>{t("Ücretli bilet satışlarında, ödeme sağlayıcısının işlem ücreti dahil toplam komisyon %5’tir. Ücretli biletli etkinlikler için etkinlik oluşturma kotası uygulanmaz; davetler sınırsızdır.", "The total commission on paid ticket sales is 5%, including the payment provider’s processing fee. Paid ticket events are exempt from event creation quotas and have unlimited invitations.")}</p> : null}
    <h2>{t("Ek hizmetler (yakında)", "Additional services (coming soon)")}</h2>
    <section>{extras.map(([name, price, description]) => <article key={name}><h3>{name} <small>{t("(yakında)", "(coming soon)")}</small></h3><strong>{price}</strong><p>{description}</p></article>)}</section>
  </div>;
}
