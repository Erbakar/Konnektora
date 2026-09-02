import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Check,
  Eye,
  LockKeyhole,
  Pencil,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createGuestList,
  deleteGuestList,
  getGuestList,
  getUserSession,
  listFollowing,
  listGuestLists,
  listMemberSuggestions,
  listNewMembers,
  removeGuestListMember,
  renameGuestList,
  resolveMediaUrl,
  shareGuestList,
  unshareGuestList,
  type GuestList,
} from "../lib/api";
import { useLanguage } from "../lib/i18n";
import { UserIdentityLink, userProfilePath } from "./UserIdentityLink";

export function GuestListHub() {
  const { language } = useLanguage();
  const tr = language === "tr";
  const client = useQueryClient();
  const session = getUserSession();
  const lists = useQuery({ queryKey: ["guest-lists"], queryFn: listGuestLists });
  const [name, setName] = useState("");
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [sharingListId, setSharingListId] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: () => createGuestList(name.trim()),
    onSuccess: async () => { setName(""); await client.invalidateQueries({ queryKey: ["guest-lists"] }); },
  });
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameGuestList(id, name),
    onSuccess: async () => { setRenameTargetId(null); await client.invalidateQueries({ queryKey: ["guest-lists"] }); },
  });
  const remove = useMutation({
    mutationFn: deleteGuestList,
    onSuccess: async () => { setDeleteTargetId(null); await client.invalidateQueries({ queryKey: ["guest-lists"] }); },
  });

  if (lists.isLoading) return <div className="feed-state">{tr ? "Guest List'ler yükleniyor…" : "Loading Guest Lists…"}</div>;
  if (lists.isError) return <div className="feed-state"><strong>{tr ? "Guest List erişimi için uygun paket veya paylaşılmış bir liste gerekli." : "An eligible plan or a shared list is required."}</strong><Link className="primary-action" to="/store">{tr ? "Paketleri incele" : "View plans"}</Link></div>;

  const ownedLists = (lists.data ?? []).filter((list) => list.access === "owner");
  const sharedLists = (lists.data ?? []).filter((list) => list.access === "read");
  const uniquePeople = new Set(ownedLists.flatMap((list) => list.members.map((member) => member.userId))).size;
  const renameList = (list: GuestList) => {
    setRenameName(list.name);
    setRenameTargetId(list.id);
  };
  const renameTarget = ownedLists.find((list) => list.id === renameTargetId);
  const deleteTarget = ownedLists.find((list) => list.id === deleteTargetId);
  const sharingList = ownedLists.find((list) => list.id === sharingListId);

  return <section className="guest-list-hub">
    <header className="guest-list-dashboard">
      <div className="guest-list-dashboard-copy">
        <span className="guest-list-eyebrow"><Sparkles size={15}/> <span lang="en">Guest List</span></span>
        <h2>{tr ? "Doğru insanları, tek yerde tut." : "Keep the right people in one place."}</h2>
        <p>{tr ? "Davet etmek istediğin kişileri düzenle, listelerini tekrar kullan ve gerektiğinde ekibinle güvenle paylaş." : "Organize the people you want to invite, reuse your lists, and share them safely with your team."}</p>
        <dl className="guest-list-dashboard-stats">
          <div><dt>{ownedLists.length}</dt><dd>{tr ? "listen" : "your lists"}</dd></div>
          <div><dt>{uniquePeople}</dt><dd>{tr ? "benzersiz kişi" : "unique people"}</dd></div>
          <div><dt>{sharedLists.length}</dt><dd>{tr ? "paylaşılan" : "shared with you"}</dd></div>
        </dl>
      </div>
      <form className="guest-list-create-card" onSubmit={(event) => { event.preventDefault(); if (name.trim().length >= 2) create.mutate(); }}>
        <div className="guest-list-create-icon"><Plus size={22}/></div>
        <div><strong>{tr ? "Yeni bir liste oluştur" : "Create a new list"}</strong><span>{tr ? "Daha sonra dilediğin kişileri ekleyebilirsin." : "You can add people whenever you like."}</span></div>
        <label className="guest-list-create-input">
          <span className="sr-only">{tr ? "Yeni liste adı" : "New list name"}</span>
          <input aria-label={tr ? "Yeni liste adı" : "New list name"} maxLength={80} minLength={2} onChange={(event) => setName(event.target.value)} placeholder={tr ? "Liste adı yazın…" : "Write a list name…"} value={name}/>
          {name ? <button aria-label={tr ? "Liste adını temizle" : "Clear list name"} onClick={() => setName("")} type="button"><X size={16}/></button> : null}
        </label>
        <button className="guest-list-create-button" disabled={name.trim().length < 2 || create.isPending} type="submit"><Plus size={17}/>{create.isPending ? (tr ? "Oluşturuluyor…" : "Creating…") : (tr ? "Liste oluştur" : "Create list")}</button>
      </form>
    </header>

    {create.isError || rename.isError || remove.isError ? <p className="form-error guest-list-form-error">{tr ? "İşlem tamamlanamadı. Aynı isimde bir listeniz olmadığından emin olun." : "The action could not be completed. Make sure you do not already have a list with that name."}</p> : null}

    {ownedLists.length ? <GuestListCollection
      description={tr ? "Düzenleyebildiğin ve davetlerde tekrar kullanabileceğin listeler." : "Lists you can edit and reuse for invitations."}
      lists={ownedLists}
      onDelete={(list) => setDeleteTargetId(list.id)}
      onRename={renameList}
      onShare={(list) => setSharingListId(list.id)}
      title={tr ? "Sana ait listeler" : "Your lists"}
      tr={tr}
    /> : <div className="guest-list-empty">
      <div><Users size={26}/></div>
      <strong>{tr ? "İlk listen için hazırsın." : "You are ready for your first list."}</strong>
      <span>{session ? (tr ? "Yukarıdan bir isim vererek ilk tekrar kullanılabilir listenizi oluşturun." : "Name it above to create your first reusable list.") : ""}</span>
    </div>}

    {sharedLists.length ? <GuestListCollection
      description={tr ? "Sahiplerinin seninle görüntüleme erişimi paylaştığı listeler." : "Lists their owners have shared with you for viewing."}
      lists={sharedLists}
      title={tr ? "Seninle paylaşılanlar" : "Shared with you"}
      tr={tr}
    /> : null}
    {renameTarget ? <div className="dialog-backdrop" role="presentation" onMouseDown={() => setRenameTargetId(null)}><section aria-modal="true" className="content-dialog guest-list-dialog guest-list-confirm-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog"><button aria-label={tr ? "Kapat" : "Close"} className="passport-close" onClick={() => setRenameTargetId(null)}>×</button><header className="guest-list-dialog-heading"><div><Pencil size={21}/></div><span className="eyebrow" lang="en">Guest List</span><h2>{tr ? "Liste adını değiştir" : "Rename list"}</h2><p>{tr ? "Yeni ad bütün davet akışlarında kullanılacak." : "The new name will be used across invitation flows."}</p></header><form className="guest-list-rename-dialog" onSubmit={(event) => { event.preventDefault(); if (renameName.trim().length >= 2 && renameName.trim() !== renameTarget.name) rename.mutate({ id: renameTarget.id, name: renameName.trim() }); }}><label><span>{tr ? "Liste adı" : "List name"}</span><input autoFocus maxLength={80} minLength={2} onChange={(event) => setRenameName(event.target.value)} value={renameName}/></label><div className="guest-list-dialog-actions"><button className="secondary-action" onClick={() => setRenameTargetId(null)} type="button">{tr ? "Vazgeç" : "Cancel"}</button><button className="primary-action" disabled={rename.isPending || renameName.trim().length < 2 || renameName.trim() === renameTarget.name} type="submit"><Check size={17}/>{tr ? "Kaydet" : "Save"}</button></div></form></section></div> : null}
    {deleteTarget ? <div className="dialog-backdrop" role="presentation" onMouseDown={() => setDeleteTargetId(null)}><section aria-modal="true" className="content-dialog guest-list-dialog guest-list-confirm-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog"><button aria-label={tr ? "Kapat" : "Close"} className="passport-close" onClick={() => setDeleteTargetId(null)}>×</button><header className="guest-list-dialog-heading"><div><Trash2 size={21}/></div><span className="eyebrow">{deleteTarget.name}</span><h2>{tr ? "Liste silinsin mi?" : "Delete this list?"}</h2><p>{tr ? "Liste ve paylaşım izinleri kalıcı olarak silinir. Kullanıcı hesapları etkilenmez." : "The list and its sharing permissions will be permanently deleted. User accounts are not affected."}</p></header><div className="guest-list-dialog-actions"><button className="secondary-action" onClick={() => setDeleteTargetId(null)} type="button">{tr ? "Vazgeç" : "Cancel"}</button><button className="danger-action" disabled={remove.isPending} onClick={() => remove.mutate(deleteTarget.id)} type="button"><Trash2 size={17}/>{tr ? "Listeyi sil" : "Delete list"}</button></div></section></div> : null}
    {sharingList ? <GuestListSharingDialog list={sharingList} onClose={() => setSharingListId(null)}/> : null}
  </section>;
}

function GuestListCollection({ description, lists, onDelete, onRename, onShare, title, tr }: {
  description: string;
  lists: GuestList[];
  onDelete?: (list: GuestList) => void;
  onRename?: (list: GuestList) => void;
  onShare?: (list: GuestList) => void;
  title: string;
  tr: boolean;
}) {
  return <section className="guest-list-section">
    <header><div><h3>{title}</h3><p>{description}</p></div><span>{lists.length} {tr ? "liste" : lists.length === 1 ? "list" : "lists"}</span></header>
    <div className="guest-list-grid">{lists.map((list) => {
      const mine = list.access === "owner";
      const ownerLabel = list.owner?.username ? `@${list.owner.username}` : list.owner?.name;
      return <article className="guest-list-card" key={list.id}>
        <div className="guest-list-card-topline">
          <div className="guest-list-card-icon">{mine ? <Users size={21}/> : <Eye size={21}/>}</div>
          <span className={`guest-list-access-pill${mine ? "" : " is-readonly"}`}>{mine ? <><LockKeyhole size={13}/>{tr ? "Özel" : "Private"}</> : <><Eye size={13}/>{tr ? "Salt okunur" : "Read only"}</>}</span>
        </div>
        <Link aria-label={`${list.name} ${tr ? "listesini aç" : "open list"}`} className="guest-list-card-link" to={`/community/guest-lists/${list.id}`}>
          <div><h4>{list.name}</h4><p>{mine ? (tr ? "Sana ait kişisel liste" : "Your personal list") : `${tr ? "Paylaşan" : "Shared by"}: ${ownerLabel ?? "—"}`}</p></div>
          <ChevronRight size={21}/>
        </Link>
        <footer>
          <GuestListAvatarStack list={list}/>
          <strong>{list.members.length} {tr ? "kişi" : list.members.length === 1 ? "person" : "people"}</strong>
          {mine ? <div className="guest-list-card-actions">
            <button aria-label={tr ? "Listeyi paylaş" : "Share list"} onClick={() => onShare?.(list)} title={tr ? "Listeyi paylaş" : "Share list"} type="button"><Share2 size={16}/></button>
            <button aria-label={tr ? "Listenin adını değiştir" : "Rename list"} onClick={() => onRename?.(list)} title={tr ? "Adını değiştir" : "Rename"} type="button"><Pencil size={16}/></button>
            <button aria-label={tr ? "Listeyi sil" : "Delete list"} onClick={() => onDelete?.(list)} title={tr ? "Listeyi sil" : "Delete list"} type="button"><Trash2 size={16}/></button>
          </div> : null}
        </footer>
      </article>;
    })}</div>
  </section>;
}

function GuestListAvatarStack({ list }: { list: GuestList }) {
  const shownMembers = list.members.slice(0, 4);
  if (!shownMembers.length) return <span className="guest-list-avatar-empty"><Users size={15}/></span>;
  return <div className="guest-list-avatar-stack" aria-hidden="true">{shownMembers.map((member) => {
    const avatar = member.user.uploadedMedia?.[0]?.url;
    return avatar ? <img alt="" key={member.id} src={resolveMediaUrl(avatar)}/> : <span key={member.id}>{member.user.name.slice(0, 1).toLocaleUpperCase()}</span>;
  })}{list.members.length > shownMembers.length ? <span>+{list.members.length - shownMembers.length}</span> : null}</div>;
}

export function GuestListDetailPage() {
  const { listId = "" } = useParams();
  const { language } = useLanguage();
  const tr = language === "tr";
  const navigate = useNavigate();
  const client = useQueryClient();
  const list = useQuery({ queryKey: ["guest-lists", listId], queryFn: () => getGuestList(listId), enabled: Boolean(listId) });
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [sharingOpen, setSharingOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const removeMember = useMutation({ mutationFn: (userId: string) => removeGuestListMember(listId, userId), onSuccess: () => client.invalidateQueries({ queryKey: ["guest-lists"] }) });
  const deleteList = useMutation({ mutationFn: () => deleteGuestList(listId), onSuccess: async () => { setDeleteOpen(false); await client.invalidateQueries({ queryKey: ["guest-lists"] }); navigate("/community?scope=guests"); } });
  const members = useMemo(() => (list.data?.members ?? []).filter((member) => {
    const person = member.user;
    const search = query.trim().toLocaleLowerCase(tr ? "tr-TR" : "en-US");
    if (search && !`${person.name} ${person.username ?? ""}`.toLocaleLowerCase(tr ? "tr-TR" : "en-US").includes(search)) return false;
    if (gender && person.gender !== gender) return false;
    if (ageRange && person.birthDate) {
      const age = memberAge(person.birthDate);
      const [minimum = 0, maximum = Number.NaN] = ageRange.split("-").map(Number);
      if (age < minimum || (!Number.isNaN(maximum) && age > maximum)) return false;
    } else if (ageRange) return false;
    return true;
  }), [ageRange, gender, list.data?.members, query, tr]);

  if (list.isLoading) return <div className="page"><div className="feed-state">{tr ? "Liste yükleniyor…" : "Loading list…"}</div></div>;
  if (!list.data || list.isError) return <div className="page"><div className="feed-state"><strong>{tr ? "Liste bulunamadı veya sizinle paylaşılmadı." : "The list was not found or was not shared with you."}</strong><Link to="/community?scope=guests">{tr ? "Guest List'lere dön" : "Back to Guest Lists"}</Link></div></div>;

  const mine = list.data.access === "owner";
  const ownerLabel = list.data.owner?.username ? `@${list.data.owner.username}` : list.data.owner?.name;
  return <div className="page guest-list-detail-page">
    <Link className="back-link guest-list-back-link" to="/community?scope=guests">← {tr ? "Guest List'lere dön" : "Back to Guest Lists"}</Link>
    <header className="guest-list-detail-hero">
      <div className="guest-list-detail-copy">
        <span className="guest-list-eyebrow">{mine ? <LockKeyhole size={15}/> : <Eye size={15}/>} {mine ? (tr ? <>Özel <span lang="en">Guest List</span></> : "Private Guest List") : (tr ? <>Paylaşılan <span lang="en">Guest List</span></> : "Shared Guest List")}</span>
        <h1>{list.data.name}</h1>
        <p>{mine ? (tr ? "Davetlerinde tekrar kullanabileceğin kişisel listen." : "Your personal list, ready to reuse in invitations.") : `${ownerLabel ?? (tr ? "Liste sahibi" : "List owner")} ${tr ? "bu listeyi seninle salt okunur paylaştı." : "shared this list with you as read only."}`}</p>
        <div className="guest-list-detail-summary"><span><Users size={17}/><strong>{list.data.members.length}</strong> {tr ? "kişi" : "people"}</span>{mine ? <span><Share2 size={17}/><strong>{list.data.shares?.length ?? 0}</strong> {tr ? "paylaşım" : "shares"}</span> : <span><ShieldCheck size={17}/>{tr ? "Görüntüleme erişimi" : "View access"}</span>}</div>
      </div>
      {mine ? <div className="guest-list-hero-actions"><button className="guest-list-light-action" onClick={() => setSharingOpen(true)}><Share2 size={17}/> {tr ? "Listeyi paylaş" : "Share list"}</button><button className="guest-list-light-action is-danger" onClick={() => setDeleteOpen(true)}><Trash2 size={17}/> {tr ? "Sil" : "Delete"}</button></div> : null}
    </header>

    <section className="guest-list-filter-panel">
      <header><div><SlidersHorizontal size={19}/><div><strong>{tr ? "Listedeki kişiler" : "People in this list"}</strong><span>{members.length === list.data.members.length ? `${members.length} ${tr ? "kişi" : "people"}` : `${members.length}/${list.data.members.length} ${tr ? "sonuç" : "results"}`}</span></div></div></header>
      <div className="guest-list-filters">
        <label className="guest-list-search"><Search size={18}/><span className="sr-only">{tr ? "Kullanıcı ara" : "Search users"}</span><input aria-label={tr ? "Kullanıcı ara" : "Search users"} onChange={(event) => setQuery(event.target.value)} placeholder={tr ? "Ad veya kullanıcı adı ara" : "Search name or username"} value={query}/></label>
        <select aria-label={tr ? "Cinsiyet" : "Gender"} onChange={(event) => setGender(event.target.value)} value={gender}><option value="">{tr ? "Tüm cinsiyetler" : "All genders"}</option><option value="female">{tr ? "Kadın" : "Female"}</option><option value="male">{tr ? "Erkek" : "Male"}</option><option value="non_binary">{tr ? "Non-binary" : "Non-binary"}</option></select>
        <select aria-label={tr ? "Yaş aralığı" : "Age range"} onChange={(event) => setAgeRange(event.target.value)} value={ageRange}><option value="">{tr ? "Tüm yaşlar" : "All ages"}</option><option value="18-24">18–24</option><option value="25-34">25–34</option><option value="35-44">35–44</option><option value="45-">45+</option></select>
      </div>
    </section>

    {members.length ? <section className="guest-list-member-grid">{members.map((member) => {
      const location = [member.user.city, member.user.country].filter(Boolean).join(", ") || (tr ? "Konum belirtilmedi" : "Location not specified");
      return <article className="guest-list-member-card" key={member.id}>
        <UserIdentityLink user={{ id: member.user.id, name: member.user.name, username: member.user.username, avatarUrl: member.user.uploadedMedia?.[0]?.url ?? null }} avatarClassName="guest-list-member-avatar" showName={false}/>
        <div className="guest-list-member-copy"><Link to={userProfilePath(member.user)}><strong>{member.user.username ? `@${member.user.username}` : member.user.name}</strong></Link><span>{member.user.name}</span><small>{location}{member.user.birthDate ? ` · ${memberAge(member.user.birthDate)} ${tr ? "yaş" : "years"}` : ""}</small></div>
        {mine ? <button aria-label={tr ? "Listeden çıkar" : "Remove from list"} className="guest-list-remove-member" disabled={removeMember.isPending} onClick={() => removeMember.mutate(member.userId)} title={tr ? "Listeden çıkar" : "Remove from list"}><UserMinus size={17}/></button> : <span className="guest-list-member-view"><Eye size={15}/></span>}
      </article>;
    })}</section> : <div className="guest-list-empty is-filtered"><div><Search size={25}/></div><strong>{tr ? "Filtreye uygun kişi bulunamadı." : "No people match these filters."}</strong><span>{tr ? "Arama veya filtrelerini değiştirerek tekrar dene." : "Try changing your search or filters."}</span></div>}
    {sharingOpen ? <GuestListSharingDialog list={list.data} onClose={() => setSharingOpen(false)}/> : null}
    {deleteOpen ? <div className="dialog-backdrop" role="presentation" onMouseDown={() => setDeleteOpen(false)}><section aria-modal="true" className="content-dialog guest-list-dialog guest-list-confirm-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog"><button aria-label={tr ? "Kapat" : "Close"} className="passport-close" onClick={() => setDeleteOpen(false)}>×</button><header className="guest-list-dialog-heading"><div><Trash2 size={21}/></div><span className="eyebrow">{list.data.name}</span><h2>{tr ? "Liste silinsin mi?" : "Delete this list?"}</h2><p>{tr ? "Liste ve paylaşım izinleri kalıcı olarak silinir. Kullanıcı hesapları etkilenmez." : "The list and its sharing permissions will be permanently deleted. User accounts are not affected."}</p></header><div className="guest-list-dialog-actions"><button className="secondary-action" onClick={() => setDeleteOpen(false)} type="button">{tr ? "Vazgeç" : "Cancel"}</button><button className="danger-action" disabled={deleteList.isPending} onClick={() => deleteList.mutate()} type="button"><Trash2 size={17}/>{tr ? "Listeyi sil" : "Delete list"}</button></div></section></div> : null}
  </div>;
}

function GuestListSharingDialog({ list, onClose }: { list: NonNullable<Awaited<ReturnType<typeof getGuestList>>>; onClose: () => void }) {
  const { language } = useLanguage();
  const tr = language === "tr";
  const session = getUserSession();
  const client = useQueryClient();
  const suggestions = useQuery({ queryKey: ["member-suggestions"], queryFn: listMemberSuggestions });
  const following = useQuery({ queryKey: ["following"], queryFn: listFollowing });
  const newcomers = useQuery({ queryKey: ["new-members"], queryFn: listNewMembers });
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const share = useMutation({
    mutationFn: (userId: string) => shareGuestList(list.id, userId),
    onSuccess: async () => {
      setQuery("");
      setSelectedUserId(null);
      await client.invalidateQueries({ queryKey: ["guest-lists"] });
    },
  });
  const unshare = useMutation({ mutationFn: (userId: string) => unshareGuestList(list.id, userId), onSuccess: () => client.invalidateQueries({ queryKey: ["guest-lists"] }) });
  const sharedIds = new Set((list.shares ?? []).map((item) => item.userId));
  const allCandidates = [...(suggestions.data ?? []), ...(following.data ?? []), ...(newcomers.data ?? [])].filter((person, index, all) => person.id !== session?.id && all.findIndex((item) => item.id === person.id) === index);
  const candidates = allCandidates.filter((person) => `${person.name} ${person.username ?? ""}`.toLocaleLowerCase(tr ? "tr-TR" : "en-US").includes(query.trim().replace(/^@/, "").toLocaleLowerCase(tr ? "tr-TR" : "en-US"))).slice(0, 20);
  const selectedUser = allCandidates.find((person) => person.id === selectedUserId);
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}><section className="content-dialog guest-list-dialog guest-list-sharing-dialog" role="dialog" aria-modal="true" aria-label={tr ? "Guest List paylaşımı" : "Guest List sharing"} onMouseDown={(event) => event.stopPropagation()}>
    <button className="passport-close" aria-label={tr ? "Kapat" : "Close"} onClick={onClose}>×</button>
    <header className="guest-list-dialog-heading"><div><Share2 size={22}/></div><span className="eyebrow">{list.name}</span><h2>{tr ? "Listeyi güvenle paylaş" : "Share the list safely"}</h2><p>{tr ? "Erişim verdiğin kişiler listeyi görebilir; adını ve üyelerini değiştiremez." : "People you give access to can view the list, but cannot change its name or members."}</p></header>
    <div className="guest-list-readonly-note"><ShieldCheck size={19}/><span><strong>{tr ? "Salt okunur erişim" : "Read-only access"}</strong>{tr ? "Listenin kontrolü her zaman sende kalır." : "You always keep control of the list."}</span></div>
    <div className="guest-list-share-compose">
      <label className="guest-list-search"><Search size={18}/><span className="sr-only">{tr ? "Paylaşılacak kullanıcıyı ara" : "Search user to share with"}</span><input autoFocus aria-label={tr ? "Paylaşılacak kullanıcıyı ara" : "Search user to share with"} onChange={(event) => { setQuery(event.target.value); setSelectedUserId(null); }} placeholder={tr ? "Kullanıcı adı yazın…" : "Write a user name…"} value={query}/></label>
      <button className="primary-action" disabled={!selectedUser || share.isPending || sharedIds.has(selectedUser.id)} onClick={() => selectedUser && share.mutate(selectedUser.id)} type="button"><Plus size={16}/>{share.isPending ? (tr ? "Ekleniyor…" : "Adding…") : (tr ? "Ekle" : "Add")}</button>
    </div>
    <div className="admin-list guest-list-share-list">
      {list.owner ? <div className="admin-list-row guest-list-share-person"><GuestListShareAvatar name={list.owner.name} url={list.owner.uploadedMedia?.[0]?.url}/><span><strong>{list.owner.username ? `@${list.owner.username}` : list.owner.name}</strong><small>{tr ? "Liste sahibi" : "List owner"}</small></span><ShieldCheck aria-label={tr ? "Sahip kaldırılamaz" : "Owner cannot be removed"} size={18}/></div> : null}
      {(list.shares ?? []).map((item) => <div className="admin-list-row guest-list-share-person" key={item.id}><GuestListShareAvatar name={item.user.name} url={item.user.uploadedMedia?.[0]?.url}/><span><strong>{item.user.username ? `@${item.user.username}` : item.user.name}</strong><small>{tr ? "Salt okunur erişimi var" : "Has read-only access"}</small></span><button className="secondary-action" disabled={unshare.isPending} onClick={() => unshare.mutate(item.userId)}>{tr ? "Erişimi kaldır" : "Remove access"}</button></div>)}
      {query.trim().length >= 2 ? candidates.filter((person) => !sharedIds.has(person.id)).map((person) => <button aria-pressed={selectedUserId === person.id} className={`admin-list-row guest-list-share-result guest-list-share-person${selectedUserId === person.id ? " is-selected" : ""}`} disabled={share.isPending} key={person.id} onClick={() => { setSelectedUserId(person.id); setQuery(person.username ? `@${person.username}` : person.name); }}><GuestListShareAvatar name={person.name} url={person.avatarUrl}/><span><strong>{person.username ? `@${person.username}` : person.name}</strong><small>{person.name}</small></span><span>{selectedUserId === person.id ? <Check size={15}/> : <Plus size={15}/>} {selectedUserId === person.id ? (tr ? "Seçildi" : "Selected") : (tr ? "Seç" : "Select")}</span></button>) : null}
    </div>
    {!list.shares?.length && query.trim().length < 2 ? <p className="guest-list-dialog-hint">{tr ? "Paylaşmak istediğin kişiyi bulmak için en az iki karakter yaz." : "Type at least two characters to find someone to share with."}</p> : null}
    {share.isError ? <p className="form-error">{tr ? "Paylaşım erişimi eklenemedi." : "Sharing access could not be added."}</p> : null}
  </section></div>;
}

function GuestListShareAvatar({ name, url }: { name: string; url?: string | null }) {
  return url ? <img alt="" className="guest-list-share-avatar" src={resolveMediaUrl(url)}/> : <span className="guest-list-share-avatar guest-list-share-avatar-fallback">{name.slice(0, 1).toLocaleUpperCase()}</span>;
}

function memberAge(value: string | Date) {
  const birth = new Date(value);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()) age -= 1;
  return Math.max(0, age);
}
