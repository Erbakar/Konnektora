import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getInteractionStats, getPublicProfileById, getTagStats } from "../lib/api";

const labels: Record<string, string> = {
  accepted: "Katılımcı", attended: "Check-in", comments: "Post ve yorum", views: "Görüntülenme",
  ticketsSold: "Satılan bilet", ticketRevenue: "Bilet geliri", refunds: "İade", rsvpRate: "RSVP dönüşümü",
  attendanceRate: "Katılım oranı", engagementRate: "Etkileşim oranı", followers: "Takipçi", following: "Takip",
  members: "Üye", invites: "Davet", reactions: "Etkileşim", events: "Etkinlik", places: "Mekân",
  checkedIn: "Check-in", checkInRate: "Check-in oranı", likes: "Beğeni", ok: "Nötr", dislikes: "Beğenmeme",
  posts: "Post", interests: "İlgi alanı", media: "Medya", profileViews: "Profil görüntülenmesi",
  messages: "Gönderilen mesaj", averageEventsPerMonth: "Aylık ortalama etkinlik",
};

export function InteractionStatsPage() {
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
  const title = targetType === "event" ? "Etkinlik" : targetType === "place" ? "Mekân" : targetType === "tag" ? "Etiket" : "Profil";
  return <section className="page interaction-stats-page">
    <header className="section-header"><div><p className="eyebrow">Analiz</p><h1>{title} etkileşim istatistikleri</h1><p>Güncel topluluk, erişim ve dönüşüm metrikleri.</p></div><button className="secondary-action" onClick={() => navigate(-1)} type="button">Geri dön</button></header>
    {stats.isLoading ? <p className="empty-state">İstatistikler hazırlanıyor…</p> : null}
    {stats.isError ? <p className="form-error">Bu istatistikleri görüntüleme yetkiniz olmayabilir veya veriler yüklenemedi.</p> : null}
    {stats.data ? <div className="interaction-stats-dashboard">{Object.entries(stats.data).map(([key, value]) => <article key={key} style={{ "--metric-value": Number(value) } as CSSProperties}><BarChart3 size={20}/><strong>{key.toLowerCase().includes("rate") ? `%${value}` : value}</strong><span>{labels[key] ?? key}</span></article>)}</div> : null}
  </section>;
}
