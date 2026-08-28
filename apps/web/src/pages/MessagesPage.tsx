import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  Check,
  CheckCheck,
  Edit3,
  File,
  Flag,
  MessageCircle,
  MoreVertical,
  Pin,
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
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RichText } from "../components/RichText";
import {
  UserIdentityLink,
  userProfilePath,
} from "../components/UserIdentityLink";
import { ReportDialog } from "../components/ReportDialog";
import { ComposerTips } from "../components/ComposerTips";
import type { PrivateChatMessage } from "@konnektora/shared";
import {
  createBlock,
  deleteConversation,
  deletePrivateMessage,
  editPrivateMessage,
  getTyping,
  getUserSession,
  listConversationMessages,
  listConversations,
  listMemberSuggestions,
  markConversationRead,
  resolveMediaUrl,
  searchDiscovery,
  searchPrivateMessages,
  sendPrivateMessage,
  sendTyping,
  toggleMessageReaction,
  updateConversationPreference,
} from "../lib/api";
import { useLanguage } from "../lib/i18n";

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
  const messages = useQuery({
    queryKey: ["conversation-messages", peerId],
    queryFn: () => listConversationMessages(peerId),
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
  const refresh = () => {
    void client.invalidateQueries({
      queryKey: ["conversation-messages", peerId],
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
        }
      : null);
  const newRecipients = (suggestions.data ?? []).filter(
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
                key={item.id}
                onClick={() => {
                  if (item.peer) setParams({ peer: item.peer.id });
                  setQuery("");
                }}
              >
                <strong>{item.peer?.name}</strong>
                <span>{item.body}</span>
              </button>
            ))}
            {!searchResults.isLoading && !searchResults.data?.length ? (
              <small>{t("Sonuç bulunamadı.", "No results found.")}</small>
            ) : null}
          </div>
        ) : (
          <>
            <label className="new-conversation-field">
              {t("Yeni konuşma", "New conversation")}
              <input
                value={recipientQuery}
                onFocus={() => setRecipientFocused(true)}
                onBlur={() =>
                  window.setTimeout(() => setRecipientFocused(false), 150)
                }
                onChange={(event) => setRecipientQuery(event.target.value)}
                placeholder={t("Kullanıcı adı veya ad yaz…", "Enter a username or name…")}
              />
            </label>
            {recipientQuery.trim().length >= 2 ? (
              <div className="message-search-results">
                {recipientResults.data?.items
                  .filter((item) => item.kind === "user")
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setParams({ peer: item.id });
                        setRecipientQuery("");
                      }}
                    >
                      <strong>{item.title}</strong>
                      <span>{item.subtitle}</span>
                    </button>
                  ))}
                {!recipientResults.isLoading &&
                !recipientResults.data?.items.some(
                  (item) => item.kind === "user",
                ) ? (
                  <small>{t("Kullanıcı bulunamadı.", "No member found.")}</small>
                ) : null}
              </div>
            ) : recipientFocused ? (
              <div className="message-search-results">
                <small>{t("Öneriler", "Suggestions")}</small>
                {newRecipients.slice(0, 5).map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setParams({ peer: member.id })}
                  >
                    <strong>
                      {member.username ? `@${member.username}` : member.name}
                    </strong>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="conversation-list">
              {list.map((conversation) => (
                <button
                  className={
                    conversation.peer.id === peerId
                      ? "conversation-card is-active"
                      : "conversation-card"
                  }
                  key={conversation.peer.id}
                  onClick={() => setParams({ peer: conversation.peer.id })}
                >
                  <span className="conversation-avatar">
                    {conversation.peer.name[0]}
                  </span>
                  <span>
                    <strong>
                      {conversation.peer.name}
                      {conversation.preference?.pinned ? (
                        <Pin size={12} />
                      ) : null}
                      {conversation.preference?.muted ? (
                        <VolumeX size={12} />
                      ) : null}
                    </strong>
                    <small>
                      {conversation.lastMessage.attachmentUrl ? "📎 " : ""}
                      {conversation.lastMessage.body}
                    </small>
                  </span>
                  {conversation.unreadCount ? (
                    <b>{conversation.unreadCount}</b>
                  ) : null}
                </button>
              ))}
              {!list.length ? (
                <p className="form-help">{t("Henüz konuşman yok.", "You have no conversations yet.")}</p>
              ) : null}
            </div>
          </>
        )}
      </aside>
      <div className="message-thread">
        {peer ? (
          <MessageThread
            peer={peer}
            messages={messages.data?.items ?? []}
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
      </div>
    </section>
  );
}

function MessageThread({
  peer,
  messages,
  currentUserId,
  typing,
  preference,
  onBack,
  onChanged,
  language,
}: {
  peer: { id: string; name: string; username?: string | null };
  messages: PrivateChatMessage[];
  currentUserId: string;
  typing: boolean;
  preference?: { pinned: boolean; muted: boolean; archived: boolean };
  onBack: () => void;
  onChanged: () => void;
  language: "tr" | "en";
}) {
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<PrivateChatMessage | null>(null);
  const [editing, setEditing] = useState<PrivateChatMessage | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [menu, setMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | undefined>(undefined);
  const previews = useMemo(
    () => attachments.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [attachments],
  );
  const groupedMessages = useMemo(() => messages.reduce<Array<{ message: PrivateChatMessage; attachments: PrivateChatMessage[] }>>((groups, message) => {
    const previous = groups.at(-1);
    const previousMessage = previous?.attachments.at(-1) ?? previous?.message;
    const sameUploadBatch = Boolean(
      message.attachmentUrl &&
      previousMessage?.attachmentUrl &&
      previousMessage.senderId === message.senderId &&
      ["Medya", "Media"].includes(message.body) &&
      Math.abs(new Date(message.createdAt).getTime() - new Date(previousMessage.createdAt).getTime()) < 60_000,
    );
    if (previous && sameUploadBatch) previous.attachments.push(message);
    else groups.push({ message, attachments: message.attachmentUrl ? [message] : [] });
    return groups;
  }, []), [messages]);
  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews],
  );
  const send = useMutation({
    mutationFn: async () => {
      if (!attachments.length)
        return sendPrivateMessage(peer.id, body, { replyToId: replyTo?.id });
      let last: PrivateChatMessage | undefined;
      for (const [index, attachment] of attachments.entries())
        last = await sendPrivateMessage(
          peer.id,
          index === 0 ? body : "",
          { replyToId: index === 0 ? replyTo?.id : undefined, attachment },
        );
      return last!;
    },
    onSuccess: () => {
      setBody("");
      setReplyTo(null);
      setAttachments([]);
      onChanged();
    },
  });
  const edit = useMutation({
    mutationFn: () => editPrivateMessage(editing!.id, body),
    onSuccess: () => {
      setBody("");
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
  const blockMutation = useMutation({
    mutationFn: () => createBlock("user", peer.id),
    onSuccess: () => {
      setMenu(false);
      onChanged();
      onBack();
    },
  });
  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight });
  }, [messages.length]);
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
    if (!body.trim() && !attachments.length) return;
    if (editing) edit.mutate();
    else send.mutate();
  }
  return (
    <>
      <header className="message-thread-header">
        <button className="ghost-action messages-back" onClick={onBack}>
          <ArrowLeft size={18} /> {t("Geri", "Back")}
        </button>
        <UserIdentityLink
          user={peer}
          avatarClassName="thread-peer-avatar"
          showName={false}
        />
        <div>
          <Link to={userProfilePath(peer)}>
            <strong>{peer.name}</strong>
          </Link>
          <span>
            {typing
              ? t("yazıyor…", "typing…")
              : peer.username
                ? `@${peer.username}`
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
            </div>
          ) : null}
        </div>
      </header>
      <div className="message-stream" ref={streamRef} aria-live="polite">
        {groupedMessages.map(({ message, attachments: messageAttachments }) => (
          <MessageBubble
            key={message.id}
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
              setBody(message.body);
            }}
            onDelete={() =>
              window.confirm(t("Mesaj silinsin mi?", "Delete this message?")) && remove.mutate(message.id)
            }
            onReact={(emoji) => react.mutate({ id: message.id, emoji })}
          />
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
              setEditing(null);
              setBody("");
            }}
          >
            <X size={17} />
          </button>
        </div>
      ) : null}
      {previews.length ? (
        <div className="message-attachment-previews">
          {previews.map(({ file, url }, index) => (
            <div key={`${file.name}-${file.lastModified}`}>
              <span>
                {file.type.startsWith("video/") ? (
                  <video src={url} />
                ) : (
                  <img src={url} alt={file.name} />
                )}
              </span>
              <small>{file.name}</small>
              <button
                aria-label={language === "tr" ? `${file.name} ekini kaldır` : `Remove ${file.name} attachment`}
                onClick={() =>
                  setAttachments((items) =>
                    items.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                type="button"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <form className="message-composer advanced-composer" onSubmit={submit}>
        <input
          ref={fileRef}
          hidden
          multiple
          type="file"
          accept="image/*,video/*"
          onChange={(event) => {
            const selected = [...(event.target.files ?? [])].filter(
              (file) =>
                file.type.startsWith("image/") ||
                file.type.startsWith("video/"),
            );
            setAttachments((items) => [...items, ...selected].slice(0, 6));
            event.target.value = "";
          }}
        />
        <textarea
          ref={textRef}
          aria-label={t("Mesaj", "Message")}
          value={body}
          onChange={(event) => type(event.target.value)}
          maxLength={5000}
          placeholder={t("Bir mesaj yaz…", "Write a message…")}
          rows={3}
        />
        <button
          className="primary-action"
          disabled={send.isPending || edit.isPending}
        >
          <Send size={18} />
          <span>{t("Gönder", "Send")}</span>
        </button>
        <button
          className="message-media-action"
          type="button"
          title={t("Fotoğraf/video ekle", "Add photo/video")}
          onClick={() => fileRef.current?.click()}
        >
          <span>{t("Fotoğraf/video ekle", "Add photo/video")}</span>
        </button>
        <ComposerTips />
      </form>
    </>
  );
}

function MessageBubble({
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
              <button onClick={onEdit} title={t("Düzenle", "Edit")}>
                <Edit3 size={14} />
              </button>
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
        {!(message.attachmentUrl && ["Medya", "Media"].includes(message.body)) ? <p className={message.status === "deleted" ? "deleted-message" : ""}>
          <RichText text={message.body} />
        </p> : null}
        {attachments.length ? <div className={`message-media-collage message-media-collage-${Math.min(attachments.length, 4)}`}>{attachments.map((attachment) => attachment.attachmentType?.startsWith("image/") || attachment.attachmentType?.startsWith("video/") ? <a href={resolveMediaUrl(attachment.attachmentUrl!)} key={attachment.id} rel="noreferrer" target="_blank">{attachment.attachmentType.startsWith("image/") ? <img className="message-image" src={resolveMediaUrl(attachment.attachmentUrl!)} alt={attachment.attachmentName ?? t("Mesaj görseli", "Message image")}/> : <video className="message-image" controls preload="metadata" src={resolveMediaUrl(attachment.attachmentUrl!)}/>}</a> : <a className="message-file" href={resolveMediaUrl(attachment.attachmentUrl!)} key={attachment.id} rel="noreferrer" target="_blank"><File size={18}/><span>{attachment.attachmentName ?? t("Dosya", "File")}<small>{attachment.attachmentSize ? `${Math.ceil(attachment.attachmentSize / 1024)} KB` : ""}</small></span></a>)}</div> : null}
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
              <CheckCheck size={15} aria-label={t("Okundu", "Read")} />
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
      <ReportDialog
        onClose={() => setReportOpen(false)}
        open={reportOpen}
        targetId={message.id}
        targetType="private_message"
      />
    </>
  );
}
