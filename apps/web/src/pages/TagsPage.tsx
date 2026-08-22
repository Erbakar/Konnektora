import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CalendarDays,
  Eye,
  Edit3,
  Flag,
  Hash,
  Heart,
  ImagePlus,
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
import { EmbeddedMedia } from "../components/EmbeddedMedia";
import type { ReportTargetType, TagSentiment } from "@konnektora/shared";
import {
  createTagComment,
  createUserTag,
  deleteTagComment,
  followUser,
  getContentNotification,
  getProfileAffinities,
  getTagStats,
  getUserSession,
  inviteEventParticipant,
  likeTagComment,
  listFollowing,
  listMyEvents,
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

export function TagsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const authorFilter = searchParams.get("author")?.replace(/^@/, "").toLocaleLowerCase("tr") ?? "";
  const authorIdFilter = searchParams.get("authorId") ?? "";
  const { slug } = useParams();
  const navigate = useNavigate();
  const user = getUserSession();
  const client = useQueryClient();
  const [query, setQuery] = useState("");
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
  const following = useQuery({
    queryKey: ["following", user?.id],
    queryFn: listFollowing,
    enabled: Boolean(user),
  });
  const managedEvents = useQuery({
    queryKey: ["my-events", user?.id],
    queryFn: listMyEvents,
    enabled: Boolean(user && guestAuthor),
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
  const invite = useMutation({
    mutationFn: (eventId: string) =>
      inviteEventParticipant(
        eventId,
        { userId: guestAuthor!.id, role: "attendee" },
        "user",
      ),
    onSuccess: () => setGuestAuthor(null),
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
            <p className="eyebrow">Keşfet</p>
            <h1>İlgi alanları</h1>
            <p className="lead">
              Toplulukları konu başlıklarına göre keşfet, ilgilendiklerini
              profiline ekle ve sohbete katıl.
            </p>
          </div>
        </div>
        <label className="tag-search">
          <Search size={18} />
          <input
            aria-label="İlgi alanı ara"
            placeholder="İlgi alanı ara veya oluştur…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <details className="collapsed-filter-panel">
          <summary><SlidersHorizontal size={17}/> Filtrele</summary>
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
            <label>Oluşturulma tarihi — Başlangıç<input defaultValue={directoryFilters.createdFrom} name="createdFrom" type="date"/></label>
            <label>Oluşturulma tarihi — Bitiş<input defaultValue={directoryFilters.createdTo} name="createdTo" type="date"/></label>
            <label>Oluşturulduğu ülke<input defaultValue={directoryFilters.country} name="country" placeholder="Ülke"/></label>
            <label>Oluşturulduğu şehir<input defaultValue={directoryFilters.city} name="city" placeholder="Şehir"/></label>
            <div className="row-actions">
              <button className="primary-action" type="submit">Uygula</button>
              <button className="secondary-action" onClick={(event) => { event.currentTarget.form?.reset(); setDirectoryFilters({ createdFrom: "", createdTo: "", country: "", city: "" }); }} type="button">Temizle</button>
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
                  ? "Popüler"
                  : value === "for_you"
                    ? "For you"
                    : value === "following"
                      ? "Following"
                      : "New"}
              </button>
            ),
          )}
        </div>
        {tags.isLoading ? (
          <div className="empty-state">
            <LoaderCircle className="spin" size={34} />
            <p>İlgi alanları yükleniyor…</p>
          </div>
        ) : null}
        {tags.isError ? (
          <div className="empty-state">
            <Hash size={38} />
            <h2>İlgi alanları yüklenemedi</h2>
            <p>Bağlantını kontrol edip yeniden deneyebilirsin.</p>
            <button
              className="secondary-action"
              onClick={() => void tags.refetch()}
            >
              <RefreshCw size={17} />
              Yeniden dene
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
                <small>{item.usageCount}</small>
              </Link>
            ))}
          </div>
        ) : null}
        {!tags.isLoading && !tags.isError && !visibleTags.length ? (
          <div className="empty-state">
            <Hash size={38} />
            <h2>Sonuç bulunamadı</h2>
            <p>
              {user
                ? "Bu adla yeni bir ilgi alanı oluşturabilirsin."
                : "Yeni ilgi alanı oluşturmak için giriş yap."}
            </p>
            {user && query.trim().length >= 2 ? <button className="primary-action" disabled={create.isPending} onClick={() => create.mutate()} type="button">{create.isPending ? "Oluşturuluyor…" : `“${query.trim()}” ilgi alanını oluştur`}</button> : null}
          </div>
        ) : null}
      </section>
    );
  if (!tag && !tags.isLoading)
    return (
      <section className="page empty-state">
        <Hash size={42} />
        <h1>İlgi alanı bulunamadı</h1>
        <Link to="/tags">Tüm ilgi alanları</Link>
      </section>
    );
  if (!tag) return <section className="page empty-state">Yükleniyor…</section>;
  return (
    <section className="page">
      <Link className="back-link" to="/tags">
        ← İlgi alanları
      </Link>
      <div className="section-header">
        <div>
          <p className="eyebrow">İlgi alanı</p>
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
              ? "Bildirim açık"
              : "Bildirim kapalı"}
          </button>
          <button
            className="secondary-action"
            onClick={() => setShareOpen(true)}
          >
            <Share2 size={17} />
            Paylaş
          </button>
          <details className="detail-action-menu"><summary aria-label="Etiket işlemleri"><MoreVertical size={20}/></summary><div>
            {user && ["admin", "super_admin", "curator"].includes(user.role) ? <a href="#tag-stats"><Eye size={17}/>Etkileşim istatistikleri</a> : null}
            {user ? <button onClick={() => setReportTarget({ type: "tag", id: tag.id })}><Flag size={17}/>Etiketi rapor et</button> : null}
          </div></details>
        </div>
      </div>
      <section className="admin-form tag-sentiment-panel">
        <h2>Profilime ekle</h2>
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
              {value === "like" ? <><Heart size={17}/> Beğeniyorum</> : value === "ok" ? <><Minus size={17}/> Sorun değil</> : <><ThumbsDown size={17}/> Beğenmiyorum</>}
            </button>
          ))}
        </div>
        {!user ? (
          <p className="form-help">Tag'i profiline eklemek için giriş yap.</p>
        ) : null}
      </section>
      <section className="admin-form tag-related-users-preview">
        <h2>People added to their profile</h2>
        <div><span className="attendee-avatar-stack">{(relatedUsers.data ?? []).slice(0, 8).map((member) => <Link key={member.id} title={`${member.name} profilini aç`} to={userProfilePath(member)}>{member.avatarUrl ? <img alt="" src={resolveMediaUrl(member.avatarUrl)}/> : member.name[0]}</Link>)}</span><Link to={`/tags/${tag.slug}/users`}><strong>Show all {relatedUsers.data?.length ?? tag.usageCount} users</strong></Link></div>
      </section>
      {user && ["admin", "super_admin", "curator"].includes(user.role) ? <section className="tag-public-stats" id="tag-stats">
        {[
          { Icon: Users, value: stats.data?.followers ?? 0, label: "takipçi" },
          { Icon: Heart, value: stats.data?.likes ?? 0, label: "beğeni" },
          { Icon: Minus, value: stats.data?.ok ?? 0, label: "nötr" },
          { Icon: ThumbsDown, value: stats.data?.dislikes ?? 0, label: "beğenmeme" },
          {
            Icon: CalendarDays,
            value: stats.data?.events ?? 0,
            label: "etkinlik",
          },
          { Icon: MapPin, value: stats.data?.places ?? 0, label: "mekân" },
          {
            Icon: MessageCircle,
            value: stats.data?.posts ?? 0,
            label: "gönderi",
          },
          { Icon: Eye, value: stats.data?.views ?? 0, label: "görüntülenme" },
          { Icon: MessageCircle, value: stats.data?.reactions ?? 0, label: "post beğenisi" },
          { Icon: Eye, value: stats.data?.engagementRate ?? 0, label: "% etkileşim" },
        ].map(({ Icon, value, label }) => (
          <article key={label}>
            <Icon size={19} />
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section> : null}
      <section className="admin-form">
        {authorFilter || authorIdFilter ? <div className="filter-notice"><span>{authorFilter ? `@${authorFilter}` : "Seçilen kullanıcı"} postları filtreleniyor.</span><button onClick={() => { const next = new URLSearchParams(searchParams); next.delete("author"); next.delete("authorId"); setSearchParams(next); }} type="button">Temizle</button></div> : null}
        <div className="section-header compact">
          <h2>
            <MessageCircle size={18} /> Bu tag'deki postlar
          </h2>
          <span>{comments.data?.length ?? 0} sonuç</span>
        </div>
        <details className="collapsed-filter-panel tag-detail-filters">
          <summary><SlidersHorizontal size={17}/> Postları filtrele</summary>
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
                  ? "All"
                  : value === "popular"
                    ? "Popular"
                    : value === "following"
                      ? `Following (${(comments.data ?? []).filter((comment) => comment.author && followingIds.has(comment.author.id)).length})`
                      : value === "photo"
                        ? "Photo"
                        : "Video"}
              </button>
            ),
          )}
          <label className="tag-tab-search"><Search size={16}/><input aria-label="Postlarda ara" placeholder="Ara…" value={commentQuery} onChange={(event) => setCommentQuery(event.target.value)}/></label>
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
              if (input.value.trim())
                post.mutate(
                  { body: input.value.trim(), files: selectedTagMedia },
                  { onSuccess: () => event.currentTarget.reset() },
                );
            }}
          >
            <textarea
              name="body"
              required
              minLength={1}
              maxLength={2000}
              placeholder={(comments.data?.length ?? 0) === 0 ? `#${tag.name} hakkında ilk yorumu yazan sen ol…` : `#${tag.name} hakkında bir şey yaz…`}
            />
            <div>
              <button className="primary-action" disabled={post.isPending}>
                Yayınla
              </button>
              <label className="secondary-action">
                <ImagePlus size={17} />
                Fotoğraf/video
                <input
                  accept="image/*,video/mp4,video/webm"
                  hidden
                  multiple
                  name="media"
                  type="file"
                  onChange={(event) => setSelectedTagMedia([...(event.target.files ?? [])].slice(0, 9))}
                />
              </label>
              {selectedTagMedia.length ? <span className="comment-media-count">{selectedTagMedia.filter((file) => file.type.startsWith("image/")).length} resim, {selectedTagMedia.filter((file) => file.type.startsWith("video/")).length} video seçildi {post.isPending ? <LoaderCircle className="spin" size={15}/> : null}</span> : null}
            </div>
          </form>
        ) : null}
        <div className="tag-post-list">
          {visibleComments.map((comment) => (
            <article className="tag-post-card" id={`post-${comment.id}`} key={comment.id}>
              <header>
                {comment.author ? <Link className="post-avatar" aria-label={`${comment.author.name} profilini aç`} to={userProfilePath(comment.author)}>
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
                    "Konnektora üyesi"
                  )}
                </strong>
                <time>
                  {new Date(comment.createdAt).toLocaleString("tr-TR")}
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
                  {comment.replyCount ? `${comment.replyCount} yorum` : "Yorum yap"}
                </button>
                <button
                  onClick={() => void shareTagPost(comment.id, `#${tag.name}`, comment.body)}
                >
                  <Share2 size={17} />
                  Paylaş
                </button>
                {comment.author ? (
                  <Link aria-label="Mesaj gönder" title="Mesaj gönder" to={`/messages?peer=${comment.author.id}`}>
                    <Mail size={17} />
                  </Link>
                ) : null}
                {user && comment.author && comment.author.id !== user.id ? (
                  <>
                    <button
                      disabled={follow.isPending}
                      onClick={() =>
                        follow.mutate({
                          id: comment.author!.id,
                          active: followingIds.has(comment.author!.id),
                        })
                      }
                    >
                      {followingIds.has(comment.author.id)
                        ? "Takibi bırak"
                        : "Takip et"}
                    </button>
                    <button
                      onClick={() =>
                        setGuestAuthor({
                          id: comment.author!.id,
                          name: comment.author!.name,
                        })
                      }
                    >
                      <UserPlus size={17} />
                      Guest List
                    </button>
                    <button onClick={() => setReportTarget({ type: "tag_comment", id: comment.id })}>
                      <Flag size={17} />
                      Rapor et
                    </button>
                  </>
                ) : null}
                {user && comment.author?.id === user.id ? (
                  <>
                    <button
                      disabled={edit.isPending}
                      onClick={() => {
                        const body = window.prompt(
                          "Gönderiyi düzenle",
                          comment.body,
                        );
                        if (body?.trim() && body.trim() !== comment.body)
                          edit.mutate({ id: comment.id, body: body.trim() });
                      }}
                    >
                      <Edit3 size={17} />
                      Düzenle
                    </button>
                    <button
                      disabled={remove.isPending}
                      onClick={() =>
                        window.confirm("Gönderi silinsin mi?") &&
                        remove.mutate(comment.id)
                      }
                    >
                      <Trash2 size={17} />
                      Sil
                    </button>
                  </>
                ) : null}
              </footer>
              {commentPostId === comment.id ? (
                <ContentComments
                  targetType="tag_comment"
                  targetId={comment.id}
                  title="Post yorumları"
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
          aria-label="Guest List'e ekle"
        >
          <div>
            <button aria-label="Kapat" onClick={() => setGuestAuthor(null)}>
              ×
            </button>
            <h2>Guest List'e ekle</h2>
            <p>{guestAuthor.name} kullanıcısını yönettiğin etkinliğe ekle.</p>
            <div className="admin-list">
              {managedEvents.data?.map((event) => (
                <button
                  className="admin-list-row"
                  disabled={invite.isPending}
                  key={event.id}
                  onClick={() => invite.mutate(event.id)}
                >
                  <strong>{event.title}</strong>
                  <span>
                    {new Date(event.startsAt).toLocaleDateString("tr-TR")}
                  </span>
                </button>
              ))}
            </div>
            {!managedEvents.isLoading && !managedEvents.data?.length ? (
              <p className="form-help">Yönettiğin etkinlik bulunmuyor.</p>
            ) : null}
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
