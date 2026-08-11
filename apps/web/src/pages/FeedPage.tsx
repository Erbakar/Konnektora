import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Heart, ListFilter, Mail, MessageCircle, MoreHorizontal, Send, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { RichText } from "../components/RichText";
import { UserIdentityLink, userProfilePath } from "../components/UserIdentityLink";
import type { DiscoveryFeed, SocialPost } from "@konnektora/shared";
import { archiveMyEvent, archiveMyPlace, createContentReport, createSocialPostComment, deleteSocialPost, followUser, getDiscoveryFeed, getUserSession, inviteEventParticipant, listFollowing, listMyEvents, listSocialPostComments, listSocialPosts, toggleSocialPostLike, unfollowUser, updateMyEvent, updateMyPlace, updateSocialPost } from "../lib/api";

const visibilityLabels = { everybody: "Herkes", following: "Takip ettiklerim", network: "Ağım" } as const;

export function FeedPage() {
  const client = useQueryClient();
  const user = getUserSession();
  const [tab, setTab] = useState<"popular" | "all" | "following" | "for_you">("all");
  const [time, setTime] = useState<"all" | "day" | "yesterday" | "week" | "month">("all");
  const [contentType, setContentType] = useState<"all" | "posts" | "events" | "places" | "tags" | "photos" | "videos">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const range = feedRange(time);
  const feed = useQuery({ queryKey: ["social-feed", tab, time], queryFn: () => listSocialPosts(tab, 1, range) });
  const discovery = useQuery({ queryKey: ["discovery-feed", user?.id, time], queryFn: () => getDiscoveryFeed(range) });
  const visiblePosts = feed.data?.items ?? [];
  const activities = (discovery.data?.activities ?? []).filter((item) => contentType === "all" || (contentType === "events" && item.kind === "event") || (contentType === "places" && item.kind === "place") || (contentType === "tags" && item.kind === "tag"));
  const timeline = [
    ...((contentType === "all" || contentType === "posts" || contentType === "photos" || contentType === "videos") ? visiblePosts.filter((post) => contentType !== "photos" && contentType !== "videos" || post.media.some((media) => media.type === contentType.slice(0, -1))).map((post) => ({ type: "post" as const, at: new Date(post.createdAt).getTime(), post })) : []),
    ...(contentType !== "posts" ? activities.map((activity) => ({ type: "activity" as const, at: new Date(activity.occurredAt).getTime(), activity })) : []),
  ].sort((a, b) => b.at - a.at);
  const refresh = () => client.invalidateQueries({ queryKey: ["social-feed"] });
  return <div className="page social-feed-page">
    <header className="feed-heading"><div><span className="eyebrow">Konnektora topluluğu</span><h1>Sosyal akış</h1><p>Tag, etkinlik, mekân ve topluluk güncellemelerini tek yerde keşfet.</p></div><div className="feed-tabs" role="tablist">
      <button className={tab === "popular" ? "active" : ""} onClick={() => setTab("popular")}>Popular</button>
      <button className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>All</button>
      <button className={tab === "following" ? "active" : ""} disabled={!user} onClick={() => setTab("following")}><Users size={16}/> Following</button>
      <button className={tab === "for_you" ? "active" : ""} disabled={!user} onClick={() => setTab("for_you")}>For you</button>
    </div></header>
    <button className="secondary-action feed-filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)} type="button"><ListFilter size={17}/> Filtrele</button>
    <section className={`feed-filter-panel ${filtersOpen ? "open" : ""}`}>
    <div className="feed-tabs" aria-label="Zaman filtresi">
      <button className={time === "all" ? "active" : ""} onClick={() => setTime("all")}>Tümü</button>
      <button className={time === "day" ? "active" : ""} onClick={() => setTime("day")}>24 hours</button>
      <button className={time === "yesterday" ? "active" : ""} onClick={() => setTime("yesterday")}>Yesterday</button>
      <button className={time === "week" ? "active" : ""} onClick={() => setTime("week")}>Last week</button>
      <button className={time === "month" ? "active" : ""} onClick={() => setTime("month")}>Last month</button>
    </div>
    <div className="feed-tabs" aria-label="İçerik türü filtresi">
      {(["all", "posts", "photos", "videos", "events", "places", "tags"] as const).map((value) => <button className={contentType === value ? "active" : ""} key={value} onClick={() => setContentType(value)}>{value === "all" ? "Tüm içerikler" : value === "posts" ? "Post'lar" : value === "photos" ? "Fotoğraflar" : value === "videos" ? "Videolar" : value === "events" ? "Etkinlikler" : value === "places" ? "Mekânlar" : "Tag'ler"}</button>)}
    </div>
    </section>
    <section className="post-list" aria-live="polite">{feed.isLoading || discovery.isLoading ? <div className="feed-state">Akış yükleniyor…</div> : feed.isError || discovery.isError ? <div className="feed-state">Akış şu anda yüklenemedi.</div> : !timeline.length ? <div className="feed-state"><strong>Bu filtrede içerik yok.</strong><span>Başka bir zaman aralığı deneyebilirsin.</span></div> : timeline.map((item) => item.type === "post" ? <PostCard key={`post-${item.post.id}`} post={item.post} userId={user?.id} onChanged={refresh}/> : <ActivityCard activity={item.activity} key={`activity-${item.activity.kind}-${item.activity.id}`} userId={user?.id} onChanged={() => { void discovery.refetch(); }}/>)}</section>
    <section className="feed-discovery-widgets">
      {contentType === "all" || contentType === "events" ? <DiscoveryWidget title="Popüler etkinlikler" items={discovery.data?.localEvents ?? []}/> : null}
      {contentType === "all" || contentType === "places" ? <DiscoveryWidget title="Popüler mekânlar" items={discovery.data?.popularPlaces ?? []}/> : null}
      {contentType === "all" || contentType === "tags" ? <DiscoveryWidget title="Trend tag'ler" items={discovery.data?.trendingTags ?? []}/> : null}
    </section>
  </div>;
}

function DiscoveryWidget({ title, items }: { title: string; items: Array<{ id: string; title: string; href: string; meta?: string | null }> }) {
  return <section className="admin-form"><h2>{title}</h2>{items.slice(0, 5).map((item) => <Link className="admin-list-row" key={item.id} to={item.href}><div><strong>{item.title}</strong><span>{item.meta}</span></div></Link>)}{!items.length ? <p className="form-help">Ülkende içerik bulunamadı; global içerikler hazırlanıyor.</p> : null}</section>;
}

function ActivityCard({ activity, userId, onChanged }: { activity: DiscoveryFeed["activities"][number]; userId?: string; onChanged: () => void }) {
  const mine = Boolean(userId && activity.ownerId === userId);
  const [guestListOpen, setGuestListOpen] = useState(false);
  const archive = useMutation({ mutationFn: () => activity.kind === "event" ? archiveMyEvent(activity.id) : archiveMyPlace(activity.id), onSuccess: onChanged });
  const edit = useMutation({ mutationFn: async (title: string) => { if (activity.kind === "event") await updateMyEvent(activity.id, { title }); else await updateMyPlace(activity.id, { name: title }); }, onSuccess: onChanged });
  const managedEvents = useQuery({ queryKey: ["my-events", userId], queryFn: listMyEvents, enabled: Boolean(userId && guestListOpen) });
  const guestInvite = useMutation({ mutationFn: (eventId: string) => inviteEventParticipant(eventId, { userId: activity.ownerId!, role: "attendee" }, "user"), onSuccess: () => { setGuestListOpen(false); window.alert("Kullanıcı etkinliğin Guest List'ine eklendi."); } });
  async function report() { const details = window.prompt("Rapor nedenini kısaca yazın:"); if (!details?.trim()) return; await createContentReport({ targetType: activity.kind, targetId: activity.id, reason: "Uygunsuz içerik", details: details.trim() }); window.alert("Raporunuz inceleme kuyruğuna alındı."); }
  return <article className="post-card feed-activity-card"><header><div className="post-avatar">{activity.kind === "event" ? "E" : activity.kind === "place" ? "M" : activity.kind === "tag" ? "#" : "K"}</div><div className="post-author"><strong>{activity.action}</strong><span>{relativeTime(activity.occurredAt)}</span></div></header>{activity.imageUrl ? <img className="activity-cover" alt="" src={activity.imageUrl}/> : null}<h2><Link to={activity.href}>{activity.title}</Link></h2>{activity.subtitle ? <p><RichText text={activity.subtitle}/></p> : null}<small>{activity.meta}</small><div className="post-actions"><Link to={activity.href}>Detayları gör</Link><button onClick={() => void shareActivity(activity)}>Paylaş</button>{mine && (activity.kind === "event" || activity.kind === "place") ? <><button disabled={edit.isPending} onClick={() => { const title = window.prompt(activity.kind === "event" ? "Etkinlik adını düzenle" : "Mekân adını düzenle", activity.title); if (title?.trim() && title.trim() !== activity.title) edit.mutate(title.trim()); }}>Düzenle</button><button disabled={archive.isPending} onClick={() => window.confirm("İçerik yayından kaldırılsın mı?") && archive.mutate()}>Sil</button></> : null}{!mine && activity.ownerId ? <><Link aria-label="Mesaj gönder" title="Mesaj gönder" to={`/messages?peer=${activity.ownerId}`}><Mail size={17}/></Link><button onClick={() => setGuestListOpen(true)}>Guest List'e ekle</button></> : null}{!mine && userId ? <button onClick={() => void report()}>Rapor et</button> : null}</div>{guestListOpen ? <div className="emotion-modal" role="dialog" aria-modal="true"><div><button aria-label="Kapat" onClick={() => setGuestListOpen(false)}>×</button><h2>Guest List'e ekle</h2><div className="admin-list">{managedEvents.data?.map((event) => <button className="admin-list-row" disabled={guestInvite.isPending} key={event.id} onClick={() => guestInvite.mutate(event.id)}><strong>{event.title}</strong></button>)}</div>{!managedEvents.isLoading && !managedEvents.data?.length ? <p className="form-help">Yönettiğin etkinlik bulunmuyor.</p> : null}</div></div> : null}</article>;
}

function PostCard({ post, userId, onChanged }: { post: SocialPost; userId?: string; onChanged: () => void }) {
  const client = useQueryClient(); const [open, setOpen] = useState(false); const [comment, setComment] = useState(""); const [guestListOpen, setGuestListOpen] = useState(false);
  const comments = useQuery({ queryKey: ["post-comments", post.id], queryFn: () => listSocialPostComments(post.id), enabled: open });
  const following = useQuery({ queryKey: ["following", userId], queryFn: listFollowing, enabled: Boolean(userId && userId !== post.authorId) });
  const isFollowing = following.data?.some((member) => member.id === post.authorId) ?? false;
  const follow = useMutation({ mutationFn: () => isFollowing ? unfollowUser(post.authorId) : followUser(post.authorId), onSuccess: () => client.invalidateQueries({ queryKey: ["following"] }) });
  const like = useMutation({ mutationFn: () => toggleSocialPostLike(post.id), onSuccess: onChanged });
  const remove = useMutation({ mutationFn: () => deleteSocialPost(post.id), onSuccess: onChanged });
  const edit = useMutation({ mutationFn: (body: string) => updateSocialPost(post.id, body), onSuccess: onChanged });
  const managedEvents = useQuery({ queryKey: ["my-events", userId], queryFn: listMyEvents, enabled: Boolean(userId && guestListOpen) });
  const guestInvite = useMutation({ mutationFn: (eventId: string) => inviteEventParticipant(eventId, { userId: post.authorId, role: "attendee" }, "user"), onSuccess: () => { setGuestListOpen(false); window.alert("Kullanıcı etkinliğin Guest List'ine eklendi."); } });
  const addComment = useMutation({ mutationFn: () => createSocialPostComment(post.id, comment), onSuccess: () => { setComment(""); client.invalidateQueries({ queryKey: ["post-comments", post.id] }); onChanged(); } });
  async function report() { const details = window.prompt("Rapor nedenini kısaca yazın:"); if (!details?.trim()) return; await createContentReport({ targetType: "post", targetId: post.id, reason: "Uygunsuz gönderi", details: details.trim() }); window.alert("Raporunuz inceleme kuyruğuna alındı."); }
  return <article className="post-card"><header><UserIdentityLink user={{...post.author,id:post.authorId}} avatarClassName="post-avatar" showName={false}/><div className="post-author"><Link to={userProfilePath({...post.author,id:post.authorId})}>{post.author.name}{post.author.profileVerifiedAt ? <BadgeCheck size={16} aria-label="Doğrulanmış profil"/> : null}</Link><span>{post.author.username ? `@${post.author.username} · ` : ""}{relativeTime(post.createdAt)} · {visibilityLabels[post.visibility]}</span></div><div className="post-menu">{userId === post.authorId ? <><button title="Gönderiyi düzenle" onClick={() => { const next = window.prompt("Gönderiyi düzenle", post.body); if (next?.trim() && next.trim() !== post.body) edit.mutate(next.trim()); }}>Düzenle</button><button title="Gönderiyi sil" onClick={() => window.confirm("Gönderi silinsin mi?") && remove.mutate()}><Trash2 size={18}/></button></> : userId ? <button title="Gönderiyi raporla" onClick={report}><MoreHorizontal size={19}/></button> : null}</div></header><p className="post-body"><RichText text={post.body}/></p>
    {post.media.length ? <div className={`post-media-grid count-${Math.min(post.media.length, 4)}`}>{post.media.map((media) => media.type === "video" ? <video key={media.id} controls src={media.url}/> : <img key={media.id} src={media.url} alt="Gönderi medyası" loading="lazy"/>)}</div> : null}
    <div className="post-stats"><span>{post.likeCount} beğeni</span><button onClick={() => setOpen((value) => !value)}>{post.commentCount} yorum</button></div><div className="post-actions"><button className={post.liked ? "liked" : ""} disabled={!userId || like.isPending} onClick={() => like.mutate()}><Heart size={19} fill={post.liked ? "currentColor" : "none"}/> Beğen</button><button onClick={() => setOpen((value) => !value)}><MessageCircle size={19}/> Yorum yap</button><button onClick={() => void sharePost(post)}>Paylaş</button>{userId && userId !== post.authorId ? <><button disabled={follow.isPending || following.isLoading} onClick={() => follow.mutate()}>{isFollowing ? "Takibi bırak" : "Takip et"}</button><Link aria-label="Mesaj gönder" title="Mesaj gönder" to={`/messages?peer=${post.authorId}`}><Mail size={17}/></Link><button onClick={() => setGuestListOpen(true)}>Guest List'e ekle</button><button onClick={() => void report()}>Rapor et</button></> : null}</div>
    {open ? <div className="post-comments">{comments.isLoading ? <span>Yorumlar yükleniyor…</span> : comments.data?.map((item) => <div className="post-comment" key={item.id}><UserIdentityLink user={{...item.author,id:item.authorId}} avatarClassName="comment-avatar" showName={false}/><div><Link to={userProfilePath({...item.author,id:item.authorId})}><strong>{item.author.name}</strong></Link><p><RichText text={item.body}/></p><small>{relativeTime(item.createdAt)}</small></div></div>)}{userId ? <form onSubmit={(e) => { e.preventDefault(); if (comment.trim()) addComment.mutate(); }}><input value={comment} maxLength={1000} onChange={(e) => setComment(e.target.value)} placeholder="Yorum yaz…"/><button aria-label="Yorumu gönder" disabled={!comment.trim()}><Send size={18}/></button></form> : null}</div> : null}
    {guestListOpen ? <div className="emotion-modal" role="dialog" aria-modal="true" aria-label="Guest List'e ekle"><div><button aria-label="Kapat" onClick={() => setGuestListOpen(false)}>×</button><h2>Guest List'e ekle</h2><p>{post.author.name} kullanıcısını yönettiğin etkinliklerden birine ekle.</p><div className="admin-list">{managedEvents.data?.map((event) => <button className="admin-list-row" disabled={guestInvite.isPending} key={event.id} onClick={() => guestInvite.mutate(event.id)}><strong>{event.title}</strong><span>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(event.startsAt))}</span></button>)}</div>{!managedEvents.isLoading && !managedEvents.data?.length ? <p className="form-help">Yönettiğin etkinlik bulunmuyor.</p> : null}{guestInvite.isError ? <p className="form-error">Kullanıcı Guest List'e eklenemedi.</p> : null}</div></div> : null}
  </article>;
}

function relativeTime(value: string | Date) { const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return "şimdi"; if (seconds < 3600) return `${Math.floor(seconds / 60)} dk`; if (seconds < 86400) return `${Math.floor(seconds / 3600)} sa`; if (seconds < 604800) return `${Math.floor(seconds / 86400)} gün`; return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(new Date(value)); }

function feedRange(time: "all" | "day" | "yesterday" | "week" | "month") { if (time === "all") return undefined; if (time === "yesterday") { const start = new Date(); start.setHours(0, 0, 0, 0); const to = new Date(start.getTime() - 1); start.setDate(start.getDate() - 1); return { from: start.toISOString(), to: to.toISOString() }; } return { from: new Date(Date.now() - (time === "day" ? 86_400_000 : time === "week" ? 604_800_000 : 2_592_000_000)).toISOString() }; }
async function sharePost(post: SocialPost) { const data = { title: `${post.author.name} gönderisi`, text: post.body, url: window.location.href }; if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(`${post.body}\n${window.location.href}`); window.alert("Gönderi bağlantısı kopyalandı."); } }
async function shareActivity(activity: DiscoveryFeed["activities"][number]) { const url = new URL(activity.href, window.location.origin).toString(); if (navigator.share) await navigator.share({ title: activity.title, text: activity.subtitle ?? activity.action, url }); else { await navigator.clipboard.writeText(url); window.alert("İçerik bağlantısı kopyalandı."); } }
