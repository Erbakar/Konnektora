import { FollowStar } from "../components/MemberSignals";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  ShieldCheck,
  BarChart3,
  Bell,
  Check,
  Edit3,
  Trash2,
  Flag,
  MapPin,
  MoreVertical,
  Share2,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { userProfilePath } from "../components/UserIdentityLink";
import { RichText } from "../components/RichText";
import { TagPicker } from "../components/TagPicker";
import { ContentMediaGallery } from "../components/ContentMediaGallery";
import { ContentComments } from "../components/ContentComments";
import { DistanceLabel } from "../components/DistanceLabel";
import { LocationPicker } from "../components/LocationPicker";
import { CountryCityFields } from "../components/CountryCityFields";
import { LocationMap } from "../components/LocationMap";
import { EventCard } from "../components/EventCard";
import { NotificationDialog, ShareDialog } from "../components/ContentDialogs";
import { ReportDialog } from "../components/ReportDialog";
import { PlaceCard, placeTypeLabels, placeTypeLabelsTr } from "../components/PlaceCard";
import {
  createBlock,
  archiveMyPlace,
  updateMyPlace,
  followPlace,
  getContentNotification,
  getPlace,
  getUserSession,
  listPlaceRelatedUsers,
  listPlaces,
  listTags,
  respondPlaceInvite,
  recordContentView,
  setContentNotification,
  unfollowPlace,
  resolveMediaUrl,
  invitePlaceMember,
} from "../lib/api";
import { NotFoundPage } from "./NotFoundPage";
import { getServiceErrorPresentation } from "../lib/serviceErrors";
import { useLanguage } from "../lib/i18n";
import { localizeCityName, localizeCountryName } from "../lib/formats";

export function PlaceDetailPage({ editPage = false }: { editPage?: boolean }) {
  const { language } = useLanguage();
  const { slug = "" } = useParams();
  const user = getUserSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(editPage);
  const [editStep, setEditStep] = useState<"details" | "media">("details");
  const closeEditor = () => { setEditOpen(false); if (editPage) navigate(`/places/${slug}`); };
  useEffect(() => { setEditOpen(editPage); setEditStep("details"); }, [editPage, slug]);
  const [showAllTags, setShowAllTags] = useState(false);
  const [chosenPlaceEventTab, setPlaceEventTab] = useState<"future" | "past" | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const placeQuery = useQuery({
    queryKey: ["place", slug],
    queryFn: () => getPlace(slug),
    enabled: Boolean(slug),
    retry: false,
  });
  const place = placeQuery.data;
  const tagsQuery = useQuery({ queryKey: ["tags"], queryFn: () => listTags(), enabled: editOpen });
  const canManage = Boolean((user && place?.createdById === user.id) || place?.viewerMembership?.status === "accepted" && ["manager", "organizer"].includes(place.viewerMembership.role) || ["admin", "super_admin", "curator"].includes(user?.role ?? ""));
  const relatedUsersQuery = useQuery({ queryKey: ["place", place?.id, "related-users"], queryFn: () => listPlaceRelatedUsers(place!.id), enabled: Boolean(place) });
  const relatedPlacesQuery = useQuery({
    queryKey: ["related-places", place?.id, place?.city],
    queryFn: () => listPlaces(new URLSearchParams({ pageSize: "20" })),
    enabled: Boolean(place),
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["place", slug] });
    void queryClient.invalidateQueries({ queryKey: ["places"] });
  };
  // 07/11 #102: düzenleme penceresinde virgülle girilen yeni yönetici kullanıcı adları da davet edilir.
  const editMutation = useMutation({ mutationFn: async ({ managerUsernames = [], ...input }: Parameters<typeof updateMyPlace>[1] & { managerUsernames?: string[] }) => { const updated = await updateMyPlace(place!.id, input); const existing = new Set((place!.managers ?? []).map((manager) => (manager.username ?? "").toLocaleLowerCase("tr-TR"))); const fresh = [...new Set(managerUsernames)].filter((username) => !existing.has(username.toLocaleLowerCase("tr-TR"))); const results = await Promise.allSettled(fresh.map((username) => invitePlaceMember(place!.id, { username, role: "manager" }))); if (results.some((result) => result.status === "rejected")) setActionNotice(language === "tr" ? "Mekân kaydedildi; bazı yönetici kullanıcı adları eklenemedi." : "The place was saved; some manager usernames could not be added."); return updated; }, onSuccess: (updated) => { refresh(); setEditOpen(false); navigate(`/places/${updated.slug}`, { replace: true }); } });
  const archiveMutation = useMutation({ mutationFn: () => archiveMyPlace(place!.id), onError: () => setActionNotice(language === "tr" ? "Mekân yayından kaldırılamadı. Tekrar deneyin." : "The place could not be removed. Try again."), onSuccess: () => { refresh(); navigate("/places"); } });
  const followMutation = useMutation({
    mutationFn: () =>
      place!.isFollowing ? unfollowPlace(place!.id) : followPlace(place!.id),
    onSuccess: refresh,
  });
  const notificationQuery = useQuery({
    queryKey: ["content-notification", "place", place?.id],
    queryFn: () => getContentNotification("place", place!.id),
    enabled: Boolean(user && place),
  });
  const notificationMutation = useMutation({
    mutationFn: () =>
      setContentNotification(
        "place",
        place!.id,
        !notificationQuery.data?.enabled,
      ),
    onSuccess: (result) => {
      queryClient.setQueryData(
        ["content-notification", "place", place?.id],
        result,
      );
      setNotificationOpen(false);
    },
  });
  const respondMutation = useMutation({
    mutationFn: (status: "accepted" | "declined") =>
      respondPlaceInvite(place!.id, status),
    onSuccess: refresh,
  });
  const blockMutation = useMutation({
    mutationFn: () => createBlock("place", place!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["places"] });
      navigate("/places");
    },
  });

  useEffect(() => {
    if (place?.id) void recordContentView("place", place.id);
  }, [place?.id]);

  if (placeQuery.isLoading)
    return <section className="page">{language === "tr" ? "Mekân yükleniyor…" : "Loading place…"}</section>;
  if (placeQuery.isError) {
    const presentation = getServiceErrorPresentation(placeQuery.error, language === "tr" ? "Mekân bilgileri şu anda yüklenemedi. Lütfen tekrar deneyin." : "The place could not be loaded. Please try again.");
    if (presentation.kind === "not-found") return <NotFoundPage kind="place" />;
    return <section className="page not-found-page" role="alert"><p className="eyebrow">{language === "tr" ? "Mekân yüklenemedi" : "Place unavailable"}</p><h1>{presentation.title}</h1><p>{presentation.message}</p><button className="primary-action" onClick={() => void placeQuery.refetch()} type="button">{language === "tr" ? "Tekrar dene" : "Try again"}</button></section>;
  }
  if (!place) return <NotFoundPage kind="place" />;
  const editor = <div className={editPage ? "page place-edit-page" : "dialog-backdrop"} role="presentation" onMouseDown={editPage ? undefined : closeEditor}><section className="content-dialog" role={editPage ? undefined : "dialog"} aria-modal={editPage ? undefined : true} aria-label={language === "tr" ? "Mekânı düzenle" : "Edit place"} onMouseDown={(e) => e.stopPropagation()}><h2>{language === "tr" ? "Mekânı düzenle" : "Edit place"}</h2><div className="feed-tabs"><button type="button" className={editStep === "details" ? "active" : ""} onClick={() => setEditStep("details")}>{language === "tr" ? "Mekân bilgileri" : "Place details"}</button><button type="button" className={editStep === "media" ? "active" : ""} onClick={() => setEditStep("media")}>{language === "tr" ? "Mekân medyaları" : "Place media"}</button></div><form className="admin-form" onInvalidCapture={() => setEditStep("details")} onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.currentTarget); editMutation.mutate({ name: String(form.get("name")).trim(), description: String(form.get("description")).trim(), address: String(form.get("address")).trim(), latitude: form.get("latitude") ? Number(form.get("latitude")) : undefined, longitude: form.get("longitude") ? Number(form.get("longitude")) : undefined, placeType: String(form.get("placeType")), tagIds: form.getAll("tagIds").map(String), region: String(form.get("region") || ""), postalCode: String(form.get("postalCode") || ""), city: String(form.get("city")).trim(), country: String(form.get("country")).trim(), visibility: String(form.get("visibility")) as "open" | "approval_required" | "invite_only", managerUsernames: String(form.get("managerUsernames") || "").split(",").map((item) => item.trim().replace(/^@/, "")).filter(Boolean) }); }}><div style={{ display: editStep === "details" ? "grid" : "none", gap: 16 }}><label>{language === "tr" ? "Mekân adı" : "Place name"}<input name="name" defaultValue={place.name} required minLength={2} maxLength={160}/></label><label>{language === "tr" ? "Açıklama" : "Description"}<textarea name="description" defaultValue={place.description ?? ""} maxLength={2000}/></label><label>{language === "tr" ? "Mekân türü" : "Place type"}<select name="placeType" defaultValue={place.placeType ?? "other"}>{Object.entries(language === "tr" ? placeTypeLabelsTr : placeTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><TagPicker tags={tagsQuery.data ?? []} initialIds={place.tags?.map(tag => tag.id)} label={language === "tr" ? "Etiketler" : "Tags"}/><label>{language === "tr" ? "Yöneticiler: (opsiyonel)" : "Managers: (optional)"}<input name="managerUsernames" placeholder="@ayse, @mehmet"/><span className="form-help">{place.managers?.length ? <>{language === "tr" ? "Mevcut: " : "Current: "}{place.managers.map((manager, index) => <span key={manager.id}>{index ? ", " : ""}<Link to={userProfilePath(manager)}>@{manager.username ?? manager.name}</Link></span>)} · </> : null}{language === "tr" ? "Birden fazla kullanıcı adını virgülle ayır. " : "Separate multiple usernames with commas. "}<Link to={`/places/${place.slug}/users`}>{language === "tr" ? "Yönetici rollerini düzenle" : "Manage roles"}</Link></span></label><CountryCityFields addressFields defaultRegion={place.region} defaultPostalCode={place.postalCode} defaultCity={place.city} defaultCountry={place.country}/><LocationPicker addressName="address" defaultAddress={place.address ?? ""} defaultLatitude={place.latitude} defaultLongitude={place.longitude}/><label>{language === "tr" ? "Katılım" : "Access"}<select name="visibility" defaultValue={place.visibility}><option value="open">{language === "tr" ? "Herkese açık" : "Open to everyone"}</option><option value="approval_required">{language === "tr" ? "Onay gerekli" : "Approval required"}</option><option value="invite_only">{language === "tr" ? "Sadece davetli" : "Invite only"}</option></select></label></div><div hidden={editStep !== "media"}><ContentMediaGallery targetType="place" targetId={place.id} canManage coverImageUrl={place.coverImageUrl}/></div>{editMutation.isError ? <p className="form-error" role="alert">{language === "tr" ? "Değişiklikler kaydedilemedi." : "The changes could not be saved."}</p> : null}<div className="row-actions"><button className="secondary-action" type="button" onClick={closeEditor}>{language === "tr" ? "Vazgeç" : "Cancel"}</button><button className="primary-action" disabled={editMutation.isPending}>{language === "tr" ? "Kaydet" : "Save"}</button></div></form></section></div>;
  if (editPage) return canManage ? editor : <section className="page"><p>{language === "tr" ? "Bu mekânı düzenleme yetkiniz yok." : "You cannot edit this place."}</p><Link to={`/places/${slug}`}>{language === "tr" ? "Mekâna dön" : "Back to place"}</Link></section>;
  const placeEvents = place.events ?? [];
  const isPlaceEventFinished = (event: (typeof placeEvents)[number]) => new Date(event.endsAt ?? event.startsAt).getTime() < Date.now();
  // Güncel etkinlik yok ama geçmiş varsa "Geçmiş etkinlikler" varsayılan seçilir; ikisi de yoksa "Güncel etkinlikler".
  const placeEventTab = chosenPlaceEventTab ?? (!placeEvents.some((event) => !isPlaceEventFinished(event)) && placeEvents.some(isPlaceEventFinished) ? "past" : "future");
  const visiblePlaceEvents = placeEvents.filter((event) => {
    const eventFinished = new Date(event.endsAt ?? event.startsAt).getTime() < Date.now();
    return placeEventTab === "future" ? !eventFinished : eventFinished;
  }).slice(0, 8);
  const invitedPreviewCount = place.inviteCount ?? (relatedUsersQuery.data ?? []).filter((member) => member.status === "invited").length;

  return (
    <article className="page detail-page">
      <ContentMediaGallery targetType="place" targetId={place.id} canManage={canManage} coverImageUrl={place.coverImageUrl} coverAlt={place.name} />
      <p className="eyebrow">{language === "tr" ? "MEKÂN" : "PLACE"} – {place.visibility === "invite_only" ? language === "tr" ? "SADECE DAVETLİ" : "INVITE ONLY" : place.visibility === "approval_required" ? language === "tr" ? "ONAY GEREKLİ" : "APPROVAL REQUIRED" : language === "tr" ? "HERKESE AÇIK" : "OPEN TO EVERYONE"}</p>
      <h1><a href={`/places/${place.slug}`}>{place.name}</a></h1>
      <div className="detail-meta">
        <span>{(language === "tr" ? placeTypeLabelsTr : placeTypeLabels)[place.placeType ?? ""] ?? (language === "tr" ? "Mekân" : "Place")}</span>
        <span>
          <MapPin size={16} />
          {[place.address, localizeCityName(place.city, language), localizeCountryName(place.country, language)]
            .filter(Boolean)
            .join(", ") || (language === "tr" ? "Konum belirtilmedi" : "Location not specified")}
        </span>
        {place.createdBy ? <span><ShieldCheck size={17}/><FollowStar id={place.createdBy.id}/><Link to={userProfilePath(place.createdBy)}>{place.createdBy.username ? `@${place.createdBy.username}` : place.createdBy.name}</Link></span> : null}
        <DistanceLabel latitude={place.latitude} longitude={place.longitude} />
      </div>
      {place.tags?.length ? (
        <section className="place-header-tags">
          <div className="tag-row">{place.tags.slice(0, showAllTags ? undefined : 6).map((tag) => <Link key={tag.id} to={`/tags/${tag.slug}`}>#{tag.name}</Link>)}{place.tags.length > 6 && !showAllTags ? <button className="text-action" onClick={() => setShowAllTags(true)} type="button">{language === "tr" ? `Tümünü göster (${place.tags.length})` : `Show all (${place.tags.length})`}</button> : null}</div>

        </section>
      ) : null}
      <div className="detail-actions place-detail-actions">
        {user ? (
          <button
            className="primary-action"
            disabled={followMutation.isPending}
            onClick={() => followMutation.mutate()}
            type="button"
          >
            {place.isFollowing ? language === "tr" ? "Takibi bırak" : "Unfollow" : language === "tr" ? "Takip et" : "Follow"}
          </button>
        ) : (
          <Link className="primary-action" to="/login">
            {language === "tr" ? "Takip etmek için giriş yap" : "Log in to follow"}
          </Link>
        )}
        {user ? <button className="secondary-action" onClick={() => {
          if (!canManage && place.viewerMembership?.status !== "accepted") {
            setActionNotice(language === "tr" ? "Sadece üyeler ve davetliler davet edebilir." : "Only members and invited people can send invitations.");
            return;
          }
          navigate(`/places/${place.slug}/invites`);
        }} type="button"><UserPlus size={18}/>{language === "tr" ? "Davet et" : "Invite"}</button> : null}
        <button className="secondary-action" onClick={() => setShareOpen(true)}><Share2 size={18}/>{language === "tr" ? "Paylaş" : "Share"}</button>
        <details className="action-menu place-actions-menu">
          <summary aria-label={language === "tr" ? "Mekân aksiyonları" : "Place actions"}><MoreVertical size={20}/></summary>
          <div>
            {user ? <button onClick={() => setNotificationOpen(true)} type="button"><Bell size={17}/> {language === "tr" ? "Bildirim ayarla" : "Set notifications"}</button> : null}
            <Link to={user ? `/stats/place/${place.id}?${new URLSearchParams({ name: place.name, back: `/places/${place.slug}` })}` : `/login?next=${encodeURIComponent(`/stats/place/${place.id}?${new URLSearchParams({ name: place.name, back: `/places/${place.slug}` })}`)}`}><BarChart3 size={17}/> {language === "tr" ? "Mekân istatistikleri" : "Place analytics"}</Link>
            {canManage ? <Link to={`/places/${place.slug}/invites#check-in`}><UserPlus size={17}/> {language === "tr" ? "Check-in kontrolü" : "Check-in control"}</Link> : null}
            {canManage ? <><button onClick={() => { setEditStep("details"); if (window.matchMedia("(max-width: 760px)").matches) navigate(`/places/${place.slug}/edit`); else setEditOpen(true); }} type="button"><Edit3 size={17}/>{language === "tr" ? "Mekânı düzenle" : "Edit place"}</button><button disabled={archiveMutation.isPending} onClick={() => { if (window.confirm(language === "tr" ? "Mekân yayından kaldırılsın mı?" : "Remove this place from publication?")) archiveMutation.mutate(); }} type="button"><Trash2 size={17}/>{language === "tr" ? "Mekânı sil" : "Delete place"}</button></> : null}
            {user && !canManage ? <button onClick={() => setReportOpen(true)} type="button"><Flag size={17}/> {language === "tr" ? "Mekânı rapor et" : "Report place"}</button> : null}
            {user && !canManage ? <button disabled={blockMutation.isPending} onClick={() => blockMutation.mutate()} type="button"><Ban size={17}/> {language === "tr" ? "Mekânı engelle" : "Block place"}</button> : null}
          </div>
        </details>
      </div>
      {actionNotice ? <div className="form-error detail-action-notice" role="alert"><span>{actionNotice}</span><button aria-label={language === "tr" ? "Mesajı kapat" : "Dismiss message"} onClick={() => setActionNotice(null)} type="button">×</button></div> : null}
      {place.viewerMembership?.status === "invited" ? (
        <section className="admin-form compact-form">
          <strong>{language === "tr" ? "Mekân daveti" : "Place invitation"}</strong>
          <div className="row-actions">
            <button
              className="primary-action"
              onClick={() => respondMutation.mutate("accepted")}
            >
              <Check size={16} /> {language === "tr" ? "Kabul et" : "Accept"}
            </button>
            <button
              className="danger-action"
              onClick={() => respondMutation.mutate("declined")}
            >
              <X size={16} /> {language === "tr" ? "Reddet" : "Decline"}
            </button>
          </div>
        </section>
      ) : null}
      <section className="admin-form event-attendee-preview"><h2>{language === "tr" ? "Takipçiler" : "Followers"}</h2><span className="attendee-avatar-stack">{(relatedUsersQuery.data ?? []).filter((member) => !member.isProvisional && member.status === "accepted").slice(0, 8).map((member) => <Link key={member.id} title={member.name} to={member.username ? `/users/${member.username}` : `/users/id/${member.id}`}>{member.avatarUrl ? <img alt="" src={resolveMediaUrl(member.avatarUrl)}/> : member.name[0]}</Link>)}</span><Link to={`/places/${place.slug}/users`}><strong>{place.memberCount ?? (relatedUsersQuery.data ?? []).filter((member) => member.status === "accepted").length} {language === "tr" ? "üye" : "members"} · {invitedPreviewCount} {language === "tr" ? "davetli" : "invited"}{canManage ? ` · ${(relatedUsersQuery.data ?? []).filter((member) => member.status === "pending").length} ${language === "tr" ? "bekleyen" : "pending"}` : ""} · {place.followingMemberCount ?? 0} {language === "tr" ? "takip ettiğiniz" : "you follow"}</strong></Link></section>
      <p className="detail-copy">
        <RichText
          text={place.description || (language === "tr" ? "Bu mekân için henüz açıklama eklenmemiş." : "No description has been added for this place yet.")}
        />
      </p>
      {place.latitude != null && place.longitude != null ? (
        <LocationMap items={[{ id: place.id, title: place.name, latitude: place.latitude, longitude: place.longitude, location: [place.address, localizeCityName(place.city, language), localizeCountryName(place.country, language)].filter(Boolean).join(", ") }]} />
      ) : null}
      <section className="detail-section"><div className="section-header"><h2>{language === "tr" ? "Mekândaki etkinlikler" : "Events at this place"}</h2>{placeEvents.length ? <Link to={`/events?city=${encodeURIComponent(place.city ?? "")}`}>{language === "tr" ? "Tümünü gör" : "See all"}</Link> : null}</div><nav className="feed-tabs"><button className={placeEventTab === "future" ? "active" : ""} onClick={() => setPlaceEventTab("future")} type="button">{language === "tr" ? "Güncel etkinlikler" : "Current events"}</button><button className={placeEventTab === "past" ? "active" : ""} onClick={() => setPlaceEventTab("past")} type="button">{language === "tr" ? "Geçmiş etkinlikler" : "Past events"}</button></nav>{visiblePlaceEvents.length ? <div className="event-grid recommendation-carousel">{visiblePlaceEvents.map((event) => <EventCard event={event} key={event.id}/>)}</div> : <p className="empty-state">{placeEventTab === "future" ? language === "tr" ? "Bu mekânda güncel etkinlik bulunmuyor." : "There are no current events at this place." : language === "tr" ? "Bu mekânda geçmiş etkinlik bulunmuyor." : "There are no past events at this place."}</p>}</section>
      <ReportDialog onClose={() => setReportOpen(false)} open={reportOpen} targetId={place.id} targetType="place"/>
      <ContentComments
        canManage={canManage}
        targetId={place.id}
        targetType="place"
        title={language === "tr" ? "Mekân yorumları" : "Place posts and comments"}
        organizerId={place.createdById ?? null}
      />
      {(relatedPlacesQuery.data?.items ?? []).filter((item) => item.id !== place.id).length ? (
        <section className="detail-section">
          <div className="section-header"><h2>{language === "tr" ? "İlginizi çekebilecek diğer mekânlar" : "Other places you may like"}</h2><Link to="/places">{language === "tr" ? "Tümünü gör" : "See all"}</Link></div>
          <div className="event-grid place-grid recommendation-carousel">{relatedPlacesQuery.data!.items.filter((item) => item.id !== place.id).sort((a, b) => { const score = (item: typeof a) => (item.city === place.city ? 5 : 0) + (item.tags ?? []).filter((tag) => place.tags?.some((own) => own.id === tag.id)).length * 3 + item.followerCount / 1000; return score(b) - score(a); }).slice(0, 8).map((item) => <PlaceCard key={item.id} place={item}/>)}</div>
        </section>
      ) : null}
      <NotificationDialog
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        enabled={Boolean(notificationQuery.data?.enabled)}
        pending={notificationMutation.isPending}
        onConfirm={() => notificationMutation.mutate()}
        title={place.name}
      />
      {editOpen && canManage ? editor : null}
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        targetId={place.id}
        targetType="place"
        title={place.name}
        text={[`${place.name} ${(placeTypeLabels[place.placeType ?? ""] ?? "").split(" ")[0]}`, `📍 ${[place.address, place.city, place.country].filter(Boolean).join(", ")}`, place.tags?.slice().sort((a, b) => b.usageCount - a.usageCount).slice(0, 4).map((tag) => `#${tag.name}`).join(" "), `✨ ${place.followerCount} ${language === "tr" ? "üye bu mekânı takip ediyor" : "members follow this place"}`, language === "tr" ? "🌎 Konnektora’da keşfet →" : "🌎 Discover on Konnektora →"].filter(Boolean).join("\n")}
        url={new URL(`/places/${place.slug}`, window.location.origin).toString()}
      />
    </article>
  );
}
