import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Handshake, Lightbulb, Mail, MapPin, Network, Sparkles, Tags, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { DiscoveryCard } from "../components/DiscoveryCard";
import { getPublicProfile, getPublicProfileById, getUserSession, resolveMediaUrl } from "../lib/api";
import { useLanguage } from "../lib/i18n";

export function MutualismPage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const { username = "", userId = "" } = useParams();
  const viewer = getUserSession();
  const profile = useQuery({
    queryKey: ["mutualism", username || userId, viewer?.id],
    queryFn: () => userId ? getPublicProfileById(userId) : getPublicProfile(username),
    enabled: Boolean(username || userId) && Boolean(viewer),
  });
  if (!viewer) return <section className="page empty-state"><Handshake size={40}/><h1>{t("Mutualizm Analizi", "Mutualism Analysis")}</h1><p>{t("Ortak noktaları karşılaştırmak için giriş yapmalısınız.", "Log in to compare your shared signals.")}</p><Link className="primary-action" to="/login">{t("Giriş yap", "Log in")}</Link></section>;
  if (profile.isLoading) return <section className="page"><p role="status">{t("Analiz hazırlanıyor…", "Preparing analysis…")}</p></section>;
  if (profile.isError || !profile.data) return <section className="page empty-state"><h1>{t("Analiz açılamadı", "Analysis unavailable")}</h1><p>{t("Profil gizlilik tercihleri veya bağlantı nedeniyle analiz yüklenemedi.", "The analysis could not be loaded because of profile privacy or connectivity.")}</p><button className="secondary-action" onClick={() => void profile.refetch()}>{t("Tekrar dene", "Try again")}</button></section>;
  const person = profile.data;
  const analysis = person.mutualism;
  const backPath = userId ? `/users/id/${person.id}` : `/users/${person.username}`;
  if (!analysis) return <section className="page empty-state"><h1>{t("Karşılaştırma yapılamıyor", "Comparison unavailable")}</h1><p>{t("Kendi profiliniz için Mutualizm Analizi gösterilmez.", "Mutualism Analysis is not shown for your own profile.")}</p><Link className="secondary-action" to={backPath}>{t("Profile dön", "Back to profile")}</Link></section>;
  const scores = [
    ["friendship", t("Arkadaşlık uyumu", "Friendship compatibility"), analysis.scores.friendship],
    ["networking", t("Networking uyumu", "Networking compatibility"), analysis.scores.networking],
    ["event", t("Etkinlik partneri uyumu", "Event partner compatibility"), analysis.scores.eventPartner],
    ["travel", t("Seyahat uyumu", "Travel compatibility"), analysis.scores.travel],
    ["business", t("İş uyumu", "Business compatibility"), analysis.scores.business],
  ] as const;
  return <section className="page mutualism-page">
    <Link className="back-link" to={backPath}><ArrowLeft size={16}/>{t("Profile dön", "Back to profile")}</Link>
    <header className="mutualism-hero"><div><span className="eyebrow">{t("Mutualizm Analizi", "Mutualism Analysis")}</span><h1>{t(`${person.name} ile uyumunuz`, `Your compatibility with ${person.name}`)}</h1><p>{analysis.total ? t(`${analysis.total} doğrulanmış ortak sinyal bulundu.`, `${analysis.total} verified shared signals found.`) : t("Henüz eşleşen ortak sinyal bulunamadı.", "No matching shared signal was found yet.")}</p></div><div className="mutualism-overall"><Sparkles size={24}/><strong>%{analysis.scores.overall}</strong><span>{t("Genel uyum", "Overall compatibility")}</span></div></header>
    <section className="mutualism-explanation"><Lightbulb size={22}/><div><h2>{t("Neden bu skor?", "Why this score?")}</h2><p>{language === "tr" ? analysis.explanation : translateExplanation(analysis)}</p></div></section>
    <section className="mutualism-section"><div className="section-header compact"><h2><Network size={20}/>{t("Kategori bazlı uyum", "Compatibility by category")}</h2></div><div className="mutualism-score-grid">{scores.map(([key, label, value]) => <article key={key}><div><span>{label}</span><strong>%{value}</strong></div><span className="mutualism-score-track" aria-label={`${label}: ${value}%`}><span style={{ width: `${value}%` }}/></span></article>)}</div></section>
    <section className="mutualism-section"><div className="section-header compact"><h2><Tags size={20}/>{t(`${analysis.sameSentimentTags.length} ortak ilgi alanı`, `${analysis.sameSentimentTags.length} shared interests`)}</h2></div>{analysis.sameSentimentTags.length ? <div className="mutualism-tag-grid">{analysis.sameSentimentTags.map((interest) => <Link key={interest.tag.id} to={`/tags/${interest.tag.slug}`}><span>{interest.sentiment === "like" ? "♥" : interest.sentiment === "dislike" ? "↓" : "↕"}</span><strong>{interest.tag.name}</strong><small>{interest.sentiment === "like" ? t("İkiniz de beğeniyorsunuz", "You both like this") : interest.sentiment === "dislike" ? t("İkiniz de beğenmiyorsunuz", "You both dislike this") : t("İkiniz de nötrsünüz", "You are both neutral")}</small></Link>)}</div> : <p className="empty-state">{t("Aynı duyguyla ilişkilendirilmiş ortak etiket yok.", "There are no shared tags with the same sentiment.")}</p>}</section>
    {analysis.events.length ? <section className="mutualism-section"><div className="section-header compact"><h2><CalendarDays size={20}/>{t(`${analysis.events.length} ortak etkinlik`, `${analysis.events.length} shared events`)}</h2></div><div className="discovery-results">{analysis.events.map((item) => <DiscoveryCard hideSubtitle item={item} key={item.id}/>)}</div></section> : null}
    {analysis.places.length ? <section className="mutualism-section"><div className="section-header compact"><h2><MapPin size={20}/>{t(`${analysis.places.length} ortak mekân`, `${analysis.places.length} shared places`)}</h2></div><div className="discovery-results">{analysis.places.map((item) => <DiscoveryCard hideSubtitle item={item} key={item.id}/>)}</div></section> : null}
    {analysis.people.length ? <section className="mutualism-section"><div className="section-header compact"><h2><Users size={20}/>{t(`${analysis.people.length} ortak takip`, `${analysis.people.length} shared follows`)}</h2></div><div className="mutualism-people">{analysis.people.map((item) => <Link key={item.id} to={item.username ? `/users/${item.username}` : `/users/id/${item.id}`}>{item.avatarUrl ? <img alt="" src={resolveMediaUrl(item.avatarUrl)}/> : <span>{item.name.slice(0, 1).toUpperCase()}</span>}<strong>{item.username ? `@${item.username}` : item.name}</strong></Link>)}</div></section> : null}
    <section className="mutualism-section mutualism-signals"><h2>{t("Diğer ortak sinyaller", "Other shared signals")}</h2><div><article><strong>{analysis.sharedReactionCount}</strong><span>{t("ortak beğeni hedefi", "shared reaction targets")}</span></article><article><strong>{analysis.sharedCommentTargetCount}</strong><span>{t("ortak yorum başlığı", "shared comment targets")}</span></article>{analysis.hiddenCount ? <article><strong>{analysis.hiddenCount}</strong><span>{t("gizlilik nedeniyle saklı", "hidden by privacy")}</span></article> : null}</div></section>
    {analysis.actions.length ? <section className="mutualism-section mutualism-actions"><h2><Lightbulb size={20}/>{t("Önerilen sonraki adımlar", "Suggested next steps")}</h2><ul>{analysis.actions.map((action) => <li key={action}>{action}</li>)}</ul></section> : null}
    {person.relationship.canMessage ? <Link className="primary-action mutualism-message" to={`/messages?peer=${person.id}`}><Mail size={17}/>{t("Sohbet başlat", "Start a conversation")}</Link> : null}
  </section>;
}

function translateExplanation(analysis: NonNullable<Awaited<ReturnType<typeof getPublicProfile>>["mutualism"]>) {
  if (!analysis.total) return "No verified shared signal has been found yet. The analysis updates as new event and interest activity is recorded.";
  return `${analysis.total} verified shared signals were found. The compatibility score is calculated from shared interest sentiments, events, places, follows and content interactions.`;
}
