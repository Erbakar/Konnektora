import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Bell,
  Check,
  MapPin,
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
import { NotificationDialog, ShareDialog } from "../components/ContentDialogs";
import {
  archiveMyPlace,
  createBlock,
  followPlace,
  getContentNotification,
  getInteractionStats,
  getPlace,
  getUserSession,
  invitePlaceMember,
  listPlaceMembers,
  respondPlaceInvite,
  setContentNotification,
  unfollowPlace,
  updateMyPlace,
  updatePlaceMember,
} from "../lib/api";

export function PlaceDetailPage() {
  const { slug = "" } = useParams();
  const user = getUserSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const placeQuery = useQuery({
    queryKey: ["place", slug],
    queryFn: () => getPlace(slug),
    enabled: Boolean(slug),
  });
  const place = placeQuery.data;
  const statsQuery = useQuery({
    queryKey: ["interaction-stats", "place", place?.id],
    queryFn: () => getInteractionStats("place", place!.id),
    enabled: Boolean(place),
  });
  const canManage =
    place?.viewerMembership?.status === "accepted" &&
    ["manager", "organizer"].includes(place.viewerMembership.role);
  const membersQuery = useQuery({
    queryKey: ["place-members", place?.id],
    queryFn: () => listPlaceMembers(place!.id),
    enabled: Boolean(place && canManage),
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
  const inviteMutation = useMutation({
    mutationFn: (input: { email: string; role: string }) =>
      invitePlaceMember(place!.id, input),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["place-members", place?.id],
      }),
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
  if (!place) return <section className="page">Mekân bulunamadı.</section>;

  return (
    <article className="page detail-page">
      {place.coverImageUrl ? (
        <div className="detail-media">
          <img alt="" src={place.coverImageUrl} />
        </div>
      ) : null}
      <ContentMediaGallery targetId={place.id} targetType="place" />
      <p className="eyebrow">Konnektora Mekân</p>
      <h1>{place.name}</h1>
      <div className="detail-meta">
        <span>
          <MapPin size={16} />
          {[place.address, place.city, place.country]
            .filter(Boolean)
            .join(", ") || "Konum belirtilmedi"}
        </span>
        <span>
          <Users size={16} />
          {place.followerCount} takipçi
        </span>
      </div>
      <div className="detail-actions">
        <button
          className="secondary-action"
          aria-pressed={notificationQuery.data?.enabled}
          disabled={!user || notificationMutation.isPending}
          onClick={() => setNotificationOpen(true)}
        >
          <Bell size={18} />
          {notificationQuery.data?.enabled
            ? "Bildirim açık"
            : "Bildirim kapalı"}
        </button>
        <button className="secondary-action" onClick={() => setShareOpen(true)}>
          <Share2 size={18} />
          Paylaş
        </button>
        <Link className="secondary-action" to={`/places/${place.slug}/users`}>
          <Users size={18} />
          İlgili kullanıcılar
        </Link>
        {canManage ? (
          <Link
            className="secondary-action"
            to={`/places/${place.slug}/invites`}
          >
            <UserPlus size={18} />
            Davet ve üyeler
          </Link>
        ) : null}
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
          <Link className="primary-action" to="/account">
            Takip etmek için giriş yap
          </Link>
        )}
        {user ? (
          <button
            className="ghost-action"
            disabled={blockMutation.isPending}
            onClick={() => blockMutation.mutate()}
            type="button"
          >
            <Ban size={18} /> Engelle
          </button>
        ) : null}
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
      <p className="detail-copy">
        <RichText
          text={place.description || "Bu mekân için henüz açıklama eklenmemiş."}
        />
      </p>
      {statsQuery.data ? (
        <section className="admin-form">
          <h2>Etkileşim istatistikleri</h2>
          <div className="compact-metrics">
            <article>
              <strong>{statsQuery.data.followers ?? 0}</strong>
              <span>Takipçi</span>
            </article>
            <article>
              <strong>{statsQuery.data.members ?? 0}</strong>
              <span>Üye</span>
            </article>
            <article>
              <strong>{statsQuery.data.comments ?? 0}</strong>
              <span>Yorum</span>
            </article>
            <article>
              <strong>{statsQuery.data.views ?? 0}</strong>
              <span>Görüntülenme</span>
            </article>
          </div>
        </section>
      ) : null}
      {canManage ? (
        <form
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
            <label>
              Şehir
              <input defaultValue={place.city ?? ""} name="city" />
            </label>
            <label>
              Ülke
              <input defaultValue={place.country ?? ""} name="country" />
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
                onClick={() => archiveMutation.mutate()}
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
          <form
            className="guest-invite-form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              inviteMutation.mutate({
                email: String(form.get("email")),
                role: String(form.get("role")),
              });
              event.currentTarget.reset();
            }}
          >
            <label>
              E-posta
              <input name="email" required type="email" />
            </label>
            <label>
              Rol
              <select name="role">
                <option value="member">Üye</option>
                <option value="manager">Yönetici</option>
              </select>
            </label>
            <button
              className="secondary-action"
              disabled={inviteMutation.isPending}
            >
              <UserPlus size={16} /> Davet et
            </button>
          </form>
          {inviteMutation.isError ? (
            <p className="form-error">Davet gönderilemedi.</p>
          ) : null}
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
      <ContentComments
        targetId={place.id}
        targetType="place"
        title="Mekân yorumları"
      />
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
