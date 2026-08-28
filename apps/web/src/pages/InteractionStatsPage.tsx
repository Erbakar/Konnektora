import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download, Lightbulb, TrendingUp, Users, WalletCards } from "lucide-react";
import { type CSSProperties, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getInteractionStats, getPublicProfileById, getTagStats } from "../lib/api";
import { useLanguage } from "../lib/i18n";

type Stats = Record<string, number>;

const labels: Record<string, string> = {
  accepted: "Katılım kararı", attended: "Check-in", requested: "Bekleyen talep", invited: "Davet",
  comments: "Post ve yorum", reactions: "Etkileşim", views: "Görüntülenme", shares: "Paylaşım", detailViews: "Detay görüntülenmesi",
  ticketsSold: "Satılan bilet", ticketOrders: "Bilet siparişi", ticketCapacity: "Bilet kapasitesi",
  ticketsRemaining: "Kalan bilet", ticketRevenue: "Brüt bilet geliri", refunds: "İade adedi", refundAmount: "İade tutarı",
  averageTicketPrice: "Ortalama bilet fiyatı", platformCommission: "Platform komisyonu", platformFees: "Platform komisyonu",
  organizerRevenue: "Organizatör geliri", rsvpRate: "RSVP dönüşümü", attendanceRate: "Katılım oranı",
  eventAttendanceRate: "Etkinlik katılım oranı", engagementRate: "Etkileşim oranı", ticketConversionRate: "Bilet dönüşümü",
  ticketOccupancyRate: "Bilet doluluk oranı", socialConnectionRate: "Sosyal bağlantı oranı", profileConversionRate: "Profil dönüşümü",
  performanceScore: "Performans puanı", opportunityScore: "Fırsat puanı", followers: "Takipçi", following: "Takip",
  members: "Üye", events: "Etkinlik", places: "Mekân", checkedIn: "Check-in", checkInRate: "Check-in oranı",
  likes: "Olumlu", ok: "Nötr", dislikes: "Olumsuz", posts: "Post", interests: "İlgi alanı", media: "Medya",
  profileViews: "Profil görüntülenmesi", profileViewsLast7d: "Son 7 gün profil görüntülenmesi",
  profileViewsLast30d: "Son 30 gün profil görüntülenmesi", profileViewsLast90d: "Son 90 gün profil görüntülenmesi",
  messages: "Gönderilen mesaj", averageEventsPerMonth: "Aylık ortalama etkinlik", memberScans: "Üye kartı taraması",
  interestLast24h: "Son 24 saatte yeni ilgi", interestLast7d: "Son 7 günde yeni ilgi",
  interestLast30d: "Son 30 günde yeni ilgi", interestLast12m: "Son 12 ayda yeni ilgi",
  viewsLast24h: "Son 24 saatte görüntülenme", viewsLast7d: "Son 7 günde görüntülenme", viewsLast30d: "Son 30 günde görüntülenme",
  eventAccepted: "Etkinlik katılım kararı", eventAttended: "Etkinlik check-in", upcomingEvents: "Yaklaşan etkinlik",
  eventAttendance: "Toplam etkinlik katılımı", averageEventAttendance: "Ortalama etkinlik katılımı",
  firstTimeVisitors: "İlk kez gelen ziyaretçi", repeatVisitors: "Tekrar gelen ziyaretçi", socialConnections: "Kurulan bağlantı",
  repeatVisitorRate: "Tekrar ziyaret oranı",
  averageConnectionsPerAttendee: "Katılımcı başına bağlantı", averageConnectionsPerVisitor: "Ziyaretçi başına bağlantı",
  uniqueVisitors: "Benzersiz ziyaretçi", freeTicketRate: "Ücretsiz bilet oranı", visitorsLast6m: "Son 6 ayda gelen ziyaretçi",
  visitorsLast12m: "Son 12 ayda gelen ziyaretçi", searchImpressions: "Arama gösterimi", searchClickRate: "Aramadan profile tıklama oranı",
  averageFollowDurationDays: "Ortalama takip süresi (gün)", ownedEventViews: "Etkinlik görüntülenmesi", ownedEventShares: "Etkinlik paylaşımı",
  popularityRank: "Popülerlik sırası", commentsLast24h: "Son 24 saatte yorum", commentsLast7d: "Son 7 günde yorum",
  commentsLast30d: "Son 30 günde yorum", commentsLast12m: "Son 12 ayda yorum", averageRsvpRate: "Ortalama RSVP oranı",
  averageEventsPerInterestedUser: "İlgilenen kişi başına etkinlik", averageConnectionsPerInterestedUser: "İlgilenen kişi başına bağlantı",
  averageMessagesPerInterestedUser: "İlgilenen kişi başına mesaj", ticketPurchaseRate: "Bilet satın alma oranı", invites: "Davet",
  websiteClicks: "Web sitesi tıklaması", locationViews: "Konum görüntülenmesi", followersLast7d: "Son 7 günde yeni takipçi",
  followersLast30d: "Son 30 günde yeni takipçi", followersLast90d: "Son 90 günde yeni takipçi",
};

const labelsEn: Record<string, string> = {
  accepted: "Participation decisions", attended: "Check-ins", requested: "Pending requests", invited: "Invitations",
  comments: "Posts and comments", reactions: "Engagements", views: "Views", shares: "Shares", detailViews: "Detail views",
  ticketsSold: "Tickets sold", ticketOrders: "Ticket orders", ticketCapacity: "Ticket capacity", ticketsRemaining: "Tickets remaining",
  ticketRevenue: "Gross ticket revenue", refunds: "Refunds", refundAmount: "Refund amount", averageTicketPrice: "Average ticket price",
  platformCommission: "Platform commission", platformFees: "Platform fees", organizerRevenue: "Organiser revenue",
  rsvpRate: "RSVP conversion", attendanceRate: "Attendance rate", eventAttendanceRate: "Event attendance rate", engagementRate: "Engagement rate",
  ticketConversionRate: "Ticket conversion", ticketOccupancyRate: "Ticket occupancy", socialConnectionRate: "Social connection rate",
  profileConversionRate: "Profile conversion", performanceScore: "Performance score", opportunityScore: "Opportunity score",
  followers: "Followers", following: "Following", members: "Members", events: "Events", places: "Places", checkedIn: "Checked in",
  checkInRate: "Check-in rate", likes: "Positive", ok: "Neutral", dislikes: "Negative", posts: "Posts", interests: "Interests", media: "Media",
  profileViews: "Profile views", profileViewsLast7d: "Profile views in 7 days", profileViewsLast30d: "Profile views in 30 days",
  profileViewsLast90d: "Profile views in 90 days", messages: "Messages sent", averageEventsPerMonth: "Average events per month", memberScans: "Member card scans",
  interestLast24h: "New interest in 24 hours", interestLast7d: "New interest in 7 days", interestLast30d: "New interest in 30 days",
  interestLast12m: "New interest in 12 months", viewsLast24h: "Views in 24 hours", viewsLast7d: "Views in 7 days", viewsLast30d: "Views in 30 days",
  eventAccepted: "Event participation decisions", eventAttended: "Event check-ins", upcomingEvents: "Upcoming events", eventAttendance: "Total event attendance",
  averageEventAttendance: "Average event attendance", firstTimeVisitors: "First-time visitors", repeatVisitors: "Repeat visitors",
  socialConnections: "Connections made", repeatVisitorRate: "Repeat visitor rate", averageConnectionsPerAttendee: "Connections per attendee",
  averageConnectionsPerVisitor: "Connections per visitor",
  uniqueVisitors: "Unique visitors", freeTicketRate: "Free ticket rate", visitorsLast6m: "Visitors in the last 6 months",
  visitorsLast12m: "Visitors in the last 12 months", searchImpressions: "Search impressions", searchClickRate: "Search-to-profile click rate",
  averageFollowDurationDays: "Average follow duration (days)", ownedEventViews: "Event views", ownedEventShares: "Event shares",
  popularityRank: "Popularity rank", commentsLast24h: "Comments in 24 hours", commentsLast7d: "Comments in 7 days",
  commentsLast30d: "Comments in 30 days", commentsLast12m: "Comments in 12 months", averageRsvpRate: "Average RSVP rate",
  averageEventsPerInterestedUser: "Events per interested member", averageConnectionsPerInterestedUser: "Connections per interested member",
  averageMessagesPerInterestedUser: "Messages per interested member", ticketPurchaseRate: "Ticket purchase rate", invites: "Invitations",
  websiteClicks: "Website clicks", locationViews: "Location views", followersLast7d: "New followers in 7 days",
  followersLast30d: "New followers in 30 days", followersLast90d: "New followers in 90 days",
};

const overviewKeys: Record<string, string[]> = {
  event: ["views", "shares", "accepted", "attended", "ticketsSold", "performanceScore"],
  place: ["views", "shares", "followers", "members", "checkedIn", "performanceScore"],
  tag: ["views", "shares", "followers", "events", "places", "opportunityScore"],
  user: ["profileViews", "shares", "followers", "events", "places", "profileConversionRate"],
};

const trendKeys = ["profileViewsLast7d", "profileViewsLast30d", "profileViewsLast90d", "followersLast7d", "followersLast30d", "followersLast90d", "interestLast24h", "interestLast7d", "interestLast30d", "interestLast12m", "viewsLast24h", "viewsLast7d", "viewsLast30d", "commentsLast24h", "commentsLast7d", "commentsLast30d", "commentsLast12m", "visitorsLast6m", "visitorsLast12m"];
const moneyKeys = ["ticketRevenue", "refundAmount", "averageTicketPrice", "platformCommission", "platformFees", "organizerRevenue"];
const conversionKeys = ["rsvpRate", "averageRsvpRate", "attendanceRate", "eventAttendanceRate", "engagementRate", "ticketConversionRate", "ticketOccupancyRate", "ticketPurchaseRate", "freeTicketRate", "checkInRate", "socialConnectionRate", "profileConversionRate", "searchClickRate", "repeatVisitorRate"];
const distributionPrefixes = ["age_", "gender_", "language_", "location_", "interest_", "city_", "country_", "relatedInterest_", "visitorCountry_", "visitorAge_", "visitorGender_", "visitorInterest_", "followerCountry_", "followerAge_", "followerGender_", "followerLanguage_", "followerInterest_", "day_", "hour_", "decision_", "source_", "shareChannel_", "ticketTypeSold_", "ticketTypeRevenue_", "ticketSaleDay_", "ticketSaleHour_", "ticketGroup_", "checkInHour_", "fullEvent_", "emptyEvent_", "organizerEvents_", "organizerAttendanceRate_", "topVisitor_"];

const distributionTitles: Record<string, string> = {
  age_: "Yaş dağılımı", gender_: "Cinsiyet dağılımı", location_: "Konum dağılımı", interest_: "İlgi alanları",
  city_: "Şehirler", country_: "Ülkeler", relatedInterest_: "İlişkili ilgi alanları", visitorCountry_: "Ziyaretçi ülkeleri",
  visitorAge_: "Ziyaretçi yaş dağılımı", visitorGender_: "Ziyaretçi cinsiyet dağılımı", visitorInterest_: "Ziyaretçi ilgi alanları",
  followerCountry_: "Takipçi ülkeleri", followerAge_: "Takipçi yaş dağılımı", followerGender_: "Takipçi cinsiyet dağılımı",
  followerInterest_: "Takipçi ilgi alanları", day_: "Günlere göre etkinlik", hour_: "Saat aralıkları", decision_: "Katılım kararı zamanı",
  source_: "Keşif kaynakları", shareChannel_: "Paylaşım kanalları",
  language_: "Dil dağılımı", followerLanguage_: "Takipçi dilleri", ticketTypeSold_: "Bilet türüne göre satış", ticketTypeRevenue_: "Bilet türüne göre gelir",
  ticketSaleDay_: "Bilet satış zaman çizgisi", ticketSaleHour_: "Satış saatleri", ticketGroup_: "Grup satışları", checkInHour_: "Check-in saatleri",
  fullEvent_: "En dolu etkinlikler", emptyEvent_: "En düşük doluluklu etkinlikler", organizerEvents_: "Organizatörlere göre etkinlik sayısı",
  organizerAttendanceRate_: "Organizatör katılım oranı", topVisitor_: "En sık gelen ziyaretçiler",
};

const distributionTitlesEn: Record<string, string> = {
  age_: "Age distribution", gender_: "Gender distribution", location_: "Location distribution", interest_: "Interests",
  city_: "Cities", country_: "Countries", relatedInterest_: "Related interests", visitorCountry_: "Visitor countries",
  visitorAge_: "Visitor age distribution", visitorGender_: "Visitor gender distribution", visitorInterest_: "Visitor interests",
  followerCountry_: "Follower countries", followerAge_: "Follower age distribution", followerGender_: "Follower gender distribution",
  followerInterest_: "Follower interests", day_: "Events by day", hour_: "Time ranges", decision_: "Participation decision time",
  source_: "Discovery sources", shareChannel_: "Share channels",
  language_: "Language distribution", followerLanguage_: "Follower languages", ticketTypeSold_: "Sales by ticket type", ticketTypeRevenue_: "Revenue by ticket type",
  ticketSaleDay_: "Ticket sales timeline", ticketSaleHour_: "Sales by time", ticketGroup_: "Group purchases", checkInHour_: "Check-in times",
  fullEvent_: "Highest occupancy events", emptyEvent_: "Lowest occupancy events", organizerEvents_: "Events by organiser",
  organizerAttendanceRate_: "Organiser attendance rate", topVisitor_: "Most frequent visitors",
};

function prettyKey(key: string, language: "tr" | "en") {
  const label = language === "tr" ? labels[key] : labelsEn[key];
  if (label) return label;
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toLocaleUpperCase(language === "tr" ? "tr-TR" : "en-US"));
}

function displayValue(key: string, value: number, language: "tr" | "en") {
  const locale = language === "tr" ? "tr-TR" : "en-GB";
  if (key.toLowerCase().includes("rate") || key.toLowerCase().includes("score")) return `${value.toLocaleString(locale)}%`;
  if (moneyKeys.includes(key) || key.toLowerCase().includes("revenue") || key.toLowerCase().includes("amount")) return `${value.toLocaleString(locale, { maximumFractionDigits: 2 })} TRY`;
  return value.toLocaleString(locale, { maximumFractionDigits: 1 });
}

function StatsSection({ title, description, icon, children }: { title: string; description?: string; icon: ReactNode; children: ReactNode }) {
  return <section className="stats-panel">
    <header><span className="stats-panel-icon">{icon}</span><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div></header>
    {children}
  </section>;
}

function MetricGrid({ entries }: { entries: Array<[string, number]> }) {
  const { language } = useLanguage();
  return <div className="stats-metric-grid">{entries.map(([key, value]) => <article key={key}>
    <span>{prettyKey(key, language)}</span><strong>{displayValue(key, value, language)}</strong>
  </article>)}</div>;
}

function BarList({ entries, prefix }: { entries: Array<[string, number]>; prefix?: string }) {
  const { language } = useLanguage();
  const locale = language === "tr" ? "tr-TR" : "en-GB";
  const maximum = Math.max(1, ...entries.map(([, value]) => value));
  return <div className="stats-bar-list">{entries.map(([key, value]) => {
    const rawLabel = prefix ? key.slice(prefix.length) : key;
    return <div key={key} className="stats-bar-row">
      <div><span>{prettyKey(rawLabel, language)}</span><strong>{prefix === "ticketTypeRevenue_" ? displayValue("ticketRevenue", value, language) : value.toLocaleString(locale)}</strong></div>
      <span className="stats-bar-track"><span style={{ "--bar-width": `${value / maximum * 100}%` } as CSSProperties}/></span>
    </div>;
  })}</div>;
}

function buildInsights(stats: Stats, targetType: string, language: "tr" | "en") {
  const insights: string[] = [];
  const scoreKey = targetType === "tag" ? "opportunityScore" : targetType === "user" ? "profileConversionRate" : "performanceScore";
  if (stats[scoreKey] !== undefined) {
    const score = stats[scoreKey];
    const metric = prettyKey(scoreKey, language);
    insights.push(language === "tr" ? (score >= 70 ? `Mevcut ${metric.toLocaleLowerCase("tr-TR")} güçlü (%${score}). Bu performansı oluşturan kanalları koruyun.` : score >= 40 ? `${metric} orta seviyede (%${score}). Dönüşüm zincirindeki en büyük kayba odaklanın.` : `${metric} geliştirmeye açık (%${score}). Görüntülenmeden katılıma geçişi güçlendirecek net çağrılar kullanın.`) : (score >= 70 ? `The current ${metric.toLowerCase()} is strong (${score}%). Maintain the channels driving this performance.` : score >= 40 ? `${metric} is moderate (${score}%). Focus on the largest loss in the conversion journey.` : `${metric} has room to improve (${score}%). Use clearer calls to action from views to participation.`));
  }
  const rates = conversionKeys.filter((key) => stats[key] !== undefined).map((key) => [key, stats[key] ?? 0] as const).sort((a, b) => a[1] - b[1]);
  if (rates[0]) insights.push(language === "tr" ? `En düşük dönüşüm metriği ${prettyKey(rates[0][0], language).toLocaleLowerCase("tr-TR")} (%${rates[0][1]}). İlk iyileştirme deneyi için en somut alan burası.` : `The lowest conversion metric is ${prettyKey(rates[0][0], language).toLowerCase()} (${rates[0][1]}%). This is the clearest area for the first improvement experiment.`);
  const interests = Object.entries(stats).filter(([key]) => key.startsWith("interest_") || key.startsWith("relatedInterest_") || key.startsWith("visitorInterest_") || key.startsWith("followerInterest_")).sort((a, b) => b[1] - a[1]);
  if (interests[0]) insights.push(language === "tr" ? `En baskın ilgi sinyali “${prettyKey(interests[0][0].split("_").slice(1).join("_"), language)}” (${interests[0][1]} kişi). İçerik ve davet hedeflemesinde bu segment önceliklendirilebilir.` : `The strongest interest signal is “${prettyKey(interests[0][0].split("_").slice(1).join("_"), language)}” (${interests[0][1]} people). Prioritise this segment for content and invitation targeting.`);
  return insights.length ? insights : [language === "tr" ? "Anlamlı bir öneri üretmek için henüz yeterli ölçüm bulunmuyor. Etkileşim oluştuğunda veri temelli öneriler burada görünecek." : "There is not enough data for a meaningful recommendation yet. Data-driven insights will appear as engagement grows."];
}

export function InteractionStatsPage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => (language === "tr" ? tr : en);
  const { targetType = "event", targetId = "" } = useParams();
  const navigate = useNavigate();
  const stats = useQuery({
    queryKey: ["interaction-stats-page", targetType, targetId],
    queryFn: async () => {
      if (targetType === "tag") return getTagStats(targetId);
      if (targetType === "user") return (await getPublicProfileById(targetId)).stats ?? {};
      if (targetType === "event" || targetType === "place") return getInteractionStats(targetType, targetId);
      throw new Error("Desteklenmeyen istatistik türü.");
    },
    enabled: Boolean(targetId),
  });
  const title = targetType === "event" ? t("Etkinlik", "Event") : targetType === "place" ? t("Mekân", "Place") : targetType === "tag" ? t("İlgi alanı", "Interest") : t("Profil", "Profile");
  const data = stats.data ?? {};
  const overview = (overviewKeys[targetType] ?? []).filter((key) => data[key] !== undefined).map((key) => [key, data[key]] as [string, number]);
  const trends = trendKeys.filter((key) => data[key] !== undefined).map((key) => [key, data[key]] as [string, number]);
  const money = moneyKeys.filter((key) => data[key] !== undefined).map((key) => [key, data[key]] as [string, number]);
  const conversions = conversionKeys.filter((key) => data[key] !== undefined).map((key) => [key, data[key]] as [string, number]);
  const funnelKeys = targetType === "event" ? ["views", "detailViews", "invited", "accepted", "ticketsSold", "attended", "socialConnections"] : targetType === "place" ? ["views", "detailViews", "invites", "members", "checkedIn", "socialConnections"] : targetType === "tag" ? ["views", "followers", "accepted", "attended"] : ["searchImpressions", "profileViews", "followers", "eventAccepted", "eventAttended"];
  const funnel = funnelKeys.filter((key) => data[key] !== undefined).map((key) => [key, data[key]] as [string, number]);
  const distributions = distributionPrefixes.map((prefix) => ({ prefix, entries: Object.entries(data).filter(([key]) => key.startsWith(prefix)).sort((a, b) => b[1] - a[1]) })).filter((group) => group.entries.length);
  const used = new Set([...overview, ...trends, ...money, ...conversions, ...funnel].map(([key]) => key));
  for (const group of distributions) for (const [key] of group.entries) used.add(key);
  const remaining = Object.entries(data).filter(([key]) => !used.has(key));
  const insights = buildInsights(data, targetType, language);

  return <section className="page interaction-stats-page">
    <header className="section-header stats-page-header"><div><p className="eyebrow">{t("Analiz merkezi", "Analytics centre")}</p><h1>{title} {t("istatistikleri", "analytics")}</h1><p>{t("Topluluk, erişim, dönüşüm ve gelir metriklerinin güncel görünümü.", "A current view of community, reach, conversion and revenue metrics.")}</p></div><div className="stats-header-actions"><button className="secondary-action" onClick={() => window.print()} type="button"><Download size={17}/> {t("PDF indir", "Download PDF")}</button><button className="secondary-action" onClick={() => navigate(-1)} type="button">{t("Geri dön", "Go back")}</button></div></header>
    {stats.isLoading ? <p className="empty-state">{t("İstatistikler hazırlanıyor…", "Preparing analytics…")}</p> : null}
    {stats.isError ? <p className="form-error">{t("Bu istatistikleri görüntüleme yetkiniz olmayabilir veya veriler yüklenemedi.", "You may not have permission to view these analytics, or the data could not be loaded.")}</p> : null}
    {stats.data ? <>
      <StatsSection title={t("Genel bakış", "Overview")} description={t("En önemli performans göstergeleri", "The most important performance indicators")} icon={<BarChart3 size={21}/>}><MetricGrid entries={overview}/></StatsSection>
      {funnel.length > 1 ? <StatsSection title={t("Dönüşüm hunisi", "Conversion funnel")} description={t("İlk temastan gerçek katılıma kadar kullanıcı akışı", "The user journey from first contact to real participation")} icon={<TrendingUp size={21}/>}><BarList entries={funnel}/></StatsSection> : null}
      {conversions.length ? <StatsSection title={t("Dönüşüm ve etkileşim", "Conversion and engagement")} icon={<TrendingUp size={21}/>}><MetricGrid entries={conversions}/></StatsSection> : null}
      {trends.length ? <StatsSection title={t("Zaman içindeki eğilim", "Trends over time")} description={t("Yakın dönem ilgi ve görüntülenme hareketi", "Recent interest and view activity")} icon={<TrendingUp size={21}/>}><BarList entries={trends}/></StatsSection> : null}
      {money.length ? <StatsSection title={t("Bilet ve gelir", "Tickets and revenue")} description={t("Satış, komisyon, organizatör geliri ve iade özeti", "Sales, commission, organiser revenue and refund summary")} icon={<WalletCards size={21}/>}><MetricGrid entries={money}/></StatsSection> : null}
      {distributions.length ? <div className="stats-distribution-grid">{distributions.map((group) => <StatsSection key={group.prefix} title={(language === "tr" ? distributionTitles : distributionTitlesEn)[group.prefix] ?? prettyKey(group.prefix, language)} icon={<Users size={20}/>}><BarList entries={group.entries} prefix={group.prefix}/></StatsSection>)}</div> : null}
      {remaining.length ? <StatsSection title={t("Diğer ölçümler", "Other metrics")} icon={<BarChart3 size={20}/>}><MetricGrid entries={remaining}/></StatsSection> : null}
      <StatsSection title={t("Veriye dayalı içgörüler", "Data-driven insights")} description={t("Aşağıdaki öneriler yalnızca bu sayfadaki ölçümlerden türetilir.", "The recommendations below are derived only from the metrics on this page.")} icon={<Lightbulb size={21}/>}><div className="stats-insights">{insights.map((insight) => <p key={insight}>{insight}</p>)}</div></StatsSection>
      <aside className="stats-unmeasured"><strong>{t("Ölçüm kapsamı", "Measurement scope")}</strong><p>{t("Konnektora içindeki liste ve arama gösterimleri, detay görüntülemeleri ve paylaşım kanalları gerçek etkileşimlerden kaydedilir. Harici arama motorlarının gösterim sayısı ve cihazlar arası kullanıcı eşleştirmesi tutulmadığı için bu alanlarda tahmini veya örnek rakam gösterilmez.", "Listing and search impressions, detail views and share channels inside Konnektora are recorded from real interactions. External search-engine impression counts and cross-device identity matching are not stored, so no estimated or sample figures are shown for those areas.")}</p></aside>
    </> : null}
  </section>;
}
