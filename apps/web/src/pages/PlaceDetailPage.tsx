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
import { type FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RichText } from "../components/RichText";
import { ContentComments } from "../components/ContentComments";
import { ContentMediaGallery } from "../components/ContentMediaGallery";
import { DistanceLabel } from "../components/DistanceLabel";
import { LocationMap } from "../components/LocationMap";
import { EventCard } from "../components/EventCard";
import { NotificationDialog, ShareDialog } from "../components/ContentDialogs";
import { ReportDialog } from "../components/ReportDialog";
import { CountryCityFields } from "../components/CountryCityFields";
import { PlaceCard, placeTypeLabels } from "../components/PlaceCard";
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
  setContentNotification,
  unfollowPlace,
  updateMyPlace,
  updatePlaceMember,
  resolveMediaUrl,
} from "../lib/api";
import { NotFoundPage } from "./NotFoundPage";

export function PlaceDetailPage() {
  const { slug = "" } = useParams();
  const user = getUserSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [placeEventTab, setPlaceEventTab] = useState<"future" | "past">("future");
  const [reportOpen, setReportOpen] = useState(false);
  const placeQuery = useQuery({
    queryKey: ["place", slug],
    queryFn: () => getPlace(slug),
    enabled: Boolean(slug),
    retry: false,
  });
  const place = placeQuery.data;
  const canViewStats = Boolean(
    place &&
      (place.viewerMembership?.status === "accepted" &&
        ["manager", "organizer"].includes(place.viewerMembership.role) ||
        ["admin", "super_admin", "curator"].includes(user?.role ?? "")),
  );
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

  if (placeQuery.isLoading)
    return <section className="page">Mekân yükleniyor…</section>;
  if (!place) return <NotFoundPage kind="place" />;

  return (
    <article className="page detail-page">
      {place.coverImageUrl ? (
        <div className="detail-media">
          <img alt="" src={resolveMediaUrl(place.coverImageUrl)} />
        </div>
      ) : null}
      <ContentMediaGallery targetId={place.id} targetType="place" />
      <p className="eyebrow">MEKÂN – {place.visibility === "invite_only" ? "SADECE DAVETLİ" : place.visibility === "approval_required" ? "ONAY GEREKLİ" : "HERKESE AÇIK"}</p>
      <h1>{place.name}</h1>
      <div className="detail-meta">
        <span>{placeTypeLabels[place.placeType ?? ""] ?? "Mekân"}</span>
        <span>
          <MapPin size={16} />
          {[place.address, place.city, place.country]
            .filter(Boolean)
            .join(", ") || "Konum belirtilmedi"}
        </span>
        <span>
          <Users size={16} />
          <Link to={`/places/${place.slug}/users`}>{place.followerCount} members / {place.followingMemberCount ?? 0} following</Link>
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
            {place.isFollowing ? "Takibi bırak" : "Takip et"}
          </button>
        ) : (
          <Link className="primary-action" to="/login">
            Takip etmek için giriş yap
          </Link>
        )}
        {user ? <button className="secondary-action" onClick={() => {
          if (!canManage && place.viewerMembership?.status !== "accepted") return window.alert("Sadece üyeler ve davetliler davet edebilir.");
          navigate(`/places/${place.slug}/invites`);
        }} type="button"><UserPlus size={18}/>Davet et</button> : null}
        <button className="secondary-action" onClick={() => setShareOpen(true)}><Share2 size={18}/>Paylaş</button>
        <details className="action-menu place-actions-menu">
          <summary aria-label="Mekân aksiyonları"><MoreVertical size={20}/></summary>
          <div>
            {user ? <button onClick={() => setNotificationOpen(true)} type="button"><Bell size={17}/> Bildirim ayarla</button> : null}
            <Link to={`/places/${place.slug}/users`}><Users size={17}/> İlgili kullanıcılar</Link>
            {canViewStats ? <Link to={`/stats/place/${place.id}`}><BarChart3 size={17}/> Mekân istatistikleri</Link> : null}
            {canManage ? <><a href="#place-edit">Mekânı düzenle</a><Link to={`/places/${place.slug}/invites#check-in`}><UserPlus size={17}/> Check-in control</Link></> : null}
            {user && !canManage ? <button onClick={() => setReportOpen(true)} type="button"><Flag size={17}/> Mekânı rapor et</button> : null}
            {user && !canManage ? <button disabled={blockMutation.isPending} onClick={() => blockMutation.mutate()} type="button"><Ban size={17}/> Mekânı engelle</button> : null}
          </div>
        </details>
      </div>
      {place.viewerMembership?.status === "invited" ? (
        <section className="admin-form compact-form">
          <strong>Mekân daveti</strong>
          <div className="row-actions">
            <button
              className="primary-action"
              onClick={() => respondMutation.mutate("accepted")}
            >
              <Check size={16} /> Kabul et
            </button>
            <button
              className="danger-action"
              onClick={() => respondMutation.mutate("declined")}
            >
              <X size={16} /> Reddet
            </button>
          </div>
        </section>
      ) : null}
      <section className="admin-form event-attendee-preview"><h2>Takipçiler</h2><span className="attendee-avatar-stack">{(relatedUsersQuery.data ?? []).filter((member) => member.status === "accepted").slice(0, 8).map((member) => <Link key={member.id} title={member.name} to={member.username ? `/users/${member.username}` : `/users/id/${member.id}`}>{member.avatarUrl ? <img alt="" src={resolveMediaUrl(member.avatarUrl)}/> : member.name[0]}</Link>)}</span><Link to={`/places/${place.slug}/users`}><strong>{(relatedUsersQuery.data ?? []).filter((member) => member.status === "accepted").length} members · {(relatedUsersQuery.data ?? []).filter((member) => member.status === "invited").length} invited · {canManage ? `${(relatedUsersQuery.data ?? []).filter((member) => member.status === "pending").length} pending · ` : ""}{place.followingMemberCount ?? 0} following</strong></Link></section>
      <p className="detail-copy">
        <RichText
          text={place.description || "Bu mekân için henüz açıklama eklenmemiş."}
        />
      </p>
      {place.latitude != null && place.longitude != null ? (
        <LocationMap items={[{ id: place.id, title: place.name, latitude: place.latitude, longitude: place.longitude, location: [place.address, place.city, place.country].filter(Boolean).join(", ") }]} />
      ) : null}
      {place.tags?.length ? (
        <section className="detail-section">
          <h2>Etiketler</h2>
          <div className="tag-row">{place.tags.slice(0, showAllTags ? undefined : 6).map((tag) => <Link key={tag.id} to={`/tags/${tag.slug}`}>#{tag.name}</Link>)}</div>
          {place.tags.length > 6 ? <button className="text-action" onClick={() => setShowAllTags((shown) => !shown)} type="button">{showAllTags ? "Daha az" : `Tümünü göster (${place.tags.length})`}</button> : null}
        </section>
      ) : null}
      {place.managers?.length ? <section className="detail-section"><h2>Mekân yöneticileri</h2><div className="manager-avatar-list">{place.managers.map((manager) => <Link key={manager.id} title={`${manager.name} · ${manager.role}`} to={manager.username ? `/users/${manager.username}` : `/users/id/${manager.id}`}>{manager.avatarUrl ? <img alt={manager.name} src={resolveMediaUrl(manager.avatarUrl)}/> : <span>{manager.name.slice(0, 1).toUpperCase()}</span>}</Link>)}</div></section> : null}
      {place.events?.length ? <section className="detail-section"><div className="section-header"><h2>Mekândaki etkinlikler</h2><Link to={`/events?city=${encodeURIComponent(place.city ?? "")}`}>Tümünü gör</Link></div><nav className="feed-tabs"><button className={placeEventTab === "future" ? "active" : ""} onClick={() => setPlaceEventTab("future")} type="button">All future</button><button className={placeEventTab === "past" ? "active" : ""} onClick={() => setPlaceEventTab("past")} type="button">All past</button></nav><div className="event-grid recommendation-carousel">{place.events.filter((event) => placeEventTab === "future" ? new Date(event.startsAt) >= new Date() : new Date(event.startsAt) < new Date()).slice(0, 8).map((event) => <EventCard event={event} key={event.id}/>)}</div></section> : null}
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
          <h2>Mekân bilgilerini düzenle</h2>
          <div className="form-grid">
            <label>
              Ad
              <input
                defaultValue={place.name}
                name="name"
                required
                minLength={2}
              />
            </label>
            <CountryCityFields defaultCity={place.city} defaultCountry={place.country}/>
            <label>
              Mekân türü
              <select defaultValue={place.placeType} name="placeType"><option value="community">🏘️ Topluluk alanı</option><option value="coworking">💻 Ortak çalışma</option><option value="venue">🎭 Etkinlik mekânı</option><option value="cafe">☕ Kafe</option><option value="restaurant">🍽️ Restoran</option><option value="bar">🍸 Bar</option><option value="club">🎶 Kulüp</option><option value="gallery">🖼️ Galeri</option><option value="outdoor">🌳 Açık alan</option></select>
            </label>
            <label>
              Katılım tipi
              <select defaultValue={place.visibility} name="visibility"><option value="open">Herkese açık</option><option value="approval_required">Onay gerekli</option><option value="invite_only">Sadece davetli</option></select>
            </label>
            <label>
              Adres
              <input defaultValue={place.address ?? ""} name="address" />
            </label>
            <label>
              Kapak görseli URL
              <input
                defaultValue={place.coverImageUrl ?? ""}
                name="coverImageUrl"
                type="url"
              />
            </label>
            <label>
              Açıklama
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
              Kaydet
            </button>
            {place.createdById === user?.id ? (
              <button
                className="danger-action"
                disabled={archiveMutation.isPending}
                onClick={() => {
                  if (window.confirm("Bu mekânı silmek istediğinize emin misiniz? Mekân listelerden kaldırılacaktır.")) archiveMutation.mutate();
                }}
                type="button"
              >
                Mekânı arşivle
              </button>
            ) : null}
          </div>
          {updateMutation.isSuccess ? (
            <p className="form-success">Mekân bilgileri güncellendi.</p>
          ) : null}
        </form>
      ) : null}
      {canManage ? (
        <section className="admin-form">
          <div className="section-header compact">
            <h2>Üye ve yöneticiler</h2>
            <span>{membersQuery.data?.length ?? 0} kişi</span>
          </div>
          <Link className="secondary-action" to={`/places/${place.slug}/invites`}><UserPlus size={16}/> Davet yöntemini seç</Link>
          <div className="guest-list">
            {membersQuery.data?.map((member) => (
              <div className="guest-list-row" key={member.userId}>
                <div>
                  <strong>{member.user?.name ?? member.userId}</strong>
                  <span>{member.user?.email}</span>
                </div>
                <span className={`status-pill status-${member.status}`}>
                  {member.status}
                </span>
                <span>{member.role}</span>
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
                      <Check size={16} /> Kabul
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
                      Yönetici yap
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
                      <X size={16} /> Çıkar
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
        title="Mekân yorumları"
      />
      {(relatedPlacesQuery.data?.items ?? []).filter((item) => item.id !== place.id).length ? (
        <section className="detail-section">
          <div className="section-header"><h2>İlginizi çekebilecek diğer mekânlar</h2><Link to="/places">Tümünü gör</Link></div>
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
        title={place.name}
        url={window.location.href}
      />
    </article>
  );
}
