import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CalendarDays,
  Eye,
  Edit3,
  Flag,
  Hash,
  Heart,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  MoreVertical,
  RefreshCw,
  Search,
  Share2,
  SlidersHorizontal,
  Trash2,
  ThumbsDown,
  UserPlus,
  Users,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { RichText } from "../components/RichText";
import { ContentComments } from "../components/ContentComments";
import { userProfilePath } from "../components/UserIdentityLink";
import { NotificationDialog, ShareDialog } from "../components/ContentDialogs";
import { ReportDialog } from "../components/ReportDialog";
import { ComposerTips } from "../components/ComposerTips";
import { EmbeddedMedia } from "../components/EmbeddedMedia";
import type { ReportTargetType, TagSentiment } from "@konnektora/shared";
import {
  createTagComment,
  createGuestList,
  createUserTag,
  deleteTagComment,
  followUser,
  getContentNotification,
  getProfileAffinities,
  getTagStats,
  getUserSession,
  addGuestListMember,
  likeTagComment,
  listFollowing,
  listEvents,
  listGuestLists,
  listTagComments,
  listTagRelatedUsers,
  listTags,
  recordContentView,
  resolveMediaUrl,
  setContentNotification,
  unfollowUser,
  updateProfileAffinities,
  updateTagComment,
  uploadTagCommentMedia,
} from "../lib/api";
import { useLanguage } from "../lib/i18n";
import { useGuestListEntitlement } from "../lib/useGuestListEntitlement";

export function TagsPage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const [searchParams, setSearchParams] = useSearchParams();
  const authorFilter = searchParams.get("author")?.replace(/^@/, "").toLocaleLowerCase("tr") ?? "";
  const authorIdFilter = searchParams.get("authorId") ?? "";
  const { slug } = useParams();
  const navigate = useNavigate();
  const user = getUserSession();
  const { canUseGuestLists } = useGuestListEntitlement();
  const client = useQueryClient();
  const [query, setQuery] = useState(() => searchParams.get("create") ?? "");
  const [directoryFilters, setDirectoryFilters] = useState({
    createdFrom: "",
    createdTo: "",
    country: "",
    city: "",
  });
  const [directoryTab, setDirectoryTab] = useState<
    "popular" | "for_you" | "following" | "new"
  >("popular");
  const [commentQuery, setCommentQuery] = useState("");
  const [postTab, setPostTab] = useState<
    "all" | "popular" | "following" | "photo" | "video"
  >("all");
  const [guestAuthor, setGuestAuthor] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedTagMedia, setSelectedTagMedia] = useState<File[]>([]);
  const [reportTarget, setReportTarget] = useState<{ type: ReportTargetType; id: string } | null>(null);
  const tags = useQuery({
    queryKey: ["tags", slug ? "detail" : directoryFilters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (!slug) {
        Object.entries(directoryFilters).forEach(([key, value]) => {
          if (value) params.set(key, value);
        });
      }
      return listTags(params);
    },
  });
  const tag = tags.data?.find((item) => item.slug === slug);
  const affinities = useQuery({
    queryKey: ["profile-affinities", user?.id],
    queryFn: getProfileAffinities,
    enabled: Boolean(user),
  });
  const comments = useQuery({
    queryKey: ["tag-comments", tag?.id],
    queryFn: () => listTagComments(tag!.id),
    enabled: Boolean(tag),
  });
  useEffect(() => {
    if (!comments.data || !window.location.hash.startsWith("#post-")) return;
    window.requestAnimationFrame(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "center" }));
  }, [comments.data]);
  const stats = useQuery({
    queryKey: ["tag-stats", tag?.id],
    queryFn: () => getTagStats(tag!.id),
    enabled: Boolean(tag && user && ["admin", "super_admin", "curator"].includes(user.role)),
  });
  const relatedUsers = useQuery({ queryKey: ["tag", tag?.id, "related-users"], queryFn: () => listTagRelatedUsers(tag!.id), enabled: Boolean(tag) });
  const relatedEvents = useQuery({ queryKey: ["tag", tag?.id, "future-events"], queryFn: () => listEvents(new URLSearchParams({ tag: tag!.slug, dateFrom: new Date().toISOString().slice(0, 10), pageSize: "1" })), enabled: Boolean(tag) });
  const following = useQuery({
    queryKey: ["following", user?.id],
    queryFn: listFollowing,
    enabled: Boolean(user),
  });
  const namedGuestLists = useQuery({
    queryKey: ["guest-lists", user?.id, "tag-post"],
    queryFn: listGuestLists,
    enabled: Boolean(user && canUseGuestLists && guestAuthor),
  });
  const notificationQuery = useQuery({
    queryKey: ["content-notification", "tag", tag?.id],
    queryFn: () => getContentNotification("tag", tag!.id),
    enabled: Boolean(user && tag),
  });
  const notificationMutation = useMutation({
    mutationFn: () =>
      setContentNotification("tag", tag!.id, !notificationQuery.data?.enabled),
    onSuccess: (result) => {
      client.setQueryData(["content-notification", "tag", tag?.id], result);
      setNotificationOpen(false);
    },
  });
  const sentiment = affinities.data?.find(
    (item) => item.tag.id === tag?.id,
  )?.sentiment;
  const save = useMutation({
    mutationFn: (next: TagSentiment) =>
      updateProfileAffinities([
        ...(affinities.data ?? [])
          .filter((item) => item.tag.id !== tag?.id)
          .map((item) => ({ tagId: item.tag.id, sentiment: item.sentiment })),
        { tagId: tag!.id, sentiment: next },
      ]),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["profile-affinities"] }),
        client.invalidateQueries({ queryKey: ["tag", tag?.id, "related-users"] }),
        client.invalidateQueries({ queryKey: ["tags"] }),
      ]);
    },
  });
  const post = useMutation({
    mutationFn: async ({ body, files }: { body: string; files: File[] }) => {
      const created = await createTagComment(tag!.id, body);
      await Promise.all(files.map((file) => uploadTagCommentMedia(created.id, file)));
      return created;
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["tag-comments", tag?.id] });
      void client.invalidateQueries({ queryKey: ["tag-stats", tag?.id] });
      setSelectedTagMedia([]);
      window.setTimeout(() => document.querySelector(".tag-post-card")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    },
  });
  const like = useMutation({
    mutationFn: likeTagComment,
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ["tag-comments", tag?.id] }),
  });
  const edit = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      updateTagComment(id, body),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ["tag-comments", tag?.id] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteTagComment(tag!.id, id),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ["tag-comments", tag?.id] }),
  });
  const follow = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? unfollowUser(id) : followUser(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["following"] }),
  });
  const addToNamedGuestList = useMutation({
    mutationFn: (listId: string) => addGuestListMember(listId, guestAuthor!.id),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["guest-lists"] }),
  });
  const createNamedGuestList = useMutation({
    mutationFn: createGuestList,
    onSuccess: () => void client.invalidateQueries({ queryKey: ["guest-lists"] }),
  });
  const create = useMutation({
    mutationFn: () => createUserTag({ name: query.trim() }),
    onSuccess: (created) => {
      void client.invalidateQueries({ queryKey: ["tags"] });
      navigate(`/tags/${created.slug}`);
    },
  });
  const visibleTags = useMemo(
    () =>
      [...(tags.data ?? [])]
        .filter((item) =>
          item.name
            .toLocaleLowerCase("tr")
            .includes(query.toLocaleLowerCase("tr")),
        )
        .sort((a, b) =>
          directoryTab === "new"
            ? a.usageCount - b.usageCount
            : directoryTab === "following" || directoryTab === "for_you"
              ? Number(
                  affinities.data?.some((entry) => entry.tag.id === b.id),
                ) -
                  Number(
                    affinities.data?.some((entry) => entry.tag.id === a.id),
                  ) || b.usageCount - a.usageCount
              : b.usageCount - a.usageCount,
        ),
    [tags.data, query, directoryTab, affinities.data],
  );
  const followingIds = new Set(
    (following.data ?? []).map((member) => member.id),
  );
  const visibleComments = [...(comments.data ?? [])]
    .filter((comment) => {
      const matches =
        !commentQuery ||
        `${comment.body} ${comment.author?.name ?? ""} ${comment.author?.username ?? ""}`
          .toLocaleLowerCase("tr")
          .includes(commentQuery.toLocaleLowerCase("tr"));
      if (!matches) return false;
      if (authorIdFilter && comment.author?.id !== authorIdFilter) return false;
      if (!authorIdFilter && authorFilter && comment.author?.username?.toLocaleLowerCase("tr") !== authorFilter) return false;
      if (postTab === "following")
        return Boolean(comment.author && followingIds.has(comment.author.id));
      if (postTab === "photo" || postTab === "video")
        return Boolean(
          comment.media?.some(
            (media) => media.type === (postTab === "photo" ? "image" : "video"),
          ),
        );
      return true;
    })
    .sort((a, b) =>
      postTab === "popular"
        ? b.likeCount - a.likeCount
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  useEffect(() => {
    if (tag?.id) void recordContentView("tag", tag.id);
  }, [tag?.id]);

  if (!slug)
    return (
      <section className="page tags-directory">
        <div className="section-header">
          <div>
            <p className="eyebrow">{t("Keşfet", "Discover")}</p>
            <h1>{t("İlgi alanları", "Interests")}</h1>
            <p className="lead">
              {t("Toplulukları konu başlıklarına göre keşfet, ilgilendiklerini profiline ekle ve sohbete katıl.", "Discover communities by topic, add your interests to your profile and join the conversation.")}
            </p>
          </div>
        </div>
        <label className="tag-search">
          <Search size={18} />
          <input
            aria-label={t("İlgi alanı ara", "Search interests")}
            placeholder={t("İlgi alanı ara veya oluştur…", "Search or create an interest…")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <details className="collapsed-filter-panel">
          <summary><SlidersHorizontal size={17}/> {t("Filtrele", "Filter")}</summary>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              setDirectoryFilters({
                createdFrom: String(form.get("createdFrom") || ""),
                createdTo: String(form.get("createdTo") || ""),
                country: String(form.get("country") || "").trim(),
                city: String(form.get("city") || "").trim(),
              });
            }}
          >
            <label>{t("Oluşturulma tarihi — Başlangıç", "Created — From")}<input defaultValue={directoryFilters.createdFrom} name="createdFrom" type="date"/></label>
            <label>{t("Oluşturulma tarihi — Bitiş", "Created — To")}<input defaultValue={directoryFilters.createdTo} name="createdTo" type="date"/></label>
            <label>{t("Oluşturulduğu ülke", "Country created")}<input defaultValue={directoryFilters.country} name="country" placeholder={t("Ülke", "Country")}/></label>
            <label>{t("Oluşturulduğu şehir", "City created")}<input defaultValue={directoryFilters.city} name="city" placeholder={t("Şehir", "City")}/></label>
            <div className="row-actions">
              <button className="primary-action" type="submit">{t("Uygula", "Apply")}</button>
              <button className="secondary-action" onClick={(event) => { event.currentTarget.form?.reset(); setDirectoryFilters({ createdFrom: "", createdTo: "", country: "", city: "" }); }} type="button">{t("Temizle", "Clear")}</button>
            </div>
          </form>
        </details>
        <div className="feed-tabs" role="tablist">
          {(["popular", "for_you", "following", "new"] as const).map(
            (value) => (
              <button
                className={directoryTab === value ? "active" : ""}
                key={value}
                onClick={() => setDirectoryTab(value)}
              >
                {value === "popular"
                  ? t("Popüler", "Popular")
                  : value === "for_you"
                    ? t("Sana özel", "For you")
                    : value === "following"
                      ? t("Takip ettiklerin", "Following")
                      : t("Yeni", "New")}
              </button>
            ),
          )}
        </div>
        {tags.isLoading ? (
          <div className="empty-state">
            <LoaderCircle className="spin" size={34} />
            <p>{t("İlgi alanları yükleniyor…", "Loading interests…")}</p>
          </div>
        ) : null}
        {tags.isError ? (
          <div className="empty-state">
            <Hash size={38} />
            <h2>{t("İlgi alanları yüklenemedi", "Interests could not be loaded")}</h2>
            <p>{t("Bağlantını kontrol edip yeniden deneyebilirsin.", "Check your connection and try again.")}</p>
            <button
              className="secondary-action"
              onClick={() => void tags.refetch()}
            >
              <RefreshCw size={17} />
              {t("Yeniden dene", "Try again")}
            </button>
          </div>
        ) : null}
        {visibleTags.length ? (
          <div className="tag-directory-grid">
            {visibleTags.map((item) => (
              <Link
                className="tag-directory-card"
                key={item.id}
                to={`/tags/${item.slug}`}
              >
                <Hash size={16} />
                <strong>{item.name}</strong>
              </Link>
            ))}
          </div>
        ) : null}
        {!tags.isLoading && !tags.isError && !visibleTags.length ? (
          <div className="empty-state">
            <Hash size={38} />
            <h2>{t("Sonuç bulunamadı", "No results found")}</h2>
            <p>
              {user
                ? t("Bu adla yeni bir ilgi alanı oluşturabilirsin.", "You can create a new interest with this name.")
                : t("Yeni ilgi alanı oluşturmak için giriş yap.", "Log in to create a new interest.")}
            </p>
            {user && query.trim().length >= 2 ? <button className="primary-action" disabled={create.isPending} onClick={() => create.mutate()} type="button">{create.isPending ? t("Oluşturuluyor…", "Creating…") : t(`“${query.trim()}” ilgi alanını oluştur`, `Create “${query.trim()}” interest`)}</button> : null}
          </div>
        ) : null}
      </section>
    );
  if (!tag && !tags.isLoading)
    return (
      <section className="page empty-state">
        <Hash size={42} />
        <h1>{t("İlgi alanı bulunamadı", "Interest not found")}</h1>
        <Link to="/tags">{t("Tüm ilgi alanları", "All interests")}</Link>
      </section>
    );
  if (!tag) return <section className="page empty-state">{t("Yükleniyor…", "Loading…")}</section>;
  return (
    <section className="page">
      <Link className="back-link" to="/tags">
        ← {t("İlgi alanları", "Interests")}
      </Link>
      <div className="section-header">
        <div>
          <p className="eyebrow">{t("İlgi alanı", "Interest")}</p>
          <h1>#{tag.name}</h1>
        </div>
        <div className="row-actions">
          <button
            className="secondary-action"
            aria-pressed={notificationQuery.data?.enabled}
            disabled={!user || notificationMutation.isPending}
            onClick={() => setNotificationOpen(true)}
          >
            <Bell size={17} />
            {notificationQuery.data?.enabled
              ? t("Bildirim açık", "Notifications on")
              : t("Bildirim kapalı", "Notifications off")}
          </button>
          <button
            className="secondary-action"
            onClick={() => setShareOpen(true)}
          >
            <Share2 size={17} />
            {t("Paylaş", "Share")}
          </button>
          <details className="detail-action-menu"><summary aria-label={t("Etiket işlemleri", "Tag actions")}><MoreVertical size={20}/></summary><div>
            <Link to={user ? `/stats/tag/${tag.id}` : `/login?next=${encodeURIComponent(`/stats/tag/${tag.id}`)}`}><Eye size={17}/>{t("Etkileşim istatistikleri", "Engagement statistics")}</Link>
            {user ? <button onClick={() => setReportTarget({ type: "tag", id: tag.id })}><Flag size={17}/>{t("Etiketi rapor et", "Report tag")}</button> : null}
          </div></details>
        </div>
      </div>
      <section className="admin-form tag-sentiment-panel">
        <h2>{t("Profilime ekle", "Add to my profile")}</h2>
        <p className="form-help">{t("Bu başlığın size ne düşündürdüğünü ve ne hissettirdiğini seçin.", "Choose how this topic makes you think and feel.")}</p>
        <div className="row-actions tag-sentiment-actions">
          {(["like", "ok", "dislike"] as TagSentiment[]).map((value) => (
            <button
              className={
                sentiment === value ? "primary-action" : "secondary-action"
              }
              disabled={!user || save.isPending}
              key={value}
              onClick={() => save.mutate(value)}
            >
              {value === "like" ? <><Heart size={17}/> {t("Beğeniyorum", "Like")}</> : value === "ok" ? <><Minus size={17}/> {t("Sorun değil", "Neutral")}</> : <><ThumbsDown size={17}/> {t("Beğenmiyorum", "Dislike")}</>}
            </button>
          ))}
        </div>
        {!user ? (
          <p className="form-help">{t("Etiketi profiline eklemek için giriş yap.", "Log in to add the tag to your profile.")}</p>
        ) : null}
      </section>
      <section className="admin-form tag-related-users-preview">
        <h2>{t("Profiline ekleyen kişiler", "People who added it to their profile")}</h2>
        <div><span className="attendee-avatar-stack">{(relatedUsers.data ?? []).slice(0, 8).map((member) => <Link key={member.id} title={t(`${member.name} profilini aç`, `Open ${member.name}'s profile`)} to={userProfilePath(member)}>{member.avatarUrl ? <img alt="" src={resolveMediaUrl(member.avatarUrl)}/> : member.name[0]}</Link>)}</span><Link to={`/tags/${tag.slug}/users`}><strong>{t(`${relatedUsers.data?.length ?? tag.usageCount} kullanıcının tümünü göster`, `Show all ${relatedUsers.data?.length ?? tag.usageCount} users`)}</strong></Link></div>
      </section>
      {relatedEvents.data?.total ? <Link className="tag-related-events-notice" to={`/events?tag=${encodeURIComponent(tag.slug)}`}>{t(`${relatedEvents.data.total} ilişkili devam eden veya gelecek etkinlik bulundu.`, `${relatedEvents.data.total} related ongoing or upcoming events found.`)}</Link> : null}
      {user && ["admin", "super_admin", "curator"].includes(user.role) ? <section className="tag-public-stats" id="tag-stats">
        {[
          { Icon: Users, value: stats.data?.followers ?? 0, label: t("takipçi", "followers") },
          { Icon: Heart, value: stats.data?.likes ?? 0, label: t("beğeni", "likes") },
          { Icon: Minus, value: stats.data?.ok ?? 0, label: t("nötr", "neutral") },
          { Icon: ThumbsDown, value: stats.data?.dislikes ?? 0, label: t("beğenmeme", "dislikes") },
          {
            Icon: CalendarDays,
            value: stats.data?.events ?? 0,
            label: t("etkinlik", "events"),
          },
          { Icon: MapPin, value: stats.data?.places ?? 0, label: t("mekân", "places") },
          {
            Icon: MessageCircle,
            value: stats.data?.posts ?? 0,
            label: t("gönderi", "posts"),
          },
          { Icon: Eye, value: stats.data?.views ?? 0, label: t("görüntülenme", "views") },
          { Icon: MessageCircle, value: stats.data?.reactions ?? 0, label: t("post beğenisi", "post likes") },
          { Icon: Eye, value: stats.data?.engagementRate ?? 0, label: t("% etkileşim", "% engagement") },
        ].map(({ Icon, value, label }) => (
          <article key={label}>
            <Icon size={19} />
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section> : null}
      <section className="admin-form">
        {authorFilter || authorIdFilter ? <div className="filter-notice"><span>{t(`${authorFilter ? `@${authorFilter}` : "Seçilen kullanıcı"} gönderileri filtreleniyor.`, `Filtering posts by ${authorFilter ? `@${authorFilter}` : "the selected user"}.`)}</span><button onClick={() => { const next = new URLSearchParams(searchParams); next.delete("author"); next.delete("authorId"); setSearchParams(next); }} type="button">{t("Temizle", "Clear")}</button></div> : null}
        <div className="section-header compact">
          <h2>
            <MessageCircle size={18} /> {t("Bu etiketteki gönderiler", "Posts for this tag")}
          </h2>
          <span>{t(`${comments.data?.length ?? 0} sonuç`, `${comments.data?.length ?? 0} results`)}</span>
        </div>
        <details className="collapsed-filter-panel tag-detail-filters">
          <summary><SlidersHorizontal size={17}/> {t("Gönderileri filtrele", "Filter posts")}</summary>
          <div className="feed-tabs">
          {(["all", "popular", "following", "photo", "video"] as const).map(
            (value) => (
              <button
                className={postTab === value ? "active" : ""}
                key={value}
                onClick={() => setPostTab(value)}
                type="button"
              >
                {value === "all"
                  ? t("Tümü", "All")
                  : value === "popular"
                    ? t("Popüler", "Popular")
                    : value === "following"
                      ? t(`Takip ettiklerim (${(comments.data ?? []).filter((comment) => comment.author && followingIds.has(comment.author.id)).length})`, `Following (${(comments.data ?? []).filter((comment) => comment.author && followingIds.has(comment.author.id)).length})`)
                      : value === "photo"
                        ? t("Fotoğraf", "Photo")
                        : "Video"}
              </button>
            ),
          )}
          <label className="tag-tab-search"><Search size={16}/><input aria-label={t("Gönderilerde ara", "Search posts")} placeholder={t("Ara…", "Search…")} value={commentQuery} onChange={(event) => setCommentQuery(event.target.value)}/></label>
          </div>
        </details>
        {user ? (
          <form
            className="tag-post-composer"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const input = event.currentTarget.elements.namedItem(
                "body",
              ) as HTMLTextAreaElement;
              if (input.value.trim() || selectedTagMedia.length)
                post.mutate(
                  { body: input.value.trim(), files: selectedTagMedia },
                  { onSuccess: () => event.currentTarget.reset() },
                );
            }}
          >
            <textarea
              name="body"
              minLength={1}
              maxLength={2000}
              placeholder={(comments.data?.length ?? 0) === 0 ? t(`#${tag.name} hakkında ilk yorumu yazan sen ol…`, `Be the first to post about #${tag.name}…`) : t(`#${tag.name} hakkında bir şey yaz…`, `Write something about #${tag.name}…`)}
            />
            <div>
              <button className="primary-action" disabled={post.isPending}>
                {t("Yayınla", "Publish")}
              </button>
              <label className="secondary-action">
                {t("Resim/video ekle", "Add image/video")}
                <input
                  accept="image/*,video/mp4,video/webm"
                  hidden
                  multiple
                  name="media"
                  type="file"
                  onChange={(event) => setSelectedTagMedia([...(event.target.files ?? [])].slice(0, 9))}
                />
              </label>
              <ComposerTips/>
              {selectedTagMedia.length ? <span className="comment-media-count">{t(`${selectedTagMedia.filter((file) => file.type.startsWith("image/")).length} resim, ${selectedTagMedia.filter((file) => file.type.startsWith("video/")).length} video seçildi`, `${selectedTagMedia.filter((file) => file.type.startsWith("image/")).length} images, ${selectedTagMedia.filter((file) => file.type.startsWith("video/")).length} videos selected`)} {post.isPending ? <LoaderCircle className="spin" size={15}/> : null}</span> : null}
            </div>
          </form>
        ) : null}
        <div className="tag-post-list">
          {visibleComments.map((comment) => (
            <article className="tag-post-card" id={`post-${comment.id}`} key={comment.id}>
              <header>
                {comment.author ? <Link className="post-avatar" aria-label={t(`${comment.author.name} profilini aç`, `Open ${comment.author.name}'s profile`)} to={userProfilePath(comment.author)}>
                  {comment.author?.avatarUrl ? (
                    <img
                      alt=""
                      src={resolveMediaUrl(comment.author.avatarUrl)}
                    />
                  ) : (
                    (comment.author?.name ?? "K")
                      .trim()
                      .charAt(0)
                      .toLocaleUpperCase("tr-TR")
                  )}
                </Link> : <span className="post-avatar" aria-hidden="true">K</span>}
                <strong>
                  {comment.author ? (
                    <Link to={userProfilePath(comment.author)}>
                      {comment.author.username
                        ? `@${comment.author.username}`
                        : comment.author.name}
                    </Link>
                  ) : (
                    t("Konnektora üyesi", "Konnektora member")
                  )}
                </strong>
                <time>
                  {new Date(comment.createdAt).toLocaleString(language === "tr" ? "tr-TR" : "en-GB")}
                </time>
              </header>
              <p>
                <RichText text={comment.body} />
              </p>
              <EmbeddedMedia text={comment.body}/>
              {comment.media?.length ? (
                <div className="tag-post-media">
                  {comment.media.map((media) =>
                    media.type === "video" ? (
                      <video
                        controls
                        key={media.id}
                        src={resolveMediaUrl(media.url)}
                      />
                    ) : (
                      <img
                        alt=""
                        key={media.id}
                        src={resolveMediaUrl(media.url)}
                      />
                    ),
                  )}
                </div>
              ) : null}
              <footer>
                <button
                  className={comment.liked ? "active" : ""}
                  disabled={!user || like.isPending}
                  onClick={() => like.mutate(comment.id)}
                >
                  <Heart
                    size={17}
                    fill={comment.liked ? "currentColor" : "none"}
                  />
                  {comment.likeCount}
                </button>
                <button
                  onClick={() =>
                    setCommentPostId((current) =>
                      current === comment.id ? null : comment.id,
                    )
                  }
                >
                  <MessageCircle size={17} />
                  {comment.replyCount ? t(`${comment.replyCount} yorum`, `${comment.replyCount} comments`) : t("Yorum yap", "Comment")}
                </button>
                <button
                  onClick={() => void shareTagPost(comment.id, `#${tag.name}`, comment.body)}
                >
                  <Share2 size={17} />
                  {t("Paylaş", "Share")}
                </button>
                {user && comment.author ? (
                  <details className="detail-action-menu post-action-menu">
                    <summary aria-label={t("Gönderi işlemleri", "Post actions")}><MoreVertical size={19}/></summary>
                    <div>
                    {comment.author.id !== user.id ? (
                      <>
                        <Link to={`/messages?peer=${comment.author.id}`}><Mail size={17}/>{t("Mesaj gönder", "Send message")}</Link>
                        <button disabled={follow.isPending} onClick={() => follow.mutate({ id: comment.author!.id, active: followingIds.has(comment.author!.id) })} type="button">
                          {followingIds.has(comment.author.id) ? t("Takibi bırak", "Unfollow") : t("Takip et", "Follow")}
                        </button>
                        {canUseGuestLists ? <button onClick={() => setGuestAuthor({ id: comment.author!.id, name: comment.author!.name })} type="button"><UserPlus size={17}/>{t("Misafir listesine ekle", "Add to guest list")}</button> : null}
                        <button onClick={() => setReportTarget({ type: "tag_comment", id: comment.id })} type="button"><Flag size={17}/>{t("Rapor et", "Report")}</button>
                      </>
                    ) : (
                      <>
                    <button
                      disabled={edit.isPending}
                      onClick={() => {
                        const body = window.prompt(
                          t("Gönderiyi düzenle", "Edit post"),
                          comment.body,
                        );
                        if (body?.trim() && body.trim() !== comment.body)
                          edit.mutate({ id: comment.id, body: body.trim() });
                      }}
                    >
                      <Edit3 size={17} />
                      {t("Düzenle", "Edit")}
                    </button>
                    <button
                      disabled={remove.isPending}
                      onClick={() =>
                        window.confirm(t("Gönderi silinsin mi?", "Delete this post?")) &&
                        remove.mutate(comment.id)
                      }
                    >
                      <Trash2 size={17} />
                      {t("Sil", "Delete")}
                    </button>
                      </>
                    )}
                    </div>
                  </details>
                ) : null}
              </footer>
              {commentPostId === comment.id ? (
                <ContentComments
                  targetType="tag_comment"
                  targetId={comment.id}
                  title={t("Gönderi yorumları", "Post comments")}
                />
              ) : null}
            </article>
          ))}
        </div>
      </section>
      {guestAuthor ? (
        <div
          className="emotion-modal"
          role="dialog"
          aria-modal="true"
          aria-label={t("Misafir listesine ekle", "Add to guest list")}
        >
          <div>
            <button aria-label={t("Kapat", "Close")} onClick={() => setGuestAuthor(null)}>
              ×
            </button>
            <h2>{t("Misafir listesine ekle", "Add to guest list")}</h2>
            <p>{t(`${guestAuthor.name} kullanıcısını isimlendirilmiş bir Guest List'e ekle.`, `Add ${guestAuthor.name} to a named Guest List.`)}</p>
            <form className="inline-create-guest-list" onSubmit={(event) => {
              event.preventDefault();
              const input = event.currentTarget.elements.namedItem("listName") as HTMLInputElement;
              if (input.value.trim()) createNamedGuestList.mutate(input.value.trim(), { onSuccess: () => { input.value = ""; } });
            }}>
              <input name="listName" placeholder={t("Yeni liste adı", "New list name")} />
              <button className="secondary-action" disabled={createNamedGuestList.isPending}>{t("Liste oluştur", "Create list")}</button>
            </form>
            <h3>{t("Misafir listeleri", "Guest lists")}</h3>
            <div className="admin-list">
              {namedGuestLists.data?.map((list) => {
                const alreadyAdded = list.members.some((member) => member.userId === guestAuthor.id);
                return <button className="admin-list-row" disabled={alreadyAdded || addToNamedGuestList.isPending} key={list.id} onClick={() => addToNamedGuestList.mutate(list.id)} type="button"><strong>{list.name}</strong><span>{t(`${list.members.length} kişi${alreadyAdded ? " · Zaten listede" : ""}`, `${list.members.length} people${alreadyAdded ? " · Already added" : ""}`)}</span></button>;
              })}
            </div>
            {addToNamedGuestList.isError || createNamedGuestList.isError ? <p className="form-error">{t("Kullanıcı misafir listesine eklenemedi.", "The user could not be added to the guest list.")}</p> : null}
          </div>
        </div>
      ) : null}
      <NotificationDialog
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        enabled={Boolean(notificationQuery.data?.enabled)}
        pending={notificationMutation.isPending}
        onConfirm={() => notificationMutation.mutate()}
        title={`#${tag.name}`}
      />
      <ReportDialog onClose={() => setReportTarget(null)} open={Boolean(reportTarget)} targetId={reportTarget?.id ?? tag.id} targetType={reportTarget?.type ?? "tag"}/>
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        targetId={tag.id}
        targetType="tag"
        title={`#${tag.name}`}
        url={window.location.href}
      />
    </section>
  );
}

async function shareTagPost(id: string, title: string, text: string) {
  const url = new URL(window.location.href);
  url.hash = `post-${id}`;
  if (navigator.share) await navigator.share({ title, text, url: url.toString() });
  else await navigator.clipboard.writeText(url.toString());
}
