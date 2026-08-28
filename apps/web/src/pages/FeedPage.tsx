import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Heart, ListFilter, Mail, MessageCircle, MoreHorizontal, Send, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RichText } from "../components/RichText";
import { UserIdentityLink, userProfilePath } from "../components/UserIdentityLink";
import { ReportDialog } from "../components/ReportDialog";
import { AnnouncementPopup } from "../components/AnnouncementPopup";
import type { DiscoveryFeed, ReportTargetType, SocialPost } from "@konnektora/shared";
import { addGuestListMember, archiveMyEvent, archiveMyPlace, createGuestList, createSocialPostComment, deleteSocialPost, followUser, getDiscoveryFeed, getUserSession, listAnnouncements, listFollowing, listGuestLists, listSocialPostComments, listSocialPosts, resolveMediaUrl, toggleSocialPostLike, unfollowUser, updateMyEvent, updateMyPlace, updateSocialPost } from "../lib/api";
import { useLanguage } from "../lib/i18n";
import { useGuestListEntitlement } from "../lib/useGuestListEntitlement";

const visibilityLabels = {
  tr: { everybody: "Herkes", following: "Takip ettiklerim", network: "Ağım" },
  en: { everybody: "Everyone", following: "Following", network: "My network" },
} as const;

export function FeedPage() {
  const { language } = useLanguage();
  const labels = language === "tr" ? { popular: "Popüler", all: "Tümü", following: "Takip ettiklerim", forYou: "Sana özel", filter: "Filtrele", day: "Son 24 saat", yesterday: "Dün", week: "Geçen hafta", month: "Geçen ay" } : { popular: "Popular", all: "All", following: "Following", forYou: "For you", filter: "Filter", day: "Last 24 hours", yesterday: "Yesterday", week: "Last week", month: "Last month" };
  const client = useQueryClient();
  const user = getUserSession();
  const [tab, setTab] = useState<"popular" | "all" | "following" | "for_you">("all");
  const [time, setTime] = useState<"all" | "day" | "yesterday" | "week" | "month">("all");
  const [contentType, setContentType] = useState<"all" | "posts" | "events" | "places" | "tags" | "photos" | "videos">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const range = feedRange(time);
  const feed = useQuery({ queryKey: ["social-feed", tab, time], queryFn: () => listSocialPosts(tab, 1, range) });
  const announcements = useQuery({ queryKey: ["announcements", "feed", user?.id], queryFn: listAnnouncements, enabled: Boolean(user) });
  const feedAnnouncements = (announcements.data ?? []).filter((announcement) =>
    user && (announcement.target === "members" || announcement.target === (user.accountType === "corporate" ? "corporate_members" : "individual_members")),
  );
  const discovery = useQuery({ queryKey: ["discovery-feed", user?.id, time], queryFn: () => getDiscoveryFeed(range) });
  const { canUseGuestLists } = useGuestListEntitlement();
  const visiblePosts = feed.data?.items ?? [];
  const activities = (discovery.data?.activities ?? []).filter((item) => contentType === "all" || (contentType === "events" && item.kind === "event") || (contentType === "places" && item.kind === "place") || (contentType === "tags" && item.kind === "tag"));
  const timeline = [
    ...((contentType === "all" || contentType === "posts" || contentType === "photos" || contentType === "videos") ? visiblePosts.filter((post) => contentType !== "photos" && contentType !== "videos" || post.media.some((media) => media.type === contentType.slice(0, -1))).map((post) => ({ type: "post" as const, at: new Date(post.createdAt).getTime(), post })) : []),
    ...(contentType !== "posts" ? activities.map((activity) => ({ type: "activity" as const, at: new Date(activity.occurredAt).getTime(), activity })) : []),
  ].sort((a, b) => b.at - a.at);
  useEffect(() => {
    if (!timeline.length || !window.location.hash.startsWith("#post-")) return;
    window.requestAnimationFrame(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "center" }));
  }, [timeline.length]);
  const refresh = () => client.invalidateQueries({ queryKey: ["social-feed"] });
  return <div className="page social-feed-page">
    <AnnouncementPopup announcements={feedAnnouncements}/>
    <header className="feed-heading"><div><span className="eyebrow">{language === "tr" ? "Konnektora topluluğu" : "Konnektora community"}</span><h1>{language === "tr" ? "Sosyal akış" : "Social feed"}</h1><p>{language === "tr" ? "Etiket, etkinlik, mekân ve topluluk güncellemelerini tek yerde keşfet." : "Discover interest, event, place and community updates in one feed."}</p></div><div className="feed-tabs" role="tablist">
      <button className={tab === "popular" ? "active" : ""} onClick={() => setTab("popular")}>{labels.popular}</button>
      <button className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>{labels.all}</button>
      <button className={tab === "following" ? "active" : ""} disabled={!user} onClick={() => setTab("following")}><Users size={16}/> {labels.following}</button>
      <button className={tab === "for_you" ? "active" : ""} disabled={!user} onClick={() => setTab("for_you")}>{labels.forYou}</button>
    </div></header>
    <button className="secondary-action feed-filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)} type="button"><ListFilter size={17}/> {labels.filter}</button>
    <section className={`feed-filter-panel ${filtersOpen ? "open" : ""}`}>
    <div className="feed-tabs" aria-label={language === "tr" ? "Zaman filtresi" : "Time filter"}>
      <button className={time === "all" ? "active" : ""} onClick={() => setTime("all")}>{labels.all}</button>
      <button className={time === "day" ? "active" : ""} onClick={() => setTime("day")}>{labels.day}</button>
      <button className={time === "yesterday" ? "active" : ""} onClick={() => setTime("yesterday")}>{labels.yesterday}</button>
      <button className={time === "week" ? "active" : ""} onClick={() => setTime("week")}>{labels.week}</button>
      <button className={time === "month" ? "active" : ""} onClick={() => setTime("month")}>{labels.month}</button>
    </div>
    <div className="feed-tabs" aria-label={language === "tr" ? "İçerik türü filtresi" : "Content type filter"}>
      {(["all", "posts", "photos", "videos", "events", "places", "tags"] as const).map((value) => <button className={contentType === value ? "active" : ""} key={value} onClick={() => setContentType(value)}>{language === "tr" ? value === "all" ? "Tüm içerikler" : value === "posts" ? "Post'lar" : value === "photos" ? "Fotoğraflar" : value === "videos" ? "Videolar" : value === "events" ? "Etkinlikler" : value === "places" ? "Mekânlar" : "Etiketler" : value === "all" ? "All content" : value === "posts" ? "Posts" : value === "photos" ? "Photos" : value === "videos" ? "Videos" : value === "events" ? "Events" : value === "places" ? "Places" : "Interests"}</button>)}
    </div>
    </section>
    <section className="post-list" aria-live="polite">{feed.isLoading || discovery.isLoading ? <div className="feed-state">{language === "tr" ? "Akış yükleniyor…" : "Loading feed…"}</div> : feed.isError || discovery.isError ? <div className="feed-state">{language === "tr" ? "Akış şu anda yüklenemedi." : "The feed is currently unavailable."}</div> : !timeline.length ? <div className="feed-state"><strong>{language === "tr" ? "Bu filtrede içerik yok." : "There is no content for this filter."}</strong><span>{language === "tr" ? "Başka bir zaman aralığı deneyebilirsin." : "Try a different time range."}</span></div> : timeline.map((item) => item.type === "post" ? <PostCard canUseGuestLists={canUseGuestLists} key={`post-${item.post.id}`} language={language} post={item.post} userId={user?.id} onChanged={refresh}/> : <ActivityCard activity={item.activity} canUseGuestLists={canUseGuestLists} key={`activity-${item.activity.kind}-${item.activity.id}`} language={language} userId={user?.id} onChanged={() => { void discovery.refetch(); }}/>)}</section>
    <section className="feed-discovery-widgets">
      {contentType === "all" || contentType === "events" ? <DiscoveryWidget language={language} title={language === "tr" ? "Popüler etkinlikler" : "Popular events"} items={discovery.data?.localEvents ?? []}/> : null}
      {contentType === "all" || contentType === "places" ? <DiscoveryWidget language={language} title={language === "tr" ? "Popüler mekânlar" : "Popular places"} items={discovery.data?.popularPlaces ?? []}/> : null}
      {contentType === "all" || contentType === "tags" ? <DiscoveryWidget language={language} title={language === "tr" ? "Trend etiketler" : "Trending interests"} items={discovery.data?.trendingTags ?? []}/> : null}
    </section>
  </div>;
}

function DiscoveryWidget({ language, title, items }: { language: "tr" | "en"; title: string; items: Array<{ id: string; title: string; href: string; meta?: string | null }> }) {
  return <section className="admin-form"><h2>{title}</h2>{items.slice(0, 5).map((item) => <Link className="admin-list-row" key={item.id} to={item.href}><div><strong>{item.title}</strong><span>{localizeMetaText(item.meta, language)}</span></div></Link>)}{!items.length ? <p className="form-help">{language === "tr" ? "Ülkende içerik bulunamadı; global içerikler hazırlanıyor." : "No content was found in your country; global content is being prepared."}</p> : null}</section>;
}

function ActivityCard({ activity, canUseGuestLists, language, userId, onChanged }: { activity: DiscoveryFeed["activities"][number]; canUseGuestLists: boolean; language: "tr" | "en"; userId?: string; onChanged: () => void }) {
  const mine = Boolean(userId && activity.ownerId === userId);
  const [guestListOpen, setGuestListOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareNotice, setShareNotice] = useState(false);
  const archive = useMutation({ mutationFn: () => activity.kind === "event" ? archiveMyEvent(activity.id) : archiveMyPlace(activity.id), onSuccess: onChanged });
  const edit = useMutation({ mutationFn: async (title: string) => { if (activity.kind === "event") await updateMyEvent(activity.id, { title }); else await updateMyPlace(activity.id, { name: title }); }, onSuccess: onChanged });
  return <article className="post-card feed-activity-card"><header><div className="post-avatar">{activity.kind === "event" ? "E" : activity.kind === "place" ? "P" : activity.kind === "tag" ? "#" : "C"}</div><div className="post-author"><strong>{localizeActivityAction(activity.action, language)}</strong><span>{relativeTime(activity.occurredAt, language)}</span></div></header>{activity.imageUrl ? <img className="activity-cover" alt="" src={resolveMediaUrl(activity.imageUrl)}/> : null}<h2><Link to={activity.href}>{activity.title}</Link></h2>{activity.subtitle ? <p><RichText text={activity.subtitle}/></p> : null}<small>{formatActivityMeta(activity.meta, language)}</small><div className="post-actions"><Link to={activity.href}>{language === "tr" ? "Detayları gör" : "View details"}</Link><button onClick={() => void shareActivity(activity).then(setShareNotice)}>{language === "tr" ? "Paylaş" : "Share"}</button>{mine && (activity.kind === "event" || activity.kind === "place") ? <><button disabled={edit.isPending} onClick={() => { const title = window.prompt(language === "tr" ? activity.kind === "event" ? "Etkinlik adını düzenle" : "Mekân adını düzenle" : activity.kind === "event" ? "Edit event title" : "Edit place name", activity.title); if (title?.trim() && title.trim() !== activity.title) edit.mutate(title.trim()); }}>{language === "tr" ? "Düzenle" : "Edit"}</button><button disabled={archive.isPending} onClick={() => window.confirm(language === "tr" ? "İçerik yayından kaldırılsın mı?" : "Remove this content from publication?") && archive.mutate()}>{language === "tr" ? "Sil" : "Delete"}</button></> : null}{!mine && activity.ownerId ? <><Link aria-label={language === "tr" ? "Mesaj gönder" : "Send message"} title={language === "tr" ? "Mesaj gönder" : "Send message"} to={`/messages?peer=${activity.ownerId}`}><Mail size={17}/></Link>{canUseGuestLists ? <button onClick={() => setGuestListOpen(true)}>{language === "tr" ? "Guest List'e ekle" : "Add to Guest List"}</button> : null}</> : null}{!mine && userId ? <button onClick={() => setReportOpen(true)}>{language === "tr" ? "Rapor et" : "Report"}</button> : null}</div>{shareNotice ? <p className="form-success" role="status">{language === "tr" ? "İçerik bağlantısı kopyalandı." : "Content link copied."}</p> : null}{guestListOpen && activity.ownerId ? <GuestListDialog language={language} onClose={() => setGuestListOpen(false)} userId={activity.ownerId} userLabel={activity.title}/> : null}<ReportDialog onClose={() => setReportOpen(false)} open={reportOpen} targetId={activity.id} targetType={activity.kind as ReportTargetType}/></article>;
}

function PostCard({ canUseGuestLists, language, post, userId, onChanged }: { canUseGuestLists: boolean; language: "tr" | "en"; post: SocialPost; userId?: string; onChanged: () => void }) {
  const client = useQueryClient(); const [open, setOpen] = useState(false); const [comment, setComment] = useState(""); const [guestListOpen, setGuestListOpen] = useState(false); const [reportOpen, setReportOpen] = useState(false); const [shareNotice, setShareNotice] = useState(false);
  const comments = useQuery({ queryKey: ["post-comments", post.id], queryFn: () => listSocialPostComments(post.id), enabled: open });
  const following = useQuery({ queryKey: ["following", userId], queryFn: listFollowing, enabled: Boolean(userId && userId !== post.authorId) });
  const isFollowing = following.data?.some((member) => member.id === post.authorId) ?? false;
  const follow = useMutation({ mutationFn: () => isFollowing ? unfollowUser(post.authorId) : followUser(post.authorId), onSuccess: () => client.invalidateQueries({ queryKey: ["following"] }) });
  const like = useMutation({ mutationFn: () => toggleSocialPostLike(post.id), onSuccess: onChanged });
  const remove = useMutation({ mutationFn: () => deleteSocialPost(post.id), onSuccess: onChanged });
  const edit = useMutation({ mutationFn: (body: string) => updateSocialPost(post.id, body), onSuccess: onChanged });
  const addComment = useMutation({ mutationFn: () => createSocialPostComment(post.id, comment), onSuccess: () => { setComment(""); client.invalidateQueries({ queryKey: ["post-comments", post.id] }); onChanged(); } });
  return <article className="post-card" id={`post-${post.id}`}><header><UserIdentityLink user={{...post.author,id:post.authorId}} avatarClassName="post-avatar" showName={false}/><div className="post-author"><Link to={userProfilePath({...post.author,id:post.authorId})}>{post.author.name}{post.author.profileVerifiedAt ? <BadgeCheck size={16} aria-label={language === "tr" ? "Doğrulanmış profil" : "Verified profile"}/> : null}</Link><span>{post.author.username ? `@${post.author.username} · ` : ""}{relativeTime(post.createdAt, language)} · {visibilityLabels[language][post.visibility]}</span></div><div className="post-menu">{userId === post.authorId ? <><button title={language === "tr" ? "Gönderiyi düzenle" : "Edit post"} onClick={() => { const next = window.prompt(language === "tr" ? "Gönderiyi düzenle" : "Edit post", post.body); if (next?.trim() && next.trim() !== post.body) edit.mutate(next.trim()); }}>{language === "tr" ? "Düzenle" : "Edit"}</button><button title={language === "tr" ? "Gönderiyi sil" : "Delete post"} onClick={() => window.confirm(language === "tr" ? "Gönderi silinsin mi?" : "Delete this post?") && remove.mutate()}><Trash2 size={18}/></button></> : userId ? <button title={language === "tr" ? "Gönderiyi raporla" : "Report post"} onClick={() => setReportOpen(true)}><MoreHorizontal size={19}/></button> : null}</div></header><p className="post-body"><RichText text={post.body}/></p>
    {post.media.length ? <div className={`post-media-grid count-${Math.min(post.media.length, 4)}`}>{post.media.map((media) => media.type === "video" ? <video key={media.id} controls src={resolveMediaUrl(media.url)}/> : <img key={media.id} src={resolveMediaUrl(media.url)} alt={language === "tr" ? "Gönderi medyası" : "Post media"} loading="lazy"/>)}</div> : null}
    <div className="post-stats"><span>{post.likeCount} {language === "tr" ? "beğeni" : "likes"}</span><button onClick={() => setOpen((value) => !value)}>{post.commentCount} {language === "tr" ? "yorum" : "comments"}</button></div><div className="post-actions"><button className={post.liked ? "liked" : ""} disabled={!userId || like.isPending} onClick={() => like.mutate()}><Heart size={19} fill={post.liked ? "currentColor" : "none"}/> {language === "tr" ? "Beğen" : "Like"}</button><button onClick={() => setOpen((value) => !value)}><MessageCircle size={19}/> {language === "tr" ? "Yorum yap" : "Comment"}</button><button onClick={() => void sharePost(post, language).then(setShareNotice)}>{language === "tr" ? "Paylaş" : "Share"}</button>{userId && userId !== post.authorId ? <><button disabled={follow.isPending || following.isLoading} onClick={() => follow.mutate()}>{isFollowing ? language === "tr" ? "Takibi bırak" : "Unfollow" : language === "tr" ? "Takip et" : "Follow"}</button><Link aria-label={language === "tr" ? "Mesaj gönder" : "Send message"} title={language === "tr" ? "Mesaj gönder" : "Send message"} to={`/messages?peer=${post.authorId}`}><Mail size={17}/></Link>{canUseGuestLists ? <button onClick={() => setGuestListOpen(true)}>{language === "tr" ? "Guest List'e ekle" : "Add to Guest List"}</button> : null}<button onClick={() => setReportOpen(true)}>{language === "tr" ? "Rapor et" : "Report"}</button></> : null}</div>{shareNotice ? <p className="form-success" role="status">{language === "tr" ? "Gönderi bağlantısı kopyalandı." : "Post link copied."}</p> : null}
    {open ? <div className="post-comments">{comments.isLoading ? <span>{language === "tr" ? "Yorumlar yükleniyor…" : "Loading comments…"}</span> : comments.data?.map((item) => <div className="post-comment" key={item.id}><UserIdentityLink user={{...item.author,id:item.authorId}} avatarClassName="comment-avatar" showName={false}/><div><Link to={userProfilePath({...item.author,id:item.authorId})}><strong>{item.author.name}</strong></Link><p><RichText text={item.body}/></p><small>{relativeTime(item.createdAt, language)}</small></div></div>)}{userId ? <form onSubmit={(e) => { e.preventDefault(); if (comment.trim()) addComment.mutate(); }}><input value={comment} maxLength={1000} onChange={(e) => setComment(e.target.value)} placeholder={language === "tr" ? "Yorum yaz…" : "Write a comment…"}/><button aria-label={language === "tr" ? "Yorumu gönder" : "Send comment"} disabled={!comment.trim()}><Send size={18}/></button></form> : null}</div> : null}
    {guestListOpen ? <GuestListDialog language={language} onClose={() => setGuestListOpen(false)} userId={post.authorId} userLabel={post.author.username ? `@${post.author.username}` : post.author.name}/> : null}
    <ReportDialog onClose={() => setReportOpen(false)} open={reportOpen} targetId={post.id} targetType="post"/>
  </article>;
}

function GuestListDialog({ language, onClose, userId, userLabel }: { language: "tr" | "en"; onClose: () => void; userId: string; userLabel: string }) {
  const client = useQueryClient();
  const [newListName, setNewListName] = useState("");
  const lists = useQuery({ queryKey: ["guest-lists"], queryFn: listGuestLists });
  const add = useMutation({ mutationFn: (guestListId: string) => addGuestListMember(guestListId, userId), onSuccess: () => { void client.invalidateQueries({ queryKey: ["guest-lists"] }); onClose(); } });
  const create = useMutation({ mutationFn: () => createGuestList(newListName.trim()), onSuccess: () => { setNewListName(""); void client.invalidateQueries({ queryKey: ["guest-lists"] }); } });
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}><section aria-modal="true" className="content-dialog guest-list-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog"><button aria-label={language === "tr" ? "Kapat" : "Close"} className="passport-close" onClick={onClose} type="button">×</button><h2>{language === "tr" ? "Guest List'e ekle" : "Add to Guest List"}</h2><p>{language === "tr" ? `${userLabel} kullanıcısını eklemek istediğiniz listeyi seçin.` : `Choose the list where you want to add ${userLabel}.`}</p><div className="admin-list">{lists.data?.slice().sort((a, b) => a.name.localeCompare(b.name)).map((list) => <button className="admin-list-row" disabled={add.isPending || list.members.some((member) => member.userId === userId)} key={list.id} onClick={() => add.mutate(list.id)} type="button"><strong>{list.name}</strong><span>{list.members.length} {language === "tr" ? "kişi" : "people"}{list.members.some((member) => member.userId === userId) ? ` · ${language === "tr" ? "zaten listede" : "already added"}` : ""}</span></button>)}</div>{!lists.isLoading && !lists.data?.length ? <p className="form-help">{language === "tr" ? "Henüz bir Guest List oluşturmadınız." : "You have not created a Guest List yet."}</p> : null}<form className="row-actions" onSubmit={(event) => { event.preventDefault(); if (newListName.trim()) create.mutate(); }}><input aria-label={language === "tr" ? "Yeni liste adı" : "New list name"} maxLength={80} onChange={(event) => setNewListName(event.target.value)} placeholder={language === "tr" ? "Yeni liste adı" : "New list name"} value={newListName}/><button className="secondary-action" disabled={!newListName.trim() || create.isPending} type="submit">{language === "tr" ? "Liste oluştur" : "Create list"}</button></form>{add.isError || create.isError ? <p className="form-error">{language === "tr" ? "İşlem tamamlanamadı." : "The action could not be completed."}</p> : null}</section></div>;
}

function relativeTime(value: string | Date, language: "tr" | "en") { const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return language === "tr" ? "şimdi" : "now"; if (seconds < 3600) return `${Math.floor(seconds / 60)} ${language === "tr" ? "dk" : "min"}`; if (seconds < 86400) return `${Math.floor(seconds / 3600)} ${language === "tr" ? "sa" : "hr"}`; if (seconds < 604800) return `${Math.floor(seconds / 86400)} ${language === "tr" ? "gün" : "days"}`; return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "short" }).format(new Date(value)); }

function feedRange(time: "all" | "day" | "yesterday" | "week" | "month") { if (time === "all") return undefined; if (time === "yesterday") { const start = new Date(); start.setHours(0, 0, 0, 0); const to = new Date(start.getTime() - 1); start.setDate(start.getDate() - 1); return { from: start.toISOString(), to: to.toISOString() }; } return { from: new Date(Date.now() - (time === "day" ? 86_400_000 : time === "week" ? 604_800_000 : 2_592_000_000)).toISOString() }; }
async function sharePost(post: SocialPost, language: "tr" | "en") { const url = new URL(window.location.href); url.hash = `post-${post.id}`; const data = { title: language === "tr" ? `${post.author.name} gönderisi` : `Post by ${post.author.name}`, text: post.body, url: url.toString() }; if (navigator.share) { await navigator.share(data); return false; } await navigator.clipboard.writeText(`${post.body}\n${url.toString()}`); return true; }
async function shareActivity(activity: DiscoveryFeed["activities"][number]) { const url = new URL(activity.href, window.location.origin).toString(); if (navigator.share) { await navigator.share({ title: activity.title, text: activity.subtitle ?? activity.action, url }); return false; } await navigator.clipboard.writeText(url); return true; }

function localizeActivityAction(action: string, language: "tr" | "en") {
  if (language === "tr") return action;
  return ({ "Etkinlik oluşturuldu": "Event created", "Mekân oluşturuldu": "Place created", "İlgi alanı oluşturuldu": "Interest created", "Etkinliğe katıldı": "Joined an event", "Mekânı takip etti": "Followed a place" } as Record<string, string>)[action] ?? action;
}

function formatActivityMeta(meta: string | null | undefined, language: "tr" | "en") {
  if (!meta) return "";
  const parts = meta.split(" · ");
  const date = new Date(parts.at(-1) ?? "");
  if (Number.isNaN(date.getTime())) return localizeMetaText(meta, language);
  const formatted = new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
  return localizeMetaText([...parts.slice(0, -1), formatted].join(" · "), language);
}

function localizeMetaText(meta: string | null | undefined, language: "tr" | "en") {
  if (!meta || language === "tr") return meta ?? "";
  return meta
    .replace(/\btakipçi\b/gi, "followers")
    .replace(/\büye\b/gi, "members")
    .replace(/\bdavetli\b/gi, "invited")
    .replace(/\bkatılımcı\b/gi, "attendees")
    .replace(/\betkinlik\b/gi, "events");
}
