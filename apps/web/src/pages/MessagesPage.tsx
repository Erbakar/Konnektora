import { FollowStar } from "../components/MemberSignals";
import { getPublicProfileById } from "../lib/api";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ImagePlus,
  Ban,
  Check,
  CheckCheck,
  Edit3,
  File,
  Flag,
  MessageCircle,
  MoreVertical,
  Pin,
  PinOff,
  Plus,
  Reply,
  Search,
  Send,
  Smile,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RichText } from "../components/RichText";
import {
  UserIdentityLink,
  userProfilePath,
} from "../components/UserIdentityLink";
import { ReportDialog } from "../components/ReportDialog";
import { EmbeddedMedia } from "../components/EmbeddedMedia";
import { ComposerTips } from "../components/ComposerTips";
import { DraftLeaveGuard } from "../components/DraftLeaveGuard";
import { PushNotificationControl } from "../components/PushNotificationControl";
import { useComposerDraft } from "../lib/composerDrafts";
import type { PrivateChatMessage } from "@konnektora/shared";
import {
  createBlock,
  listBlocks,
  removeBlock,
  deleteConversation,
  deletePrivateMessage,
  editPrivateMessage,
  getMessagingPermission,
  getTyping,
  getUserSession,
  listConversationMessages,
  listConversations,
  listFollowing,
  listMemberSuggestions,
  markConversationRead,
  resolveMediaUrl,
  searchDiscovery,
  searchPrivateMessages,
  sendPrivateMessage,
  sendPrivateMessageWithProgress,
  sendTyping,
  toggleMessageReaction,
  updateConversationPreference,
} from "../lib/api";
import { useLanguage } from "../lib/i18n";
import { MediaPicker, type MediaPickerHandle } from "../components/MediaPicker";
import { MediaAlbum } from "../components/MediaAlbum";

const emojis = ["❤️", "👍", "😂", "😮", "😢", "🎉"];

export function MessagesPage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const user = getUserSession();
  const [params, setParams] = useSearchParams();
  const client = useQueryClient();
  const peerId = params.get("peer") ?? "";
  const [query, setQuery] = useState("");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientFocused, setRecipientFocused] = useState(false);
  const conversations = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: listConversations,
    enabled: Boolean(user),
    refetchInterval: 15_000,
  });
  const suggestions = useQuery({
    queryKey: ["member-suggestions", user?.id],
    queryFn: listMemberSuggestions,
    enabled: Boolean(user),
  });
  const following = useQuery({ queryKey: ["following", user?.id], queryFn: listFollowing, enabled: Boolean(user) });
  const [newOpen, setNewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const cardPreference = useMutation({ mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => updateConversationPreference(id, { pinned }), onSuccess: () => void client.invalidateQueries({ queryKey: ["conversations"] }) });
  const cardDelete = useMutation({ mutationFn: (id: string) => deleteConversation(id), onSuccess: (_result, id) => { setConfirmDelete(null); void client.invalidateQueries({ queryKey: ["conversations"] }); if (id === peerId) setParams({}); } });
  const messages = useInfiniteQuery({
    queryKey: ["conversation-messages", user?.id, peerId],
    queryFn: ({ pageParam }) => listConversationMessages(peerId, pageParam),
    initialPageParam: 1,
    getNextPageParam: last => last.hasNextPage ? last.page + 1 : undefined,
    enabled: Boolean(user && peerId),
    refetchInterval: 5_000,
  });
  const typing = useQuery({
    queryKey: ["typing", peerId],
    queryFn: () => getTyping(peerId),
    enabled: Boolean(user && peerId),
    refetchInterval: 2_000,
  });
  const searchResults = useQuery({
    queryKey: ["message-search", query],
    queryFn: () => searchPrivateMessages(query),
    enabled: query.trim().length >= 2,
  });
  const recipientResults = useQuery({
    queryKey: ["message-recipient-search", recipientQuery],
    queryFn: () => searchDiscovery(recipientQuery),
    enabled: recipientQuery.trim().length >= 2,
  });
  const directPeer = useQuery({ queryKey: ["message-peer", peerId, user?.id], queryFn: () => getPublicProfileById(peerId), enabled: Boolean(user && peerId) });
  const refresh = () => {
    void client.invalidateQueries({
      queryKey: ["conversation-messages", user?.id, peerId],
    });
    void client.invalidateQueries({ queryKey: ["conversations"] });
  };
  useEffect(() => {
    const selected = conversations.data?.items.find(
      (item) => item.peer.id === peerId,
    );
    if (selected?.unreadCount) void markConversationRead(peerId).then(refresh);
  }, [peerId, conversations.data?.items]);
  if (!user)
    return (
      <section className="page empty-state">
        <MessageCircle size={40} />
        <h1>{t("Mesajlar", "Messages")}</h1>
        <p>{t("Konuşmalarını görmek için giriş yap.", "Log in to view your conversations.")}</p>
        <Link className="primary-action" to="/login">
          {t("Giriş yap", "Log in")}
        </Link>
      </section>
    );
  const list = conversations.data?.items ?? [];
  const selectedConversation = conversations.data?.items.find(
    (item) => item.peer.id === peerId,
  );
  const suggested = suggestions.data?.find((item) => item.id === peerId);
  const peer =
    selectedConversation?.peer ??
    (suggested
      ? {
          id: suggested.id,
          name: suggested.name,
          username: suggested.username,
          status: "active" as const,
          avatarUrl: suggested.avatarUrl ?? null,
        }
      : directPeer.data ? { id: directPeer.data.id, name: directPeer.data.accountType === "corporate" ? directPeer.data.companyName || directPeer.data.name : directPeer.data.name, username: directPeer.data.username, avatarUrl: directPeer.data.media.find(item => item.type === "image")?.url ?? null } : null);
  // 23/11 #62.1: önerilen alıcılar kullanıcının takip ettikleri arasından gelir.
  const newRecipients = (following.data ?? []).filter(
    (item) =>
      item.id !== user.id &&
      !(conversations.data?.items ?? []).some(
        (conversation) => conversation.peer.id === item.id,
      ),
  );
  return (
    <section
      className={`page messages-layout advanced-messages${peerId ? " has-selection" : ""}`}
    >
      <aside className="conversation-sidebar">
        <div className="message-sidebar-head">
          <div>
            <h1>{t("Mesajlar", "Messages")}</h1>
            <span>{conversations.data?.totalUnread ?? 0} {t("okunmamış", "unread")}</span>
          </div>
          {/* 23/11 #62.1: "Yeni konuşma" alanı yerine başlığın sağında "+ yeni mesaj" */}
          <button className="text-button new-message-link" onClick={() => { setNewOpen((open) => !open); setRecipientQuery(""); }} type="button"><Plus size={15}/>{t("yeni mesaj", "new message")}</button>
        </div>
        <div className="message-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Mesajlarda ara…", "Search messages…")}
          />
          <>
            {query ? (
              <button onClick={() => setQuery("")}>
                <X size={15} />
              </button>
            ) : null}
          </>
        </div>
        {query.trim().length >= 2 ? (
          <div className="message-search-results">
            {searchResults.data?.map((item) => (
              <button
                className="message-user-result"
                key={item.id}
                onClick={() => {
                  if (item.peer) setParams({ peer: item.peer.id });
                  setQuery("");
                }}
              >
                <span className="message-result-avatar">
                  {item.peer?.avatarUrl ? <img alt="" src={resolveMediaUrl(item.peer.avatarUrl)} /> : item.peer?.name?.[0] ?? "?"}
                </span>
                <span><strong>{item.peer?.name}</strong><small>{item.body}</small></span>
              </button>
            ))}
            {!searchResults.isLoading && !searchResults.data?.length ? (
              <small>{t("Sonuç bulunamadı.", "No results found.")}</small>
            ) : null}
          </div>
        ) : (
          <>
            {newOpen ? <label className="new-conversation-field">
              {t("Kime", "To")}
              <input
                autoFocus
                value={recipientQuery}
                onFocus={() => setRecipientFocused(true)}
                onBlur={() =>
                  window.setTimeout(() => setRecipientFocused(false), 150)
                }
                onChange={(event) => setRecipientQuery(event.target.value)}
                placeholder={t("Kullanıcı adı veya ad soyad yazarak seç", "Type a username or full name to select")}
              />
            </label> : null}
            {newOpen && recipientQuery.trim().length >= 2 ? (
              <div className="message-search-results">
                {recipientResults.data?.items
                  .filter((item) => item.kind === "user")
                  .map((item) => (
                    <button
                      className="message-user-result"
                      key={item.id}
                      onClick={() => {
                        setParams({ peer: item.id });
                        setRecipientQuery("");
                        setNewOpen(false);
                      }}
                    >
                      <span className="message-result-avatar">
                        {item.imageUrl ? <img alt="" src={resolveMediaUrl(item.imageUrl)} /> : item.title[0]}
                      </span>
                      <span><strong>{item.title}</strong><small>{item.subtitle}</small></span>
                    </button>
                  ))}
                {!recipientResults.isLoading &&
                !recipientResults.data?.items.some(
                  (item) => item.kind === "user",
                ) ? (
                  <small>{t("Kullanıcı bulunamadı.", "No member found.")}</small>
                ) : null}
              </div>
            ) : newOpen && (recipientFocused || !recipientQuery) ? (
              <div className="message-search-results">
                <small>{t("Takip ettiklerin", "People you follow")}</small>
                {newRecipients.slice(0, 8).map((member) => (
                  <button
                    className="message-user-result"
                    key={member.id}
                    onClick={() => { setParams({ peer: member.id }); setNewOpen(false); }}
                  >
                    <span className="message-result-avatar">
                      {member.avatarUrl ? <img alt="" src={resolveMediaUrl(member.avatarUrl)} /> : member.name[0]}
                    </span>
                    <span><strong>{member.username ? `@${member.username}` : member.name}</strong></span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="conversation-list">
              {list.map((conversation) => (
                <div className={`conversation-card-wrap${conversation.preference?.pinned ? " is-pinned" : ""}`} key={conversation.peer.id}>
                <button
                  className={
                    conversation.peer.id === peerId
                      ? "conversation-card is-active"
                      : "conversation-card"
                  }
                  onClick={() => setParams({ peer: conversation.peer.id })}
                >
                  <span className="conversation-avatar">
                    {conversation.peer.avatarUrl ? (
                      <img alt="" src={resolveMediaUrl(conversation.peer.avatarUrl)} />
                    ) : conversation.peer.name[0]}
                  </span>
                  <span>
                    <strong>
                      {conversation.peer.username ? `@${conversation.peer.username}` : conversation.peer.name}
                      {/* 23/11 #62.10: okunmamış sayısı kullanıcı adının sağında */}
                      {/* 26/11 #62 test dönüşü: tam yuvarlak kırmızı daire; 99'dan fazlası "99+" */}
                      {conversation.unreadCount ? <b aria-label={t(`${conversation.unreadCount} okunmamış mesaj`, `${conversation.unreadCount} unread messages`)} className={`conversation-unread${conversation.unreadCount > 99 ? " is-wide" : ""}`}>{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</b> : null}
                      {conversation.preference?.muted ? (
                        <VolumeX size={12} />
                      ) : null}
                    </strong>
                    <small>
                      <span className="conversation-last">{conversation.lastMessage.attachmentUrl ? "📎 " : ""}{conversation.lastMessage.body}</span>
                      {/* 23/11 #62.9: son mesajın ne zaman gönderildiği (1d, 3s, 4g, 3h…) */}
                      <span className="conversation-ago"> - {relativeAgo(conversation.lastMessage.createdAt, language)}</span>
                    </small>
                  </span>
                </button>
                {/* 23/11 #62.8: üzerine gelince sağ ortada sabitle ve sil */}
                <div className="conversation-card-tools">
                  <button aria-label={conversation.preference?.pinned ? t("Sabitlemeyi kaldır", "Unpin") : t("Sabitle", "Pin")} className={`conversation-pin${conversation.preference?.pinned ? " is-on" : ""}`} disabled={cardPreference.isPending} onClick={() => cardPreference.mutate({ id: conversation.peer.id, pinned: !conversation.preference?.pinned })} title={conversation.preference?.pinned ? t("Sabitlemeyi kaldır", "Unpin") : t("Sabitle", "Pin")} type="button">{conversation.preference?.pinned ? <PinOff size={15}/> : <Pin size={15}/>}</button>
                  <button aria-label={t("Mesaj dizisini sil", "Delete conversation")} className="conversation-delete" onClick={() => setConfirmDelete({ id: conversation.peer.id, name: conversation.peer.username ? `@${conversation.peer.username}` : conversation.peer.name })} title={t("Sil", "Delete")} type="button"><Trash2 size={15}/></button>
                </div>
                </div>
              ))}
              {!list.length ? (
                <p className="form-help">{t("Henüz konuşman yok.", "You have no conversations yet.")}</p>
              ) : null}
            </div>
            {/* 26/11 #124 (mobil): mesaj kartlarının altında cihaz bildirimi banner'ı */}
            <MessagesPushBanner className="messages-push-banner is-mobile" language={language} />
          </>
        )}
      </aside>
      {confirmDelete ? <div className="emotion-modal" role="presentation" onMouseDown={() => setConfirmDelete(null)}><section aria-labelledby="delete-thread-title" aria-modal="true" className="content-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog"><h2 id="delete-thread-title">{t("Mesaj dizisini sil", "Delete conversation")}</h2><p>{t(`${confirmDelete.name} ile mesaj dizisi senden silinecek. Devam etmek istiyor musun?`, `Your conversation with ${confirmDelete.name} will be deleted for you. Continue?`)}</p><div className="dialog-actions"><button disabled={cardDelete.isPending} onClick={() => setConfirmDelete(null)} type="button">{t("Vazgeç", "Cancel")}</button><button className="danger-action" disabled={cardDelete.isPending} onClick={() => cardDelete.mutate(confirmDelete.id)} type="button">{t("Sil", "Delete")}</button></div></section></div> : null}
      <div className="message-thread">
        {peer ? (
          <MessageThread
            key={peer.id}
            peer={peer}
            messages={[...new Map((messages.data?.pages.flatMap(page => page.items) ?? []).map(message => [message.id, message])).values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id))}
            hasOlder={messages.hasNextPage}
            loadingOlder={messages.isFetchingNextPage}
            historyError={messages.isFetchNextPageError}
            onLoadOlder={() => { void messages.fetchNextPage(); }}
            currentUserId={user.id}
            typing={Boolean(typing.data?.typing)}
            preference={selectedConversation?.preference}
            onBack={() => setParams({})}
            onChanged={refresh}
            language={language}
          />
        ) : (
          <div className="empty-state">
            <MessageCircle size={44} />
            <h2>{t("Bir konuşma seç", "Choose a conversation")}</h2>
            <p>{t("Mesajların burada görüntülenecek.", "Your messages will appear here.")}</p>
          </div>
        )}
        {/* 26/11 #124 (desktop): boş konuşma alanının altında cihaz bildirimi banner'ı */}
        {peer ? null : <MessagesPushBanner className="messages-push-banner is-desktop" language={language} />}
      </div>
    </section>
  );
}

function MessagesPushBanner({ className, language }: { className: string; language: string }) {
  const t = (tr: string, en: string) => (language === "tr" ? tr : en);
  return (
    <PushNotificationControl
      className={className}
      description={t("Diğer üyelerden mesaj geldiğinde gerçek zamanlı bildirim almayı bu cihazda etkinleştir.", "Enable real-time notifications on this device when other members message you.")}
      enableLabel={t("Bu cihazda etkinleştir", "Enable on this device")}
      title={t("Cihaz bildirimleri", "Device notifications")}
      variant="banner"
    />
  );
}

function MessageThread({
  peer,
  messages,
  currentUserId,
  typing,
  hasOlder, loadingOlder, historyError, onLoadOlder,
  preference,
  onBack,
  onChanged,
  language,
}: {
  peer: { id: string; name: string; username?: string | null; avatarUrl?: string | null };
  messages: PrivateChatMessage[];
  currentUserId: string;
  typing: boolean;
  hasOlder: boolean; loadingOlder: boolean; historyError: boolean; onLoadOlder: () => void;
  preference?: { pinned: boolean; muted: boolean; archived: boolean };
  onBack: () => void;
  onChanged: () => void;
  language: "tr" | "en";
}) {
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  // 17/10 #22.3: gönderilmemiş mesaj, konuşmaya özel taslak olarak saklanır.
  const [draft, setDraft, clearDraft] = useComposerDraft(currentUserId, "message", peer.id);
  const [editBody, setEditBody] = useState("");
  // 17/10 #22.2: karşı tarafın gizlilik ayarı izin vermiyorsa yazma alanı baştan pasiftir.
  const permission = useQuery({
    queryKey: ["message-permission", currentUserId, peer.id],
    queryFn: () => getMessagingPermission(peer.id),
    staleTime: 30_000,
  });
  const messagingClosed = permission.data?.canMessage === false;
  const [replyTo, setReplyTo] = useState<PrivateChatMessage | null>(null);
  const [editing, setEditing] = useState<PrivateChatMessage | null>(null);
  const body = editing ? editBody : draft;
  const setBody = editing ? setEditBody : setDraft;
  const [attachments, setAttachmentState] = useState<File[]>([]);
  // 26/11 #62.11 test dönüşü: gönderim sürerken eklenen dosyalar da aynı gönderimde sıraya girer.
  const attachmentsRef = useRef<File[]>([]);
  const setAttachments = (next: File[] | ((items: File[]) => File[])) => {
    attachmentsRef.current = typeof next === "function" ? next(attachmentsRef.current) : next;
    setAttachmentState(attachmentsRef.current);
  };
  const [uploadProgress, setUploadProgress] = useState<ReadonlyMap<File, number>>(new Map());
  const [menu, setMenu] = useState(false);
  const pickerRef = useRef<MediaPickerHandle>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const previousEdges = useRef<{ first?: string; last?: string }>({});
  const olderAnchor = useRef<{ height: number; top: number } | null>(null);
  const typingTimer = useRef<number | undefined>(undefined);
  const groupedMessages = useMemo(() => messages.reduce<Array<{ message: PrivateChatMessage; attachments: PrivateChatMessage[] }>>((groups, message) => {
    const previous = groups.at(-1);
    const previousMessage = previous?.attachments.at(-1) ?? previous?.message;
    const isMediaOnly = (item: PrivateChatMessage | undefined) => Boolean(item?.attachmentUrl && ["", "Medya", "Media"].includes(item.body.trim()));
    const sameUploadBatch = Boolean(
      previousMessage &&
      isMediaOnly(message) &&
      isMediaOnly(previousMessage) &&
      previousMessage.senderId === message.senderId &&
      Math.abs(new Date(message.createdAt).getTime() - new Date(previousMessage.createdAt).getTime()) < 60_000,
    );
    if (previous && sameUploadBatch) previous.attachments.push(message);
    else groups.push({ message, attachments: message.attachmentUrl ? [message] : [] });
    return groups;
  }, []), [messages]);
  const send = useMutation({
    mutationFn: async () => {
      if (!attachments.length)
        return sendPrivateMessage(peer.id, body, { replyToId: replyTo?.id });
      let last: PrivateChatMessage | undefined;
      let first = true;
      // 26/11 #62.11 test dönüşü: kuyruk her adımda güncel listeden okunur; gönderim sürerken eklenenler de gider.
      // Her dosyanın yüzdesi kendi küçük resminin üzerinde (sıradakiler %0), gönderilen dosya listeden çıkar.
      for (let attachment = attachmentsRef.current[0]; attachment; attachment = attachmentsRef.current[0]) {
        const current = attachment;
        last = await sendPrivateMessageWithProgress(peer.id, first ? body : "", { replyToId: first ? replyTo?.id : undefined, attachment: current }, (percent) => setUploadProgress(new Map([[current, percent]])));
        setAttachments(items => items.filter(file => file !== current));
        setUploadProgress(new Map());
        if (first) { clearDraft(); setReplyTo(null); first = false; }
      }
      return last!;
    },
    onError: () => { setUploadProgress(new Map()); void permission.refetch(); },
    onSuccess: () => {
      clearDraft();
      setReplyTo(null);
      stickToBottom.current = true;
      onChanged();
    },
  });
  const edit = useMutation({
    mutationFn: () => editPrivateMessage(editing!.id, body),
    onSuccess: () => {
      setEditBody("");
      setEditing(null);
      onChanged();
    },
  });
  const remove = useMutation({
    mutationFn: deletePrivateMessage,
    onSuccess: onChanged,
  });
  const react = useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) =>
      toggleMessageReaction(id, emoji),
    onSuccess: onChanged,
  });
  const preferenceMutation = useMutation({
    mutationFn: (input: {
      pinned?: boolean;
      muted?: boolean;
      archived?: boolean;
    }) => updateConversationPreference(peer.id, input),
    onSuccess: () => {
      setMenu(false);
      onChanged();
    },
  });
  const deleteConversationMutation = useMutation({
    mutationFn: () => deleteConversation(peer.id),
    onSuccess: () => {
      setMenu(false);
      onChanged();
      onBack();
    },
  });
  // 06/08 #59: engellenen kişi için menüde "Engeli kaldır" gösterilir.
  const queryClient = useQueryClient();
  const blocksQuery = useQuery({ queryKey: ["blocks"], queryFn: listBlocks });
  const peerBlocked = Boolean(blocksQuery.data?.some((block) => block.targetType === "user" && block.targetId === peer.id));
  const blockMutation = useMutation({
    mutationFn: () => createBlock("user", peer.id),
    onSuccess: () => {
      setMenu(false);
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
      onChanged();
      onBack();
    },
  });
  const unblockMutation = useMutation({
    mutationFn: () => removeBlock("user", peer.id),
    onSuccess: () => {
      setMenu(false);
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
      void queryClient.invalidateQueries({ queryKey: ["message-permission"] });
      onChanged();
    },
  });
  useLayoutEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const first = messages[0]?.id;
    const last = messages.at(-1)?.id;
    if (olderAnchor.current && first !== previousEdges.current.first) {
      stream.scrollTo({ top: olderAnchor.current.top + stream.scrollHeight - olderAnchor.current.height });
      olderAnchor.current = null;
    } else if (stickToBottom.current && last !== previousEdges.current.last) {
      stream.scrollTo({ top: stream.scrollHeight });
    }
    previousEdges.current = { first, last };
  }, [messages]);
  useEffect(() => {
    const textarea = textRef.current;
    if (!textarea) return;
    textarea.style.height = "42px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [body]);
  function type(value: string) {
    setBody(value);
    window.clearTimeout(typingTimer.current);
    void sendTyping(peer.id);
    typingTimer.current = window.setTimeout(() => undefined, 3000);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (messagingClosed || (!body.trim() && !attachments.length)) return;
    if (editing) edit.mutate();
    else send.mutate();
  }
  return (
    <>
      {/* 23/11 #62.3: "Geri" kullanıcı bilgilerinin bir üst satırında, solda */}
      <div className="message-thread-topbar">
        <button className="ghost-action messages-back" onClick={onBack}>
          <ArrowLeft size={18} /> {t("Geri", "Back")}
        </button>
      </div>
      <header className="message-thread-header">
        <UserIdentityLink
          user={peer}
          avatarClassName="thread-peer-avatar"
          showName={false}
        />
        <div>
          <div className="member-name-line"><FollowStar id={peer.id}/><Link to={userProfilePath(peer)}>
            <strong>{peer.username ? `@${peer.username}` : peer.name}</strong>
          </Link></div>
          <span>
            {typing
              ? t("yazıyor…", "typing…")
              : peer.name !== peer.username
                ? peer.name
                : t("Konnektora üyesi", "Konnektora member")}
          </span>
        </div>
        <div className="thread-menu">
          <button onClick={() => setMenu((value) => !value)}>
            <MoreVertical size={19} />
          </button>
          {menu ? (
            <div>
              <button
                onClick={() =>
                  preferenceMutation.mutate({ pinned: !preference?.pinned })
                }
              >
                <Pin size={15} />
                {preference?.pinned ? t("Sabitlemeyi kaldır", "Unpin") : t("Sabitle", "Pin")}
              </button>
              <button
                onClick={() =>
                  preferenceMutation.mutate({ muted: !preference?.muted })
                }
              >
                {preference?.muted ? (
                  <Volume2 size={15} />
                ) : (
                  <VolumeX size={15} />
                )}
                {preference?.muted ? t("Sesi aç", "Unmute") : t("Sessize al", "Mute")}
              </button>
              <button
                disabled={deleteConversationMutation.isPending}
                onClick={() =>
                  window.confirm(t("Bu konuşma senden silinsin mi?", "Delete this conversation for you?")) &&
                  deleteConversationMutation.mutate()
                }
              >
                <Trash2 size={15} />
                {t("Konuşmayı sil", "Delete conversation")}
              </button>
              {peerBlocked ? (
                <button disabled={unblockMutation.isPending} onClick={() => unblockMutation.mutate()}>
                  <Ban size={15} />
                  {t("Engeli kaldır", "Unblock member")}
                </button>
              ) : (
              <button
                disabled={blockMutation.isPending}
                onClick={() =>
                  window.confirm(language === "tr" ? `${peer.name} engellensin mi?` : `Block ${peer.name}?`) &&
                  blockMutation.mutate()
                }
              >
                <Ban size={15} />
                {t("Kullanıcıyı engelle", "Block member")}
              </button>
              )}
            </div>
          ) : null}
        </div>
      </header>
      <div className="message-stream" ref={streamRef} aria-live="polite" tabIndex={0} aria-label={t("Konuşma mesajları", "Conversation messages")} onScroll={event => { const node = event.currentTarget; stickToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80; }}>
        {hasOlder && <button type="button" className="secondary-action message-history-load" disabled={loadingOlder} onClick={() => { const node = streamRef.current; if (node) olderAnchor.current = { height: node.scrollHeight, top: node.scrollTop }; onLoadOlder(); }}>{loadingOlder ? t("Yükleniyor…", "Loading…") : t("Önceki mesajları yükle", "Load earlier messages")}</button>}
        {historyError && <p role="alert">{t("Önceki mesajlar yüklenemedi. Tekrar deneyin.", "Earlier messages could not be loaded. Try again.")}</p>}
        {groupedMessages.map(({ message, attachments: messageAttachments }, position) => (
          <div className="message-row-group" key={message.id}>
          {/* 23/11 #62.7: gün ayracı */}
          {position === 0 || dayKey(groupedMessages[position - 1]!.message.createdAt) !== dayKey(message.createdAt) ? <div className="message-day-separator"><span>{new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(message.createdAt))}</span></div> : null}
          <MessageBubble
            peerAvatarUrl={peer.avatarUrl ?? null}
            peerInitial={peer.name[0] ?? "?"}
            message={message}
            attachments={messageAttachments}
            mine={message.senderId === currentUserId}
            currentUserId={currentUserId}
            language={language}
            onReply={() => {
              setReplyTo(message);
              setEditing(null);
            }}
            onEdit={() => {
              setEditing(message);
              setReplyTo(null);
              setEditBody(message.body);
            }}
            onDelete={() =>
              window.confirm(t("Mesaj silinsin mi?", "Delete this message?")) && remove.mutate(message.id)
            }
            onReact={(emoji) => react.mutate({ id: message.id, emoji })}
          />
          </div>
        ))}
        {typing ? (
          <div className="typing-bubble">
            <i />
            <i />
            <i />
          </div>
        ) : null}
        {!messages.length ? (
          <p className="empty-state">{t("İlk mesajı sen gönder.", "Send the first message.")}</p>
        ) : null}
      </div>
      {replyTo || editing ? (
        <div className="composer-context">
          <div>
            {replyTo ? (
              <>
                <Reply size={15} />
                <span>
                  <strong>
                    {replyTo.senderId === currentUserId ? t("Sen", "You") : peer.name}
                  </strong>
                  {replyTo.body}
                </span>
              </>
            ) : (
              <>
                <Edit3 size={15} />
                <span>
                  <strong>{t("Mesajı düzenle", "Edit message")}</strong>
                  {editing?.body}
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => {
              setReplyTo(null);
              if (editing) setEditBody("");
              setEditing(null);
            }}
          >
            <X size={17} />
          </button>
        </div>
      ) : null}
      <MediaPicker ref={pickerRef} disabled={messagingClosed || Boolean(editing)} files={attachments} language={language} onChange={setAttachments} progress={uploadProgress} uploading={send.isPending}/>
      {/* 26/11 #62.11 test dönüşü: gönderim neden durduysa (tür, boyut, bağlantı…) kullanıcı görür. */}
      {send.isError || edit.isError ? <p className="form-error" role="alert">{t("Gönderim tamamlanamadı.", "Sending could not finish.")} {(send.error ?? edit.error) instanceof Error && (send.error ?? edit.error)!.message ? `${(send.error ?? edit.error)!.message} ` : ""}{attachments.length ? t("Gönderilen mesajları kontrol edip kalan dosyalarla yeniden deneyin.", "Check sent messages and retry the remaining files.") : ""}</p> : null}
      {messagingClosed ? <p className="message-closed-notice" role="status"><Ban aria-hidden="true" size={17}/>{t("Bu kullanıcı özel mesaj almak istemiyor.", "This member does not want to receive private messages.")}</p> : null}
      <form aria-disabled={messagingClosed || undefined} className={`message-composer advanced-composer${messagingClosed ? " is-closed" : ""}`} onSubmit={submit}>
        <textarea
          ref={textRef}
          aria-label={t("Mesaj", "Message")}
          value={body}
          onChange={(event) => type(event.target.value)}
          maxLength={5000}
          disabled={messagingClosed}
          placeholder={t("Bir mesaj yaz…", "Write a message…")}
          rows={3}
        />
        <button
          className="primary-action"
          disabled={send.isPending || edit.isPending || messagingClosed}
        >
          <Send size={18} />
          {/* 26/11 #105: yükleme/gönderim sürdükçe etiket "Gönderiliyor…" olur. */}
          <span>{send.isPending || edit.isPending ? t("Gönderiliyor…", "Sending…") : t("Gönder", "Send")}</span>
        </button>
        <button
          className="message-media-action"
          type="button"
          aria-label={t("Fotoğraf/video ekle", "Add photo/video")}
          disabled={messagingClosed || Boolean(editing)}
          title={t("Fotoğraf/video ekle", "Add photo/video")}
          onClick={() => pickerRef.current?.open()}
        >
          <ImagePlus size={20} aria-hidden="true"/>
          <span className="composer-media-label">{t("Resim / video ekle", "Add photo / video")}</span>
        </button>
        <ComposerTips />
      </form>
      <DraftLeaveGuard
        active={!editing && !messagingClosed && Boolean(draft.trim()) && !send.isPending}
        isLeaving={({ currentLocation, nextLocation }) => currentLocation.pathname !== nextLocation.pathname || new URLSearchParams(nextLocation.search).get("peer") !== peer.id}
        kind="message"
        onDiscard={clearDraft}
      />
    </>
  );
}

function MessageBubble({
  peerAvatarUrl,
  peerInitial,
  message,
  attachments,
  mine,
  currentUserId,
  language,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: {
  peerAvatarUrl: string | null;
  peerInitial: string;
  message: PrivateChatMessage;
  attachments: PrivateChatMessage[];
  mine: boolean;
  currentUserId: string;
  language: "tr" | "en";
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}) {
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const [actions, setActions] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const grouped = useMemo(
    () =>
      Object.entries(
        (message.reactions ?? []).reduce<Record<string, string[]>>(
          (all, reaction) => ({
            ...all,
            [reaction.emoji]: [...(all[reaction.emoji] ?? []), reaction.userId],
          }),
          {},
        ),
      ),
    [message.reactions],
  );
  return (
    <>
      <div className={mine ? "message-line is-mine" : "message-line"}>
      {!mine ? <span className="message-peer-avatar" aria-hidden="true">{peerAvatarUrl ? <img alt="" src={resolveMediaUrl(peerAvatarUrl)}/> : peerInitial}</span> : null}
      <article className={mine ? "message-bubble is-mine" : "message-bubble"}>
        <div className="bubble-actions">
          <button onClick={onReply} title={t("Yanıtla", "Reply")}>
            <Reply size={14} />
          </button>
          <button onClick={() => setActions((value) => !value)} title={t("Tepki", "React")}>
            <Smile size={14} />
          </button>
          {!mine ? (
            <button onClick={() => setReportOpen(true)} title={t("Rapor et", "Report")}>
              <Flag size={14} />
            </button>
          ) : null}
          {mine && message.status === "active" ? (
            <>
              {Date.now() - new Date(message.createdAt).getTime() < 30 * 60_000 ? <button onClick={onEdit} title={t("Düzenle", "Edit")}>
                <Edit3 size={14} />
              </button> : null}
              <button onClick={onDelete} title={t("Sil", "Delete")}>
                <Trash2 size={14} />
              </button>
            </>
          ) : null}
        </div>
        {actions ? (
          <div className="reaction-picker">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji);
                  setActions(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
        {message.replyTo ? (
          <div className="reply-preview">
            <Reply size={13} />
            {message.replyTo.body}
          </div>
        ) : null}
        {!(message.attachmentUrl && ["", "Medya", "Media"].includes(message.body.trim())) ? <p className={message.status === "deleted" ? "deleted-message" : ""}>
          <RichText hideEmbeddableUrls text={message.body} />
          {message.status === "active" ? <EmbeddedMedia text={message.body}/> : null}
        </p> : null}
        {/* 23/11 #62.11.4–5: gönderilen medyalar etkinlik gönderilerindeki albüm görünümünde; dokununca medya lightbox'ı açılır */}
        {attachments.some((attachment) => attachment.attachmentType?.startsWith("image/") || attachment.attachmentType?.startsWith("video/")) ? <MediaAlbum items={attachments.filter((attachment) => attachment.attachmentType?.startsWith("image/") || attachment.attachmentType?.startsWith("video/")).map((attachment) => ({ id: attachment.id, url: attachment.attachmentUrl!, type: attachment.attachmentType!.startsWith("video/") ? "video" : "image" }))}/> : null}
        {attachments.filter((attachment) => !(attachment.attachmentType?.startsWith("image/") || attachment.attachmentType?.startsWith("video/"))).map((attachment) => <a className="message-file" href={resolveMediaUrl(attachment.attachmentUrl!)} key={attachment.id} rel="noreferrer" target="_blank"><File size={18}/><span>{attachment.attachmentName ?? t("Dosya", "File")}<small>{attachment.attachmentSize ? `${Math.ceil(attachment.attachmentSize / 1024)} KB` : ""}</small></span></a>)}
        <footer>
          <time>
            {new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(message.createdAt))}
            {message.editedAt ? t(" · düzenlendi", " · edited") : ""}
          </time>
          {mine ? (
            message.readAt ? (
              <CheckCheck className="message-read-tick" size={15} aria-label={t("Okundu", "Read")} />
            ) : (
              <Check size={15} aria-label={t("Gönderildi", "Sent")} />
            )
          ) : null}
        </footer>
        {grouped.length ? (
          <div className="message-reactions">
            {grouped.map(([emoji, users]) => (
              <button
                className={users.includes(currentUserId) ? "active" : ""}
                key={emoji}
                onClick={() => onReact(emoji)}
              >
                {emoji} {users.length}
              </button>
            ))}
          </div>
        ) : null}
      </article>
      </div>
      <ReportDialog
        onClose={() => setReportOpen(false)}
        open={reportOpen}
        targetId={message.id}
        targetType="private_message"
      />
    </>
  );
}

/** 23/11 #62.9: "1d" (dakika), "3s" (saat), "4g" (gün), "3h" (hafta) */
function relativeAgo(value: string | Date, language: "tr" | "en") {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return language === "tr" ? `${minutes}d` : `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return language === "tr" ? `${hours}s` : `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return language === "tr" ? `${days}g` : `${days}d`;
  return language === "tr" ? `${Math.round(days / 7)}h` : `${Math.round(days / 7)}w`;
}

const dayKey = (value: string | Date) => { const date = new Date(value); return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; };
