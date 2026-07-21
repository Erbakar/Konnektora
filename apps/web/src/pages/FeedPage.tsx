import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Heart, ImagePlus, MessageCircle, MoreHorizontal, Send, Trash2, Users } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { PostVisibility, SocialPost } from "@konnektora/shared";
import { createContentReport, createSocialPost, createSocialPostComment, deleteSocialPost, getUserSession, listSocialPostComments, listSocialPosts, toggleSocialPostLike } from "../lib/api";

const visibilityLabels: Record<PostVisibility, string> = { everybody: "Herkes", following: "Takip ettiklerim", network: "Ağım" };

export function FeedPage() {
  const client = useQueryClient();
  const user = getUserSession();
  const [scope, setScope] = useState<"all" | "following">("all");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("everybody");
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const feed = useQuery({ queryKey: ["social-feed", scope], queryFn: () => listSocialPosts(scope) });
  const refresh = () => client.invalidateQueries({ queryKey: ["social-feed"] });
  const create = useMutation({ mutationFn: () => createSocialPost(body, visibility, files), onSuccess: () => { setBody(""); setFiles([]); refresh(); } });

  function submit(event: FormEvent) { event.preventDefault(); if (body.trim()) create.mutate(); }
  return <div className="page social-feed-page">
    <header className="feed-heading"><div><span className="eyebrow">Konnektora community</span><h1>Sosyal akış</h1><p>Fikirleri, güncellemeleri ve topluluğun gündemini tek yerde paylaş.</p></div><div className="feed-tabs" role="tablist"><button className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}>Tüm gönderiler</button><button className={scope === "following" ? "active" : ""} disabled={!user} onClick={() => setScope("following")}><Users size={16}/> Takip ettiklerim</button></div></header>
    {user ? <form className="post-composer" onSubmit={submit}>
      <div className="post-author-avatar">{user.name.slice(0, 1).toUpperCase()}</div><div className="post-composer-main"><textarea value={body} maxLength={3000} onChange={(e) => setBody(e.target.value)} placeholder="Toplulukla ne paylaşmak istersin? @kullanici ile bahset…" aria-label="Gönderi metni" />
      {files.length ? <div className="composer-files">{files.map((file, index) => <span key={`${file.name}-${index}`}>{file.name}<button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}>×</button></span>)}</div> : null}
      <div className="composer-actions"><input ref={inputRef} hidden type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 4))}/><button type="button" className="icon-text-button" onClick={() => inputRef.current?.click()}><ImagePlus size={18}/> Medya</button><select value={visibility} onChange={(e) => setVisibility(e.target.value as PostVisibility)} aria-label="Gönderi görünürlüğü"><option value="everybody">Herkes</option><option value="following">Takip ettiklerim</option><option value="network">Ağım</option></select><span className="composer-count">{body.length}/3000</span><button className="feed-primary" disabled={!body.trim() || create.isPending}>{create.isPending ? "Paylaşılıyor…" : "Paylaş"}</button></div></div>
      {create.isError ? <p className="feed-error">Gönderi paylaşılamadı.</p> : null}
    </form> : <div className="feed-login-callout"><strong>Topluluğa katıl.</strong><span>Gönderi paylaşmak, beğenmek ve yorum yapmak için giriş yap.</span><Link to="/account">Giriş yap</Link></div>}
    <section className="post-list" aria-live="polite">{feed.isLoading ? <div className="feed-state">Gönderiler yükleniyor…</div> : feed.isError ? <div className="feed-state">Akış şu anda yüklenemedi.</div> : !feed.data?.items.length ? <div className="feed-state"><strong>Burada henüz gönderi yok.</strong><span>İlk paylaşımı sen yap.</span></div> : feed.data.items.map((post) => <PostCard key={post.id} post={post} userId={user?.id} onChanged={refresh}/>)}</section>
  </div>;
}

function PostCard({ post, userId, onChanged }: { post: SocialPost; userId?: string; onChanged: () => void }) {
  const client = useQueryClient(); const [open, setOpen] = useState(false); const [comment, setComment] = useState("");
  const comments = useQuery({ queryKey: ["post-comments", post.id], queryFn: () => listSocialPostComments(post.id), enabled: open });
  const like = useMutation({ mutationFn: () => toggleSocialPostLike(post.id), onSuccess: onChanged });
  const remove = useMutation({ mutationFn: () => deleteSocialPost(post.id), onSuccess: onChanged });
  const addComment = useMutation({ mutationFn: () => createSocialPostComment(post.id, comment), onSuccess: () => { setComment(""); client.invalidateQueries({ queryKey: ["post-comments", post.id] }); onChanged(); } });
  async function report() { const details = window.prompt("Rapor nedenini kısaca yazın:"); if (!details?.trim()) return; await createContentReport({ targetType: "post", targetId: post.id, reason: "Uygunsuz gönderi", details: details.trim() }); window.alert("Raporunuz inceleme kuyruğuna alındı."); }
  return <article className="post-card"><header><div className="post-avatar">{post.author.avatarUrl ? <img src={post.author.avatarUrl} alt=""/> : post.author.name.slice(0, 1).toUpperCase()}</div><div className="post-author"><Link to={post.author.username ? `/users/${post.author.username}` : "/feed"}>{post.author.name}{post.author.profileVerifiedAt ? <BadgeCheck size={16} aria-label="Doğrulanmış profil"/> : null}</Link><span>{post.author.username ? `@${post.author.username} · ` : ""}{relativeTime(post.createdAt)} · {visibilityLabels[post.visibility]}</span></div><div className="post-menu">{userId === post.authorId ? <button title="Gönderiyi sil" onClick={() => window.confirm("Gönderi silinsin mi?") && remove.mutate()}><Trash2 size={18}/></button> : userId ? <button title="Gönderiyi raporla" onClick={report}><MoreHorizontal size={19}/></button> : null}</div></header><p className="post-body">{post.body}</p>
    {post.media.length ? <div className={`post-media-grid count-${Math.min(post.media.length, 4)}`}>{post.media.map((media) => media.type === "video" ? <video key={media.id} controls src={media.url}/> : <img key={media.id} src={media.url} alt="Gönderi medyası" loading="lazy"/>)}</div> : null}
    <div className="post-stats"><span>{post.likeCount} beğeni</span><button onClick={() => setOpen((value) => !value)}>{post.commentCount} yorum</button></div><div className="post-actions"><button className={post.liked ? "liked" : ""} disabled={!userId || like.isPending} onClick={() => like.mutate()}><Heart size={19} fill={post.liked ? "currentColor" : "none"}/> Beğen</button><button onClick={() => setOpen((value) => !value)}><MessageCircle size={19}/> Yorum yap</button></div>
    {open ? <div className="post-comments">{comments.isLoading ? <span>Yorumlar yükleniyor…</span> : comments.data?.map((item) => <div className="post-comment" key={item.id}><div className="comment-avatar">{item.author.name[0]}</div><div><strong>{item.author.name}</strong><p>{item.body}</p><small>{relativeTime(item.createdAt)}</small></div></div>)}{userId ? <form onSubmit={(e) => { e.preventDefault(); if (comment.trim()) addComment.mutate(); }}><input value={comment} maxLength={1000} onChange={(e) => setComment(e.target.value)} placeholder="Yorum yaz…"/><button aria-label="Yorumu gönder" disabled={!comment.trim()}><Send size={18}/></button></form> : null}</div> : null}
  </article>;
}

function relativeTime(value: string | Date) { const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return "şimdi"; if (seconds < 3600) return `${Math.floor(seconds / 60)} dk`; if (seconds < 86400) return `${Math.floor(seconds / 3600)} sa`; if (seconds < 604800) return `${Math.floor(seconds / 86400)} gün`; return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(new Date(value)); }
