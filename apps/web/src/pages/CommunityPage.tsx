import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EventParticipant, MemberCard } from "@konnektora/shared";
import { CalendarCheck, Mail, MapPin, MoreVertical, Sparkles, UserPlus, UserRound, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { followUser, getUserSession, inviteEventParticipant, listEventParticipants, listFollowing, listMemberSuggestions, listMyEvents, listNewMembers, unfollowUser } from "../lib/api";
import { UserIdentityLink, userProfilePath } from "../components/UserIdentityLink";

type DirectoryTab = "new" | "popular" | "following" | "guests" | "mutual";
function memberAge(value: string | Date) { const birth = new Date(value); const now = new Date(); let age = now.getFullYear() - birth.getFullYear(); if (now.getMonth() < birth.getMonth() || now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()) age -= 1; return Math.max(0, age); }

export function CommunityPage() {
  const client = useQueryClient();
  const user = getUserSession();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("scope");
  const [tab, setTab] = useState<DirectoryTab>(requestedTab === "following" || requestedTab === "guests" || requestedTab === "mutual" || requestedTab === "popular" ? requestedTab : "new");
  const [guestTarget, setGuestTarget] = useState<GuestMember | null>(null);
  const suggestions = useQuery({ queryKey: ["member-suggestions", user?.id], queryFn: listMemberSuggestions, enabled: Boolean(user) });
  const newMembers = useQuery({ queryKey: ["new-members", user?.id], queryFn: listNewMembers, enabled: Boolean(user) });
  const following = useQuery({ queryKey: ["following", user?.id], queryFn: listFollowing, enabled: Boolean(user) });
  const managedEvents = useQuery({ queryKey: ["my-events", user?.id], queryFn: listMyEvents, enabled: Boolean(user && (tab === "guests" || guestTarget)) });
  const guests = useQuery({
    queryKey: ["community-guests", user?.id, managedEvents.data?.map((event) => event.id)],
    enabled: Boolean(user && tab === "guests" && managedEvents.data),
    queryFn: async () => {
      const lists = await Promise.all((managedEvents.data ?? []).map(async (event) => ({ event, participants: await listEventParticipants(event.id, "user") })));
      return lists.flatMap(({ event, participants }) => participants.map((participant) => ({ event, participant })));
    }
  });
  const followingIds = useMemo(() => new Set((following.data ?? []).map((member) => member.id)), [following.data]);
  const guestMembers = useMemo(() => deduplicateGuests(guests.data ?? [], followingIds), [guests.data, followingIds]);
  const members: GuestMember[] = tab === "new"
    ? newMembers.data ?? []
    : tab === "following"
    ? following.data ?? []
    : tab === "guests"
      ? guestMembers
      : [...(suggestions.data ?? [])]
          .filter((member) => tab !== "mutual" || member.commonTagCount > 0)
          .sort((a, b) => tab === "mutual" ? b.commonTagCount - a.commonTagCount : b.followerCount - a.followerCount);
  const pending = (tab === "new" && newMembers.isLoading) || suggestions.isLoading || following.isLoading || (tab === "guests" && (managedEvents.isLoading || guests.isLoading));
  const toggle = useMutation({
    mutationFn: (member: MemberCard) => member.following ? unfollowUser(member.id) : followUser(member.id),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["following"] }), client.invalidateQueries({ queryKey: ["member-suggestions"] }), client.invalidateQueries({ queryKey: ["community-guests"] })]); }
  });
  const addGuest = useMutation({ mutationFn: (eventId: string) => inviteEventParticipant(eventId, { userId: guestTarget!.id, role: "attendee" }, "user"), onSuccess: () => setGuestTarget(null) });

  if (!user) return <div className="page"><section className="feed-state"><h1>Topluluk</h1><strong>Topluluğu görmek için giriş yap.</strong><Link className="primary-action" to="/login">Giriş yap</Link></section></div>;
  return <div className="page community-page">
    <header className="feed-heading"><div><span className="eyebrow">Konnektora topluluğu</span><h1>İnsanlar</h1><p>Yeni üyeleri keşfet, takip ettiklerini ve etkinlik misafirlerini tek yerde yönet.</p></div></header>
    <div className="feed-tabs" role="tablist">
      <button className={tab === "new" ? "active" : ""} onClick={() => setTab("new")}><Sparkles size={17}/> Yeni üyeler</button>
      <button className={tab === "popular" ? "active" : ""} onClick={() => setTab("popular")}><Users size={17}/> Popüler</button>
      <button className={tab === "following" ? "active" : ""} onClick={() => setTab("following")}><UserRound size={17}/> Takip ettiklerim</button>
      <button className={tab === "guests" ? "active" : ""} onClick={() => setTab("guests")}><CalendarCheck size={17}/> Misafir listeleri</button>
      <button className={tab === "mutual" ? "active" : ""} onClick={() => setTab("mutual")}><Sparkles size={17}/> Ortak ilgi alanları</button>
    </div>
    {pending ? <div className="feed-state">Kişiler yükleniyor…</div> : members.length ? <section className="community-grid">{members.map((member) => <article className="community-card" key={member.id}>
      <UserIdentityLink user={member} avatarClassName="post-avatar" showName={false}/>
      <div className="community-card-body"><Link to={userProfilePath(member)}><strong>{member.username ? `@${member.username}` : member.name}</strong></Link>{tab === "new" && member.createdAt ? <span>{new Intl.RelativeTimeFormat("tr", { numeric: "auto" }).format(Math.ceil((new Date(member.createdAt).getTime() - Date.now()) / 86_400_000), "day")} katıldı</span> : null}{member.birthDate ? <span>{memberAge(member.birthDate)} yaşında</span> : null}<span><MapPin size={14}/>{member.city || member.country ? `${member.city || member.country} konumunda` : "Konum belirtilmedi"}</span><small>{member.followerCount} takipçi · {member.commonTagCount} ortak ilgi alanı</small>{tab === "guests" && member.guestEvents ? <small>{member.guestEvents}</small> : null}</div>
      <div className="community-card-actions"><button className={member.following ? "secondary-action" : "primary-action"} disabled={toggle.isPending} onClick={() => toggle.mutate(member)}>{member.following ? "Takipte" : "Takip et"}</button><button className="secondary-action" onClick={() => setGuestTarget(member)}><UserPlus size={16}/> Misafir listesi</button><details className="action-menu"><summary aria-label="Kullanıcı aksiyonları"><MoreVertical size={18}/></summary><div><Link to={`/messages?peer=${member.id}`}><Mail size={17}/> Mesaj gönder</Link></div></details></div>
    </article>)}</section> : <div className="feed-state"><strong>{tab === "guests" ? "Henüz misafir bulunmuyor." : "Bu listede kullanıcı bulunmuyor."}</strong></div>}
    {guestTarget ? <div className="emotion-modal" role="dialog" aria-modal="true" aria-label="Guest List'e ekle"><div><button aria-label="Kapat" onClick={() => setGuestTarget(null)}>×</button><h2>{guestTarget.name}</h2><p>Kullanıcıyı yönettiğin etkinliklerden birinin guest listesine ekle.</p><div className="admin-list">{managedEvents.data?.map((event) => <button className="admin-list-row" disabled={addGuest.isPending} key={event.id} onClick={() => addGuest.mutate(event.id)}><strong>{event.title}</strong><span>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(event.startsAt))}</span></button>)}</div>{!managedEvents.isLoading && !managedEvents.data?.length ? <p className="form-help">Yönettiğin etkinlik bulunmuyor.</p> : null}{addGuest.isError ? <p className="form-error">Kullanıcı guest listesine eklenemedi.</p> : null}</div></div> : null}
  </div>;
}

type GuestMember = MemberCard & { guestEvents?: string };
function deduplicateGuests(items: Array<{ event: { title: string }; participant: EventParticipant }>, followingIds: Set<string>): GuestMember[] {
  const result = new Map<string, GuestMember & { eventNames: Set<string> }>();
  for (const { event, participant } of items) {
    if (!participant.user) continue;
    const current = result.get(participant.userId);
    const eventNames = current?.eventNames ?? new Set<string>(); eventNames.add(event.title);
    result.set(participant.userId, { id: participant.userId, name: participant.user.name, username: null, accountType: "individual", city: null, country: null, followerCount: 0, commonTagCount: 0, following: followingIds.has(participant.userId), eventNames });
  }
  return [...result.values()].map(({ eventNames, ...member }) => ({ ...member, guestEvents: [...eventNames].join(" · ") }));
}
