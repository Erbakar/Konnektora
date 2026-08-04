import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, LoaderCircle, MessageCircle, RefreshCw } from "lucide-react";
import { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { RichText } from "../components/RichText";
import type { TagSentiment } from "@konnektora/shared";
import { createTagComment, getProfileAffinities, getUserSession, listTagComments, listTags, updateProfileAffinities } from "../lib/api";

export function TagsPage() {
  const { slug } = useParams();
  const user = getUserSession();
  const client = useQueryClient();
  const tags = useQuery({ queryKey: ["tags"], queryFn: listTags });
  const tag = tags.data?.find((item) => item.slug === slug);
  const affinities = useQuery({ queryKey: ["profile-affinities", user?.id], queryFn: getProfileAffinities, enabled: Boolean(user) });
  const comments = useQuery({ queryKey: ["tag-comments", tag?.id], queryFn: () => listTagComments(tag!.id), enabled: Boolean(tag) });
  const sentiment = affinities.data?.find((item) => item.tag.id === tag?.id)?.sentiment;
  const save = useMutation({
    mutationFn: (next: TagSentiment) => updateProfileAffinities([
      ...(affinities.data ?? []).filter((item) => item.tag.id !== tag?.id).map((item) => ({ tagId: item.tag.id, sentiment: item.sentiment })),
      { tagId: tag!.id, sentiment: next },
    ]),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["profile-affinities"] }),
  });
  const post = useMutation({ mutationFn: (body: string) => createTagComment(tag!.id, body), onSuccess: () => void client.invalidateQueries({ queryKey: ["tag-comments", tag?.id] }) });

  if (!slug) return <section className="page tags-directory"><div className="section-header"><div><p className="eyebrow">Keşfet</p><h1>İlgi alanları</h1><p className="lead">Toplulukları konu başlıklarına göre keşfet, ilgilendiklerini profiline ekle ve sohbete katıl.</p></div></div>{tags.isLoading ? <div className="empty-state"><LoaderCircle className="spin" size={34}/><p>İlgi alanları yükleniyor…</p></div> : null}{tags.isError ? <div className="empty-state"><Hash size={38}/><h2>İlgi alanları yüklenemedi</h2><p>Bağlantını kontrol edip yeniden deneyebilirsin.</p><button className="secondary-action" onClick={() => void tags.refetch()}><RefreshCw size={17}/>Yeniden dene</button></div> : null}{tags.data?.length ? <div className="tag-directory-grid">{tags.data.map((item) => <Link className="tag-directory-card" key={item.id} to={`/tags/${item.slug}`}><span><Hash size={19}/></span><div><strong>{item.name}</strong><p>{item.description ?? "Bu konudaki toplulukları ve paylaşımları keşfet."}</p><small>{item.usageCount} kullanım</small></div></Link>)}</div> : null}{!tags.isLoading && !tags.isError && !tags.data?.length ? <div className="empty-state"><Hash size={38}/><h2>Henüz ilgi alanı yok</h2><p>Yeni ilgi alanları eklendiğinde burada görünecek.</p></div> : null}</section>;
  if (!tag && !tags.isLoading) return <section className="page empty-state"><Hash size={42}/><h1>İlgi alanı bulunamadı</h1><Link to="/tags">Tüm ilgi alanları</Link></section>;
  if (!tag) return <section className="page empty-state">Yükleniyor…</section>;
  return <section className="page"><Link className="back-link" to="/tags">← İlgi alanları</Link><div className="section-header"><div><p className="eyebrow">İlgi alanı</p><h1>#{tag.name}</h1><p className="lead">{tag.description ?? "Bu ilgi alanındaki topluluk paylaşımlarını keşfet."}</p></div></div>
    <section className="admin-form tag-sentiment-panel"><h2>Profilime ekle</h2><div className="row-actions tag-sentiment-actions">{(["like", "ok", "dislike"] as TagSentiment[]).map((value) => <button className={sentiment === value ? "primary-action" : "secondary-action"} disabled={!user || save.isPending} key={value} onClick={() => save.mutate(value)}>{value === "like" ? "Beğeniyorum" : value === "ok" ? "Sorun değil" : "Beğenmiyorum"}</button>)}</div>{!user ? <p className="form-help">Tag'i profiline eklemek için giriş yap.</p> : null}</section>
    <section className="admin-form"><h2><MessageCircle size={18}/> Bu tag'de paylaş</h2>{user ? <form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const input = event.currentTarget.elements.namedItem("body") as HTMLTextAreaElement; if (input.value.trim()) post.mutate(input.value.trim(), { onSuccess: () => event.currentTarget.reset() }); }}><textarea name="body" required minLength={1} maxLength={2000} placeholder={`#${tag.name} hakkında bir şey yaz…`}/><button className="primary-action" disabled={post.isPending}>Yayınla</button></form> : null}<div className="admin-list">{comments.data?.map((comment) => <article className="admin-list-row" key={comment.id}><div><strong>{comment.author?.username ? `@${comment.author.username}` : comment.author?.name}</strong><span><RichText text={comment.body}/></span></div></article>)}</div></section>
  </section>;
}
