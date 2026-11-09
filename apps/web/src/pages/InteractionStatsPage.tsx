import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, Lightbulb, ListOrdered, Radar, Share2, Ticket, TrendingUp, Users, WalletCards } from "lucide-react";
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getInteractionStats, getPublicProfileById, getTagStats, listTags, getPlaceAnalyticsReferences } from "../lib/api";
import { analyticsSeries } from "../lib/analyticsSeries";
import { useLanguage } from "../lib/i18n";
import { ChartPanel, DensityHeatmap, FunnelChart, PeriodRankedList, PeriodTotalsChart, PieWithLegend, SegmentTabs, SourceDonut, TitleSelect, sentimentColors } from "../components/StatsCharts";

type Stats = Record<string, number>;
type EntityRef = { name: string; to: string; metricKey?: string; kind: "tag" | "event" | "place" | "user" };
const StatsLinks = createContext<EntityRef[]>([]);
const metricName = (value: string) => value.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
function LinkedMetric({ label, prefix, metricKey }: { label: string; prefix?: string; metricKey: string }) {
  const refs = useContext(StatsLinks);
  const kind = prefix?.toLowerCase().includes("interest") ? "tag" : prefix === "fullEvent_" || prefix === "emptyEvent_" ? "event" : undefined;
  const matches = refs.filter(ref => ref.metricKey ? ref.metricKey === metricKey : kind && ref.kind === kind && metricName(ref.name) === metricName(label));
  const reference = new Set(matches.map(ref => ref.to)).size === 1 ? matches[0] : undefined;
  if (reference) return <Link to={reference.to}>{reference.name}</Link>;
  return <>{label}</>;
}
function LinkedInsight({ text }: { text: string }) {
  const refs = useContext(StatsLinks);
  const parts = text.split(/(“[^”]+”)/g);
  return <>{parts.map((part, index) => {
    const label = part.startsWith("“") ? part.slice(1, -1) : "";
    const matches = label ? refs.filter(ref => metricName(ref.name) === metricName(label)) : [];
    const reference = new Set(matches.map(ref => ref.to)).size === 1 ? matches[0] : undefined;
    return reference ? <Link key={index} to={reference.to}>“{reference.name}”</Link> : part;
  })}</>;
}


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
  likes: "Beğenen", ok: "Kararsız", dislikes: "Beğenmeyen", posts: "Post", interests: "İlgi alanı", media: "Medya",
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
  viewsLast12m: "Son 12 ayda görüntülenme", averageCancellationRate: "Ortalama iptal oranı", cancellationRate: "İptal oranı",
  eventCancellationRate: "Etkinlik iptal oranı", eventOccupancyRate: "Etkinlik doluluk oranı", averageEventRating: "Ortalama etkinlik puanı",
  averageRating: "Ortalama puan", ratingCount: "Değerlendirme adedi", ownedEvents: "Yönetilen etkinlik", eventDeclined: "İptal edilen katılım",
  taxAmount: "Vergi", totalConnections: "Toplam bağlantı", averageAppMinutesPerInterestedUser: "İlgilenen kişi başına uygulama süresi (30 gün, dakika)",
  likeLast24h: "Olumlu · son 24 saat", likeLast7d: "Olumlu · son 7 gün", likeLast30d: "Olumlu · son 30 gün", likeLast12m: "Olumlu · son 12 ay",
  okLast24h: "Kararsız · son 24 saat", okLast7d: "Kararsız · son 7 gün", okLast30d: "Kararsız · son 30 gün", okLast12m: "Kararsız · son 12 ay",
  dislikeLast24h: "Olumsuz · son 24 saat", dislikeLast7d: "Olumsuz · son 7 gün", dislikeLast30d: "Olumsuz · son 30 gün", dislikeLast12m: "Olumsuz · son 12 ay",
  pastEvents: "Geçmiş etkinlik", averageTicketPriceUsd: "Ortalama bilet fiyatı (USD)",
  profileExchanges: "QR/NFC profil takası", profileExchangers: "Profil takası yapan kişi", profileExchangeRate: "Profil takası yapanların oranı", profileExchangesPerPerson: "Kişi başına profil takası",
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
  viewsLast12m: "Views in 12 months", averageCancellationRate: "Average cancellation rate", cancellationRate: "Cancellation rate",
  eventCancellationRate: "Event cancellation rate", eventOccupancyRate: "Event occupancy", averageEventRating: "Average event rating",
  averageRating: "Average rating", ratingCount: "Ratings", ownedEvents: "Managed events", eventDeclined: "Cancelled participation",
  taxAmount: "Tax", totalConnections: "Total connections", averageAppMinutesPerInterestedUser: "App time per interested member (30 days, minutes)",
  likeLast24h: "Positive · 24 hours", likeLast7d: "Positive · 7 days", likeLast30d: "Positive · 30 days", likeLast12m: "Positive · 12 months",
  okLast24h: "Neutral · 24 hours", okLast7d: "Neutral · 7 days", okLast30d: "Neutral · 30 days", okLast12m: "Neutral · 12 months",
  dislikeLast24h: "Negative · 24 hours", dislikeLast7d: "Negative · 7 days", dislikeLast30d: "Negative · 30 days", dislikeLast12m: "Negative · 12 months",
  pastEvents: "Past events", averageTicketPriceUsd: "Average ticket price (USD)",
  profileExchanges: "QR/NFC profile exchanges", profileExchangers: "People who exchanged profiles", profileExchangeRate: "Profile exchange rate", profileExchangesPerPerson: "Profile exchanges per person",
};

const overviewKeys: Record<string, string[]> = {
  event: ["views", "shares", "accepted", "attended", "ticketsSold", "performanceScore"],
  place: ["views", "shares", "followers", "members", "checkedIn", "performanceScore"],
  tag: ["views", "shares", "followers", "events", "places", "opportunityScore"],
  user: ["profileViews", "shares", "followers", "events", "places", "profileConversionRate"],
};

const trendKeys = ["profileViewsLast7d", "profileViewsLast30d", "profileViewsLast90d", "followersLast7d", "followersLast30d", "followersLast90d", "interestLast24h", "interestLast7d", "interestLast30d", "interestLast12m", "likeLast24h", "likeLast7d", "likeLast30d", "likeLast12m", "okLast24h", "okLast7d", "okLast30d", "okLast12m", "dislikeLast24h", "dislikeLast7d", "dislikeLast30d", "dislikeLast12m", "viewsLast24h", "viewsLast7d", "viewsLast30d", "viewsLast12m", "commentsLast24h", "commentsLast7d", "commentsLast30d", "commentsLast12m", "visitorsLast6m", "visitorsLast12m"];
const moneyKeys = ["ticketRevenue", "refundAmount", "averageTicketPrice", "platformCommission", "platformFees", "organizerRevenue"];
const conversionKeys = ["rsvpRate", "averageRsvpRate", "attendanceRate", "eventAttendanceRate", "engagementRate", "ticketConversionRate", "ticketOccupancyRate", "ticketPurchaseRate", "freeTicketRate", "checkInRate", "socialConnectionRate", "profileConversionRate", "searchClickRate", "repeatVisitorRate", "cancellationRate", "averageCancellationRate", "eventCancellationRate", "eventOccupancyRate"];
const distributionPrefixes = ["age_", "gender_", "language_", "location_", "interest_", "city_", "country_", "relatedInterest_", "viewerCountry_", "visitorCountry_", "visitorAge_", "visitorGender_", "visitorInterest_", "followerCountry_", "followerCity_", "followerAge_", "followerGender_", "followerLanguage_", "followerInterest_", "networkCity_", "networkCountry_", "likeAge_", "likeGender_", "likeCity_", "likeCountry_", "likeLanguage_", "likeRelatedInterest_", "okAge_", "okGender_", "okCity_", "okCountry_", "okLanguage_", "okRelatedInterest_", "dislikeAge_", "dislikeGender_", "dislikeCity_", "dislikeCountry_", "dislikeLanguage_", "dislikeRelatedInterest_", "day_", "hour_", "decision_", "source_", "shareChannel_", "ticketTypeSold_", "ticketTypeRevenue_", "ticketSaleDay_", "ticketSaleHour_", "ticketGroup_", "checkInHour_", "monthlyOccupancyRate_", "monthlyOccupancyPeople_", "fullEvent_", "emptyEvent_", "organizerEvents_", "organizerAttendanceRate_", "topVisitor_"];

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
  viewerCountry_: "Görüntüleyenlerin ülkeleri", followerCity_: "Takipçi şehirleri", networkCity_: "Bağlantı şehirleri", networkCountry_: "Bağlantı ülkeleri",
  likeAge_: "Olumlu · yaş", likeGender_: "Olumlu · cinsiyet", likeCity_: "Olumlu · şehir", likeCountry_: "Olumlu · ülke", likeLanguage_: "Olumlu · dil", likeRelatedInterest_: "Olumlu · ilişkili ilgi alanları",
  okAge_: "Nötr · yaş", okGender_: "Nötr · cinsiyet", okCity_: "Nötr · şehir", okCountry_: "Nötr · ülke", okLanguage_: "Nötr · dil", okRelatedInterest_: "Nötr · ilişkili ilgi alanları",
  dislikeAge_: "Olumsuz · yaş", dislikeGender_: "Olumsuz · cinsiyet", dislikeCity_: "Olumsuz · şehir", dislikeCountry_: "Olumsuz · ülke", dislikeLanguage_: "Olumsuz · dil", dislikeRelatedInterest_: "Olumsuz · ilişkili ilgi alanları",
  monthlyOccupancyRate_: "Aylara göre doluluk oranı", monthlyOccupancyPeople_: "Aylara göre biletli ziyaretçi",
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
  viewerCountry_: "Viewer countries", followerCity_: "Follower cities", networkCity_: "Connection cities", networkCountry_: "Connection countries",
  likeAge_: "Positive · age", likeGender_: "Positive · gender", likeCity_: "Positive · city", likeCountry_: "Positive · country", likeLanguage_: "Positive · language", likeRelatedInterest_: "Positive · related interests",
  okAge_: "Neutral · age", okGender_: "Neutral · gender", okCity_: "Neutral · city", okCountry_: "Neutral · country", okLanguage_: "Neutral · language", okRelatedInterest_: "Neutral · related interests",
  dislikeAge_: "Negative · age", dislikeGender_: "Negative · gender", dislikeCity_: "Negative · city", dislikeCountry_: "Negative · country", dislikeLanguage_: "Negative · language", dislikeRelatedInterest_: "Negative · related interests",
  monthlyOccupancyRate_: "Monthly occupancy rate", monthlyOccupancyPeople_: "Ticketed visitors by month",
};

function prettyKey(key: string, language: "tr" | "en") {
  const label = language === "tr" ? labels[key] : labelsEn[key];
  if (label) return label;
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toLocaleUpperCase(language === "tr" ? "tr-TR" : "en-US"));
}

function displayValue(key: string, value: number, language: "tr" | "en") {
  const locale = language === "tr" ? "tr-TR" : "en-GB";
  if (key === "averageTicketPriceUsd") return `$${value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
      <div><span><LinkedMetric label={prettyKey(rawLabel, language)} prefix={prefix} metricKey={key}/></span><strong>{prefix === "ticketTypeRevenue_" ? displayValue("ticketRevenue", value, language) : prefix?.toLowerCase().includes("rate") ? `${value.toLocaleString(locale)}%` : value.toLocaleString(locale)}</strong></div>
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

type Sentiment = "like" | "ok" | "dislike";
type Dimension = "age" | "gender" | "city" | "country" | "language";

/** Bir önekle başlayan anahtarları [ek, değer] olarak, büyükten küçüğe döndürür. */
function grouped(data: Stats, prefix: string): Array<[string, number]> {
  return Object.entries(data).filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key.slice(prefix.length), value] as [string, number]).sort((a, b) => b[1] - a[1]);
}

/** Pasta/halka grafiklerinde ilk 9 dilim + "Diğer". */
function sliceEntries(rows: Array<[string, number]>, prefix: string, language: "tr" | "en", limit = 9) {
  const top = rows.slice(0, limit);
  const rest = rows.slice(limit).reduce((sum, [, value]) => sum + value, 0);
  const entries = top.map(([key, value]) => ({ key, value, text: prettyKey(key, language), label: <LinkedMetric label={prettyKey(key, language)} metricKey={`${prefix}${key}`} prefix={prefix}/> }));
  if (rest > 0) entries.push({ key: "__other", value: rest, text: language === "tr" ? "Diğer" : "Other", label: <>{language === "tr" ? "Diğer" : "Other"}</> });
  return entries;
}

const dimensionLabels: Record<Dimension, [string, string]> = { age: ["Yaş dağılımı", "Age distribution"], gender: ["Cinsiyet dağılımı", "Gender distribution"], city: ["Şehir dağılımı", "City distribution"], country: ["Ülke dağılımı", "Country distribution"], language: ["Dil dağılımı", "Language distribution"] };
const dimensionLegend: Record<Dimension, [string, string]> = { age: ["Yaş grupları", "Age groups"], gender: ["Cinsiyet", "Gender"], city: ["Şehirler", "Cities"], country: ["Ülkeler", "Countries"], language: ["Diller", "Languages"] };

/** #67, #71, #78, #87: başlığı açılır menü olan demografi pastası; etikette Beğenenler/Kararsız/Beğenmeyenler sekmeleri. */
function DemographicsPanel({ data, targetType }: { data: Stats; targetType: string }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const [sentiment, setSentiment] = useState<Sentiment>("like");
  const [audience, setAudience] = useState<"follower" | "visitor">("follower");
  const prefixFor = (dimension: Dimension): string => {
    if (targetType === "tag") return `${sentiment}${dimension[0]!.toUpperCase()}${dimension.slice(1)}_`;
    if (targetType === "user") return `${audience}${dimension[0]!.toUpperCase()}${dimension.slice(1)}_`;
    return dimension === "country" ? "location_" : `${dimension}_`;
  };
  const candidates: Dimension[] = targetType === "tag" ? ["age", "gender", "city", "country", "language"] : ["age", "gender", "country", "language"];
  const available = candidates.filter((dimension) => targetType === "tag" ? (["like", "ok", "dislike"] as const).some((item) => Object.keys(data).some((key) => key.startsWith(`${item}${dimension[0]!.toUpperCase()}${dimension.slice(1)}_`))) : targetType === "user" ? (["follower", "visitor"] as const).some((item) => Object.keys(data).some((key) => key.startsWith(`${item}${dimension[0]!.toUpperCase()}${dimension.slice(1)}_`))) : Object.keys(data).some((key) => key.startsWith(prefixFor(dimension))));
  const [dimension, setDimension] = useState<Dimension>(available[0] ?? "age");
  if (!available.length) return null;
  const active = available.includes(dimension) ? dimension : available[0]!;
  const prefix = prefixFor(active);
  const hasVisitors = targetType === "user" && Object.keys(data).some((key) => key.startsWith("visitorAge_") || key.startsWith("visitorGender_") || key.startsWith("visitorCountry_"));
  return <ChartPanel actions={null} className="stats-demographics" title={<TitleSelect label={t("Dağılım türü", "Distribution type")} onChange={setDimension} options={available.map((value) => ({ value, label: t(...dimensionLabels[value]) }))} value={active}/>}>
    {targetType === "tag" ? <SegmentTabs label={t("Duygu", "Sentiment")} onChange={setSentiment} options={[{ value: "like", label: t("Beğenenler", "Likes"), tone: "like" }, { value: "ok", label: t("Kararsız", "Undecided"), tone: "ok" }, { value: "dislike", label: t("Beğenmeyenler", "Dislikes"), tone: "dislike" }]} value={sentiment}/> : null}
    {hasVisitors ? <SegmentTabs label={t("Kitle", "Audience")} onChange={setAudience} options={[{ value: "follower", label: t("Takipçiler", "Followers") }, { value: "visitor", label: t("Ziyaretçiler", "Visitors") }]} value={audience}/> : null}
    <PieWithLegend entries={sliceEntries(grouped(data, prefix), prefix, language)} label={t(...dimensionLabels[active])} legendTitle={t(...dimensionLegend[active])} unit={t("kullanıcı", "users")}/>
  </ChartPanel>;
}

/** Halka grafik paneli; birden fazla kaynak varsa başlık açılır menüdür. */
function SourcesPanel({ data, groups, description }: { data: Stats; groups: Array<{ prefix: string; title: [string, string]; center: [string, string] }>; description?: [string, string] }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const available = groups.filter((group) => grouped(data, group.prefix).length);
  const [selected, setSelected] = useState(available[0]?.prefix ?? "");
  if (!available.length) return null;
  const active = available.find((group) => group.prefix === selected) ?? available[0]!;
  return <ChartPanel description={description ? t(...description) : undefined} title={available.length > 1 ? <TitleSelect label={t("Grafik", "Chart")} onChange={setSelected} options={available.map((group) => ({ value: group.prefix, label: t(...group.title) }))} value={active.prefix}/> : t(...active.title)}>
    <SourceDonut centerLabel={t(...active.center)} entries={sliceEntries(grouped(data, active.prefix), active.prefix, language, 7)} label={t(...active.title)}/>
  </ChartPanel>;
}

const interestPeriodOptions = (t: (tr: string, en: string) => string) => [{ key: "7d", label: t("Son 1 hafta", "Last week") }, { key: "30d", label: t("Son 1 ay", "Last month") }, { key: "90d", label: t("Son 3 ay", "Last 3 months") }, { key: "180d", label: t("Son 6 ay", "Last 6 months") }];

/** #89–#91: başlığı açılır menü (kitle) olan, dönem filtreli ilgi alanları tablosu. */
function AudienceInterestsPanel({ data, audiences }: { data: Stats; audiences: Array<{ prefix: string; label: [string, string] }> }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const [selected, setSelected] = useState(audiences[0]!.prefix);
  const periods = interestPeriodOptions(t);
  const active = audiences.find((item) => item.prefix === selected) ?? audiences[0]!;
  if (!audiences.some((item) => periods.some((period) => grouped(data, `${item.prefix}${period.key}_`).length))) return null;
  return <ChartPanel description={t("Seçili kitlenin bu dönemde profiline en çok yapıştırdığı ilgi alanları", "Interests the selected audience added to their profiles most in this period")} title={<TitleSelect label={t("Kitle", "Audience")} onChange={setSelected} options={audiences.map((item) => ({ value: item.prefix, label: t(...item.label) }))} value={active.prefix}/>}>
    <PeriodRankedList groups={Object.fromEntries(periods.map((period) => [period.key, grouped(data, `${active.prefix}${period.key}_`)]))} key={active.prefix} periods={periods} renderLabel={(key) => <LinkedMetric label={prettyKey(key, language)} metricKey={`${active.prefix}_${key}`} prefix={`${active.prefix}_`}/>}/>
  </ChartPanel>;
}

/** #93: Beğeni / Kararsız / Beğenmeme sekmeli "Ekleyenlerin ortak ilgi alanları". */
function CommonInterestsPanel({ data }: { data: Stats }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const [sentiment, setSentiment] = useState<Sentiment>("like");
  if (!(["like", "ok", "dislike"] as const).some((item) => grouped(data, `${item}RelatedInterest_`).length)) return null;
  const prefix = `${sentiment}RelatedInterest_`;
  return <ChartPanel title={t("Ekleyenlerin ortak ilgi alanları", "Common interests of people who added it")}>
    <SegmentTabs label={t("Duygu", "Sentiment")} onChange={setSentiment} options={[{ value: "like", label: t("Beğeni", "Like"), tone: "like" }, { value: "ok", label: t("Kararsız", "Undecided"), tone: "ok" }, { value: "dislike", label: t("Beğenmeme", "Dislike"), tone: "dislike" }]} value={sentiment}/>
    {grouped(data, prefix).length ? <BarList entries={grouped(data, prefix).map(([key, value]) => [`${prefix}${key}`, value])} prefix={prefix}/> : <p className="stats-empty">{t("Bu sekmede veri yok.", "No data in this tab.")}</p>}
  </ChartPanel>;
}

/** #75: Bilet adı · satılan · doluluk · gelir. */
function TicketTypeTable({ data }: { data: Stats }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const names = [...new Set([...grouped(data, "ticketTypeSold_"), ...grouped(data, "ticketTypeOccupancy_"), ...grouped(data, "ticketTypeRevenue_")].map(([key]) => key))];
  if (!names.length) return null;
  const rows = names.map((name) => ({ name, sold: data[`ticketTypeSold_${name}`] ?? 0, occupancy: data[`ticketTypeOccupancy_${name}`], revenue: data[`ticketTypeRevenue_${name}`] ?? 0 })).sort((a, b) => b.sold - a.sold);
  return <ChartPanel title={t("Satılan bilet türü", "Tickets sold by type")}>
    <div className="stats-table-wrap"><table className="stats-table"><thead><tr><th>{t("Bilet adı", "Ticket")}</th><th>{t("Satılan", "Sold")}</th><th>{t("Doluluk", "Occupancy")}</th><th>{t("Toplam gelir", "Revenue")}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name}><td>{prettyKey(row.name, language)}</td><td>{row.sold.toLocaleString(language === "tr" ? "tr-TR" : "en-GB")}</td><td>{row.occupancy === undefined ? "—" : `%${row.occupancy}`}</td><td>{displayValue("ticketRevenue", row.revenue, language)}</td></tr>)}</tbody></table></div>
  </ChartPanel>;
}

function safeBackPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export function InteractionStatsPage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => (language === "tr" ? tr : en);
  const { targetType = "event", targetId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [analyticsRequest] = useState(() => crypto.randomUUID());
  const stats = useQuery({
    queryKey: ["interaction-stats-page", targetType, targetId],
    queryFn: async () => {
      if (targetType === "tag") return getTagStats(targetId);
      if (targetType === "user") return (await getPublicProfileById(targetId, analyticsRequest)).stats ?? {};
      if (targetType === "event" || targetType === "place") return getInteractionStats(targetType, targetId);
      throw new Error("Desteklenmeyen istatistik türü.");
    },
    enabled: Boolean(targetId),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const references = useQuery({
    queryKey: ["stats-entity-references", targetType, targetId],
    enabled: Boolean(stats.data && (targetType === "place" || Object.keys(stats.data).some(key => /interest_|Interest_|Interest\d/.test(key)))),
    queryFn: async () => {
      if (targetType === "place") return getPlaceAnalyticsReferences(targetId);
      const data = stats.data ?? {};
      const refs: EntityRef[] = [];
      if (Object.keys(data).some(key => /interest_|Interest_|Interest\d/.test(key))) {
        const tags = await listTags();
        refs.push(...tags.map(tag => ({ name: tag.name, to: `/tags/${tag.slug}`, kind: "tag" as const })));
      }
      return refs;
    },
  });
  const title = targetType === "event" ? t("Etkinlik", "Event") : targetType === "place" ? t("Mekân", "Place") : targetType === "tag" ? t("İlgi alanı", "Interest") : t("Profil", "Profile");
  // 07/11 #96: "Geri dön" yerine "%ad% etiketine/mekânına/etkinliğine geri dön".
  const targetName = searchParams.get("name")?.trim().slice(0, 160) || "";
  const backPath = safeBackPath(searchParams.get("back"));
  const backLabel = targetName && targetType !== "user" ? targetType === "tag" ? t(`${targetName} etiketine geri dön`, `Back to the ${targetName} tag`) : targetType === "place" ? t(`${targetName} mekânına geri dön`, `Back to the ${targetName} place`) : t(`${targetName} etkinliğine geri dön`, `Back to the ${targetName} event`) : t("Geri dön", "Go back");
  const data = stats.data ?? {};
  const periodLabels = { "24h": t("24 Saat", "24 hours"), "7d": t("7 Gün", "7 days"), "30d": t("30 Gün", "30 days"), "90d": t("90 Gün", "90 days"), "12m": t("12 Ay", "12 months") };
  const overview = (overviewKeys[targetType] ?? []).filter((key) => data[key] !== undefined).map((key) => [key, data[key]] as [string, number]);
  const money = moneyKeys.filter((key) => data[key] !== undefined).map((key) => [key, data[key]] as [string, number]);
  const conversions = conversionKeys.filter((key) => data[key] !== undefined).map((key) => [key, data[key]] as [string, number]);
  const funnelKeys = targetType === "event" ? ["views", "detailViews", "invited", "accepted", "ticketsSold", "attended", "socialConnections"] : targetType === "place" ? ["views", "detailViews", "invites", "members", "checkedIn", "socialConnections"] : targetType === "tag" ? ["views", "followers", "accepted", "attended"] : ["searchImpressions", "profileViews", "followers", "eventAccepted", "eventAttended"];
  const funnel = funnelKeys.filter((key) => data[key] !== undefined).map((key) => [key, data[key]] as [string, number]);
  // 07/11 #66, #80, #85: dönem toplamları çizgi grafiği.
  const periodSeries = targetType === "tag"
    ? [{ key: "like", label: t("Beğenenler", "Likes"), color: sentimentColors.like, values: { "24h": data.likeLast24h, "7d": data.likeLast7d, "30d": data.likeLast30d, "12m": data.likeLast12m } }, { key: "ok", label: t("Kararsız", "Undecided"), color: sentimentColors.ok, values: { "24h": data.okLast24h, "7d": data.okLast7d, "30d": data.okLast30d, "12m": data.okLast12m } }, { key: "dislike", label: t("Beğenmeyenler", "Dislikes"), color: sentimentColors.dislike, values: { "24h": data.dislikeLast24h, "7d": data.dislikeLast7d, "30d": data.dislikeLast30d, "12m": data.dislikeLast12m } }]
    : targetType === "user"
      ? [{ key: "views", label: t("Profil görüntülenme sayısı", "Profile views"), color: "#3b82f6", values: { "7d": data.profileViewsLast7d, "30d": data.profileViewsLast30d, "90d": data.profileViewsLast90d } }, { key: "followers", label: t("Profil takipçi sayısı", "New followers"), color: "#22c55e", values: { "7d": data.followersLast7d, "30d": data.followersLast30d, "90d": data.followersLast90d } }]
      : targetType === "place"
        ? [{ key: "views", label: t("Görüntülenme", "Views"), color: "#3b82f6", values: { "24h": data.viewsLast24h, "7d": data.viewsLast7d, "30d": data.viewsLast30d, "12m": data.viewsLast12m } }, { key: "comments", label: t("Post ve yorum", "Posts and comments"), color: "#8b5cf6", values: { "24h": data.commentsLast24h, "7d": data.commentsLast7d, "30d": data.commentsLast30d, "12m": data.commentsLast12m } }]
        : [];
  const periodKeys = (targetType === "user" ? ["7d", "30d", "90d"] : ["24h", "7d", "30d", "12m"]) as Array<keyof typeof periodLabels>;
  const chartedSeries = periodSeries.filter((item) => Object.values(item.values).some((value) => value !== undefined));
  const chartedKeys = new Set(chartedSeries.length ? (targetType === "tag" ? ["like", "ok", "dislike"].flatMap((name) => ["24h", "7d", "30d", "12m"].map((period) => `${name}Last${period}`)) : targetType === "user" ? ["profileViews", "followers"].flatMap((name) => ["7d", "30d", "90d"].map((period) => `${name}Last${period}`)) : ["views", "comments"].flatMap((name) => ["24h", "7d", "30d", "12m"].map((period) => `${name}Last${period}`))) : []);
  const sourceGroups = targetType === "event"
    ? [{ prefix: "decision_", title: ["Katılım kararı zamanı", "Participation decision time"] as [string, string], center: ["Karar", "Decisions"] as [string, string] }, { prefix: "source_", title: ["Keşif kaynakları", "Discovery sources"] as [string, string], center: ["Keşif", "Discovery"] as [string, string] }, { prefix: "checkInHour_", title: ["Check-in saatleri", "Check-in times"] as [string, string], center: ["Check-in", "Check-ins"] as [string, string] }, { prefix: "shareChannel_", title: ["Paylaşım kanalları", "Share channels"] as [string, string], center: ["Paylaşım", "Shares"] as [string, string] }]
    : targetType === "place"
      ? [{ prefix: "source_", title: ["Keşif kaynakları", "Discovery sources"] as [string, string], center: ["Keşif", "Discovery"] as [string, string] }, { prefix: "hour_", title: ["Check-in saatleri", "Check-in times"] as [string, string], center: ["Check-in", "Check-ins"] as [string, string] }, { prefix: "shareChannel_", title: ["Paylaşım kanalları", "Share channels"] as [string, string], center: ["Paylaşım", "Shares"] as [string, string] }]
      : [{ prefix: "source_", title: ["Keşif kaynakları", "Discovery sources"] as [string, string], center: ["Keşif", "Discovery"] as [string, string] }, { prefix: "shareChannel_", title: ["Paylaşım kanalları", "Share channels"] as [string, string], center: ["Paylaşım", "Shares"] as [string, string] }];
  const interestAudiences = targetType === "user" ? [{ prefix: "followerInterest", label: ["Takipçi ilgi alanları", "Follower interests"] as [string, string] }, { prefix: "visitorInterest", label: ["Ziyaretçi ilgi alanları", "Visitor interests"] as [string, string] }]
    : targetType === "event" ? [{ prefix: "attendeeInterest", label: ["Katılımcılar ilgi alanları", "Attendee interests"] as [string, string] }, { prefix: "visitorInterest", label: ["Ziyaretçiler ilgi alanları", "Visitor interests"] as [string, string] }]
      : targetType === "place" ? [{ prefix: "memberInterest", label: ["Üyeler ilgi alanları", "Member interests"] as [string, string] }, { prefix: "visitorInterest", label: ["Ziyaretçiler ilgi alanları", "Visitor interests"] as [string, string] }] : [];
  const monthPeriods = [{ key: "1m", label: t("Son 1 ay", "Last month") }, { key: "3m", label: t("Son 3 ay", "Last 3 months") }, { key: "12m", label: t("Son 12 ay", "Last 12 months") }];
  const hasPeriodEventLists = Object.keys(data).some((key) => /^(fullEvent|emptyEvent)(1m|3m|12m)_/.test(key));
  const socialKeys = ["profileExchanges", "profileExchangers", "profileExchangeRate", "profileExchangesPerPerson"].filter((key) => data[key] !== undefined);
  // Yeni grafiklerin kapsadığı anahtarlar genel tablolarda tekrar gösterilmez.
  const replaced = (key: string) =>
    /^(like|ok|dislike)(Age|Gender|City|Country|Language|RelatedInterest)_/.test(key) ||
    /^(follower|visitor)(Age|Gender|Country|Language|Interest)_/.test(key) ||
    /^(age|gender|location|language|city|country|relatedInterest)_/.test(key) ||
    (targetType !== "tag" && key.startsWith("interest_")) ||
    /^(source|shareChannel|decision|checkInHour|lineupClick|ticketTypeSold|ticketTypeRevenue|ticketTypeOccupancy|density|exchangeMethod|viewsDay)_/.test(key) ||
    (targetType === "place" && key.startsWith("hour_")) ||
    (targetType === "place" && hasPeriodEventLists && /^(fullEvent|emptyEvent)_/.test(key)) ||
    /^(fullEvent|emptyEvent|fullEventTag)(1m|3m|12m)_/.test(key) ||
    /^(attendee|visitor|member|follower)Interest(7d|30d|90d|180d)_/.test(key) ||
    chartedKeys.has(key);
  const otherTrends = trendKeys.filter((key) => data[key] !== undefined && !chartedKeys.has(key)).map((key) => [key, data[key]] as [string, number]);
  const distributions = distributionPrefixes.map((prefix) => ({ prefix, entries: Object.entries(data).filter(([key]) => key.startsWith(prefix) && !replaced(key)).sort((a, b) => b[1] - a[1]) })).filter((group) => group.entries.length);
  const used = new Set([...overview, ...money, ...conversions, ...funnel].map(([key]) => key));
  for (const group of distributions) for (const [key] of group.entries) used.add(key);
  for (const key of socialKeys) used.add(key);
  for (const [key] of otherTrends) used.add(key);
  const remainingRaw = Object.entries(data).filter(([key]) => !used.has(key) && !replaced(key));
  // 07/11 #69: Geçmiş etkinlik → Yaklaşan etkinlik; Ortalama bilet fiyatı (USD) satılan biletin hemen ardından.
  const remaining = remainingRaw.filter(([key]) => key !== "averageTicketPriceUsd" && key !== "pastEvents").flatMap((entry) => entry[0] === "upcomingEvents" && data.pastEvents !== undefined ? [["pastEvents", data.pastEvents] as [string, number], entry] : entry[0] === "ticketsSold" && data.averageTicketPriceUsd !== undefined ? [entry, ["averageTicketPriceUsd", data.averageTicketPriceUsd] as [string, number]] : [entry]);
  if (data.pastEvents !== undefined && !remaining.some(([key]) => key === "pastEvents")) remaining.unshift(["pastEvents", data.pastEvents]);
  if (data.averageTicketPriceUsd !== undefined && !remaining.some(([key]) => key === "averageTicketPriceUsd")) remaining.push(["averageTicketPriceUsd", data.averageTicketPriceUsd]);
  const insights = buildInsights(data, targetType, language);
  const hasMetrics = Object.keys(data).length > 0;
  const lineup = grouped(data, "lineupClick_");
  const density = Object.fromEntries(Object.entries(data).filter(([key]) => key.startsWith("density_")));

  return <StatsLinks.Provider value={references.data ?? []}><section className="page interaction-stats-page">
    {backPath ? <Link className="secondary-action stats-back" to={backPath}><ArrowLeft size={18}/>{backLabel}</Link> : <button className="secondary-action stats-back" onClick={() => navigate(-1)} type="button"><ArrowLeft size={18}/>{backLabel}</button>}<header className="section-header stats-page-header"><div><p className="eyebrow">{t("Analiz merkezi", "Analytics centre")}</p><h1>{targetName ? `${targetName} · ` : ""}{title} {t("istatistikleri", "analytics")}</h1><p>{t("Topluluk, erişim, dönüşüm ve gelir metriklerinin güncel görünümü.", "A current view of community, reach, conversion and revenue metrics.")}</p></div></header>
    {stats.isLoading ? <p className="empty-state">{t("İstatistikler hazırlanıyor…", "Preparing analytics…")}</p> : null}
    {stats.isError ? <section className="stats-access-gate"><h2>{t("Gelişmiş analiz erişimi gerekli", "Advanced analytics access required")}</h2><p>{t("Bu rapor yalnız içerik yöneticileri ile admin, küratör veya uygun paket sahipleri tarafından kullanılabilir.", "This report is available only to content managers and admins, curators or members with an eligible plan.")}</p><Link className="primary-action" to="/store">{t("Paketleri incele", "View plans")}</Link></section> : null}
    {stats.data && !hasMetrics ? <section className="stats-access-gate"><h2>{t("Bu rapora erişiminiz yok", "You do not have access to this report")}</h2><p>{t("Kendi profil istatistikleriniz uygun paketle; başka profillerin istatistikleri yalnız yetkili rollerle görüntülenebilir.", "Your own profile analytics require an eligible plan; analytics for other profiles are restricted to authorised roles.")}</p><Link className="primary-action" to="/store">{t("Paketleri incele", "View plans")}</Link></section> : null}
    {stats.data && hasMetrics ? <>
      <AnalyticsVisuals entries={Object.entries(data)} language={language}/>
      <StatsSection title={t("Genel bakış", "Overview")} description={t("En önemli performans göstergeleri", "The most important performance indicators")} icon={<BarChart3 size={21}/>}><MetricGrid entries={overview}/></StatsSection>
      {funnel.length > 1 ? <ChartPanel description={t("İlk temastan gerçek katılıma kadar kullanıcı akışı", "The user journey from first contact to real participation")} title={t("Dönüşüm hunisi", "Conversion funnel")}><FunnelChart steps={funnel.map(([key, value]) => ({ key, label: prettyKey(key, language), value }))}/></ChartPanel> : null}
      {chartedSeries.length ? <ChartPanel description={t("Bu dönemler birbiriyle örtüşür; her nokta o dönemin toplamıdır. Bir noktanın üzerine gelince o dönemin değerleri görünür.", "These periods overlap; each point is the total for that period. Hover a point to see that period's values.")} title={targetType === "tag" ? t("Yeni değerlendirmelerin dönemlere göre değişimi", "New ratings by period") : t("Dönem toplamları", "Period totals")}><PeriodTotalsChart periods={periodKeys.map((key) => ({ key, label: periodLabels[key] }))} series={chartedSeries.map((item) => ({ ...item, values: item.values as Record<string, number | undefined> }))}/></ChartPanel> : null}
      {otherTrends.length ? <StatsSection title={chartedSeries.length ? t("Diğer dönem toplamları", "Other period totals") : t("Dönem toplamları", "Period totals")} description={t("Bu dönemler birbiriyle örtüşür; günlük değişim değildir.", "These periods overlap; they are not daily changes.")} icon={<TrendingUp size={21}/>}><BarList entries={otherTrends}/></StatsSection> : null}
      {conversions.length ? <StatsSection title={t("Dönüşüm ve etkileşim", "Conversion and engagement")} icon={<TrendingUp size={21}/>}><MetricGrid entries={conversions}/></StatsSection> : null}
      {money.length ? <StatsSection title={t("Bilet ve gelir", "Tickets and revenue")} description={t("Satış, komisyon, organizatör geliri ve iade özeti", "Sales, commission, organiser revenue and refund summary")} icon={<WalletCards size={21}/>}><MetricGrid entries={money}/></StatsSection> : null}
      {targetType === "event" ? <TicketTypeTable data={data}/> : null}
      <div className="stats-chart-grid">
        <DemographicsPanel data={data} targetType={targetType}/>
        <SourcesPanel data={data} description={["Kullanıcıların içeriği keşfettiği ve paylaştığı kanallar", "Channels where people discovered and shared this content"]} groups={sourceGroups}/>
      </div>
      {targetType === "tag" ? <CommonInterestsPanel data={data}/> : null}
      {interestAudiences.length ? <AudienceInterestsPanel audiences={interestAudiences} data={data}/> : null}
      {targetType === "event" && lineup.length ? <ChartPanel description={t("Etkinlik programında ziyaretçilerin en çok tıkladığı satırlar", "Programme rows visitors clicked most")} title={<><ListOrdered size={19}/> {t("Line-up'ta en çok tıklananlar", "Most clicked line-up items")}</>}><BarList entries={lineup.map(([key, value]) => [`lineupClick_${key}`, value])} prefix="lineupClick_"/></ChartPanel> : null}
      {targetType === "place" && Object.keys(density).length ? <ChartPanel description={t("Mekândaki etkinliklerde satılan biletlere göre gün ve saat yoğunluğu (en yoğun dilim %100)", "Day and time density by tickets sold for events at this place (busiest slot = 100%)")} title={<><Radar size={19}/> {t("Mekân yoğunluğu", "Place density")}</>}><DensityHeatmap data={density}/></ChartPanel> : null}
      {targetType === "place" && monthPeriods.some((period) => grouped(data, `fullEvent${period.key}_`).length || grouped(data, `emptyEvent${period.key}_`).length) ? <div className="stats-chart-grid">
        <ChartPanel title={t("En dolu etkinlikler", "Fullest events")}><PeriodRankedList groups={Object.fromEntries(monthPeriods.map((period) => [period.key, grouped(data, `fullEvent${period.key}_`)]))} periods={monthPeriods} renderLabel={(key) => <LinkedMetric label={prettyKey(key, language)} metricKey={`fullEvent_${key}`} prefix="fullEvent_"/>} valueSuffix="%"/></ChartPanel>
        <ChartPanel title={t("En boş etkinlikler", "Emptiest events")}><PeriodRankedList groups={Object.fromEntries(monthPeriods.map((period) => [period.key, [...grouped(data, `emptyEvent${period.key}_`)].reverse()]))} periods={monthPeriods} renderLabel={(key) => <LinkedMetric label={prettyKey(key, language)} metricKey={`emptyEvent_${key}`} prefix="emptyEvent_"/>} valueSuffix="%"/></ChartPanel>
      </div> : null}
      {targetType === "place" && monthPeriods.some((period) => grouped(data, `fullEventTag${period.key}_`).length) ? <ChartPanel description={t("Seçili dönemin en dolu 5 etkinliğinde en sık kullanılan etiketler", "Tags used most across the period's five fullest events")} title={t("En dolu geçen etkinliklerin ortak etiketleri", "Common tags of the fullest events")}><PeriodRankedList groups={Object.fromEntries(monthPeriods.map((period) => [period.key, grouped(data, `fullEventTag${period.key}_`)]))} periods={monthPeriods} renderLabel={(key) => <LinkedMetric label={prettyKey(key, language)} metricKey={`interest_${key}`} prefix="interest_"/>}/></ChartPanel> : null}
      {socialKeys.length ? <StatsSection description={targetType === "place" ? t("Mekândaki etkinliklerde QR veya NFC ile yapılan profil takasları", "Profile exchanges via QR or NFC at events in this place") : t("Etkinlik süresince QR veya NFC ile yapılan profil takasları", "Profile exchanges via QR or NFC during the event")} icon={<Share2 size={21}/>} title={t("Sosyalleşme analizi", "Socialisation analysis")}><MetricGrid entries={socialKeys.map((key) => [key, data[key]!] as [string, number])}/>{grouped(data, "exchangeMethod_").length ? <p className="stats-chart-note">{grouped(data, "exchangeMethod_").map(([method, value]) => `${method.toUpperCase()}: ${value}`).join(" · ")}</p> : null}</StatsSection> : null}
      {distributions.length ? <div className="stats-distribution-grid">{distributions.map((group) => <StatsSection key={group.prefix} title={(language === "tr" ? distributionTitles : distributionTitlesEn)[group.prefix] ?? prettyKey(group.prefix, language)} icon={group.prefix.startsWith("ticket") ? <Ticket size={20}/> : <Users size={20}/>}><BarList entries={group.entries} prefix={group.prefix}/></StatsSection>)}</div> : null}
      {remaining.length ? <StatsSection title={t("Diğer ölçümler", "Other metrics")} icon={<BarChart3 size={20}/>}><MetricGrid entries={remaining}/></StatsSection> : null}
      <StatsSection title={t("Veriye dayalı içgörüler", "Data-driven insights")} description={t("Aşağıdaki öneriler yalnızca bu sayfadaki ölçümlerden türetilir.", "The recommendations below are derived only from the metrics on this page.")} icon={<Lightbulb size={21}/>}><div className="stats-insights">{insights.map((insight) => <p key={insight}><LinkedInsight text={insight}/></p>)}</div></StatsSection>
      <aside className="stats-unmeasured"><strong>{t("Ölçüm kapsamı", "Measurement scope")}</strong><p>{t("Konnektora içindeki liste ve arama gösterimleri, detay görüntülemeleri ve paylaşım kanalları gerçek etkileşimlerden kaydedilir. Harici arama motorlarının gösterim sayısı ve cihazlar arası kullanıcı eşleştirmesi tutulmadığı için bu alanlarda tahmini veya örnek rakam gösterilmez.", "Listing and search impressions, detail views and share channels inside Konnektora are recorded from real interactions. External search-engine impression counts and cross-device identity matching are not stored, so no estimated or sample figures are shown for those areas.")}</p></aside>
    </> : null}
  </section></StatsLinks.Provider>;
}

function AnalyticsVisuals({ entries, language }: { entries: Array<[string, number]>; language: "tr" | "en" }) {
  const { counts, pie, pieKind, daily, dailyKind } = analyticsSeries(Object.fromEntries(entries));
  const max = Math.max(...daily.map(([, value]) => value), 1);
  const total = pie.reduce((sum, [, value]) => sum + value, 0);
  let cursor = 0;
  const colors = [sentimentColors.like, sentimentColors.ok, sentimentColors.dislike];
  const stops = pie.map(([, value], index) => {
    const start = cursor;
    cursor += total ? value / total * 360 : 0;
    return `${colors[index % colors.length]} ${start}deg ${cursor}deg`;
  }).join(", ");
  // X positions follow elapsed days, rather than equally spacing unrelated metrics.
  const first = daily.length ? Date.parse(daily[0]![0]) : 0;
  const span = daily.length > 1 ? Date.parse(daily[daily.length - 1]![0]) - first : 1;
  const points = daily.map(([date, value]) => `${daily.length === 1 ? 50 : (Date.parse(date) - first) / Math.max(1, span) * 100},${100 - value / max * 86}`).join(" ");
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  return <section className="stats-visual-grid" aria-label={t("İstatistik grafikleri", "Analytics charts")}>
    <article aria-label={t("Çubuk grafik", "Bar chart")}><h2>{t("Etkileşim sayıları", "Interaction counts")}</h2><BarList entries={counts}/></article>
    {/* Keşif kaynakları artık ayrı halka grafikte; burada yalnız beğeni/kararsız/beğenmeme dağılımı. */}
    {pieKind === "sentiment" ? <article aria-label={t("Pasta grafik", "Pie chart")}><h2>{t("İlgi dağılımı", "Interest distribution")}</h2>{total > 0 ? <><div className="stats-donut" role="img" aria-label={pie.map(([key, value]) => `${prettyKey(key, language)}: ${value}`).join(", ")} style={{ background: `conic-gradient(${stops})` }}><span>{total.toLocaleString(language === "tr" ? "tr-TR" : "en-GB")}</span></div><ul className="stats-chart-legend">{pie.map(([key, value], index) => <li key={key}><i style={{ background: colors[index % colors.length] }}/>{prettyKey(key, language)}: {value} ({Math.round(value / total * 100)}%)</li>)}</ul></> : <p>{t("Dağılım için henüz veri yok.", "No distribution data yet.")}</p>}</article> : null}
    <article aria-label={t("Çizgi grafik", "Line chart")}><h2>{dailyKind === "ticketOrders" ? t("Günlük bilet siparişleri (UTC)", "Daily ticket orders (UTC)") : t("Günlük görüntülenmeler (UTC)", "Daily views (UTC)")}</h2>{daily.length > 1 ? <><svg className="stats-line-chart" role="img" aria-label={daily.map(([date, value]) => `${date}: ${value}`).join(", ")} viewBox="0 0 100 100"><polyline fill="none" points={points} stroke="#21724e" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg><ul className="stats-chart-legend">{daily.map(([date, value]) => <li key={date}>{date}: {value}</li>)}</ul></> : <p>{t("Zaman çizgisi için en az iki güne ait ölçüm gerekli.", "A time series requires measurements on at least two days.")}</p>}</article>
  </section>;
}
