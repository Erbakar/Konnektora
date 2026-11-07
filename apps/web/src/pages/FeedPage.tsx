import { FollowStar } from "../components/MemberSignals";
import { EmbeddedMedia } from "../components/EmbeddedMedia";
import { MediaAlbum } from "../components/MediaAlbum";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CalendarDays, MapPin, Heart, ListFilter, Mail, MessageCircle, MoreVertical, Flag, Edit3, Share2, UserPlus, UserMinus, Send, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShareDialog } from "../components/ContentDialogs";
import { RichText } from "../components/RichText";
import { UserIdentityLink, userProfilePath } from "../components/UserIdentityLink";
import { ReportDialog } from "../components/ReportDialog";
import { AnnouncementPopup } from "../components/AnnouncementPopup";
import type { DiscoveryFeed, ReportTargetType, SocialPost } from "@konnektora/shared";
import { archiveMyEvent, archiveMyPlace, createSocialPostComment, deleteSocialPost, followUser, getDiscoveryFeed, getUserSession, listAnnouncements, listFollowing, listSocialPostComments, listSocialPosts, resolveMediaUrl, toggleSocialPostLike, unfollowUser, updateMyEvent, updateMyPlace, updateSocialPost } from "../lib/api";
import { useLanguage } from "../lib/i18n";
import { formatEventDateRange, formatPostDateTime, localizeCityName } from "../lib/formats";

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
  const feed = useQuery({ queryKey: ["social-feed", user?.id, tab, time], queryFn: () => listSocialPosts(tab, 1, range) });
  const announcements = useQuery({ queryKey: ["announcements", "feed", user?.id], queryFn: listAnnouncements, enabled: Boolean(user) });
  const feedAnnouncements = (announcements.data ?? []).filter((announcement) =>
    user && (announcement.target === "members" || announcement.target === (user.accountType === "corporate" ? "corporate_members" : "individual_members")),
  );
  const discovery = useQuery({ queryKey: ["discovery-feed", user?.id, time], queryFn: () => getDiscoveryFeed(range) });
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
    <section className="post-list" aria-live="polite">{feed.isLoading || discovery.isLoading ? <div className="feed-state">{language === "tr" ? "Akış yükleniyor…" : "Loading feed…"}</div> : feed.isError || discovery.isError ? <div className="feed-state">{language === "tr" ? "Akış şu anda yüklenemedi." : "The feed is currently unavailable."}</div> : !timeline.length ? <div className="feed-state"><strong>{language === "tr" ? "Bu filtrede içerik yok." : "There is no content for this filter."}</strong><span>{language === "tr" ? "Başka bir zaman aralığı deneyebilirsin." : "Try a different time range."}</span></div> : timeline.map((item) => item.type === "post" ? <PostCard key={`post-${item.post.id}`} language={language} post={item.post} userId={user?.id} onChanged={refresh}/> : <ActivityCard activity={item.activity} key={item.activity.activityId ?? `activity-${item.activity.kind}-${item.activity.id}-${item.activity.ownerId}-${item.activity.action}`} language={language} userId={user?.id} onChanged={() => { void discovery.refetch(); }}/>)}</section>
    {!discovery.isLoading && !discovery.isError && contentType === "all" && (discovery.data?.hiddenParticipantCount ?? 0) > 0 ? <article className="feed-state"><strong>{language === "tr" ? `Gösterilemeyen +${discovery.data!.hiddenParticipantCount} katılımcı` : `+${discovery.data!.hiddenParticipantCount} participants not displayed`}</strong><span>{language === "tr" ? "Bu kişiler henüz üyeliklerini tamamlamadı." : "These participants have not completed registration."}</span></article> : null}
  </div>;
}

function ActivityCard({ activity, language, userId, onChanged }: { activity: DiscoveryFeed["activities"][number]; language: "tr" | "en"; userId?: string; onChanged: () => void }) {
  const mine = Boolean(userId && activity.ownerId === userId && activity.canManageContent !== false);
  const eventVariant = activity.kind === "event" ? eventActivityVariant(activity.action) : null;
  const [expanded, setExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const archive = useMutation({ mutationFn: () => activity.kind === "event" ? archiveMyEvent(activity.id) : archiveMyPlace(activity.id), onSuccess: onChanged });
  const edit = useMutation({ mutationFn: async (title: string) => { if (activity.kind === "event") await updateMyEvent(activity.id, { title }); else await updateMyPlace(activity.id, { name: title }); }, onSuccess: onChanged });
  return <article className="post-card feed-activity-card"><header>{activity.actor ? <UserIdentityLink user={activity.actor} avatarClassName="post-avatar" showName={false}/> : <span className="post-avatar">K</span>}<div className="post-author">{activity.actor ? <FollowStar id={activity.actor.id}/> : null}{activity.actor ? <Link to={userProfilePath(activity.actor)}>{activity.actor.username ? `@${activity.actor.username}` : activity.actor.name}</Link> : null}<span className="activity-action">{localizeActivityAction(activity.action, language)}</span><span>{relativeTime(activity.occurredAt, language)}</span></div></header>{eventVariant ? <EventActivitySummary activity={activity} language={language} variant={eventVariant}/> : <>{activity.imageUrl ? <Link to={activity.href}><img className="activity-cover" alt={activity.title} src={resolveMediaUrl(activity.imageUrl)}/></Link> : null}{activity.title ? <h2><Link to={activity.href}>{activity.kind === "tag" ? `#${activity.title.replace(/^#/, "")}` : activity.title}</Link>{activity.place ? <> @<Link to={`/places/${activity.place.slug}`}>{activity.place.name}</Link></> : null}</h2> : null}
    {activity.body ? <div className="post-body"><span className="post-copy"><RichText text={expanded ? activity.body : activity.body.slice(0, 300)}/></span><EmbeddedMedia text={activity.body}/>{activity.body.length > 300 ? <button className="text-button" onClick={() => setExpanded(value => !value)}>{expanded ? language === "tr" ? "Daha az" : "Show less" : language === "tr" ? "Daha fazla" : "Show more"}</button> : null}</div> : null}
    {activity.media?.length ? <MediaAlbum items={activity.media} owner={activity.activityId?.startsWith("comment-") ? { contentType: activity.kind === "event" ? "event_comment" : activity.kind === "place" ? "place_comment" : "tag_comment", contentId: activity.activityId.slice("comment-".length), ownerId: activity.ownerId, queryKeys: [["discovery-feed"]] } : undefined}/> : null}
    {activity.tags?.length ? <div className="activity-tags">{activity.tags.slice(0, expanded ? undefined : 5).map((tag, index) => <span key={tag.id}>{index > 0 ? "; " : ""}<Link to={`/tags/${tag.slug}`}>#{tag.name}</Link></span>)}{activity.tags.length > 5 ? <button className="text-button" onClick={() => setExpanded(value => !value)}>{expanded ? language === "tr" ? "Daha az" : "Show less" : language === "tr" ? "Daha fazla" : "Show more"}</button> : null}</div> : null}{activity.subtitle ? <p><RichText text={activity.subtitle}/></p> : null}</>}{eventVariant ? null : <small>{formatActivityMeta(activity.meta, language)}</small>}<div className="post-actions">
      {!mine && activity.ownerId && activity.ownerId !== userId && userId ? <FeedFollowButton id={activity.ownerId} userId={userId} language={language}/> : null}
      {!mine && activity.ownerId && activity.ownerId !== userId && userId ? <Link to={`/messages?peer=${activity.ownerId}`}><Mail size={17}/>{language === "tr" ? "Mesaj gönder" : "Send message"}</Link> : null}
      <button className="feed-share" onClick={() => setShareOpen(true)}><Share2 size={17}/>{language === "tr" ? "Paylaş" : "Share"}</button>
      {userId ? <details className="action-menu"><summary aria-label={language === "tr" ? "Diğer işlemler" : "More actions"}><MoreVertical size={18}/></summary><div>
      {mine && (activity.kind === "event" || activity.kind === "place") ? <><button disabled={edit.isPending} onClick={() => { const title = window.prompt(language === "tr" ? "Başlığı düzenle" : "Edit title", activity.title); if (title?.trim() && title.trim() !== activity.title) edit.mutate(title.trim()); }}><Edit3 size={17}/>{language === "tr" ? "Düzenle" : "Edit"}</button><button disabled={archive.isPending} onClick={() => window.confirm(language === "tr" ? "İçerik yayından kaldırılsın mı?" : "Remove this content?") && archive.mutate()}><Trash2 size={17}/>{language === "tr" ? "Sil" : "Delete"}</button></> : null}
      {!mine ? <button onClick={() => setReportOpen(true)}><Flag size={17}/>{language === "tr" ? "Rapor et" : "Report"}</button> : null}
      </div></details> : null}
    </div><ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} targetType={activity.kind === "user" ? "user" : activity.kind} targetId={activity.id} title={activity.title} text={activity.subtitle ?? activity.action} url={new URL(activity.href, window.location.origin).toString()}/><ReportDialog onClose={() => setReportOpen(false)} open={reportOpen} targetId={activity.id} targetType={activity.kind as ReportTargetType}/></article>;
}

/** Kısa (ad/zaman/yer) ve geniş (avatar, etiket, açıklama) etkinlik kartı düzenleri (07/11 #6, #7, #33–#35). */
const joinedEventActions = new Set(["Etkinliğe katıldı", "Katıldığınız etkinliğe yeni bilet tanımlandı", "Katıldığınız etkinlik bilet satışına başladı", "Katıldığınız etkinlikte yeni bilet kontenjanı açıldı"]);
const createdEventActions = new Set(["Etkinlik oluşturuldu", "Takip ettiğiniz etiket etkinliğe eklendi"]);
function eventActivityVariant(action?: string | null) {
  if (action && joinedEventActions.has(action)) return "joined" as const;
  if (action && createdEventActions.has(action)) return "created" as const;
  return null;
}

/** Akıştaki etkinlik kartları: katılım kartı yalnız ad/zaman/yer; oluşturma kartı avatar, ad, zaman, yer, etiket ve açıklama. */
function EventActivitySummary({ activity, language, variant }: { activity: DiscoveryFeed["activities"][number]; language: "tr" | "en"; variant: "joined" | "created" }) {
  const [expanded, setExpanded] = useState(false);
  const locale = language === "tr" ? "tr-TR" : "en-GB";
  const startsAt = activity.startsAt ? new Date(activity.startsAt).toISOString() : null;
  const endsAt = activity.endsAt ? new Date(activity.endsAt).toISOString() : null;
  const city = localizeCityName(activity.city, language);
  const venue = activity.place ? <Link to={`/places/${activity.place.slug}`}>{activity.place.name}</Link> : activity.locationName ? <>{activity.locationName}</> : null;
  const description = activity.subtitle ?? "";
  return <div className={`feed-event-summary is-${variant}`}>
    <div className="feed-event-summary-head">
      {variant === "created" ? <Link className="feed-event-avatar" to={activity.href}>{activity.imageUrl ? <img alt="" src={resolveMediaUrl(activity.imageUrl)}/> : <CalendarDays size={22}/>}</Link> : null}
      <div>
        <h2><Link to={activity.href}>{activity.title}</Link></h2>
        {startsAt ? <p className="feed-event-line"><CalendarDays size={15}/>{formatEventDateRange(startsAt, endsAt, { locale })}</p> : null}
        {venue || city ? <p className="feed-event-line"><MapPin size={15}/><span>{venue}{venue && city ? ", " : ""}{city}</span></p> : null}
      </div>
    </div>
    {variant === "created" && activity.tags?.length ? <div className="activity-tags">{activity.tags.slice(0, expanded ? undefined : 5).map((tag, index) => <span key={tag.id}>{index > 0 ? "; " : ""}<Link to={`/tags/${tag.slug}`}>#{tag.name}</Link></span>)}</div> : null}
    {variant === "created" && description ? <p className="post-copy feed-event-description"><RichText text={expanded ? description : description.slice(0, 300)}/>{description.length > 300 || (activity.tags?.length ?? 0) > 5 ? <button className="text-button" onClick={() => setExpanded(value => !value)} type="button">{expanded ? language === "tr" ? "Daha az" : "Show less" : language === "tr" ? "Daha fazla" : "Show more"}</button> : null}</p> : variant === "created" && (activity.tags?.length ?? 0) > 5 ? <button className="text-button" onClick={() => setExpanded(value => !value)} type="button">{expanded ? language === "tr" ? "Daha az" : "Show less" : language === "tr" ? "Daha fazla" : "Show more"}</button> : null}
  </div>;
}

function PostCard({ language, post, userId, onChanged }: { language: "tr" | "en"; post: SocialPost; userId?: string; onChanged: () => void }) {
  const client = useQueryClient(); const [open, setOpen] = useState(false); const [comment, setComment] = useState(""); const [reportOpen, setReportOpen] = useState(false); const [shareOpen, setShareOpen] = useState(false);
  const comments = useQuery({ queryKey: ["post-comments", post.id], queryFn: () => listSocialPostComments(post.id), enabled: open });
  const following = useQuery({ queryKey: ["following", userId], queryFn: listFollowing, enabled: Boolean(userId && userId !== post.authorId) });
  const isFollowing = following.data?.some((member) => member.id === post.authorId) ?? false;
  const follow = useMutation({ mutationFn: () => isFollowing ? unfollowUser(post.authorId) : followUser(post.authorId), onSuccess: () => client.invalidateQueries({ queryKey: ["following"] }) });
  const like = useMutation({ mutationFn: () => toggleSocialPostLike(post.id), onSuccess: onChanged });
  const remove = useMutation({ mutationFn: () => deleteSocialPost(post.id), onSuccess: onChanged });
  const edit = useMutation({ mutationFn: (body: string) => updateSocialPost(post.id, body), onSuccess: onChanged });
  const addComment = useMutation({ mutationFn: () => createSocialPostComment(post.id, comment), onSuccess: () => { setComment(""); client.invalidateQueries({ queryKey: ["post-comments", post.id] }); onChanged(); } });
  return <article className="post-card" id={`post-${post.id}`}><header><UserIdentityLink user={{...post.author,id:post.authorId}} avatarClassName="post-avatar" showName={false}/><div className="post-author"><FollowStar id={post.authorId}/><Link to={userProfilePath({...post.author,id:post.authorId})}>{post.author.name}{post.author.profileVerifiedAt ? <BadgeCheck size={16} aria-label={language === "tr" ? "Doğrulanmış profil" : "Verified profile"}/> : null}</Link><span>{post.author.username ? <><Link to={userProfilePath({...post.author,id:post.authorId})}>@{post.author.username}</Link> · </> : null}{relativeTime(post.createdAt, language)} · {visibilityLabels[language][post.visibility]}</span></div></header><div className="post-body"><span className="post-copy"><RichText text={post.body}/></span><EmbeddedMedia text={post.body}/></div>
    {post.media.length ? <div className={`post-media-grid count-${Math.min(post.media.length, 4)}`}>{post.media.map((media) => media.type === "video" ? <video key={media.id} controls src={resolveMediaUrl(media.url)}/> : <img key={media.id} src={resolveMediaUrl(media.url)} alt={language === "tr" ? "Gönderi medyası" : "Post media"} loading="lazy"/>)}</div> : null}
    <div className="post-stats"><span>{post.likeCount} {language === "tr" ? "beğeni" : "likes"}</span><button onClick={() => setOpen((value) => !value)}>{post.commentCount} {language === "tr" ? "yorum" : "comments"}</button></div><div className="post-actions"><button className={`feed-like ${post.liked ? "liked" : ""}`} disabled={!userId || like.isPending} onClick={() => like.mutate()}><Heart size={19} fill={post.liked ? "currentColor" : "none"}/> {language === "tr" ? "Beğen" : "Like"}</button><button className="feed-comment" onClick={() => setOpen((value) => !value)}><MessageCircle size={19}/> {language === "tr" ? "Yorum yap" : "Comment"}</button><button className="feed-share" onClick={() => setShareOpen(true)}><Share2 size={17}/>{language === "tr" ? "Paylaş" : "Share"}</button>{userId && userId !== post.authorId ? <><button className="feed-follow" disabled={follow.isPending || following.isLoading} onClick={() => follow.mutate()}>{isFollowing ? <UserMinus size={17}/> : <UserPlus size={17}/>}{isFollowing ? language === "tr" ? "Takibi bırak" : "Unfollow" : language === "tr" ? "Takip et" : "Follow"}</button><Link className="feed-message" aria-label={language === "tr" ? "Mesaj gönder" : "Send message"} title={language === "tr" ? "Mesaj gönder" : "Send message"} to={`/messages?peer=${post.authorId}`}><Mail size={17}/>{language === "tr" ? "Mesaj gönder" : "Send message"}</Link><details className="action-menu"><summary aria-label={language === "tr" ? "Diğer işlemler" : "More actions"}><MoreVertical size={18}/></summary><div><button onClick={() => setReportOpen(true)}><Flag size={17}/>{language === "tr" ? "Rapor et" : "Report"}</button></div></details></> : null}{userId === post.authorId ? <><button title={language === "tr" ? "Gönderiyi düzenle" : "Edit post"} onClick={() => { const next = window.prompt(language === "tr" ? "Gönderiyi düzenle" : "Edit post", post.body); if (next?.trim() && next.trim() !== post.body) edit.mutate(next.trim()); }}><Edit3 size={17}/>{language === "tr" ? "Düzenle" : "Edit"}</button><button title={language === "tr" ? "Gönderiyi sil" : "Delete post"} onClick={() => window.confirm(language === "tr" ? "Gönderi silinsin mi?" : "Delete this post?") && remove.mutate()}><Trash2 size={18}/></button></> : null}</div><ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} targetType="post" targetId={post.id} title={post.author.name} text={post.body} url={new URL(`/feed#post-${post.id}`, window.location.origin).toString()}/>
    {open ? <div className="post-comments">{comments.isLoading ? <span>{language === "tr" ? "Yorumlar yükleniyor…" : "Loading comments…"}</span> : comments.data?.map((item) => <div className="post-comment" key={item.id}><UserIdentityLink user={{...item.author,id:item.authorId}} avatarClassName="comment-avatar" showName={false} showFollow/><div><Link to={userProfilePath({...item.author,id:item.authorId})}><strong>{item.author.name}</strong></Link><p className="post-copy"><RichText text={item.body}/></p><small>{relativeTime(item.createdAt, language)}</small></div></div>)}{userId ? <form onSubmit={(e) => { e.preventDefault(); if (comment.trim()) addComment.mutate(); }}><input value={comment} maxLength={1000} onChange={(e) => setComment(e.target.value)} placeholder={language === "tr" ? "Yorum yaz…" : "Write a comment…"}/><button aria-label={language === "tr" ? "Yorumu gönder" : "Send comment"} disabled={!comment.trim()}><Send size={18}/></button></form> : null}</div> : null}
    <ReportDialog onClose={() => setReportOpen(false)} open={reportOpen} targetId={post.id} targetType="post"/>
  </article>;
}

function relativeTime(value: string | Date, language: "tr" | "en") { return formatPostDateTime(value, language); }

function feedRange(time: "all" | "day" | "yesterday" | "week" | "month") { if (time === "all") return undefined; if (time === "yesterday") { const start = new Date(); start.setHours(0, 0, 0, 0); const to = new Date(start.getTime() - 1); start.setDate(start.getDate() - 1); return { from: start.toISOString(), to: to.toISOString() }; } return { from: new Date(Date.now() - (time === "day" ? 86_400_000 : time === "week" ? 604_800_000 : 2_592_000_000)).toISOString() }; }
function localizeActivityAction(action: string, language: "tr" | "en") {
  if (language === "tr") return action;
  return ({ "Etkinlik oluşturuldu": "Event created", "Mekân oluşturuldu": "Place created", "İlgi alanı oluşturuldu": "Interest created", "Etkinliğe katıldı": "Joined an event", "Mekânı takip etti": "Followed a place", "Mekâna katıldı": "Joined a place", "Etiket oluşturuldu": "Created an interest", "Etiketleri profiline yapıştırdı": "Added interests to their profile", "Profiline yeni medya ekledi": "Added new media to their profile", "Etikete ileti yazdı": "Posted to an interest", "Etkinliğe ileti yazdı": "Posted to an event", "Mekâna ileti yazdı": "Posted to a place", "Etkinlik yöneticisi ileti yazdı": "Event manager posted", "Mekân yöneticisi ileti yazdı": "Place manager posted", "Katıldığınız etkinlikte yeni bilet kontenjanı açıldı": "More tickets are available for your event", "Katıldığınız etkinliğe yeni bilet tanımlandı": "New tickets were added to your event", "Katıldığınız etkinlik bilet satışına başladı": "Ticket sales have started for your event", "Takip ettiğiniz etiket etkinliğe eklendi": "An interest you follow was added to an event" } as Record<string, string>)[action] ?? action;
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

function FeedFollowButton({id,userId,language}:{id:string;userId:string;language:"tr"|"en"}) {
 const client=useQueryClient();
 const following=useQuery({queryKey:["following",userId],queryFn:listFollowing});
 const active=following.data?.some(member=>member.id===id)??false;
 const follow=useMutation({mutationFn:()=>active?unfollowUser(id):followUser(id),onSuccess:()=>client.invalidateQueries({queryKey:["following"]})});
 if(id===userId)return null;
 return <><button className="feed-follow" disabled={follow.isPending||following.isLoading} onClick={()=>follow.mutate()}>{active?<UserMinus size={17}/>:<UserPlus size={17}/>} {active?language==="tr"?"Takibi bırak":"Unfollow":language==="tr"?"Takip et":"Follow"}</button>{follow.isError ? <span role="alert" className="form-error">{follow.error.message}</span> : null}</>;
}
