import { FollowStar } from "./MemberSignals";
import { MediaAlbum } from "./MediaAlbum";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  BarChart3,
  Flag,
  Edit3,
  Heart,
  ImagePlus,
  LoaderCircle,
  Mail,
  MessageCircle,
  MoreVertical,
  Reply,
  Send,
  Share2,
  Trash2,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  createContentComment,
  createContentPoll,
  deleteContentComment,
  followUser,
  getUserSession,
  listFollowing,
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
import { PollCard, PollComposer, emptyPollDraft, pollDraftError, pollDraftInput, type PollDraft } from "./ContentPoll";
import { EmbeddedMedia } from "./EmbeddedMedia";
import { userProfilePath } from "./UserIdentityLink";
import { ReportDialog } from "./ReportDialog";
import { ComposerTips } from "./ComposerTips";
import { ShareDialog } from "./ContentDialogs";
import { useLanguage } from "../lib/i18n";
import { useGuestListEntitlement } from "../lib/useGuestListEntitlement";
import { formatPostDateTime } from "../lib/formats";
import { GuestListAction } from "./GuestListAction";

export function ContentComments({
  targetType,
  targetId,
  title,
  organizerId,
  canManage = false,
  shareContext,
}: {
  targetType: "event" | "place" | "tag_comment";
  targetId: string;
  title: string;
  organizerId?: string | null;
  canManage?: boolean;
  shareContext?: { title: string; location?: string; date?: string; tags?: string[]; icon?: string };
}) {
  const { language } = useLanguage();
  const user = getUserSession();
  const client = useQueryClient();
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<File[]>([]);
  const [pollDraft, setPollDraft] = useState<PollDraft | null>(null);
  const [pollError, setPollError] = useState("");
  const pollKind = targetType === "event" || targetType === "place" ? targetType : null;
  const [filter, setFilter] = useState<
    "all" | "organizer" | "following" | "popular" | "photos" | "videos"
  >("all");
  const following = useQuery({
    queryKey: ["following", user?.id],
    queryFn: listFollowing,
    enabled: Boolean(user),
  });
  const comments = useQuery({
    queryKey: ["content-comments", targetType, targetId, user?.id],
    queryFn: () => listContentComments(targetType, targetId),
  });
  const { canUseGuestLists: canAddGuest } = useGuestListEntitlement(canManage);
  useEffect(() => {
    if (!comments.data || !window.location.hash.startsWith("#post-")) return;
    window.requestAnimationFrame(() =>
      document
        .getElementById(window.location.hash.slice(1))
        ?.scrollIntoView({ block: "center" }),
    );
  }, [comments.data]);
  const pendingUpload = useRef<{ key: string; id: string; body: string; files: File[]; pollPending: boolean } | null>(null);
  const create = useMutation({
    mutationFn: async () => {
      const key = `${targetType}:${targetId}`;
      const text = body.trim() || pollDraft?.question.trim() || "";
      let draft = pendingUpload.current?.key === key ? pendingUpload.current : null;
      if (!draft) {
        const comment = await createContentComment(targetType, targetId, text);
        draft = { key, id: comment.id, body: text, files: [...media], pollPending: Boolean(pollDraft && pollKind) };
        pendingUpload.current = draft;
      } else if (draft.body !== text) {
        await updateContentComment(draft.id, text);
        draft.body = text;
      }
      if (draft.pollPending && pollDraft) {
        await createContentPoll(draft.id, pollDraftInput(pollDraft));
        draft.pollPending = false;
      }
      const mediaType = targetType === "event" ? "event_comment" : targetType === "place" ? "place_comment" : "tag_comment";
      while (draft.files.length) {
        await uploadContentMedia(mediaType, draft.id, draft.files[0]!);
        draft.files.shift();
      }
      pendingUpload.current = null;
      return draft.id;
    },
    onSuccess: async (id) => {
      setBody("");
      setMedia([]);
      setPollDraft(null);
      await client.invalidateQueries({
        queryKey: ["content-comments", targetType, targetId],
      });
      window.requestAnimationFrame(() => document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
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
      {targetType !== "tag_comment" ? <div
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
      </div> : null}
      {create.isError ? <p role="alert" className="form-error">{create.error instanceof Error ? create.error.message : language === "tr" ? "Yayın tamamlanamadı. Yeniden yayınlayarak kalan dosyaları yükleyebilirsiniz; gönderiniz çoğaltılmaz." : "Publishing could not finish. Publish again to retry remaining files without duplicating your post."}</p> : null}
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
              <header className="comment-author-line">{comment.author?<FollowStar id={comment.author.id}/>:null}<strong>
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
              <small className="comment-timestamp"><a href={`#post-${comment.id}`}>{formatPostDateTime(comment.createdAt, language)}</a></small></header>
              {comment.poll && comment.body.trim() === comment.poll.question ? null : <span className="post-copy">
                <RichText hideEmbeddableUrls text={comment.body} />
              </span>}
              <EmbeddedMedia text={comment.body} />
              {comment.poll && pollKind ? <PollCard poll={comment.poll} kind={pollKind} queryKey={["content-comments", targetType, targetId]} tr={language === "tr"}/> : null}
              {comment.media?.length ? <MediaAlbum items={comment.media} owner={{ contentType: targetType === "event" ? "event_comment" : targetType === "place" ? "place_comment" : "tag_comment", contentId: comment.id, ownerId: comment.authorId, queryKeys: [["content-comments", targetType, targetId]] }}/> : null}
              <CommentActions
                shareContext={shareContext}
                canManage={canManage}
                organizerId={organizerId}
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
                    <article className="comment-reply" id={`post-${reply.id}`} key={reply.id}>
                      {reply.author ? (
                        <Link
                          aria-label={language === "tr" ? `${reply.author.name} profilini aç` : `Open ${reply.author.name}'s profile`}
                          className="comment-author-avatar-link"
                          to={userProfilePath(reply.author)}
                        >
                          {reply.author.avatarUrl ? (
                            <img className="comment-author-avatar" src={resolveMediaUrl(reply.author.avatarUrl)} alt="" />
                          ) : (
                            <span className="comment-author-avatar comment-author-fallback">{reply.author.name?.[0] ?? "?"}</span>
                          )}
                        </Link>
                      ) : (
                        <span className="comment-author-avatar comment-author-fallback">?</span>
                      )}
                      <div>
                        <header className="comment-author-line">{reply.author?<FollowStar id={reply.author.id}/>:null}<strong>
                          {reply.author ? (
                            <Link to={userProfilePath(reply.author)}>{reply.author.username ? `@${reply.author.username}` : reply.author.name}</Link>
                          ) : language === "tr" ? "Silinmiş kullanıcı" : "Deleted user"}
                        </strong><small className="comment-timestamp"><a href={`#post-${reply.id}`}>{formatPostDateTime(reply.createdAt, language)}</a></small></header>
                        <span className="post-copy"><RichText hideEmbeddableUrls text={reply.body} /></span>
                        <EmbeddedMedia text={reply.body} />
                        {reply.media?.length ? <MediaAlbum items={reply.media} owner={{ contentType: "comment_reply", contentId: reply.id, ownerId: reply.authorId, queryKeys: [["content-comments", targetType, targetId]] }}/> : null}
                        <CommentActions
                          shareContext={shareContext}
                          canManage={canManage}
                organizerId={organizerId}
                          canAddGuest={canAddGuest}
                          comment={reply}
                          currentUserId={user?.id}
                          following={Boolean(reply.authorId && followingIds.has(reply.authorId))}
                          targetType={targetType}
                          onChanged={() => void client.invalidateQueries({ queryKey: ["content-comments", targetType, targetId] })}
                        />
                      </div>
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
            if (pollDraft) {
              const problem = pollDraftError(pollDraft, language === "tr");
              setPollError(problem);
              if (problem) return;
            }
            if (body.trim() || media.length || pollDraft) create.mutate();
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
            disabled={(!body.trim() && !media.length && !pollDraft) || create.isPending}
          >
            <Send size={17} />
            {targetType === "tag_comment" ? language === "tr" ? "Yayınla" : "Publish" : language === "tr" ? "Gönder" : "Send"}
          </button>
          <label className="comment-media-picker composer-link">
            <ImagePlus aria-hidden="true" size={20}/>
            <span>{language === "tr" ? "Resim / video ekle" : "Add photo / video"}</span>
            <input
              accept="image/*,video/mp4,video/webm"
              hidden
              multiple
              onChange={(event) =>
                setMedia([...(event.target.files ?? [])].slice(0, 50))
              }
              type="file"
            />
          </label>
          {pollKind ? <button type="button" className={`comment-poll-toggle composer-link${pollDraft ? " active" : ""}`} aria-pressed={Boolean(pollDraft)} onMouseDown={(event) => event.preventDefault()} onClick={() => { setPollDraft((current) => current ? null : emptyPollDraft()); setPollError(""); }}><BarChart3 size={18}/>{language === "tr" ? "Anket ekle" : "Add poll"}</button> : null}
          <ComposerTips />
          {pollKind && pollDraft ? <PollComposer draft={pollDraft} kind={pollKind} onChange={(next) => { setPollDraft(next); setPollError(""); }} onRemove={() => { setPollDraft(null); setPollError(""); }} tr={language === "tr"}/> : null}
          {pollError ? <p className="form-error" role="alert">{pollError}</p> : null}

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
  shareContext,
  organizerId,
}: {
  organizerId?: string | null;
  comment: ContentThreadComment;
  currentUserId?: string;
  following: boolean;
  targetType: "event" | "place" | "tag_comment";
  canManage: boolean;
  canAddGuest: boolean;
  onChanged: () => void;
  shareContext?: { title: string; location?: string; date?: string; tags?: string[]; icon?: string };
}) {
  const { language } = useLanguage();
  const [banned, setBanned] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const like = useMutation({
    mutationFn: () => toggleContentCommentLike(comment.id),
    onSuccess: onChanged,
  });
  const remove = useMutation({
    mutationFn: () => deleteContentComment(comment.id),
    onSuccess: () => {
      setDeleteOpen(false);
      onChanged();
    },
  });
  const edit = useMutation({
    mutationFn: (body: string) => updateContentComment(comment.id, body),
    onSuccess: () => { setEditing(false); onChanged(); },
  });
  const reply = useMutation({
    mutationFn: (body: string) =>
      createContentComment(
        targetType,
        comment.targetId,
        body,
        comment.parentId ?? comment.id,
      ),
    onSuccess: () => { setReplyBody(""); setReplying(false); onChanged(); },
  });
  const follow = useMutation({
    mutationFn: () =>
      following
        ? unfollowUser(comment.authorId!)
        : followUser(comment.authorId!),
    onSuccess: onChanged,
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
          banned ? "accepted" : "banned",
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
          aria-pressed={Boolean(comment.liked)}
          className={comment.liked ? "liked" : ""}
          disabled={like.isPending}
          onClick={() => like.mutate()}
          type="button"
        >
          <Heart size={14} fill={comment.liked ? "currentColor" : "none"} />
          {comment.likeCount || (language === "tr" ? "Beğen" : "Like")}
        </button>
        {!comment.parentId && targetType !== "tag_comment" ? <button
          onClick={() => setReplying((current) => !current)}
          type="button"
        >
          <Reply size={14} />
          {comment.replies?.length ?? 0} {language === "tr" ? "yorum" : "replies"}
        </button> : null}
        <button onClick={() => setShareOpen(true)} type="button">
            <Share2 size={14} />
            {language === "tr" ? "Paylaş" : "Share"}
          </button>
        <details className="action-menu comment-action-menu">
          <summary aria-label={language === "tr" ? "Yorum aksiyonları" : "Comment actions"} role="button">
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
                {following ? <UserMinus size={14} /> : <UserPlus size={14} />}
                {following ? language === "tr" ? "Takibi bırak" : "Unfollow" : language === "tr" ? "Takip et" : "Follow"}
              </button>
            ) : null}
            {canManage &&
            ["event", "place"].includes(targetType) &&
            comment.authorId &&
            comment.authorId !== currentUserId && comment.authorId !== organizerId ? (
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
              <GuestListAction
                canUse
                className=""
                context={targetType === "tag_comment" ? undefined : { id: comment.targetId, type: targetType }}
                target={{
                  id: comment.authorId,
                  name: comment.author?.name ?? (language === "tr" ? "Kullanıcı" : "User"),
                  username: comment.author?.username,
                }}
              />
            ) : null}
            {comment.authorId === currentUserId ? (
              <button
                onClick={() => { setEditBody(comment.body); setEditing(true); }}
                type="button"
              >
                <Edit3 size={14} />
                {language === "tr" ? "Düzenle" : "Edit"}
              </button>
            ) : (
              <button onClick={() => setReportOpen(true)} type="button"><Flag size={14}/>
                {language === "tr" ? "Rapor et" : "Report"}
              </button>
            )}
            {canDelete ? (
              <button
                disabled={remove.isPending}
                onClick={() => setDeleteOpen(true)}
                type="button"
              >
                <Trash2 size={14} />
                {language === "tr" ? "Sil" : "Delete"}
              </button>
            ) : null}
          </div>
        </details>
      </div>
      {editing ? <form className="comment-inline-editor" onSubmit={(event) => { event.preventDefault(); if (editBody.trim() && editBody.trim() !== comment.body) edit.mutate(editBody.trim()); }}><textarea aria-label={language === "tr" ? "Yorumu düzenle" : "Edit comment"} maxLength={3000} onChange={(event) => setEditBody(event.target.value)} value={editBody}/><div><button onClick={() => setEditing(false)} type="button">{language === "tr" ? "Vazgeç" : "Cancel"}</button><button className="primary-action" disabled={!editBody.trim() || edit.isPending} type="submit">{language === "tr" ? "Kaydet" : "Save"}</button></div></form> : null}
      {replying ? <form className="comment-inline-editor" onSubmit={(event) => { event.preventDefault(); if (replyBody.trim()) reply.mutate(replyBody.trim()); }}><textarea aria-label={language === "tr" ? "Yanıtını yaz" : "Write your reply"} maxLength={3000} onChange={(event) => setReplyBody(event.target.value)} value={replyBody}/><div><button onClick={() => setReplying(false)} type="button">{language === "tr" ? "Vazgeç" : "Cancel"}</button><button className="primary-action" disabled={!replyBody.trim() || reply.isPending} type="submit">{language === "tr" ? "Yanıtla" : "Reply"}</button></div></form> : null}
      {deleteOpen ? (
        <div className="emotion-modal" role="presentation" onMouseDown={() => setDeleteOpen(false)}>
          <section aria-labelledby={`delete-comment-title-${comment.id}`} aria-modal="true" className="content-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <h2 id={`delete-comment-title-${comment.id}`}>{language === "tr" ? "Yorumu sil" : "Delete comment"}</h2>
            <p>{language === "tr" ? "Bu yorum kalıcı olarak silinecek. Devam etmek istiyor musunuz?" : "This comment will be permanently deleted. Do you want to continue?"}</p>
            <div className="dialog-actions">
              <button disabled={remove.isPending} onClick={() => setDeleteOpen(false)} type="button">{language === "tr" ? "Vazgeç" : "Cancel"}</button>
              <button className="danger-action" disabled={remove.isPending} onClick={() => remove.mutate()} type="button">{language === "tr" ? "Yorumu sil" : "Delete comment"}</button>
            </div>
          </section>
        </div>
      ) : null}
      <ReportDialog
        onClose={() => setReportOpen(false)}
        open={reportOpen}
        targetId={comment.id}
        targetType={reportTargetType}
      />
      <ShareDialog
        onClose={() => setShareOpen(false)}
        open={shareOpen}
        targetId={comment.id}
        targetType="post"
        title={comment.body.trim().slice(0, 120) || (language === "tr" ? "Konnektora postu" : "Konnektora post")}
        text={[`${comment.author?.username ? `@${comment.author.username}` : comment.author?.name ?? ""}${shareContext ? ` · ${shareContext.title}${shareContext.icon ? ` ${shareContext.icon}` : ""}` : ""}`, `“${comment.body.trim()}”`, shareContext?.location ? `📍 ${shareContext.location}` : "", shareContext?.date ? `📅 ${shareContext.date}` : "", shareContext?.tags?.slice(0, 4).map((tag) => `#${tag}`).join(" "), language === "tr" ? "🌎 Konnektora’da gönderiyi gör →" : "🌎 See the post on Konnektora →"].filter(Boolean).join("\n")}
        url={`${window.location.href.split("#")[0]}#post-${comment.id}`}
      />
    </>
  );
}
