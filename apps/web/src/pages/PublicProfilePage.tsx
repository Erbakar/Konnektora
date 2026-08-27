import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Ban,
  CalendarDays,
  Flag,
  Globe2,
  Mail,
  MapPin,
  MessageCircle,
  MoreVertical,
  Settings,
  Share2,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DiscoveryCard } from "../components/DiscoveryCard";
import { NotificationDialog, ShareDialog } from "../components/ContentDialogs";
import {
  createBlock,
  createGuestList,
  createContentReport,
  followUser,
  getPublicProfile,
  getPublicProfileById,
  getContentNotification,
  getUserSession,
  addGuestListMember,
  inviteEventParticipant,
  listMyEvents,
  listGuestLists,
  listReportRules,
  setContentNotification,
  unfollowUser,
  resolveMediaUrl,
  getProfileAffinities,
  listTags,
  updateProfileAffinities,
} from "../lib/api";

function ageFrom(value: string | Date) {
  const birth = new Date(value); const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) age -= 1;
  return Math.max(0, age);
}

function publicUsername(username: string | null | undefined) {
  return username && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(username) ? username : null;
}

export function PublicProfilePage() {
  const { username = "", userId = "" } = useParams();
  const user = getUserSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState(false);
  const [mutualOpen, setMutualOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [selectedSentiment, setSelectedSentiment] = useState<"like" | "ok" | "dislike">("like");
  const [profileEventTab, setProfileEventTab] = useState<"future" | "past" | "organizer">("future");
  const [profilePlaceTab, setProfilePlaceTab] = useState<"all" | "organizer">("all");
  const profileQuery = useQuery({
    queryKey: ["public-profile", username || userId, user?.id],
    queryFn: () => userId ? getPublicProfileById(userId) : getPublicProfile(username),
    enabled: Boolean(username || userId),
  });
  const rules = useQuery({
    queryKey: ["report-rules", "user"],
    queryFn: () => listReportRules("user"),
    enabled: Boolean(user),
  });
  const profile = profileQuery.data;
  const notification = useQuery({ queryKey: ["content-notification", "user", profile?.id], queryFn: () => getContentNotification("user", profile!.id), enabled: Boolean(user && profile && !profile.relationship.isSelf) });
  const managedEvents = useQuery({ queryKey: ["my-events", user?.id, "profile-guest-list"], queryFn: listMyEvents, enabled: Boolean(user && guestOpen) });
  const namedGuestLists = useQuery({ queryKey: ["guest-lists", user?.id], queryFn: listGuestLists, enabled: Boolean(user && guestOpen) });
  const allTags = useQuery({ queryKey: ["tags", "profile-dialog"], queryFn: () => listTags(), enabled: tagDialogOpen });
  const ownAffinities = useQuery({ queryKey: ["profile-affinities", user?.id, "profile-dialog"], queryFn: getProfileAffinities, enabled: Boolean(user && profile?.relationship.isSelf && tagDialogOpen) });
  const notificationMutation = useMutation({ mutationFn: () => setContentNotification("user", profile!.id, !notification.data?.enabled), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["content-notification", "user", profile?.id] }); setNotificationOpen(false); } });
  const guestMutation = useMutation({ mutationFn: (eventId: string) => inviteEventParticipant(eventId, { userId: profile!.id, role: "attendee" }, "user"), onSuccess: () => setGuestOpen(false) });
  const namedGuestMutation = useMutation({ mutationFn: (listId: string) => addGuestListMember(listId, profile!.id), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["guest-lists", user?.id] }); setGuestOpen(false); } });
  const createNamedGuestList = useMutation({ mutationFn: (name: string) => createGuestList(name), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guest-lists", user?.id] }) });
  const addTagMutation = useMutation({ mutationFn: () => updateProfileAffinities([...(ownAffinities.data ?? []).filter((item) => item.tag.id !== selectedTagId).map((item) => ({ tagId: item.tag.id, sentiment: item.sentiment })), { tagId: selectedTagId, sentiment: selectedSentiment }]), onSuccess: async () => { setSelectedTagId(""); await Promise.all([queryClient.invalidateQueries({ queryKey: ["public-profile"] }), queryClient.invalidateQueries({ queryKey: ["profile-affinities"] })]); } });
  const followMutation = useMutation({
    mutationFn: () =>
      profile?.relationship.following
        ? unfollowUser(profile.id)
        : followUser(profile!.id),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["public-profile", username],
      }),
  });
  const blockMutation = useMutation({
    mutationFn: () => createBlock("user", profile!.id),
    onSuccess: () => navigate("/search"),
  });
  const reportMutation = useMutation({
    mutationFn: (input: {
      ruleId?: string;
      reason: string;
      details?: string;
    }) =>
      createContentReport({
        targetType: "user",
        targetId: profile!.id,
        ...input,
      }),
    onSuccess: () => setReportOpen(false),
  });

  if (profileQuery.isLoading)
    return (
      <section className="page route-loading" role="status">
        Profil yükleniyor…
      </section>
    );
  if (!profile)
    return (
      <section className="page empty-state">
        <h1>Profil bulunamadı</h1>
        <p>Bu kullanıcı mevcut değil, aktif değil veya görüntülenemiyor.</p>
        <Link className="primary-action" to="/search">
          Aramaya dön
        </Link>
      </section>
    );
  const profilePhoto =
    profile.media.find(
      (item) => item.isProfilePicture && item.type === "image",
    ) ?? profile.media.find((item) => item.type === "image");

  return (
    <section className="page public-profile-page">
      <header className="public-profile-hero">
        <button aria-label="Medya galerisini aç" className="public-profile-avatar" onClick={() => setGalleryIndex(0)} type="button">
          {profilePhoto ? (
            <img
              alt={`${profile.name} profil fotoğrafı`}
              src={resolveMediaUrl(profilePhoto.url)}
            />
          ) : (
            profile.name.slice(0, 1).toUpperCase()
          )}
        </button>
        {profile.media.length > 1 ? <div className="profile-media-thumbnails">{profile.media.filter((item) => item.id !== profilePhoto?.id).slice(0, 3).map((media, index, shown) => <button key={media.id} onClick={() => setGalleryIndex(profile.media.findIndex((item) => item.id === media.id))} type="button">{media.type === "video" ? <video muted src={resolveMediaUrl(media.url)}/> : <img alt="" src={resolveMediaUrl(media.url)}/>} {index === shown.length - 1 && profile.media.length - 1 > shown.length ? <span>+{profile.media.length - 1 - shown.length}</span> : null}</button>)}</div> : null}
        <div className="public-profile-heading">
          <span className="eyebrow">
            {profile.accountType === "corporate"
              ? "Kurumsal üye"
              : "Konnektora üyesi"}
          </span>
          <h1>
            {profile.name}
            {profile.verified ? <BadgeCheck aria-label="Doğrulanmış profil" className="verified-badge" size={25} /> : null}
          </h1>
          {publicUsername(profile.username) ? <strong>@{publicUsername(profile.username)}</strong> : <strong>{profile.name}</strong>}
          <div className="profile-metrics">
            <button data-tooltip="Kimin kimi takip ettiğini kimse göremez." onClick={() => setPrivacyNotice(true)} title="Kimin kimi takip ettiğini kimse göremez." type="button">
              <b>{profile.followerCount}</b> takipçi
            </button>
            {profile.relationship.isSelf ? <Link to="/community?scope=following">
              <b>{profile.followingCount}</b> takip
            </Link> : null}
          </div>
        </div>
        <div className="public-profile-actions">
          {profile.relationship.isSelf ? (
            <Link className="primary-action" to="/settings">
              Profili düzenle
            </Link>
          ) : user ? (
            <>
              <button
                className={
                  profile.relationship.following
                    ? "secondary-action"
                    : "primary-action"
                }
                disabled={followMutation.isPending}
                onClick={() => followMutation.mutate()}
                type="button"
              >
                {profile.relationship.following ? (
                  <UserCheck size={18} />
                ) : (
                  <UserPlus size={18} />
                )}
                {profile.relationship.following ? "Takipte" : "Takip et"}
              </button>
              {profile.relationship.canMessage ? <Link className="secondary-action" to={`/messages?peer=${profile.id}`}><Mail size={18}/> Mesaj</Link> : null}
              <details className="action-menu profile-actions-menu"><summary aria-label="Profil aksiyonları"><MoreVertical size={20}/></summary><div>{profile.relationship.canMessage ? <Link to={`/messages?peer=${profile.id}`}><Mail size={18}/> Mesaj gönder</Link> : null}<button onClick={() => setNotificationOpen(true)} type="button">{notification.data?.enabled ? "Bildirimleri kapat" : "Set a notification"}</button><button onClick={() => setGuestOpen(true)} type="button"><UserPlus size={18}/> Add to guest list</button>{profile.stats ? <Link to={`/stats/user/${profile.id}`}>Interaction statistics about you</Link> : null}<button onClick={() => setShareOpen(true)} type="button"><Share2 size={18}/> Paylaş</button><button onClick={() => setReportOpen((open) => !open)} type="button"><Flag size={18}/> Kullanıcıyı raporla</button><button className="danger" disabled={blockMutation.isPending} onClick={() => blockMutation.mutate()} type="button"><Ban size={18}/> Kullanıcıyı engelle</button></div></details>
            </>
          ) : (
            <Link className="primary-action" to="/login">
              Takip etmek için giriş yap
            </Link>
          )}
          {profile.relationship.isSelf ? <details className="action-menu profile-actions-menu"><summary aria-label="Profil ayarları"><MoreVertical size={20}/></summary><div><Link to={`/stats/user/${profile.id}`}>Interaction statistics about you</Link><Link to="/settings"><Settings size={18}/> Ayarlar</Link><button onClick={() => setShareOpen(true)} type="button"><Share2 size={18}/> Paylaş</button></div></details> : null}
        </div>
        <div className="profile-sidebar-facts" aria-label="Profil bilgileri">
          {profile.accountType === "individual" && profile.birthDate ? <span>{ageFrom(profile.birthDate)} yaşında</span> : null}
          {profile.city || profile.country ? <span><MapPin size={15}/> {[profile.city, profile.country].filter(Boolean).join(", ")}</span> : null}
          {profile.accountType === "corporate" ? <>{profile.companyName ? <span><strong>İşletme:</strong> {profile.companyName}</span> : null}{profile.tradeName ? <span><strong>Ticari unvan:</strong> {profile.tradeName}</span> : null}{profile.companyType ? <span><strong>Şirket türü:</strong> {profile.companyType}</span> : null}{profile.businessCategory ? <span><strong>Kategori:</strong> {profile.businessCategory}</span> : null}{profile.address || profile.district ? <span><strong>Adres:</strong> {[profile.address, profile.district, profile.city, profile.country].filter(Boolean).join(", ")}</span> : null}</> : null}
          {profile.website ? <a href={profile.website} rel="noreferrer" target="_blank"><Globe2 size={16}/> {profile.website}</a> : null}
        </div>
      </header>
      {privacyNotice ? <div className="profile-privacy-toast" role="status"><span>Kimin kimi takip ettiğini kimse göremez.</span><button onClick={() => setPrivacyNotice(false)} type="button">Kapat</button></div> : null}
      <NotificationDialog open={notificationOpen} onClose={() => setNotificationOpen(false)} enabled={Boolean(notification.data?.enabled)} pending={notificationMutation.isPending} onConfirm={() => notificationMutation.mutate()} title={profile.name}/>
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} title={profile.name} url={window.location.href}/>
      {galleryIndex != null && profile.media[galleryIndex] ? <div className="dialog-backdrop profile-gallery-dialog" role="presentation" onMouseDown={() => setGalleryIndex(null)}><section aria-modal="true" className="content-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog"><div className="section-header"><strong>{galleryIndex + 1} / {profile.media.length}</strong><button onClick={() => setGalleryIndex(null)} type="button">Kapat</button></div>{profile.media[galleryIndex].type === "video" ? <video autoPlay controls src={resolveMediaUrl(profile.media[galleryIndex].url)}/> : <img alt={`${profile.name} profil medyası`} src={resolveMediaUrl(profile.media[galleryIndex].url)}/>}<div className="gallery-navigation"><button disabled={galleryIndex === 0} onClick={() => setGalleryIndex((value) => Math.max(0, (value ?? 0) - 1))} type="button">Önceki</button><button disabled={galleryIndex === profile.media.length - 1} onClick={() => setGalleryIndex((value) => Math.min(profile.media.length - 1, (value ?? 0) + 1))} type="button">Sonraki</button></div></section></div> : null}
      {guestOpen ? <div className="emotion-modal" role="dialog" aria-modal="true" aria-label="Guest List'e ekle"><div><button aria-label="Kapat" onClick={() => setGuestOpen(false)}>×</button><h2>{profile.name}</h2><p>Kullanıcıyı isimlendirilmiş bir listeye veya doğrudan etkinliğe ekle.</p><form className="inline-create-guest-list" onSubmit={(event) => { event.preventDefault(); const input = event.currentTarget.elements.namedItem("listName") as HTMLInputElement; if (input.value.trim()) { createNamedGuestList.mutate(input.value.trim()); input.value = ""; } }}><input name="listName" placeholder="Yeni liste adı"/><button className="secondary-action" disabled={createNamedGuestList.isPending}>Liste oluştur</button></form><h3>Guest listeler</h3><div className="admin-list">{namedGuestLists.data?.map((list) => <button className="admin-list-row" disabled={namedGuestMutation.isPending || list.members.some((member) => member.userId === profile.id)} key={list.id} onClick={() => namedGuestMutation.mutate(list.id)}><strong>{list.name}</strong><span>{list.members.length} kişi{list.members.some((member) => member.userId === profile.id) ? " · Zaten listede" : ""}</span></button>)}</div><h3>Etkinlikler</h3><div className="admin-list">{managedEvents.data?.map((event) => <button className="admin-list-row" disabled={guestMutation.isPending} key={event.id} onClick={() => guestMutation.mutate(event.id)}><strong>{event.title}</strong><span>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(event.startsAt))}</span></button>)}</div>{guestMutation.isError || namedGuestMutation.isError ? <p className="form-error">Kullanıcı guest listesine eklenemedi.</p> : null}</div></div> : null}
      {!profile.relationship.isSelf && profile.commonInterestCount > 0 ? (
        <button className="mutualism-bar" onClick={() => setMutualOpen(true)} type="button"><strong>{profile.commonInterestCount} ortak ilgi alanınız var</strong><span>Mutualizm analizini gör →</span></button>
      ) : null}
      {mutualOpen ? <div className="dialog-backdrop" role="presentation" onMouseDown={() => setMutualOpen(false)}><section aria-modal="true" className="content-dialog mutualism-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog"><div className="section-header"><div><p className="eyebrow">Mutualizm Analizi</p><h2>{profile.name} ile ortak noktalarınız</h2></div><button onClick={() => setMutualOpen(false)} type="button">Kapat</button></div><p>{profile.commonInterestCount} ortak ilgi alanı, yeni bir bağlantı kurmak için güçlü bir başlangıç.</p><div className="profile-interest-list">{profile.interests.filter((interest) => interest.common).map((interest) => <Link className="profile-interest is-common" key={interest.tag.id} to={`/tags/${interest.tag.slug}`}><span>#{interest.tag.name}</span><small>Ortak ilgi alanı</small></Link>)}</div>{profile.relationship.canMessage ? <Link className="primary-action" to={`/messages?peer=${profile.id}`}><Mail size={17}/> Sohbet başlat</Link> : null}</section></div> : null}
      {reportOpen ? (
        <form
          className="identity-panel public-profile-report"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const ruleId = String(form.get("ruleId") ?? "");
            const rule = rules.data?.find((item) => item.id === ruleId);
            reportMutation.mutate({
              ruleId: ruleId || undefined,
              reason:
                rule?.title ??
                String(form.get("reason") || "Uygunsuz kullanıcı profili"),
              details: String(form.get("details") || "") || undefined,
            });
          }}
        >
          <h2>Kullanıcıyı raporla</h2>
          {rules.data?.length ? (
            <select aria-label="Rapor sebebi" name="ruleId" required>
              <option value="">Sebep seç</option>
              {rules.data.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.title}
                </option>
              ))}
            </select>
          ) : (
            <input
              aria-label="Rapor sebebi"
              name="reason"
              minLength={3}
              required
            />
          )}
          <textarea
            aria-label="Rapor detayı"
            name="details"
            placeholder="İsteğe bağlı açıklama"
          />
          <button className="primary-action" type="submit">
            Raporu gönder
          </button>
        </form>
      ) : null}
      <section className="identity-panel" id="interests">
        <div className="section-header compact">
          <h2>İlgi alanları</h2>
          {profile.relationship.isSelf ? <button className="text-action" onClick={() => setTagDialogOpen(true)} type="button">+ Add a tag to yourself</button> : <span>{profile.interests.length} etiket</span>}
        </div>
        <div className="profile-interest-list">
          {profile.interests.map((interest) => (
            <Link
              className={
                interest.common
                  ? "profile-interest is-common"
                  : "profile-interest"
              }
              key={interest.tag.id}
              to={`/tags/${interest.tag.slug}?authorId=${profile.id}`}
            >
              <span><b className={`interest-sentiment interest-sentiment-${interest.sentiment}`}>{interest.sentiment === "like" ? "♡" : interest.sentiment === "dislike" ? "⌄" : "−"}</b> {interest.tag.name}</span>
              <small>
                {interest.sentiment === "like"
                    ? "Beğeniyor"
                    : interest.sentiment === "dislike"
                      ? "Beğenmiyor"
                      : "Nötr"}{interest.commentCount ? <> · <MessageCircle size={13}/> {interest.commentCount} gönderi</> : null}
              </small>
            </Link>
          ))}
          {!profile.interests.length ? (
            <p className="form-help">Henüz public ilgi alanı yok.</p>
          ) : null}
        </div>
      </section>
      {tagDialogOpen ? <div className="dialog-backdrop" role="presentation" onMouseDown={() => setTagDialogOpen(false)}><form aria-modal="true" className="content-dialog add-profile-tag-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); if (selectedTagId) addTagMutation.mutate(); }} role="dialog"><div className="section-header"><div><p className="eyebrow">Add a Tag to Profile</p><h2>Step 1: Select or write a tag</h2></div><button onClick={() => setTagDialogOpen(false)} type="button">Kapat</button></div><p>Sevdiğiniz kahve, müzik grubu, film; hatta sevmediğiniz alerjinize kadar her şey birer etiket olabilir.</p><label>Etiket<select required value={selectedTagId} onChange={(event) => setSelectedTagId(event.target.value)}><option value="">Enter an existing or new tag…</option>{allTags.data?.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select></label>{selectedTagId ? <fieldset><legend>Step 2: Choose a felt emotion for this tag</legend>{([['like', 'Beğeniyorum'], ['ok', 'Nötr'], ['dislike', 'Beğenmiyorum']] as const).map(([value, label]) => <label key={value}><input checked={selectedSentiment === value} onChange={() => setSelectedSentiment(value)} type="radio"/> {label}</label>)}</fieldset> : null}<button className="primary-action" disabled={!selectedTagId || addTagMutation.isPending}>Add to profile</button>{addTagMutation.isSuccess ? <p className="form-success">Etiket eklendi. Başka bir etiket seçebilirsiniz.</p> : null}{addTagMutation.isError ? <p className="form-error">Etiket profile eklenemedi.</p> : null}</form></div> : null}
      <section className="profile-content-section">
        <div className="section-header">
          <h2>
            <CalendarDays size={22} /> Etkinlikler
          </h2>
          <span>{profile.events.length}</span>
        </div>
        <nav className="discovery-tabs compact-tabs" aria-label="Profil etkinlikleri"><button className={profileEventTab === "future" ? "active" : ""} onClick={() => setProfileEventTab("future")} type="button">Future</button><button className={profileEventTab === "past" ? "active" : ""} onClick={() => setProfileEventTab("past")} type="button">Past</button><button className={profileEventTab === "organizer" ? "active" : ""} onClick={() => setProfileEventTab("organizer")} type="button">Organizer</button></nav>
        <div className="discovery-results">
          {profile.events.filter((item) => { if (profileEventTab === "organizer") return item.organizer; const date = item.meta?.split(" · ").at(-1); if (!date) return true; return profileEventTab === "future" ? new Date(date) >= new Date() : new Date(date) < new Date(); }).map((item) => (
            <DiscoveryCard hideSubtitle item={item} key={item.id} />
          ))}
        </div>
        {!profile.events.length ? (
          <p className="form-help">Görüntülenebilir etkinlik yok.</p>
        ) : null}
      </section>
      <section className="profile-content-section">
        <div className="section-header">
          <h2>
            <MapPin size={22} /> Mekânlar
          </h2>
          <span>{profile.places.length}</span>
        </div>
        <nav className="discovery-tabs compact-tabs" aria-label="Profil mekânları"><button className={profilePlaceTab === "all" ? "active" : ""} onClick={() => setProfilePlaceTab("all")} type="button">All</button><button className={profilePlaceTab === "organizer" ? "active" : ""} onClick={() => setProfilePlaceTab("organizer")} type="button">Organizer</button></nav>
        <div className="discovery-results">
          {profile.places.filter((item) => profilePlaceTab === "all" || item.organizer).map((item) => (
            <DiscoveryCard hideSubtitle item={item} key={item.id} />
          ))}
        </div>
        {!profile.places.length ? (
          <p className="form-help">Görüntülenebilir mekân yok.</p>
        ) : null}
      </section>
    </section>
  );
}
