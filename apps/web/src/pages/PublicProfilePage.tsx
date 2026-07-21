import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CalendarDays, Flag, Globe2, MapPin, MessageCircle, UserCheck, UserPlus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DiscoveryCard } from "../components/DiscoveryCard";
import { createBlock, createContentReport, followUser, getPublicProfile, getUserSession, listReportRules, unfollowUser } from "../lib/api";

export function PublicProfilePage() {
  const { username = "" } = useParams();
  const user = getUserSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const profileQuery = useQuery({ queryKey: ["public-profile", username, user?.id], queryFn: () => getPublicProfile(username), enabled: Boolean(username) });
  const rules = useQuery({ queryKey: ["report-rules", "user"], queryFn: () => listReportRules("user"), enabled: Boolean(user) });
  const profile = profileQuery.data;
  const followMutation = useMutation({ mutationFn: () => profile?.relationship.following ? unfollowUser(profile.id) : followUser(profile!.id), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["public-profile", username] }) });
  const blockMutation = useMutation({ mutationFn: () => createBlock("user", profile!.id), onSuccess: () => navigate("/search") });
  const reportMutation = useMutation({ mutationFn: (input: { ruleId?: string; reason: string; details?: string }) => createContentReport({ targetType: "user", targetId: profile!.id, ...input }), onSuccess: () => setReportOpen(false) });

  if (profileQuery.isLoading) return <section className="page route-loading" role="status">Profil yükleniyor…</section>;
  if (!profile) return <section className="page empty-state"><h1>Profil bulunamadı</h1><p>Bu kullanıcı mevcut değil, aktif değil veya görüntülenemiyor.</p><Link className="primary-action" to="/search">Aramaya dön</Link></section>;
  const profilePhoto = profile.media.find((item) => item.isProfilePicture && item.type === "image") ?? profile.media.find((item) => item.type === "image");

  return <section className="page public-profile-page">
    <header className="public-profile-hero">
      <div className="public-profile-avatar">{profilePhoto ? <img alt={`${profile.name} profil fotoğrafı`} src={profilePhoto.url} /> : profile.name.slice(0, 1).toUpperCase()}</div>
      <div className="public-profile-heading"><span className="eyebrow">{profile.accountType === "corporate" ? "Kurumsal üye" : "Konnektora üyesi"}</span><h1>{profile.name}</h1><strong>@{profile.username}</strong><p>{[profile.city, profile.country].filter(Boolean).join(", ") || "Konum paylaşılmadı"}</p><div className="profile-metrics"><span><b>{profile.followerCount}</b> takipçi</span><span><b>{profile.followingCount}</b> takip</span><span><b>{profile.commonInterestCount}</b> ortak ilgi</span></div></div>
      <div className="public-profile-actions">
        {profile.relationship.isSelf ? <Link className="primary-action" to="/account">Profili düzenle</Link> : user ? <>
          <button className={profile.relationship.following ? "secondary-action" : "primary-action"} disabled={followMutation.isPending} onClick={() => followMutation.mutate()} type="button">{profile.relationship.following ? <UserCheck size={18} /> : <UserPlus size={18} />}{profile.relationship.following ? "Takipte" : "Takip et"}</button>
          {profile.relationship.canMessage ? <Link className="secondary-action" to={`/messages?peer=${profile.id}`}><MessageCircle size={18} /> Mesaj gönder</Link> : null}
          <button className="ghost-action" onClick={() => setReportOpen((open) => !open)} type="button"><Flag size={18} /> Raporla</button>
          <button className="ghost-action danger" disabled={blockMutation.isPending} onClick={() => blockMutation.mutate()} type="button"><Ban size={18} /> Engelle</button>
        </> : <Link className="primary-action" to="/account">Takip etmek için giriş yap</Link>}
      </div>
    </header>
    {reportOpen ? <form className="identity-panel public-profile-report" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const ruleId = String(form.get("ruleId") ?? ""); const rule = rules.data?.find((item) => item.id === ruleId); reportMutation.mutate({ ruleId: ruleId || undefined, reason: rule?.title ?? String(form.get("reason") || "Uygunsuz kullanıcı profili"), details: String(form.get("details") || "") || undefined }); }}><h2>Kullanıcıyı raporla</h2>{rules.data?.length ? <select aria-label="Rapor sebebi" name="ruleId" required><option value="">Sebep seç</option>{rules.data.map((rule) => <option key={rule.id} value={rule.id}>{rule.title}</option>)}</select> : <input aria-label="Rapor sebebi" name="reason" minLength={3} required />}<textarea aria-label="Rapor detayı" name="details" placeholder="İsteğe bağlı açıklama" /><button className="primary-action" type="submit">Raporu gönder</button></form> : null}
    {profile.media.length ? <section className="profile-gallery" aria-label="Profil fotoğrafları">{profile.media.map((media) => media.type === "image" ? <img alt={`${profile.name} profil medyası`} key={media.id} src={media.url} /> : <video controls key={media.id} src={media.url} />)}</section> : null}
    <section className="identity-panel"><div className="section-header compact"><h2>İlgi alanları</h2><span>{profile.interests.length} tag</span></div><div className="profile-interest-list">{profile.interests.map((interest) => <Link className={interest.common ? "profile-interest is-common" : "profile-interest"} key={interest.tag.id} to={`/events?tag=${interest.tag.slug}`}><span>#{interest.tag.name}</span><small>{interest.common ? "Ortak ilgi" : interest.sentiment === "like" ? "Beğeniyor" : interest.sentiment === "dislike" ? "Beğenmiyor" : "Nötr"}</small></Link>)}{!profile.interests.length ? <p className="form-help">Henüz public ilgi alanı yok.</p> : null}</div></section>
    {profile.website ? <a className="profile-website" href={profile.website} rel="noreferrer" target="_blank"><Globe2 size={18} /> {profile.website}</a> : null}
    <section className="profile-content-section"><div className="section-header"><h2><CalendarDays size={22} /> Etkinlikler</h2><span>{profile.events.length}</span></div><div className="discovery-results">{profile.events.map((item) => <DiscoveryCard item={item} key={item.id} />)}</div>{!profile.events.length ? <p className="form-help">Görüntülenebilir etkinlik yok.</p> : null}</section>
    <section className="profile-content-section"><div className="section-header"><h2><MapPin size={22} /> Mekânlar</h2><span>{profile.places.length}</span></div><div className="discovery-results">{profile.places.map((item) => <DiscoveryCard item={item} key={item.id} />)}</div>{!profile.places.length ? <p className="form-help">Görüntülenebilir mekân yok.</p> : null}</section>
  </section>;
}
