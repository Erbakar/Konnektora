import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ListPlus, Plus, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  addGuestListMember,
  checkInEventParticipant,
  checkInPlaceMember,
  createGuestList,
  followUser,
  getPublicProfileById,
  getUserSession,
  inviteEventParticipant,
  invitePlaceMember,
  listEventParticipants,
  listFollowing,
  listGuestLists,
  listPlaceMembers,
  removeGuestListMember,
  resolveMediaUrl,
  unfollowUser,
  updateEventParticipant,
  updatePlaceMember,
} from "../lib/api";
import { useLanguage } from "../lib/i18n";

export type GuestListTarget = {
  id: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
  accountType?: string | null;
  plan?: string | null;
  status?: string | null;
  role?: string | null;
  checkedIn?: boolean;
};

export type GuestListContext = {
  id: string;
  name?: string;
  type: "event" | "place";
};

type GuestListContextMember = {
  userId: string;
  status: string;
  role: string;
  checkedInAt?: string | Date | null;
  tickets?: Array<{
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    unitPrice: number;
    currency: string;
    gateOpensAt: string | Date | null;
    gateClosesAt: string | Date | null;
  }>;
};

export function GuestListAction({
  canUse,
  target,
  className = "secondary-action",
  compact = false,
  label,
  ariaLabel,
  context,
}: {
  canUse: boolean;
  target: GuestListTarget;
  className?: string;
  compact?: boolean;
  label?: string;
  ariaLabel?: string;
  context?: GuestListContext;
}) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const isSelf = getUserSession()?.id === target.id;
  const lists = useQuery({
    queryKey: ["guest-lists"],
    queryFn: listGuestLists,
    enabled: canUse && !isSelf,
  });
  if (!canUse || isSelf) return null;
  const membershipCount = (lists.data ?? []).filter((list) =>
    list.members.some((member) => member.userId === target.id),
  ).length;
  const defaultLabel = membershipCount
    ? language === "tr"
      ? `${membershipCount} Guest List'te`
      : `In ${membershipCount} Guest List${membershipCount === 1 ? "" : "s"}`
    : language === "tr"
      ? "Guest List'e ekle"
      : "Add to Guest List";
  return (
    <>
      <button aria-label={ariaLabel ?? defaultLabel} className={className} onClick={() => setOpen(true)} type="button">
        <UserPlus size={16}/>{compact ? null : ` ${label ?? defaultLabel}`}
      </button>
      {open ? <GuestListDialog context={context} target={target} onClose={() => setOpen(false)}/> : null}
    </>
  );
}

export function GuestListDialog({ context, target, onClose }: { context?: GuestListContext; target: GuestListTarget; onClose: () => void }) {
  const { language } = useLanguage();
  const tr = language === "tr";
  const client = useQueryClient();
  const lists = useQuery({ queryKey: ["guest-lists"], queryFn: listGuestLists });
  const following = useQuery({ queryKey: ["following"], queryFn: listFollowing });
  const publicProfile = useQuery({
    queryKey: ["public-profile", "id", target.id],
    queryFn: () => getPublicProfileById(target.id),
    enabled: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(target.id),
    retry: false,
  });
  const contextMembers = useQuery<GuestListContextMember[]>({
    queryKey: ["guest-list-context", context?.type, context?.id],
    queryFn: async () => {
      if (context?.type === "event") {
        const members = await listEventParticipants(context.id, "user");
        return members.map((member) => ({ userId: member.userId, status: member.status, role: member.role, checkedInAt: member.checkedInAt, tickets: member.tickets }));
      }
      const members = await listPlaceMembers(context!.id);
      return members.map((member) => ({ userId: member.userId, status: member.status, role: member.role, checkedInAt: member.checkedInAt }));
    },
    enabled: Boolean(context),
    retry: false,
  });
  const isFollowing = following.data?.some((member) => member.id === target.id) ?? false;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newListName, setNewListName] = useState("");
  const [defaultList, setDefaultList] = useState("");
  const [organizerType, setOrganizerType] = useState<"manager" | "organizer">("organizer");
  const [saveError, setSaveError] = useState(false);
  const initialMembership = useMemo(
    () => new Set((lists.data ?? []).filter((list) => list.members.some((member) => member.userId === target.id)).map((list) => list.id)),
    [lists.data, target.id],
  );
  useEffect(() => setSelected(new Set(initialMembership)), [initialMembership]);
  const contextMember = (contextMembers.data ?? []).find((member) => member.userId === target.id);
  useEffect(() => {
    if (!context) return;
    if (contextMember?.checkedInAt || target.checkedIn) setDefaultList("attended");
    else if (contextMember && ["manager", "organizer"].includes(contextMember.role) && contextMember.status === "accepted") setDefaultList("organizer");
    else setDefaultList(contextMember?.status ?? target.status ?? "");
    if (contextMember && ["manager", "organizer"].includes(contextMember.role)) setOrganizerType(contextMember.role as "manager" | "organizer");
  }, [context, contextMember, target.checkedIn, target.status]);
  const saveContext = async () => {
    if (!context || !defaultList) return;
    const desiredRole = defaultList === "organizer" ? organizerType : contextMember?.role;
    if (context.type === "event") {
      if (!contextMember) await inviteEventParticipant(context.id, { userId: target.id, role: desiredRole ?? "attendee" }, "user");
      if (defaultList === "attended") {
        if (contextMember && !["accepted", "invited"].includes(contextMember.status)) await updateEventParticipant(context.id, target.id, { status: "accepted" }, "user");
        await checkInEventParticipant(context.id, target.id, "user");
      }
      else if (defaultList === "organizer") await updateEventParticipant(context.id, target.id, { status: "accepted", role: desiredRole ?? "organizer" }, "user");
      else if (["declined", "banned"].includes(defaultList)) await updateEventParticipant(context.id, target.id, { status: defaultList }, "user");
    } else {
      if (!contextMember) await invitePlaceMember(context.id, { userId: target.id, role: desiredRole ?? "member" });
      if (defaultList === "attended") {
        await updatePlaceMember(context.id, target.id, { status: "accepted", role: desiredRole ?? "member" });
        await checkInPlaceMember(context.id, target.id);
      }
      else if (defaultList === "organizer") await updatePlaceMember(context.id, target.id, { status: "accepted", role: desiredRole ?? "organizer" });
      else if (["declined", "banned"].includes(defaultList)) await updatePlaceMember(context.id, target.id, { status: defaultList });
    }
  };
  const save = useMutation({
    mutationFn: async () => {
      setSaveError(false);
      const owned = (lists.data ?? []).filter((list) => list.access !== "read");
      await Promise.all(owned.map((list) => {
        const hadMember = initialMembership.has(list.id);
        const shouldHaveMember = selected.has(list.id);
        if (!hadMember && shouldHaveMember) return addGuestListMember(list.id, target.id);
        if (hadMember && !shouldHaveMember) return removeGuestListMember(list.id, target.id);
        return Promise.resolve();
      }));
      await saveContext();
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["guest-lists"] });
      if (context) {
        await client.invalidateQueries({ queryKey: ["guest-list-context", context.type, context.id] });
        await client.invalidateQueries({ queryKey: [context.type, context.id, "related-users"] });
      }
      onClose();
    },
    onError: () => setSaveError(true),
  });
  const create = useMutation({
    mutationFn: async () => {
      const list = await createGuestList(newListName.trim());
      await addGuestListMember(list.id, target.id);
    },
    onSuccess: async () => {
      setNewListName("");
      await client.invalidateQueries({ queryKey: ["guest-lists"] });
    },
    onError: () => setSaveError(true),
  });
  const follow = useMutation({
    mutationFn: () => isFollowing ? unfollowUser(target.id) : followUser(target.id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["following"] }),
  });
  const ordered = [...(lists.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, tr ? "tr" : "en"));
  const systemRole = ["admin", "super_admin", "curator"].includes(target.role ?? "") ? target.role : publicProfile.data?.systemRole;
  const resolvedPlan = target.plan ?? publicProfile.data?.plan;
  const resolvedAccountType = target.accountType ?? publicProfile.data?.accountType;
  const systemUser = ["admin", "super_admin"].includes(systemRole ?? "")
    ? "Admin"
    : systemRole === "curator"
      ? tr ? "Küratör" : "Curator"
      : resolvedPlan
        ? translateGuestListValue(resolvedPlan, language)
        : tr ? "Standart" : "Standard";
  const tickets = context?.type === "event" ? contextMember?.tickets ?? [] : [];
  const accountLabel = resolvedAccountType ? translateGuestListValue(resolvedAccountType, language) : null;
  const planLabel = resolvedPlan ? translateGuestListValue(resolvedPlan, language) : null;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="content-dialog guest-list-dialog" role="dialog" aria-modal="true" aria-label={tr ? "Misafir listesine ekle" : "Add to guest list"} onMouseDown={(event) => event.stopPropagation()}>
        <button className="passport-close" aria-label={tr ? "Kapat" : "Close"} onClick={onClose}>×</button>
        <header className="guest-list-dialog-heading is-compact">
          <div><ListPlus size={22}/></div>
          <span className="eyebrow" lang="en">Guest List</span>
          <h2>{tr ? "Listelerini düzenle" : "Organize your lists"}</h2>
          <p>{tr ? "Bu kişinin bulunacağı listeleri seç ve tek seferde kaydet." : "Choose the lists this person belongs to and save once."}</p>
        </header>
        <header className="guest-list-person">
          {target.avatarUrl ? <img alt="" src={resolveMediaUrl(target.avatarUrl)}/> : <div className="post-avatar">{target.name.slice(0, 1).toUpperCase()}</div>}
          <div><strong>{target.username ? `@${target.username}` : target.name}</strong><span>{target.name}</span></div>
          <button className="secondary-action" disabled={follow.isPending || following.isLoading} onClick={() => follow.mutate()} type="button">{isFollowing ? (tr ? "Takibi bırak" : "Unfollow") : (tr ? "Takip et" : "Follow")}</button>
        </header>
        <dl className="guest-list-context">
          <div><dt>{tr ? "Sistem kullanıcısı" : "System user"}</dt><dd>{systemUser}</dd></div>
          {accountLabel ? <div><dt>{tr ? "Hesap" : "Account"}</dt><dd>{accountLabel}</dd></div> : null}
          {planLabel ? <div><dt>{tr ? "Paket" : "Plan"}</dt><dd>{planLabel}</dd></div> : null}
          {target.status ? <div><dt>{tr ? "Durum" : "Status"}</dt><dd>{translateGuestListValue(target.status, language)}{target.checkedIn ? ` · ${tr ? "Check-in yapıldı" : "Checked in"}` : ""}</dd></div> : null}
          {target.role ? <div><dt>{tr ? "Rol" : "Role"}</dt><dd>{translateGuestListValue(target.role, language)}</dd></div> : null}
        </dl>
        {context ? <section className="guest-list-default-section">
          <div className="guest-list-dialog-section-title"><strong>{context.type === "event" ? (tr ? "Etkinlik listesi" : "Event list") : (tr ? "Mekân listesi" : "Place list")}</strong>{context.name ? <span>{context.name}</span> : null}</div>
          <label><span>{tr ? "Varsayılan liste" : "Default list"}</span><select disabled={contextMembers.isLoading || save.isPending} onChange={(event) => setDefaultList(event.target.value)} value={defaultList}>
            <option value="">{tr ? "Değişiklik yok" : "No change"}</option>
            <option disabled value="invited">{tr ? "Davet edildi" : "Invited"}</option>
            <option disabled value={context.type === "event" ? "requested" : "pending"}>{tr ? "Beklemede" : "Pending"}</option>
            <option disabled value="accepted">{tr ? "Katılım onaylandı" : "Attendance approved"}</option>
            <option value="attended">{tr ? "Katıldı" : "Attended"}{contextMember?.checkedInAt ? ` · ${new Date(contextMember.checkedInAt).toLocaleString(tr ? "tr-TR" : "en-US")}` : ""}</option>
            <option value="organizer">{tr ? "Organizatör" : "Organizer"}</option>
            <option value="declined">{tr ? "Reddetti" : "Declined"}</option>
            <option value="banned">{tr ? "Yasaklandı" : "Banned"}</option>
          </select></label>
          {defaultList === "organizer" ? <label><span>{tr ? "Organizatör türü" : "Organizer type"}</span><select onChange={(event) => setOrganizerType(event.target.value as "manager" | "organizer")} value={organizerType}><option value="manager">{tr ? "Sahip" : "Owner"}</option><option value="organizer">{tr ? "Organizatör" : "Organizer"}</option></select></label> : null}
          {tickets.length ? <div className="guest-list-ticket-summary"><strong>{tr ? "Biletler" : "Tickets"}</strong>{tickets.map((ticket) => <article key={ticket.id}><div><strong>{ticket.name}</strong>{ticket.description ? <span>{ticket.description}</span> : null}</div><span>{ticket.quantity} × {ticket.unitPrice} {ticket.currency}</span>{ticket.gateOpensAt || ticket.gateClosesAt ? <small>{tr ? "Kapı" : "Gate"}: {ticket.gateOpensAt ? new Date(ticket.gateOpensAt).toLocaleString(tr ? "tr-TR" : "en-US") : "—"} – {ticket.gateClosesAt ? new Date(ticket.gateClosesAt).toLocaleString(tr ? "tr-TR" : "en-US") : "—"}</small> : null}</article>)}</div> : null}
        </section> : null}
        <div className="guest-list-dialog-section-title"><strong>{tr ? "Özel Guest List'ler" : "Custom Guest Lists"}</strong><span>{selected.size} {tr ? "seçili" : "selected"}</span></div>
        <div className="admin-list guest-list-checkboxes">
          {ordered.map((list) => {
            const readOnly = list.access === "read";
            return <label className="admin-list-row" key={list.id}>
              <input checked={selected.has(list.id)} disabled={readOnly} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(list.id); else next.delete(list.id); return next; })} type="checkbox"/>
              <span className="guest-list-checkmark"><Check size={15}/></span>
              <span><strong>{list.name}</strong><small>{list.members.length} {tr ? "kişi" : "people"}{readOnly ? ` · ${tr ? "salt okunur" : "read only"}` : ""}</small></span>
            </label>;
          })}
        </div>
        {!lists.isLoading && !ordered.length ? <p className="form-help">{tr ? "Henüz Guest List oluşturmadınız." : "You have not created a Guest List yet."}</p> : null}
        <form className="guest-list-inline-create" onSubmit={(event) => { event.preventDefault(); if (newListName.trim()) create.mutate(); }}>
          <Plus size={18}/>
          <input aria-label={tr ? "Yeni liste adı" : "New list name"} maxLength={80} minLength={2} onChange={(event) => setNewListName(event.target.value)} placeholder={tr ? "Yeni bir Guest List adı yazın…" : "Write a new guest list name…"} value={newListName}/>
          <button className="secondary-action" disabled={newListName.trim().length < 2 || create.isPending} type="submit">{tr ? "Oluştur ve ekle" : "Create and add"}</button>
        </form>
        {saveError || lists.isError ? <p className="form-error">{tr ? "Guest List değişikliği kaydedilemedi." : "The Guest List change could not be saved."}</p> : null}
        <footer className="guest-list-dialog-actions"><button className="secondary-action" onClick={onClose} type="button">{tr ? "Vazgeç" : "Cancel"}</button><button className="primary-action" disabled={save.isPending || lists.isLoading} onClick={() => save.mutate()} type="button"><Check size={17}/>{save.isPending ? (tr ? "Kaydediliyor…" : "Saving…") : (tr ? "Değişiklikleri kaydet" : "Save changes")}</button></footer>
      </section>
    </div>
  );
}

function translateGuestListValue(value: string, language: "tr" | "en") {
  const labels: Record<string, [string, string]> = {
    accepted: ["Kabul edildi", "Accepted"],
    active: ["Aktif", "Active"],
    attendee: ["Katılımcı", "Attendee"],
    attended: ["Katıldı", "Attended"],
    banned: ["Yasaklandı", "Banned"],
    corporate: ["Kurumsal", "Corporate"],
    curator: ["Küratör", "Curator"],
    declined: ["Reddetti", "Declined"],
    growth: ["Kurumsal Growth", "Corporate Growth"],
    individual: ["Bireysel", "Individual"],
    invited: ["Davet edildi", "Invited"],
    manager: ["Sahip", "Owner"],
    member: ["Üye", "Member"],
    organizer: ["Organizatör", "Organizer"],
    pending: ["Beklemede", "Pending"],
    plus: ["Plus", "Plus"],
    premium: ["Premium", "Premium"],
    requested: ["Talep etti", "Requested"],
    scale: ["Kurumsal Scale", "Corporate Scale"],
    starter: ["Kurumsal Başlangıç", "Corporate Starter"],
  };
  return labels[value]?.[language === "tr" ? 0 : 1] ?? value;
}
