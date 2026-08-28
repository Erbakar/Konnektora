import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MemberCard } from "@konnektora/shared";
import { CalendarCheck, Mail, MapPin, MoreVertical, Sparkles, UserPlus, UserRound, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { addGuestListMember, createGuestList, followUser, getUserSession, listFollowing, listGuestLists, listMemberSuggestions, listNewMembers, unfollowUser } from "../lib/api";
import { UserIdentityLink, userProfilePath } from "../components/UserIdentityLink";
import { useLanguage } from "../lib/i18n";
import { useGuestListEntitlement } from "../lib/useGuestListEntitlement";

type DirectoryTab = "new" | "popular" | "following" | "guests" | "mutual";
function memberAge(value: string | Date) { const birth = new Date(value); const now = new Date(); let age = now.getFullYear() - birth.getFullYear(); if (now.getMonth() < birth.getMonth() || now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()) age -= 1; return Math.max(0, age); }

export function CommunityPage() {
  const { language } = useLanguage();
  const c = language === "tr" ? {
    community: "Topluluk", loginPrompt: "Topluluğu görmek için giriş yap.", login: "Giriş yap", eyebrow: "Konnektora topluluğu", title: "İnsanlar", lead: "Yeni üyeleri keşfet, takip ettiklerini ve etkinlik misafirlerini tek yerde yönet.",
    new: "Yeni üyeler", popular: "Popüler", following: "Takip ettiklerim", guests: "Misafir listeleri", mutual: "Ortak ilgi alanları", loading: "Kişiler yükleniyor…", joined: "katıldı", age: "yaşında", located: "konumunda", noLocation: "Konum belirtilmedi", followers: "takipçi", shared: "ortak ilgi alanı", followingStatus: "Takipte", follow: "Takip et", guestList: "Misafir listesi", actions: "Kullanıcı aksiyonları", message: "Mesaj gönder", emptyGuests: "Henüz misafir bulunmuyor.", empty: "Bu listede kullanıcı bulunmuyor.", addGuest: "Guest List'e ekle", close: "Kapat", addCopy: "Kullanıcıyı yönettiğin etkinliklerden birinin guest listesine ekle.", noManaged: "Yönettiğin etkinlik bulunmuyor.", addFailed: "Kullanıcı guest listesine eklenemedi.",
  } : {
    community: "Community", loginPrompt: "Log in to view the community.", login: "Log in", eyebrow: "Konnektora community", title: "People", lead: "Discover new members and manage people you follow and event guests in one place.",
    new: "New members", popular: "Popular", following: "Following", guests: "Guest lists", mutual: "Shared interests", loading: "Loading people…", joined: "joined", age: "years old", located: "located in", noLocation: "Location not specified", followers: "followers", shared: "shared interests", followingStatus: "Following", follow: "Follow", guestList: "Guest list", actions: "User actions", message: "Send message", emptyGuests: "No guests yet.", empty: "No members in this list.", addGuest: "Add to Guest List", close: "Close", addCopy: "Add this member to the guest list of an event you manage.", noManaged: "You do not manage any events.", addFailed: "The member could not be added to the guest list.",
  };
  const client = useQueryClient();
  const user = getUserSession();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("scope");
  const [tab, setTab] = useState<DirectoryTab>(requestedTab === "following" || requestedTab === "guests" || requestedTab === "mutual" || requestedTab === "popular" ? requestedTab : "new");
  const [guestTarget, setGuestTarget] = useState<GuestMember | null>(null);
  const suggestions = useQuery({ queryKey: ["member-suggestions", user?.id], queryFn: listMemberSuggestions, enabled: Boolean(user) });
  const newMembers = useQuery({ queryKey: ["new-members", user?.id], queryFn: listNewMembers, enabled: Boolean(user) });
  const following = useQuery({ queryKey: ["following", user?.id], queryFn: listFollowing, enabled: Boolean(user) });
  const { canUseGuestLists } = useGuestListEntitlement();
  const guestLists = useQuery({ queryKey: ["guest-lists", user?.id], queryFn: listGuestLists, enabled: Boolean(user && canUseGuestLists && (tab === "guests" || guestTarget)) });
  const followingIds = useMemo(() => new Set((following.data ?? []).map((member) => member.id)), [following.data]);
  const guestMembers = useMemo(() => deduplicateGuests(guestLists.data ?? [], followingIds), [guestLists.data, followingIds]);
  const members: GuestMember[] = tab === "new"
    ? newMembers.data ?? []
    : tab === "following"
    ? following.data ?? []
    : tab === "guests"
      ? guestMembers
      : [...(suggestions.data ?? [])]
          .filter((member) => tab !== "mutual" || member.commonTagCount > 0)
          .sort((a, b) => tab === "mutual" ? b.commonTagCount - a.commonTagCount : b.followerCount - a.followerCount);
  const pending = (tab === "new" && newMembers.isLoading) || suggestions.isLoading || following.isLoading || (tab === "guests" && guestLists.isLoading);
  const toggle = useMutation({
    mutationFn: (member: MemberCard) => member.following ? unfollowUser(member.id) : followUser(member.id),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["following"] }), client.invalidateQueries({ queryKey: ["member-suggestions"] }), client.invalidateQueries({ queryKey: ["community-guests"] })]); }
  });
  const addGuest = useMutation({ mutationFn: (guestListId: string) => addGuestListMember(guestListId, guestTarget!.id), onSuccess: () => { setGuestTarget(null); void client.invalidateQueries({ queryKey: ["guest-lists"] }); } });
  const [newListName, setNewListName] = useState("");
  const addList = useMutation({ mutationFn: () => createGuestList(newListName.trim()), onSuccess: () => { setNewListName(""); void client.invalidateQueries({ queryKey: ["guest-lists"] }); } });

  if (!user) return <div className="page"><section className="feed-state"><h1>{c.community}</h1><strong>{c.loginPrompt}</strong><Link className="primary-action" to="/login">{c.login}</Link></section></div>;
  return <div className="page community-page">
    <header className="feed-heading"><div><span className="eyebrow">{c.eyebrow}</span><h1>{c.title}</h1><p>{c.lead}</p></div></header>
    <div className="feed-tabs" role="tablist">
      <button className={tab === "new" ? "active" : ""} onClick={() => setTab("new")}><Sparkles size={17}/> {c.new}</button>
      <button className={tab === "popular" ? "active" : ""} onClick={() => setTab("popular")}><Users size={17}/> {c.popular}</button>
      <button className={tab === "following" ? "active" : ""} onClick={() => setTab("following")}><UserRound size={17}/> {c.following}</button>
      {canUseGuestLists ? <button className={tab === "guests" ? "active" : ""} onClick={() => setTab("guests")}><CalendarCheck size={17}/> {c.guests}</button> : null}
      <button className={tab === "mutual" ? "active" : ""} onClick={() => setTab("mutual")}><Sparkles size={17}/> {c.mutual}</button>
    </div>
    {tab === "guests" && !canUseGuestLists ? <div className="feed-state"><strong>{language === "tr" ? "Guest List erişimi için uygun paket gerekli." : "An eligible plan is required for Guest Lists."}</strong><Link className="primary-action" to="/store">{language === "tr" ? "Paketleri incele" : "View plans"}</Link></div> : pending ? <div className="feed-state">{c.loading}</div> : members.length ? <section className="community-grid">{members.map((member) => <article className="community-card" key={member.id}>
      <UserIdentityLink user={member} avatarClassName="post-avatar" showName={false}/>
      <div className="community-card-body"><Link to={userProfilePath(member)}><strong>{member.username ? `@${member.username}` : member.name}</strong></Link>{tab === "new" && member.createdAt ? <span>{new Intl.RelativeTimeFormat(language === "tr" ? "tr" : "en", { numeric: "auto" }).format(Math.ceil((new Date(member.createdAt).getTime() - Date.now()) / 86_400_000), "day")} {c.joined}</span> : null}{member.birthDate ? <span>{memberAge(member.birthDate)} {c.age}</span> : null}<span><MapPin size={14}/>{member.city || member.country ? language === "tr" ? `${member.city || member.country} ${c.located}` : `${c.located} ${member.city || member.country}` : c.noLocation}</span><small>{member.followerCount} {c.followers} · {member.commonTagCount} {c.shared}</small>{tab === "guests" && member.guestEvents ? <small>{member.guestEvents}</small> : null}</div>
      <div className="community-card-actions"><button className={member.following ? "secondary-action" : "primary-action"} disabled={toggle.isPending} onClick={() => toggle.mutate(member)}>{member.following ? c.followingStatus : c.follow}</button>{canUseGuestLists ? <button className="secondary-action" onClick={() => setGuestTarget(member)}><UserPlus size={16}/> {c.guestList}</button> : null}<details className="action-menu"><summary aria-label={c.actions}><MoreVertical size={18}/></summary><div><Link to={`/messages?peer=${member.id}`}><Mail size={17}/> {c.message}</Link></div></details></div>
    </article>)}</section> : <div className="feed-state"><strong>{tab === "guests" ? c.emptyGuests : c.empty}</strong></div>}
    {guestTarget ? <div className="dialog-backdrop" role="presentation" onMouseDown={() => setGuestTarget(null)}><section className="content-dialog guest-list-dialog" role="dialog" aria-modal="true" aria-label={c.addGuest} onMouseDown={(event) => event.stopPropagation()}><button className="passport-close" aria-label={c.close} onClick={() => setGuestTarget(null)}>×</button><h2>{guestTarget.username ? `@${guestTarget.username}` : guestTarget.name}</h2><p>{language === "tr" ? "Kullanıcıyı eklemek istediğiniz Guest List'i seçin." : "Choose the Guest List where you want to add this member."}</p><div className="admin-list">{guestLists.data?.slice().sort((a, b) => a.name.localeCompare(b.name)).map((list) => { const exists = list.members.some((member) => member.userId === guestTarget.id); return <button className="admin-list-row" disabled={addGuest.isPending || exists} key={list.id} onClick={() => addGuest.mutate(list.id)}><strong>{list.name}</strong><span>{list.members.length} {language === "tr" ? "kişi" : "people"}{exists ? ` · ${language === "tr" ? "zaten listede" : "already added"}` : ""}</span></button>; })}</div>{!guestLists.isLoading && !guestLists.data?.length ? <p className="form-help">{language === "tr" ? "Henüz Guest List oluşturmadınız." : "You have not created a Guest List yet."}</p> : null}<form className="row-actions" onSubmit={(event) => { event.preventDefault(); if (newListName.trim()) addList.mutate(); }}><input aria-label={language === "tr" ? "Yeni liste adı" : "New list name"} maxLength={80} onChange={(event) => setNewListName(event.target.value)} placeholder={language === "tr" ? "Yeni liste adı" : "New list name"} value={newListName}/><button className="secondary-action" disabled={!newListName.trim() || addList.isPending} type="submit">{language === "tr" ? "Liste oluştur" : "Create list"}</button></form>{addGuest.isError || addList.isError ? <p className="form-error">{c.addFailed}</p> : null}</section></div> : null}
  </div>;
}

type GuestMember = MemberCard & { guestEvents?: string };
function deduplicateGuests(items: Awaited<ReturnType<typeof listGuestLists>>, followingIds: Set<string>): GuestMember[] {
  const result = new Map<string, GuestMember & { eventNames: Set<string> }>();
  for (const list of items) for (const member of list.members) {
    const current = result.get(member.userId);
    const eventNames = current?.eventNames ?? new Set<string>(); eventNames.add(list.name);
    result.set(member.userId, { id: member.userId, name: member.user.name, username: member.user.username ?? null, avatarUrl: member.user.uploadedMedia?.[0]?.url ?? null, accountType: "individual", city: null, country: null, followerCount: 0, commonTagCount: 0, following: followingIds.has(member.userId), eventNames });
  }
  return [...result.values()].map(({ eventNames, ...member }) => ({ ...member, guestEvents: [...eventNames].join(" · ") }));
}
