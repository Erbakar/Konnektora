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
  MapPin,
  MessageCircle,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RichText } from "../components/RichText";
import { ContentComments } from "../components/ContentComments";
import { userProfilePath } from "../components/UserIdentityLink";
import { NotificationDialog, ShareDialog } from "../components/ContentDialogs";
import type { TagSentiment } from "@konnektora/shared";
import {
  createContentReport,
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
  const { slug } = useParams();
  const navigate = useNavigate();
  const user = getUserSession();
  const client = useQueryClient();
  const [query, setQuery] = useState("");
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
  const tags = useQuery({ queryKey: ["tags"], queryFn: listTags });
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
  const stats = useQuery({
    queryKey: ["tag-stats", tag?.id],
    queryFn: () => getTagStats(tag!.id),
    enabled: Boolean(tag),
  });
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
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ["profile-affinities"] }),
  });
  const post = useMutation({
    mutationFn: async ({ body, file }: { body: string; file?: File }) => {
      const created = await createTagComment(tag!.id, body);
      if (file) await uploadTagCommentMedia(created.id, file);
      return created;
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["tag-comments", tag?.id] });
      void client.invalidateQueries({ queryKey: ["tag-stats", tag?.id] });
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
          {user &&
          query.trim().length >= 2 &&
          !visibleTags.some(
            (item) =>
              item.name.toLocaleLowerCase("tr") ===
              query.trim().toLocaleLowerCase("tr"),
          ) ? (
            <button
              className="create-inline-link"
              disabled={create.isPending}
              onClick={() => create.mutate()}
              type="button"
            >
              Oluştur
            </button>
          ) : null}
        </label>
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
          <Link className="secondary-action" to={`/tags/${tag.slug}/users`}>
            <Users size={17} />
            İlgili kullanıcılar
          </Link>
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
              {value === "like"
                ? "Beğeniyorum"
                : value === "ok"
                  ? "Sorun değil"
                  : "Beğenmiyorum"}
            </button>
          ))}
        </div>
        {!user ? (
          <p className="form-help">Tag'i profiline eklemek için giriş yap.</p>
        ) : null}
      </section>
      <section className="tag-public-stats">
        {[
          { Icon: Users, value: stats.data?.followers ?? 0, label: "takipçi" },
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
        ].map(({ Icon, value, label }) => (
          <article key={label}>
            <Icon size={19} />
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>
      <section className="admin-form">
        <div className="section-header compact">
          <h2>
            <MessageCircle size={18} /> Bu tag'deki postlar
          </h2>
          <span>{comments.data?.length ?? 0} sonuç</span>
        </div>
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
        </div>
        <label className="tag-search">
          <Search size={16} />
          <input
            placeholder="Postlarda filtrele…"
            value={commentQuery}
            onChange={(event) => setCommentQuery(event.target.value)}
          />
        </label>
        {user ? (
          <form
            className="tag-post-composer"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const input = event.currentTarget.elements.namedItem(
                "body",
              ) as HTMLTextAreaElement;
              const fileInput = event.currentTarget.elements.namedItem(
                "media",
              ) as HTMLInputElement;
              if (input.value.trim())
                post.mutate(
                  { body: input.value.trim(), file: fileInput.files?.[0] },
                  { onSuccess: () => event.currentTarget.reset() },
                );
            }}
          >
            <textarea
              name="body"
              required
              minLength={1}
              maxLength={2000}
              placeholder={`#${tag.name} hakkında bir şey yaz…`}
            />
            <div>
              <label className="secondary-action">
                <ImagePlus size={17} />
                Fotoğraf/video
                <input
                  accept="image/*,video/mp4,video/webm"
                  hidden
                  name="media"
                  type="file"
                />
              </label>
              <button className="primary-action" disabled={post.isPending}>
                Yayınla
              </button>
            </div>
          </form>
        ) : null}
        <div className="tag-post-list">
          {visibleComments.map((comment) => (
            <article className="tag-post-card" key={comment.id}>
              <header>
                <span className="post-avatar" aria-hidden="true">
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
                </span>
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
                  Yorum yap
                </button>
                <button
                  onClick={() =>
                    void (navigator.share
                      ? navigator.share({
                          title: `#${tag.name}`,
                          text: comment.body,
                          url: window.location.href,
                        })
                      : navigator.clipboard.writeText(window.location.href))
                  }
                >
                  <Share2 size={17} />
                  Paylaş
                </button>
                {comment.author ? (
                  <Link to={`/messages?peer=${comment.author.id}`}>
                    <MessageCircle size={17} />
                    Mesaj
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
                    <button
                      onClick={async () => {
                        const details = window.prompt("Rapor nedenini yazın:");
                        if (details?.trim()) {
                          await createContentReport({
                            targetType: "tag_comment",
                            targetId: comment.id,
                            reason: "Uygunsuz gönderi",
                            details: details.trim(),
                          });
                          window.alert("Rapor incelemeye alındı.");
                        }
                      }}
                    >
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
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`#${tag.name}`}
        url={window.location.href}
      />
    </section>
  );
}
