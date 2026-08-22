import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CalendarCheck, Edit3, Heart, ImagePlus, LoaderCircle, Mail, MessageCircle, Reply, Send, Share2, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createContentComment,
  deleteContentComment,
  followUser,
  inviteEventParticipant,
  getUserSession,
  listFollowing,
  listContentComments,
  uploadContentMedia,
  toggleContentCommentLike,
  updateContentComment,
  unfollowUser,
  updateEventParticipantStatus,
  type ContentThreadComment,
  resolveMediaUrl,
} from "../lib/api";
import { RichText } from "./RichText";
import { EmbeddedMedia } from "./EmbeddedMedia";
import { userProfilePath } from "./UserIdentityLink";
import { ReportDialog } from "./ReportDialog";

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
  const user = getUserSession();
  const client = useQueryClient();
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<File[]>([]);
  const [filter, setFilter] = useState<"all" | "organizer" | "following" | "popular" | "photos" | "videos">("all");
  const following = useQuery({ queryKey: ["following", user?.id], queryFn: listFollowing, enabled: Boolean(user) });
  const comments = useQuery({
    queryKey: ["content-comments", targetType, targetId],
    queryFn: () => listContentComments(targetType, targetId),
  });
  useEffect(() => {
    if (!comments.data || !window.location.hash.startsWith("#post-")) return;
    window.requestAnimationFrame(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "center" }));
  }, [comments.data]);
  const create = useMutation({
    mutationFn: async () => {
      const comment = await createContentComment(targetType, targetId, body.trim());
      if (targetType !== "tag_comment") await Promise.all(media.map((file) => uploadContentMedia(targetType, targetId, file)));
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
  const followingIds = new Set((following.data ?? []).map((member) => member.id));
  const filteredComments = [...(comments.data ?? [])]
    .filter((comment) => filter === "all"
      || (filter === "organizer" && comment.authorId === organizerId)
      || (filter === "following" && Boolean(comment.authorId && followingIds.has(comment.authorId)))
      || filter === "popular"
      || (filter === "photos" && /https?:\/\/\S+\.(?:png|jpe?g|webp|gif)/i.test(comment.body))
      || (filter === "videos" && /https?:\/\/\S+\.(?:mp4|webm|mov)|youtu(?:\.be|be\.com)|vimeo/i.test(comment.body)))
    .sort((a, b) => filter === "popular" ? b.likeCount - a.likeCount : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return (
    <section className="admin-form content-comments">
      <div className="section-header compact">
        <h2>
          <MessageCircle size={19} />
          {title}
        </h2>
        <span>{comments.data?.length ?? 0} yorum</span>
      </div>
      <div className="comment-filter-tabs" role="tablist" aria-label={`${title} filtreleri`}>
        {([[
          "all", "Tümü"
        ], ["organizer", `Organizatör (${(comments.data ?? []).filter((item) => item.authorId === organizerId).length})`], ["following", `Takip ettiklerim (${(comments.data ?? []).filter((item) => Boolean(item.authorId && followingIds.has(item.authorId))).length})`], ["popular", "Popüler"], ["photos", "Fotoğraflar"], ["videos", "Videolar"]] as const).map(([value, label]) => <button className={filter === value ? "active" : ""} key={value} onClick={() => setFilter(value)} type="button">{label}</button>)}
      </div>
      <div className="admin-list">
        {filteredComments.map((comment) => (
          <article className="admin-list-row" id={`post-${comment.id}`} key={comment.id}>
            {comment.author ? <Link aria-label={`${comment.author.name} profilini aç`} className="comment-author-avatar-link" to={userProfilePath(comment.author)}>{comment.author.avatarUrl ? <img className="comment-author-avatar" src={resolveMediaUrl(comment.author.avatarUrl)} alt=""/> : <span className="comment-author-avatar comment-author-fallback">{comment.author.name?.[0] ?? "?"}</span>}</Link> : <span className="comment-author-avatar comment-author-fallback">?</span>}
            <div>
              <strong>
                {comment.author ? (
                  <Link to={userProfilePath(comment.author)}>
                    {comment.author.username
                      ? `@${comment.author.username}`
                      : comment.author.name}
                  </Link>
                ) : (
                  "Silinmiş kullanıcı"
                )}
              </strong>
              <span>
                <RichText text={comment.body} />
              </span>
              <EmbeddedMedia text={comment.body}/>
              <small>
                {new Date(comment.createdAt).toLocaleString("tr-TR")}
              </small>
              <CommentActions canManage={canManage} comment={comment} currentUserId={user?.id} following={Boolean(comment.authorId && followingIds.has(comment.authorId))} targetType={targetType} onChanged={() => void client.invalidateQueries({ queryKey: ["content-comments", targetType, targetId] })}/>
              {comment.replies?.length ? <div className="comment-replies">{comment.replies.map((reply) => <article key={reply.id}><strong>{reply.author?.name ?? "Silinmiş kullanıcı"}</strong><RichText text={reply.body}/><EmbeddedMedia text={reply.body}/><CommentActions canManage={canManage} comment={reply} currentUserId={user?.id} following={Boolean(reply.authorId && followingIds.has(reply.authorId))} targetType={targetType} onChanged={() => void client.invalidateQueries({ queryKey: ["content-comments", targetType, targetId] })}/></article>)}</div> : null}
            </div>
          </article>
        ))}
      </div>
      {user ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (body.trim()) create.mutate();
          }}
        >
          <textarea
            maxLength={3000}
            placeholder="Yorum yaz…"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <button className="primary-action" disabled={!body.trim() || create.isPending}>
            <Send size={17} />
            {targetType === "tag_comment" ? "Yayınla" : "Gönder"}
          </button>
          {targetType !== "tag_comment" ? <label className="comment-media-picker"><ImagePlus size={17}/><span>Fotoğraf/video ekle</span><input accept="image/*,video/*" hidden multiple onChange={(event) => setMedia([...(event.target.files ?? [])].slice(0, 9))} type="file"/></label> : null}
          {media.length ? <span className="comment-media-count">{media.filter((file) => file.type.startsWith("image/")).length} resim, {media.filter((file) => file.type.startsWith("video/")).length} video seçildi {create.isPending ? <LoaderCircle className="spin" size={15}/> : null}</span> : null}
        </form>
      ) : <p className="form-help"><Link to="/login">Giriş yaparak</Link> yorum yazabilirsin.</p>}
      {comments.isError ? (
        <p className="form-error">Yorumlar yüklenemedi.</p>
      ) : null}
    </section>
  );
}

function CommentActions({ comment, currentUserId, following, targetType, canManage, onChanged }: { comment: ContentThreadComment; currentUserId?: string; following: boolean; targetType: "event" | "place" | "tag_comment"; canManage: boolean; onChanged: () => void }) {
  const [banned, setBanned] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const like = useMutation({ mutationFn: () => toggleContentCommentLike(comment.id), onSuccess: onChanged });
  const remove = useMutation({ mutationFn: () => deleteContentComment(comment.id), onSuccess: onChanged });
  const edit = useMutation({ mutationFn: (body: string) => updateContentComment(comment.id, body), onSuccess: onChanged });
  const reply = useMutation({ mutationFn: (body: string) => createContentComment(targetType, comment.targetId, body, comment.parentId ?? comment.id), onSuccess: onChanged });
  const follow = useMutation({ mutationFn: () => following ? unfollowUser(comment.authorId!) : followUser(comment.authorId!), onSuccess: onChanged });
  const guest = useMutation({ mutationFn: () => inviteEventParticipant(comment.targetId, { userId: comment.authorId!, role: "attendee" }, "user"), onSuccess: onChanged });
  const ban = useMutation({ mutationFn: async () => {
    if (!banned) await inviteEventParticipant(comment.targetId, { userId: comment.authorId!, role: "attendee" }, "user").catch(() => undefined);
    await updateEventParticipantStatus(comment.targetId, comment.authorId!, banned ? "accepted" : "rejected", "user");
  }, onSuccess: () => { setBanned((value) => !value); onChanged(); } });
  if (!currentUserId) return null;
  const reportTargetType = comment.parentId ? "comment_reply" : targetType === "event" ? "event_comment" : targetType === "place" ? "place_comment" : "tag_comment";
  return <><div className="comment-actions">
    <button disabled={like.isPending} onClick={() => like.mutate()} type="button"><Heart size={14}/>{comment.likeCount || "Beğen"}</button>
    <button onClick={() => { const body = window.prompt("Yanıtını yaz"); if (body?.trim()) reply.mutate(body.trim()); }} type="button"><Reply size={14}/>{comment.replies?.length ?? 0} yorum</button>
    {comment.authorId && comment.authorId !== currentUserId ? <button disabled={follow.isPending} onClick={() => follow.mutate()} type="button"><UserPlus size={14}/>{following ? "Takibi bırak" : "Takip et"}</button> : null}
    {comment.authorId && comment.authorId !== currentUserId ? <Link aria-label="Mesaj gönder" title="Mesaj gönder" to={`/messages?peer=${comment.authorId}`}><Mail size={14}/></Link> : null}
    <button onClick={() => void sharePost(comment.id)} type="button"><Share2 size={14}/>Paylaş</button>
    {canManage && targetType === "event" && comment.authorId && comment.authorId !== currentUserId ? <><button disabled={ban.isPending} onClick={() => ban.mutate()} type="button"><Ban size={14}/>{banned ? "Etkinliğe affet" : "Etkinliğe yasakla"}</button><button disabled={guest.isPending} onClick={() => guest.mutate()} type="button"><CalendarCheck size={14}/>Guest List'e ekle</button></> : null}
    {comment.authorId === currentUserId ? <button onClick={() => { const body = window.prompt("Yorumu düzenle", comment.body); if (body?.trim() && body.trim() !== comment.body) edit.mutate(body.trim()); }} type="button"><Edit3 size={14}/>Düzenle</button> : <button onClick={() => setReportOpen(true)} type="button">Rapor et</button>}
    {comment.authorId === currentUserId ? <button disabled={remove.isPending} onClick={() => window.confirm("Yorum silinsin mi?") && remove.mutate()} type="button"><Trash2 size={14}/>Sil</button> : null}
  </div><ReportDialog onClose={() => setReportOpen(false)} open={reportOpen} targetId={comment.id} targetType={reportTargetType}/></>;
}

async function sharePost(id: string) {
  const url = new URL(window.location.href);
  url.hash = `post-${id}`;
  if (navigator.share) await navigator.share({ url: url.toString() });
  else await navigator.clipboard.writeText(url.toString());
}
