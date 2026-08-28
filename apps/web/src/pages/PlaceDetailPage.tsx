import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  BarChart3,
  Bell,
  Check,
  Flag,
  MapPin,
  MoreVertical,
  Share2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RichText } from "../components/RichText";
import { ContentComments } from "../components/ContentComments";
import { ContentMediaGallery } from "../components/ContentMediaGallery";
import { ContentRating } from "../components/ContentRating";
import { DistanceLabel } from "../components/DistanceLabel";
import { LocationMap } from "../components/LocationMap";
import { EventCard } from "../components/EventCard";
import { NotificationDialog, ShareDialog } from "../components/ContentDialogs";
import { ReportDialog } from "../components/ReportDialog";
import { CountryCityFields } from "../components/CountryCityFields";
import { PlaceCard, placeTypeKeys, placeTypeLabels, placeTypeLabelsTr } from "../components/PlaceCard";
import {
  archiveMyPlace,
  createBlock,
  followPlace,
  getContentNotification,
  getPlace,
  getUserSession,
  listPlaceMembers,
  listPlaceRelatedUsers,
  listPlaces,
  respondPlaceInvite,
  recordContentView,
  setContentNotification,
  unfollowPlace,
  updateMyPlace,
  updatePlaceMember,
  resolveMediaUrl,
} from "../lib/api";
import { NotFoundPage } from "./NotFoundPage";
import { getServiceErrorPresentation } from "../lib/serviceErrors";
import { useLanguage } from "../lib/i18n";
import { localizeCityName, localizeCountryName } from "../lib/formats";

export function PlaceDetailPage() {
  const { language } = useLanguage();
  const { slug = "" } = useParams();
  const user = getUserSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [placeEventTab, setPlaceEventTab] = useState<"future" | "past">("future");
  const [reportOpen, setReportOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const placeQuery = useQuery({
    queryKey: ["place", slug],
    queryFn: () => getPlace(slug),
    enabled: Boolean(slug),
    retry: false,
  });
  const place = placeQuery.data;
  const canManage = Boolean(place?.viewerMembership?.status === "accepted" && ["manager", "organizer"].includes(place.viewerMembership.role) || ["admin", "super_admin", "curator"].includes(user?.role ?? ""));
  const membersQuery = useQuery({
    queryKey: ["place-members", place?.id],
    queryFn: () => listPlaceMembers(place!.id),
    enabled: Boolean(place && canManage),
  });
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
  const memberMutation = useMutation({
    mutationFn: ({
      userId,
      ...changes
    }: {
      userId: string;
      status?: string;
      role?: string;
    }) => updatePlaceMember(place!.id, userId, changes),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["place-members", place?.id],
      }),
  });
  const updateMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateMyPlace>[1]) =>
      updateMyPlace(place!.id, input),
    onSuccess: refresh,
  });
  const archiveMutation = useMutation({
    mutationFn: () => archiveMyPlace(place!.id),
    onSuccess: () => navigate("/places"),
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
  const placeEvents = place.events ?? [];
  const visiblePlaceEvents = placeEvents.filter((event) => {
    const eventFinished = new Date(event.endsAt ?? event.startsAt).getTime() < Date.now();
    return placeEventTab === "future" ? !eventFinished : eventFinished;
  }).slice(0, 8);
  const invitedPreviewCount = place.inviteCount ?? (relatedUsersQuery.data ?? []).filter((member) => member.status === "invited").length;

  return (
    <article className="page detail-page">
      {place.coverImageUrl ? (
        <div className="detail-media">
          <img alt="" src={resolveMediaUrl(place.coverImageUrl)} />
        </div>
      ) : null}
      <ContentMediaGallery canManage={canManage} coverAlt={place.name} coverImageUrl={place.coverImageUrl} targetId={place.id} targetType="place" />
      <p className="eyebrow">{language === "tr" ? "MEKÂN" : "PLACE"} – {place.visibility === "invite_only" ? language === "tr" ? "SADECE DAVETLİ" : "INVITE ONLY" : place.visibility === "approval_required" ? language === "tr" ? "ONAY GEREKLİ" : "APPROVAL REQUIRED" : language === "tr" ? "HERKESE AÇIK" : "OPEN TO EVERYONE"}</p>
      <h1>{place.name}</h1>
      <div className="detail-meta">
        <span>{(language === "tr" ? placeTypeLabelsTr : placeTypeLabels)[place.placeType ?? ""] ?? (language === "tr" ? "Mekân" : "Place")}</span>
        <span>
          <MapPin size={16} />
          {[place.address, localizeCityName(place.city, language), localizeCountryName(place.country, language)]
            .filter(Boolean)
            .join(", ") || (language === "tr" ? "Konum belirtilmedi" : "Location not specified")}
        </span>
        <span>
          <Users size={16} />
          <Link to={`/places/${place.slug}/users`}>{place.memberCount ?? place.followerCount} {language === "tr" ? "üye" : (place.memberCount ?? place.followerCount) === 1 ? "member" : "members"}{place.inviteCount ? ` · ${place.inviteCount} ${language === "tr" ? "davetli" : "invited"}` : ""}{place.followingMemberCount ? ` · ${place.followingMemberCount} ${language === "tr" ? "takip ettiğiniz" : "you follow"}` : ""}</Link>
        </span>
        <DistanceLabel latitude={place.latitude} longitude={place.longitude} />
      </div>
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
            <Link to={`/places/${place.slug}/users`}><Users size={17}/> {language === "tr" ? "İlgili kullanıcılar" : "Related people"}</Link>
            <Link to={user ? `/stats/place/${place.id}` : `/login?next=${encodeURIComponent(`/stats/place/${place.id}`)}`}><BarChart3 size={17}/> {language === "tr" ? "Mekân istatistikleri" : "Place analytics"}</Link>
            {canManage ? <><a href="#place-edit">{language === "tr" ? "Mekânı düzenle" : "Edit place"}</a><Link to={`/places/${place.slug}/invites#check-in`}><UserPlus size={17}/> {language === "tr" ? "Check-in kontrolü" : "Check-in control"}</Link></> : null}
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
      <section className="admin-form event-attendee-preview"><h2>{language === "tr" ? "Takipçiler" : "Followers"}</h2><span className="attendee-avatar-stack">{(relatedUsersQuery.data ?? []).filter((member) => member.status === "accepted").slice(0, 8).map((member) => <Link key={member.id} title={member.name} to={member.username ? `/users/${member.username}` : `/users/id/${member.id}`}>{member.avatarUrl ? <img alt="" src={resolveMediaUrl(member.avatarUrl)}/> : member.name[0]}</Link>)}</span><Link to={`/places/${place.slug}/users`}><strong>{place.memberCount ?? (relatedUsersQuery.data ?? []).filter((member) => member.status === "accepted").length} {language === "tr" ? "üye" : "members"} · {invitedPreviewCount} {language === "tr" ? "davetli" : "invited"}{canManage ? ` · ${(relatedUsersQuery.data ?? []).filter((member) => member.status === "pending").length} ${language === "tr" ? "bekleyen" : "pending"}` : ""} · {place.followingMemberCount ?? 0} {language === "tr" ? "takip ettiğiniz" : "you follow"}</strong></Link></section>
      <p className="detail-copy">
        <RichText
          text={place.description || (language === "tr" ? "Bu mekân için henüz açıklama eklenmemiş." : "No description has been added for this place yet.")}
        />
      </p>
      {user ? <ContentRating targetId={place.id} targetType="place"/> : null}
      {place.latitude != null && place.longitude != null ? (
        <LocationMap items={[{ id: place.id, title: place.name, latitude: place.latitude, longitude: place.longitude, location: [place.address, localizeCityName(place.city, language), localizeCountryName(place.country, language)].filter(Boolean).join(", ") }]} />
      ) : null}
      {place.tags?.length ? (
        <section className="detail-section">
          <h2>{language === "tr" ? "Etiketler" : "Tags"}</h2>
          <div className="tag-row">{place.tags.slice(0, showAllTags ? undefined : 6).map((tag) => <Link key={tag.id} to={`/tags/${tag.slug}`}>#{tag.name}</Link>)}</div>
          {place.tags.length > 6 ? <button className="text-action" onClick={() => setShowAllTags((shown) => !shown)} type="button">{showAllTags ? language === "tr" ? "Daha az" : "Show less" : language === "tr" ? `Tümünü göster (${place.tags.length})` : `Show all (${place.tags.length})`}</button> : null}
        </section>
      ) : null}
      {place.managers?.length ? <section className="detail-section"><h2>{language === "tr" ? "Mekân yöneticileri" : "Place managers"}</h2><div className="manager-avatar-list">{place.managers.map((manager) => <Link key={manager.id} title={`${manager.name} · ${manager.role}`} to={manager.username ? `/users/${manager.username}` : `/users/id/${manager.id}`}>{manager.avatarUrl ? <img alt={manager.name} src={resolveMediaUrl(manager.avatarUrl)}/> : <span>{manager.name.slice(0, 1).toUpperCase()}</span>}</Link>)}</div></section> : null}
      <section className="detail-section"><div className="section-header"><h2>{language === "tr" ? "Mekândaki etkinlikler" : "Events at this place"}</h2>{placeEvents.length ? <Link to={`/events?city=${encodeURIComponent(place.city ?? "")}`}>{language === "tr" ? "Tümünü gör" : "See all"}</Link> : null}</div><nav className="feed-tabs"><button className={placeEventTab === "future" ? "active" : ""} onClick={() => setPlaceEventTab("future")} type="button">{language === "tr" ? "Gelecek etkinlikler" : "Upcoming events"}</button><button className={placeEventTab === "past" ? "active" : ""} onClick={() => setPlaceEventTab("past")} type="button">{language === "tr" ? "Geçmiş etkinlikler" : "Past events"}</button></nav>{visiblePlaceEvents.length ? <div className="event-grid recommendation-carousel">{visiblePlaceEvents.map((event) => <EventCard event={event} key={event.id}/>)}</div> : <p className="empty-state">{placeEventTab === "future" ? language === "tr" ? "Bu mekânda planlanmış gelecek etkinlik bulunmuyor." : "There are no upcoming events scheduled at this place." : language === "tr" ? "Bu mekânda geçmiş etkinlik bulunmuyor." : "There are no past events at this place."}</p>}</section>
      {canManage ? (
        <form
          id="place-edit"
          className="admin-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            updateMutation.mutate({
              name: String(form.get("name")),
              description: String(form.get("description") || ""),
              city: String(form.get("city") || ""),
              country: String(form.get("country") || ""),
              address: String(form.get("address") || ""),
              coverImageUrl: String(form.get("coverImageUrl") || ""),
              visibility: String(form.get("visibility") || "open"),
              placeType: String(form.get("placeType") || "community"),
            });
          }}
        >
          <h2>{language === "tr" ? "Mekân bilgilerini düzenle" : "Edit place details"}</h2>
          <div className="form-grid">
            <label>
              {language === "tr" ? "Ad" : "Name"}
              <input
                defaultValue={place.name}
                name="name"
                required
                minLength={2}
              />
            </label>
            <CountryCityFields defaultCity={place.city} defaultCountry={place.country}/>
            <label>
              {language === "tr" ? "Mekân türü" : "Place type"}
              <select defaultValue={place.placeType ?? "community"} name="placeType">{placeTypeKeys.map((value) => <option key={value} value={value}>{(language === "tr" ? placeTypeLabelsTr : placeTypeLabels)[value]}</option>)}</select>
            </label>
            <label>
              {language === "tr" ? "Katılım tipi" : "Access type"}
              <select defaultValue={place.visibility} name="visibility"><option value="open">{language === "tr" ? "Herkese açık" : "Open to everyone"}</option><option value="approval_required">{language === "tr" ? "Onay gerekli" : "Approval required"}</option><option value="invite_only">{language === "tr" ? "Sadece davetli" : "Invite only"}</option></select>
            </label>
            <label>
              {language === "tr" ? "Adres" : "Address"}
              <input defaultValue={place.address ?? ""} name="address" />
            </label>
            <label>
              {language === "tr" ? "Kapak görseli URL" : "Cover image URL"}
              <input
                defaultValue={place.coverImageUrl ?? ""}
                name="coverImageUrl"
                type="url"
              />
            </label>
            <label>
              {language === "tr" ? "Açıklama" : "Description"}
              <textarea
                defaultValue={place.description ?? ""}
                name="description"
                rows={4}
              />
            </label>
          </div>
          <div className="row-actions">
            <button
              className="primary-action"
              disabled={updateMutation.isPending}
              type="submit"
            >
              {language === "tr" ? "Kaydet" : "Save"}
            </button>
            {place.createdById === user?.id ? (
              <button
                className="danger-action"
                disabled={archiveMutation.isPending}
                onClick={() => {
                  if (window.confirm(language === "tr" ? "Bu mekânı silmek istediğinize emin misiniz? Mekân listelerden kaldırılacaktır." : "Are you sure you want to archive this place? It will be removed from listings.")) archiveMutation.mutate();
                }}
                type="button"
              >
                {language === "tr" ? "Mekânı arşivle" : "Archive place"}
              </button>
            ) : null}
          </div>
          {updateMutation.isSuccess ? (
            <p className="form-success">{language === "tr" ? "Mekân bilgileri güncellendi." : "Place details updated."}</p>
          ) : null}
        </form>
      ) : null}
      {canManage ? (
        <section className="admin-form">
          <div className="section-header compact">
            <h2>{language === "tr" ? "Üye ve yöneticiler" : "Members and managers"}</h2>
            <span>{membersQuery.data?.length ?? 0} {language === "tr" ? "kişi" : "people"}</span>
          </div>
          <Link className="secondary-action" to={`/places/${place.slug}/invites`}><UserPlus size={16}/> {language === "tr" ? "Davet yöntemini seç" : "Choose invitation method"}</Link>
          <div className="guest-list">
            {membersQuery.data?.map((member) => (
              <div className="guest-list-row" key={member.userId}>
                <div>
                  <strong>{member.user?.name ?? member.userId}</strong>
                  <span>{member.user?.email}</span>
                </div>
                <span className={`status-pill status-${member.status}`}>
                  {language === "tr" ? ({ accepted: "kabul edildi", invited: "davetli", pending: "bekliyor", banned: "yasaklı", declined: "reddedildi" } as Record<string, string>)[member.status] ?? member.status : member.status}
                </span>
                <span>{language === "tr" ? ({ member: "üye", manager: "yönetici", organizer: "organizatör" } as Record<string, string>)[member.role] ?? member.role : member.role}</span>
                <div className="row-actions">
                  {member.status === "invited" ? (
                    <button
                      className="secondary-action"
                      onClick={() =>
                        memberMutation.mutate({
                          userId: member.userId,
                          status: "accepted",
                        })
                      }
                    >
                      <Check size={16} /> {language === "tr" ? "Kabul" : "Accept"}
                    </button>
                  ) : null}
                  {member.role === "member" && member.status === "accepted" ? (
                    <button
                      className="secondary-action"
                      onClick={() =>
                        memberMutation.mutate({
                          userId: member.userId,
                          role: "manager",
                        })
                      }
                    >
                      {language === "tr" ? "Yönetici yap" : "Make manager"}
                    </button>
                  ) : null}
                  {member.role !== "organizer" ? (
                    <button
                      className="danger-action"
                      onClick={() =>
                        memberMutation.mutate({
                          userId: member.userId,
                          status: "banned",
                        })
                      }
                    >
                      <X size={16} /> {language === "tr" ? "Çıkar" : "Remove"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <ReportDialog onClose={() => setReportOpen(false)} open={reportOpen} targetId={place.id} targetType="place"/>
      <ContentComments
        canManage={canManage}
        targetId={place.id}
        targetType="place"
        title={language === "tr" ? "Mekân yorumları" : "Place posts and comments"}
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
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        targetId={place.id}
        targetType="place"
        title={place.name}
        url={window.location.href}
      />
    </article>
  );
}
