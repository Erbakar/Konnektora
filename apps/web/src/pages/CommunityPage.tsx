import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EventParticipant, MemberCard } from "@konnektora/shared";
import { CalendarCheck, MapPin, UserRound, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { followUser, getUserSession, listEventParticipants, listFollowing, listMemberSuggestions, listMyEvents, unfollowUser } from "../lib/api";
import { UserIdentityLink, userProfilePath } from "../components/UserIdentityLink";

type DirectoryTab = "members" | "following" | "guests";

export function CommunityPage() {
  const client = useQueryClient();
  const user = getUserSession();
  const [tab, setTab] = useState<DirectoryTab>("members");
  const suggestions = useQuery({ queryKey: ["member-suggestions", user?.id], queryFn: listMemberSuggestions, enabled: Boolean(user) });
  const following = useQuery({ queryKey: ["following", user?.id], queryFn: listFollowing, enabled: Boolean(user) });
  const managedEvents = useQuery({ queryKey: ["my-events", user?.id], queryFn: listMyEvents, enabled: Boolean(user && tab === "guests") });
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
  const members: GuestMember[] = tab === "following" ? following.data ?? [] : tab === "guests" ? guestMembers : suggestions.data ?? [];
  const pending = suggestions.isLoading || following.isLoading || (tab === "guests" && (managedEvents.isLoading || guests.isLoading));
  const toggle = useMutation({
    mutationFn: (member: MemberCard) => member.following ? unfollowUser(member.id) : followUser(member.id),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["following"] }), client.invalidateQueries({ queryKey: ["member-suggestions"] }), client.invalidateQueries({ queryKey: ["community-guests"] })]); }
  });

  if (!user) return <div className="page"><section className="feed-state"><strong>Topluluğu görmek için giriş yap.</strong><Link className="primary-action" to="/account">Giriş yap</Link></section></div>;
  return <div className="page community-page">
    <header className="feed-heading"><div><span className="eyebrow">Konnektora topluluğu</span><h1>İnsanlar</h1><p>Yeni üyeleri keşfet, takip ettiklerini ve etkinlik misafirlerini tek yerde yönet.</p></div></header>
    <div className="feed-tabs" role="tablist">
      <button className={tab === "members" ? "active" : ""} onClick={() => setTab("members")}><Users size={17}/> Üyeler</button>
      <button className={tab === "following" ? "active" : ""} onClick={() => setTab("following")}><UserRound size={17}/> Takip ettiklerim</button>
      <button className={tab === "guests" ? "active" : ""} onClick={() => setTab("guests")}><CalendarCheck size={17}/> Misafirler</button>
    </div>
    {pending ? <div className="feed-state">Kişiler yükleniyor…</div> : members.length ? <section className="community-grid">{members.map((member) => <article className="community-card" key={member.id}>
      <UserIdentityLink user={member} avatarClassName="post-avatar" showName={false}/>
      <div className="community-card-body"><Link to={userProfilePath(member)}><strong>{member.name}</strong></Link>{member.username ? <span>@{member.username}</span> : null}<span><MapPin size={14}/>{[member.city, member.country].filter(Boolean).join(", ") || "Konum belirtilmedi"}</span><small>{member.followerCount} takipçi · {member.commonTagCount} ortak ilgi alanı</small>{tab === "guests" && member.guestEvents ? <small>{member.guestEvents}</small> : null}</div>
      <button className={member.following ? "secondary-action" : "primary-action"} disabled={toggle.isPending} onClick={() => toggle.mutate(member)}>{member.following ? "Takibi bırak" : "Takip et"}</button>
    </article>)}</section> : <div className="feed-state"><strong>{tab === "guests" ? "Henüz misafir bulunmuyor." : "Bu listede kullanıcı bulunmuyor."}</strong></div>}
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
