import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { type FormEvent, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getUserSession, listConversationMessages, listConversations, listMemberSuggestions,
  markConversationRead, sendPrivateMessage
} from "../lib/api";

export function MessagesPage() {
  const user = getUserSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const conversationsQuery = useQuery({ queryKey: ["conversations", user?.id], queryFn: listConversations, enabled: Boolean(user) });
  const suggestionsQuery = useQuery({ queryKey: ["member-suggestions", user?.id], queryFn: listMemberSuggestions, enabled: Boolean(user) });
  const selectedPeerId = searchParams.get("peer") ?? "";
  const messagesQuery = useQuery({
    queryKey: ["conversation-messages", selectedPeerId],
    queryFn: () => listConversationMessages(selectedPeerId),
    enabled: Boolean(user && selectedPeerId)
  });
  const readMutation = useMutation({
    mutationFn: markConversationRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] })
  });
  const sendMutation = useMutation({
    mutationFn: (body: string) => sendPrivateMessage(selectedPeerId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedPeerId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
    }
  });
  const conversations = conversationsQuery.data?.items ?? [];
  const selectedConversation = conversations.find((item) => item.peer.id === selectedPeerId);
  const selectedSuggestion = suggestionsQuery.data?.find((item) => item.id === selectedPeerId);
  const selectedPeer = selectedConversation?.peer ?? (selectedSuggestion ? {
    id: selectedSuggestion.id, name: selectedSuggestion.name, username: selectedSuggestion.username, status: "active" as const
  } : null);
  const newRecipients = useMemo(
    () => (suggestionsQuery.data ?? []).filter((member) => member.id !== user?.id && !conversations.some((item) => item.peer.id === member.id)),
    [conversations, suggestionsQuery.data, user?.id]
  );

  useEffect(() => {
    if (selectedPeerId && selectedConversation?.unreadCount) readMutation.mutate(selectedPeerId);
  }, [selectedPeerId, selectedConversation?.unreadCount]);

  if (!user) {
    return <section className="page empty-state"><MessageCircle size={40} /><h1>Mesajlar</h1><p>Konuşmalarını görmek için giriş yap.</p><Link className="primary-action" to="/account">Giriş yap</Link></section>;
  }

  return (
    <section className={`page messages-layout${selectedPeerId ? " has-selection" : ""}`}>
      <aside className="conversation-sidebar">
        <div className="section-header compact"><h1>Mesajlar</h1><span>{conversationsQuery.data?.totalUnread ?? 0} okunmamış</span></div>
        <label className="new-conversation-field">Yeni konuşma
          <select value="" onChange={(event) => event.target.value && setSearchParams({ peer: event.target.value })}>
            <option value="">Üye seç</option>
            {newRecipients.map((member) => <option key={member.id} value={member.id}>{member.username ? `@${member.username}` : member.name}</option>)}
          </select>
        </label>
        <div className="conversation-list">
          {conversations.map((conversation) => (
            <button className={conversation.peer.id === selectedPeerId ? "conversation-card is-active" : "conversation-card"} key={conversation.peer.id} onClick={() => setSearchParams({ peer: conversation.peer.id })} type="button">
              <span className="conversation-avatar">{conversation.peer.name.slice(0, 1).toUpperCase()}</span>
              <span><strong>{conversation.peer.username ? `@${conversation.peer.username}` : conversation.peer.name}</strong><small>{conversation.lastMessage.body}</small></span>
              {conversation.unreadCount ? <b>{conversation.unreadCount}</b> : null}
            </button>
          ))}
          {!conversationsQuery.isLoading && conversations.length === 0 ? <p className="form-help">Henüz konuşman yok. Benzer üyelerden birini seçerek başlayabilirsin.</p> : null}
        </div>
      </aside>
      <div className="message-thread">
        {selectedPeer ? (
          <>
            <header className="message-thread-header">
              <button className="ghost-action messages-back" onClick={() => setSearchParams({})} type="button"><ArrowLeft size={18} /> Geri</button>
              <div><strong>{selectedPeer.name}</strong><span>{selectedPeer.username ? `@${selectedPeer.username}` : "Konnektora üyesi"}</span></div>
            </header>
            <div className="message-stream" aria-live="polite">
              {messagesQuery.data?.hasNextPage ? <p className="form-help">Daha eski mesajlar sonraki sayfalarda mevcut.</p> : null}
              {messagesQuery.data?.items.map((message) => (
                <article className={message.senderId === user.id ? "message-bubble is-mine" : "message-bubble"} key={message.id}>
                  <p>{message.body}</p>
                  <time dateTime={String(message.createdAt)}>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(message.createdAt))}</time>
                </article>
              ))}
              {!messagesQuery.isLoading && !messagesQuery.data?.items.length ? <p className="empty-state">İlk mesajı sen gönder.</p> : null}
            </div>
            <form className="message-composer" onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault(); const form = new FormData(event.currentTarget); const body = String(form.get("body") || "").trim();
              if (body) sendMutation.mutate(body); event.currentTarget.reset();
            }}>
              <textarea aria-label="Mesaj" maxLength={5000} name="body" placeholder="Bir mesaj yaz…" required rows={2} />
              <button className="primary-action" disabled={sendMutation.isPending} type="submit"><Send size={18} /> Gönder</button>
            </form>
            {sendMutation.isError ? <p className="form-error">Mesaj gönderilemedi. Alıcının gizlilik ayarı veya engel durumu buna izin vermiyor olabilir.</p> : null}
          </>
        ) : <div className="empty-state"><MessageCircle size={44} /><h2>Bir konuşma seç</h2><p>Mesajların burada görüntülenecek.</p></div>}
      </div>
    </section>
  );
}
