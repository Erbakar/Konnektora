import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MemberCard } from "@konnektora/shared";
import { CalendarCheck, Mail, MapPin, MoreVertical, Sparkles, UserRound, Users } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GuestListAction } from "../components/GuestListAction";
import { GuestListHub } from "../components/GuestListHub";
import { UserIdentityLink, userProfilePath } from "../components/UserIdentityLink";
import { followUser, getUserSession, listFollowing, listGuestLists, listMemberSuggestions, listNewMembers, unfollowUser } from "../lib/api";
import { useGuestListEntitlement } from "../lib/useGuestListEntitlement";
import { useLanguage } from "../lib/i18n";

type DirectoryTab = "new" | "popular" | "following" | "guests" | "mutual";

export function CommunityPage() {
  const { language } = useLanguage();
  const tr = language === "tr";
  const client = useQueryClient();
  const user = getUserSession();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("scope");
  const [tab, setTab] = useState<DirectoryTab>(requestedTab === "following" || requestedTab === "guests" || requestedTab === "mutual" || requestedTab === "popular" ? requestedTab : "new");
  const suggestions = useQuery({ queryKey: ["member-suggestions", user?.id], queryFn: listMemberSuggestions, enabled: Boolean(user) });
  const newMembers = useQuery({ queryKey: ["new-members", user?.id], queryFn: listNewMembers, enabled: Boolean(user) });
  const following = useQuery({ queryKey: ["following", user?.id], queryFn: listFollowing, enabled: Boolean(user) });
  const { canUseGuestLists } = useGuestListEntitlement();
  const accessibleLists = useQuery({ queryKey: ["guest-lists"], queryFn: listGuestLists, enabled: Boolean(user), retry: false });
  const canViewGuestLists = canUseGuestLists || Boolean(accessibleLists.data?.length);
  const members: MemberCard[] = tab === "new"
    ? newMembers.data ?? []
    : tab === "following"
      ? following.data ?? []
      : [...(suggestions.data ?? [])]
          .filter((member) => tab !== "mutual" || member.commonTagCount > 0)
          .sort((a, b) => tab === "mutual" ? b.commonTagCount - a.commonTagCount : b.followerCount - a.followerCount);
  const pending = (tab === "new" && newMembers.isLoading) || suggestions.isLoading || following.isLoading;
  const toggle = useMutation({
    mutationFn: (member: MemberCard) => member.following ? unfollowUser(member.id) : followUser(member.id),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["following"] }), client.invalidateQueries({ queryKey: ["member-suggestions"] })]); },
  });

  if (!user) return <div className="page"><section className="feed-state"><h1>{tr ? "Topluluk" : "Community"}</h1><strong>{tr ? "Topluluğu görmek için giriş yap." : "Log in to view the community."}</strong><Link className="primary-action" to="/login">{tr ? "Giriş yap" : "Log in"}</Link></section></div>;
  return <div className="page community-page">
    <header className="feed-heading"><div><span className="eyebrow">{tr ? "Konnektora topluluğu" : "Konnektora community"}</span><h1>{tr ? "İnsanlar" : "People"}</h1><p>{tr ? "Yeni üyeleri keşfet, takip ettiklerini ve kişisel Guest List'lerini tek yerde yönet." : "Discover new members and manage people you follow and your personal Guest Lists in one place."}</p></div></header>
    <div className="feed-tabs" role="tablist">
      <button className={tab === "new" ? "active" : ""} onClick={() => setTab("new")}><Sparkles size={17}/> {tr ? "Yeni üyeler" : "New members"}</button>
      <button className={tab === "popular" ? "active" : ""} onClick={() => setTab("popular")}><Users size={17}/> {tr ? "Popüler" : "Popular"}</button>
      <button className={tab === "following" ? "active" : ""} onClick={() => setTab("following")}><UserRound size={17}/> {tr ? "Takip ettiklerim" : "Following"}</button>
      {canViewGuestLists ? <button className={tab === "guests" ? "active" : ""} onClick={() => setTab("guests")}><CalendarCheck size={17}/> Guest Lists</button> : null}
      <button className={tab === "mutual" ? "active" : ""} onClick={() => setTab("mutual")}><Sparkles size={17}/> {tr ? "Ortak ilgi alanları" : "Shared interests"}</button>
    </div>
    {tab === "guests" ? <GuestListHub/> : pending ? <div className="feed-state">{tr ? "Kişiler yükleniyor…" : "Loading people…"}</div> : members.length ? <section className="community-grid">{members.map((member) => <article className="community-card" key={member.id}>
      <UserIdentityLink user={member} avatarClassName="post-avatar" showName={false}/>
      <div className="community-card-body"><Link to={userProfilePath(member)}><strong>{member.username ? `@${member.username}` : member.name}</strong></Link>{tab === "new" && member.createdAt ? <span>{new Intl.RelativeTimeFormat(tr ? "tr" : "en", { numeric: "auto" }).format(Math.ceil((new Date(member.createdAt).getTime() - Date.now()) / 86_400_000), "day")} {tr ? "katıldı" : "joined"}</span> : null}{member.birthDate ? <span>{memberAge(member.birthDate)} {tr ? "yaşında" : "years old"}</span> : null}<span><MapPin size={14}/>{member.city || member.country ? (tr ? `${member.city || member.country} konumunda` : `located in ${member.city || member.country}`) : (tr ? "Konum belirtilmedi" : "Location not specified")}</span><small>{member.followerCount} {tr ? "takipçi" : "followers"} · {member.commonTagCount} {tr ? "ortak ilgi alanı" : "shared interests"}</small></div>
      <div className="community-card-actions"><button className={member.following ? "secondary-action" : "primary-action"} disabled={toggle.isPending} onClick={() => toggle.mutate(member)}>{member.following ? (tr ? "Takipte" : "Following") : (tr ? "Takip et" : "Follow")}</button><GuestListAction canUse={canUseGuestLists} target={{ id: member.id, name: member.name, username: member.username, avatarUrl: member.avatarUrl, accountType: member.accountType }}/><details className="action-menu"><summary aria-label={tr ? "Kullanıcı aksiyonları" : "User actions"}><MoreVertical size={18}/></summary><div><Link to={`/messages?peer=${member.id}`}><Mail size={17}/> {tr ? "Mesaj gönder" : "Send message"}</Link></div></details></div>
    </article>)}</section> : <div className="feed-state"><strong>{tr ? "Bu listede kullanıcı bulunmuyor." : "No members in this list."}</strong></div>}
  </div>;
}

function memberAge(value: string | Date) {
  const birth = new Date(value);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()) age -= 1;
  return Math.max(0, age);
}
