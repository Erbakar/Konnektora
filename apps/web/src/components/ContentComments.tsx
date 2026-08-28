import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CalendarCheck,
  Edit3,
  Heart,
  LoaderCircle,
  Mail,
  MessageCircle,
  MoreVertical,
  Reply,
  Send,
  Share2,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createContentComment,
  addGuestListMember,
  deleteContentComment,
  followUser,
  getUserSession,
  listFollowing,
  listGuestLists,
  listMyEvents,
  listMyPlaces,
  listContentComments,
  uploadContentMedia,
  toggleContentCommentLike,
  updateContentComment,
  unfollowUser,
  updateEventParticipantStatus,
  updatePlaceMember,
  type ContentThreadComment,
  resolveMediaUrl,
} from "../lib/api";
import { RichText } from "./RichText";
import { EmbeddedMedia } from "./EmbeddedMedia";
import { userProfilePath } from "./UserIdentityLink";
import { ReportDialog } from "./ReportDialog";
import { ComposerTips } from "./ComposerTips";
import { useLanguage } from "../lib/i18n";

export function ContentComments({
  targetType,
  targetId,
  title,
  organizerId,
  canManage = false,
}: {
  targetType: "event" | "place" | "tag_comment";
  targetId: string;
  title: string;
  organizerId?: string | null;
  canManage?: boolean;
}) {
  const { language } = useLanguage();
  const user = getUserSession();
  const client = useQueryClient();
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<File[]>([]);
  const [filter, setFilter] = useState<
    "all" | "organizer" | "following" | "popular" | "photos" | "videos"
  >("all");
  const following = useQuery({
    queryKey: ["following", user?.id],
    queryFn: listFollowing,
    enabled: Boolean(user),
  });
  const comments = useQuery({
    queryKey: ["content-comments", targetType, targetId],
    queryFn: () => listContentComments(targetType, targetId),
  });
  const managedEvents = useQuery({
    queryKey: ["my-events", user?.id, "comment-guest-permission"],
    queryFn: listMyEvents,
    enabled: Boolean(user && targetType === "tag_comment"),
  });
  const managedPlaces = useQuery({
    queryKey: ["my-places", user?.id, "comment-guest-permission"],
    queryFn: listMyPlaces,
    enabled: Boolean(user && targetType === "tag_comment"),
  });
  const canAddGuest = Boolean(
    user && (
      canManage ||
      ["admin", "super_admin", "curator"].includes(user.role) ||
      (targetType === "tag_comment" && ((managedEvents.data?.length ?? 0) > 0 || (managedPlaces.data?.length ?? 0) > 0))
    ),
  );
  useEffect(() => {
    if (!comments.data || !window.location.hash.startsWith("#post-")) return;
    window.requestAnimationFrame(() =>
      document
        .getElementById(window.location.hash.slice(1))
        ?.scrollIntoView({ block: "center" }),
    );
  }, [comments.data]);
  const create = useMutation({
    mutationFn: async () => {
      const comment = await createContentComment(
        targetType,
        targetId,
        body.trim(),
      );
      const mediaType =
        targetType === "event"
          ? "event_comment"
          : targetType === "place"
            ? "place_comment"
            : "tag_comment";
      await Promise.all(
        media.map((file) => uploadContentMedia(mediaType, comment.id, file)),
      );
      return comment;
    },
    onSuccess: () => {
      setBody("");
      setMedia([]);
      void client.invalidateQueries({
        queryKey: ["content-comments", targetType, targetId],
      });
    },
  });
  const followingIds = new Set(
    (following.data ?? []).map((member) => member.id),
  );
  const filteredComments = [...(comments.data ?? [])]
    .filter(
      (comment) =>
        filter === "all" ||
        (filter === "organizer" && comment.authorId === organizerId) ||
        (filter === "following" &&
          Boolean(comment.authorId && followingIds.has(comment.authorId))) ||
        filter === "popular" ||
        (filter === "photos" &&
          (comment.media?.some((item) => item.type === "image") ||
            /https?:\/\/\S+\.(?:png|jpe?g|webp|gif)/i.test(comment.body))) ||
        (filter === "videos" &&
          (comment.media?.some((item) => item.type === "video") ||
            /https?:\/\/\S+\.(?:mp4|webm|mov)|youtu(?:\.be|be\.com)|vimeo/i.test(
              comment.body,
            ))),
    )
    .sort((a, b) =>
      filter === "popular"
        ? b.likeCount - a.likeCount
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  return (
    <section className="admin-form content-comments">
      <div className="section-header compact">
        <h2>
          <MessageCircle size={19} />
          {title}
        </h2>
        <span>{comments.data?.length ?? 0} {language === "tr" ? "yorum" : "comments"}</span>
      </div>
      <div
        className="comment-filter-tabs"
        role="tablist"
        aria-label={`${title} ${language === "tr" ? "filtreleri" : "filters"}`}
      >
        {(
          [
            ["all", language === "tr" ? "Tümü" : "All"],
            [
              "organizer",
              `${language === "tr" ? "Organizatör" : "Organiser"} (${(comments.data ?? []).filter((item) => item.authorId === organizerId).length})`,
            ],
            [
              "following",
              `${language === "tr" ? "Takip ettiklerim" : "Following"} (${(comments.data ?? []).filter((item) => Boolean(item.authorId && followingIds.has(item.authorId))).length})`,
            ],
            ["popular", language === "tr" ? "Popüler" : "Popular"],
            ["photos", language === "tr" ? "Fotoğraflar" : "Photos"],
            ["videos", language === "tr" ? "Videolar" : "Videos"],
          ] as const
        ).map(([value, label]) => (
          <button
            className={filter === value ? "active" : ""}
            key={value}
            onClick={() => setFilter(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="admin-list">
        {filteredComments.map((comment) => (
          <article
            className="admin-list-row"
            id={`post-${comment.id}`}
            key={comment.id}
          >
            {comment.author ? (
              <Link
                aria-label={language === "tr" ? `${comment.author.name} profilini aç` : `Open ${comment.author.name}'s profile`}
                className="comment-author-avatar-link"
                to={userProfilePath(comment.author)}
              >
                {comment.author.avatarUrl ? (
                  <img
                    className="comment-author-avatar"
                    src={resolveMediaUrl(comment.author.avatarUrl)}
                    alt=""
                  />
                ) : (
                  <span className="comment-author-avatar comment-author-fallback">
                    {comment.author.name?.[0] ?? "?"}
                  </span>
                )}
              </Link>
            ) : (
              <span className="comment-author-avatar comment-author-fallback">
                ?
              </span>
            )}
            <div>
              <strong>
                {comment.author ? (
                  <Link to={userProfilePath(comment.author)}>
                    {comment.author.username
                      ? `@${comment.author.username}`
                      : comment.author.name}
                  </Link>
                ) : (
                  language === "tr" ? "Silinmiş kullanıcı" : "Deleted user"
                )}
              </strong>
              <span>
                <RichText hideEmbeddableUrls text={comment.body} />
              </span>
              <EmbeddedMedia text={comment.body} />
              {comment.media?.length ? (
                <div className={`comment-media-grid media-count-${Math.min(comment.media.length, 5)}`}>
                  {comment.media.map((item) =>
                    item.type === "video" ? (
                      <video
                        controls
                        key={item.id}
                        src={resolveMediaUrl(item.url)}
                      />
                    ) : (
                      <img
                        alt=""
                        key={item.id}
                        src={resolveMediaUrl(item.url)}
                      />
                    ),
                  )}
                </div>
              ) : null}
              <small>
                {new Date(comment.createdAt).toLocaleString(language === "tr" ? "tr-TR" : "en-GB")}
              </small>
              <CommentActions
                canManage={canManage}
                canAddGuest={canAddGuest}
                comment={comment}
                currentUserId={user?.id}
                following={Boolean(
                  comment.authorId && followingIds.has(comment.authorId),
                )}
                targetType={targetType}
                onChanged={() =>
                  void client.invalidateQueries({
                    queryKey: ["content-comments", targetType, targetId],
                  })
                }
              />
              {comment.replies?.length ? (
                <div className="comment-replies">
                  {comment.replies.map((reply) => (
                    <article key={reply.id}>
                      <strong>
                        {reply.author?.username
                          ? `@${reply.author.username}`
                          : (reply.author?.name ?? (language === "tr" ? "Silinmiş kullanıcı" : "Deleted user"))}
                      </strong>
                      <RichText hideEmbeddableUrls text={reply.body} />
                      <EmbeddedMedia text={reply.body} />
                      {reply.media?.length ? (
                        <div className={`comment-media-grid media-count-${Math.min(reply.media.length, 5)}`}>
                          {reply.media.map((item) =>
                            item.type === "video" ? (
                              <video
                                controls
                                key={item.id}
                                src={resolveMediaUrl(item.url)}
                              />
                            ) : (
                              <img
                                alt=""
                                key={item.id}
                                src={resolveMediaUrl(item.url)}
                              />
                            ),
                          )}
                        </div>
                      ) : null}
                      <CommentActions
                        canManage={canManage}
                        canAddGuest={canAddGuest}
                        comment={reply}
                        currentUserId={user?.id}
                        following={Boolean(
                          reply.authorId && followingIds.has(reply.authorId),
                        )}
                        targetType={targetType}
                        onChanged={() =>
                          void client.invalidateQueries({
                            queryKey: [
                              "content-comments",
                              targetType,
                              targetId,
                            ],
                          })
                        }
                      />
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {user ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (body.trim() || media.length) create.mutate();
          }}
        >
          <textarea
            maxLength={3000}
            placeholder={language === "tr" ? "Yorum yaz…" : "Write a comment…"}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <button
            className="primary-action"
            disabled={(!body.trim() && !media.length) || create.isPending}
          >
            <Send size={17} />
            {targetType === "tag_comment" ? language === "tr" ? "Yayınla" : "Publish" : language === "tr" ? "Gönder" : "Send"}
          </button>
          <label className="comment-media-picker">
            <span>{language === "tr" ? "Resim/video ekle" : "Add image/video"}</span>
            <input
              accept="image/*,video/mp4,video/webm"
              hidden
              multiple
              onChange={(event) =>
                setMedia([...(event.target.files ?? [])].slice(0, 9))
              }
              type="file"
            />
          </label>
          <ComposerTips />
          {media.length ? (
            <span className="comment-media-count">
              {media.filter((file) => file.type.startsWith("image/")).length}{" "}
              {language === "tr" ? "resim" : "images"},{" "}
              {media.filter((file) => file.type.startsWith("video/")).length}{" "}
              {language === "tr" ? "video seçildi" : "videos selected"}{" "}
              {create.isPending ? (
                <LoaderCircle className="spin" size={15} />
              ) : null}
            </span>
          ) : null}
        </form>
      ) : (
        <p className="form-help">
          <Link to="/login">{language === "tr" ? "Giriş yaparak" : "Log in"}</Link> {language === "tr" ? "yorum yazabilirsin." : "to write a comment."}
        </p>
      )}
      {comments.isError ? (
        <p className="form-error">{language === "tr" ? "Yorumlar yüklenemedi." : "Comments could not be loaded."}</p>
      ) : null}
    </section>
  );
}

function CommentActions({
  comment,
  currentUserId,
  following,
  targetType,
  canManage,
  canAddGuest,
  onChanged,
}: {
  comment: ContentThreadComment;
  currentUserId?: string;
  following: boolean;
  targetType: "event" | "place" | "tag_comment";
  canManage: boolean;
  canAddGuest: boolean;
  onChanged: () => void;
}) {
  const { language } = useLanguage();
  const [banned, setBanned] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const like = useMutation({
    mutationFn: () => toggleContentCommentLike(comment.id),
    onSuccess: onChanged,
  });
  const remove = useMutation({
    mutationFn: () => deleteContentComment(comment.id),
    onSuccess: onChanged,
  });
  const edit = useMutation({
    mutationFn: (body: string) => updateContentComment(comment.id, body),
    onSuccess: onChanged,
  });
  const reply = useMutation({
    mutationFn: (body: string) =>
      createContentComment(
        targetType,
        comment.targetId,
        body,
        comment.parentId ?? comment.id,
      ),
    onSuccess: onChanged,
  });
  const follow = useMutation({
    mutationFn: () =>
      following
        ? unfollowUser(comment.authorId!)
        : followUser(comment.authorId!),
    onSuccess: onChanged,
  });
  const guestLists = useQuery({
    queryKey: ["guest-lists", currentUserId, "comment-actions"],
    queryFn: listGuestLists,
    enabled: guestOpen,
  });
  const guest = useMutation({
    mutationFn: (listId: string) =>
      addGuestListMember(listId, comment.authorId!),
    onSuccess: () => {
      setGuestOpen(false);
      onChanged();
    },
  });
  const ban = useMutation({
    mutationFn: async () => {
      if (targetType === "place")
        await updatePlaceMember(comment.targetId, comment.authorId!, {
          status: banned ? "accepted" : "banned",
        });
      else
        await updateEventParticipantStatus(
          comment.targetId,
          comment.authorId!,
          banned ? "accepted" : "rejected",
          "user",
        );
    },
    onSuccess: () => {
      setBanned((value) => !value);
      onChanged();
    },
  });
  if (!currentUserId) return null;
  const reportTargetType = comment.parentId
    ? "comment_reply"
    : targetType === "event"
      ? "event_comment"
      : targetType === "place"
        ? "place_comment"
        : "tag_comment";
  const canDelete = comment.authorId === currentUserId || canManage;
  return (
    <>
      <div className="comment-actions">
        <button
          disabled={like.isPending}
          onClick={() => like.mutate()}
          type="button"
        >
          <Heart size={14} />
          {comment.likeCount || (language === "tr" ? "Beğen" : "Like")}
        </button>
        <button
          onClick={() => {
            const body = window.prompt(language === "tr" ? "Yanıtını yaz" : "Write your reply");
            if (body?.trim()) reply.mutate(body.trim());
          }}
          type="button"
        >
          <Reply size={14} />
          {comment.replies?.length ?? 0} {language === "tr" ? "yorum" : "replies"}
        </button>
        {!comment.parentId ? (
          <button onClick={() => void sharePost(comment.id)} type="button">
            <Share2 size={14} />
            {language === "tr" ? "Paylaş" : "Share"}
          </button>
        ) : null}
        <details className="action-menu comment-action-menu">
          <summary aria-label={language === "tr" ? "Yorum aksiyonları" : "Comment actions"}>
            <MoreVertical size={16} />
          </summary>
          <div>
            {comment.authorId && comment.authorId !== currentUserId ? (
              <Link to={`/messages?peer=${comment.authorId}`}>
                <Mail size={14} />
                {language === "tr" ? "Mesaj gönder" : "Send message"}
              </Link>
            ) : null}
            {comment.authorId && comment.authorId !== currentUserId ? (
              <button
                disabled={follow.isPending}
                onClick={() => follow.mutate()}
                type="button"
              >
                <UserPlus size={14} />
                {following ? language === "tr" ? "Takibi bırak" : "Unfollow" : language === "tr" ? "Takip et" : "Follow"}
              </button>
            ) : null}
            {canManage &&
            ["event", "place"].includes(targetType) &&
            comment.authorId &&
            comment.authorId !== currentUserId ? (
              <>
                <button
                  disabled={ban.isPending}
                  onClick={() => ban.mutate()}
                  type="button"
                >
                  <Ban size={14} />
                  {banned
                    ? language === "tr" ? `${targetType === "place" ? "Mekâna" : "Etkinliğe"} affet` : `Allow in ${targetType === "place" ? "place" : "event"}`
                    : language === "tr" ? `${targetType === "place" ? "Mekâna" : "Etkinliğe"} yasakla` : `Ban from ${targetType === "place" ? "place" : "event"}`}
                </button>
              </>
            ) : null}
            {canAddGuest && comment.authorId && comment.authorId !== currentUserId ? (
              <button disabled={guest.isPending} onClick={() => setGuestOpen(true)} type="button">
                <CalendarCheck size={14} />
                {language === "tr" ? "Misafir listesine ekle" : "Add to Guest List"}
              </button>
            ) : null}
            {comment.authorId === currentUserId ? (
              <button
                onClick={() => {
                  const body = window.prompt(language === "tr" ? "Yorumu düzenle" : "Edit comment", comment.body);
                  if (body?.trim() && body.trim() !== comment.body)
                    edit.mutate(body.trim());
                }}
                type="button"
              >
                <Edit3 size={14} />
                {language === "tr" ? "Düzenle" : "Edit"}
              </button>
            ) : (
              <button onClick={() => setReportOpen(true)} type="button">
                {language === "tr" ? "Rapor et" : "Report"}
              </button>
            )}
            {canDelete ? (
              <button
                disabled={remove.isPending}
                onClick={() =>
                  window.confirm(language === "tr" ? "Yorum silinsin mi?" : "Delete this comment?") && remove.mutate()
                }
                type="button"
              >
                <Trash2 size={14} />
                {language === "tr" ? "Sil" : "Delete"}
              </button>
            ) : null}
          </div>
        </details>
      </div>
      {guestOpen ? (
        <div
          className="emotion-modal"
          role="dialog"
          aria-modal="true"
          aria-label={language === "tr" ? "Misafir listesine ekle" : "Add to Guest List"}
        >
          <div>
            <button aria-label={language === "tr" ? "Kapat" : "Close"} onClick={() => setGuestOpen(false)}>
              ×
            </button>
            <h2>{language === "tr" ? "Misafir listesine ekle" : "Add to Guest List"}</h2>
            <p>
              @{comment.author?.username ?? comment.author?.name ?? (language === "tr" ? "kullanıcı" : "user")}{" "}
              {language === "tr" ? "için liste seçin." : "— select a list."}
            </p>
            <div className="admin-list">
              {guestLists.data?.map((list) => (
                <button
                  className="admin-list-row"
                  disabled={
                    guest.isPending ||
                    list.members.some(
                      (member) => member.userId === comment.authorId,
                    )
                  }
                  key={list.id}
                  onClick={() => guest.mutate(list.id)}
                >
                  <strong>{list.name}</strong>
                  <span>
                    {list.members.length} {language === "tr" ? "kişi" : "people"}
                    {list.members.some(
                      (member) => member.userId === comment.authorId,
                    )
                      ? language === "tr" ? " · Zaten listede" : " · Already listed"
                      : ""}
                  </span>
                </button>
              ))}
            </div>
            {!guestLists.isLoading && !guestLists.data?.length ? (
              <p className="form-help">{language === "tr" ? "Henüz misafir listesi oluşturmadınız." : "You have not created a Guest List yet."}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      <ReportDialog
        onClose={() => setReportOpen(false)}
        open={reportOpen}
        targetId={comment.id}
        targetType={reportTargetType}
      />
    </>
  );
}

async function sharePost(id: string) {
  const url = new URL(window.location.href);
  url.hash = `post-${id}`;
  if (navigator.share) await navigator.share({ url: url.toString() });
  else await navigator.clipboard.writeText(url.toString());
}
