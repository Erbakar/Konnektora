import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Check, MapPin, UserPlus, Users, X } from "lucide-react";
import { type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RichText } from "../components/RichText";
import {
  archiveMyPlace, createBlock, followPlace, getPlace, getUserSession, invitePlaceMember, listPlaceMembers,
  respondPlaceInvite, unfollowPlace, updateMyPlace, updatePlaceMember
} from "../lib/api";

export function PlaceDetailPage() {
  const { slug = "" } = useParams();
  const user = getUserSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const placeQuery = useQuery({ queryKey: ["place", slug], queryFn: () => getPlace(slug), enabled: Boolean(slug) });
  const place = placeQuery.data;
  const canManage = place?.viewerMembership?.status === "accepted" && ["manager", "organizer"].includes(place.viewerMembership.role);
  const membersQuery = useQuery({
    queryKey: ["place-members", place?.id], queryFn: () => listPlaceMembers(place!.id), enabled: Boolean(place && canManage)
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["place", slug] });
    void queryClient.invalidateQueries({ queryKey: ["places"] });
  };
  const followMutation = useMutation({ mutationFn: () => place!.isFollowing ? unfollowPlace(place!.id) : followPlace(place!.id), onSuccess: refresh });
  const respondMutation = useMutation({ mutationFn: (status: "accepted" | "declined") => respondPlaceInvite(place!.id, status), onSuccess: refresh });
  const inviteMutation = useMutation({
    mutationFn: (input: { email: string; role: string }) => invitePlaceMember(place!.id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["place-members", place?.id] })
  });
  const memberMutation = useMutation({
    mutationFn: ({ userId, ...changes }: { userId: string; status?: string; role?: string }) => updatePlaceMember(place!.id, userId, changes),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["place-members", place?.id] })
  });
  const updateMutation = useMutation({ mutationFn: (input: Parameters<typeof updateMyPlace>[1]) => updateMyPlace(place!.id, input), onSuccess: refresh });
  const archiveMutation = useMutation({ mutationFn: () => archiveMyPlace(place!.id), onSuccess: () => navigate("/places") });
  const blockMutation = useMutation({
    mutationFn: () => createBlock("place", place!.id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["places"] }); navigate("/places"); }
  });

  if (placeQuery.isLoading) return <section className="page">Mekân yükleniyor…</section>;
  if (!place) return <section className="page">Mekân bulunamadı.</section>;

  return (
    <article className="page detail-page">
      {place.coverImageUrl ? <div className="detail-media"><img alt="" src={place.coverImageUrl} /></div> : null}
      <p className="eyebrow">Konnektora Mekân</p>
      <h1>{place.name}</h1>
      <div className="detail-meta"><span><MapPin size={16} />{[place.address, place.city, place.country].filter(Boolean).join(", ") || "Konum belirtilmedi"}</span><span><Users size={16} />{place.followerCount} takipçi</span></div>
      <div className="detail-actions">
        {user ? <button className="primary-action" disabled={followMutation.isPending} onClick={() => followMutation.mutate()} type="button">{place.isFollowing ? "Takibi bırak" : "Takip et"}</button> : <Link className="primary-action" to="/account">Takip etmek için giriş yap</Link>}
        {user ? <button className="ghost-action" disabled={blockMutation.isPending} onClick={() => blockMutation.mutate()} type="button"><Ban size={18} /> Engelle</button> : null}
      </div>
      {place.viewerMembership?.status === "invited" ? <section className="admin-form compact-form"><strong>Mekân daveti</strong><div className="row-actions"><button className="primary-action" onClick={() => respondMutation.mutate("accepted")}><Check size={16} /> Kabul et</button><button className="danger-action" onClick={() => respondMutation.mutate("declined")}><X size={16} /> Reddet</button></div></section> : null}
      <p className="detail-copy"><RichText text={place.description || "Bu mekân için henüz açıklama eklenmemiş."}/></p>
      {canManage ? <form className="admin-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); const form = new FormData(event.currentTarget);
        updateMutation.mutate({
          name: String(form.get("name")), description: String(form.get("description") || ""),
          city: String(form.get("city") || ""), country: String(form.get("country") || ""),
          address: String(form.get("address") || ""), coverImageUrl: String(form.get("coverImageUrl") || "")
        });
      }}>
        <h2>Mekân bilgilerini düzenle</h2>
        <div className="form-grid">
          <label>Ad<input defaultValue={place.name} name="name" required minLength={2} /></label>
          <label>Şehir<input defaultValue={place.city ?? ""} name="city" /></label>
          <label>Ülke<input defaultValue={place.country ?? ""} name="country" /></label>
          <label>Adres<input defaultValue={place.address ?? ""} name="address" /></label>
          <label>Kapak görseli URL<input defaultValue={place.coverImageUrl ?? ""} name="coverImageUrl" type="url" /></label>
          <label>Açıklama<textarea defaultValue={place.description ?? ""} name="description" rows={4} /></label>
        </div>
        <div className="row-actions"><button className="primary-action" disabled={updateMutation.isPending} type="submit">Kaydet</button>
          {place.createdById === user?.id ? <button className="danger-action" disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate()} type="button">Mekânı arşivle</button> : null}
        </div>
        {updateMutation.isSuccess ? <p className="form-success">Mekân bilgileri güncellendi.</p> : null}
      </form> : null}
      {canManage ? <section className="admin-form">
        <div className="section-header compact"><h2>Üye ve yöneticiler</h2><span>{membersQuery.data?.length ?? 0} kişi</span></div>
        <form className="guest-invite-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault(); const form = new FormData(event.currentTarget);
          inviteMutation.mutate({ email: String(form.get("email")), role: String(form.get("role")) }); event.currentTarget.reset();
        }}>
          <label>E-posta<input name="email" required type="email" /></label>
          <label>Rol<select name="role"><option value="member">Üye</option><option value="manager">Yönetici</option></select></label>
          <button className="secondary-action" disabled={inviteMutation.isPending}><UserPlus size={16} /> Davet et</button>
        </form>
        {inviteMutation.isError ? <p className="form-error">Davet gönderilemedi.</p> : null}
        <div className="guest-list">{membersQuery.data?.map((member) => <div className="guest-list-row" key={member.userId}>
          <div><strong>{member.user?.name ?? member.userId}</strong><span>{member.user?.email}</span></div>
          <span className={`status-pill status-${member.status}`}>{member.status}</span><span>{member.role}</span>
          <div className="row-actions">
            {member.status === "invited" ? <button className="secondary-action" onClick={() => memberMutation.mutate({ userId: member.userId, status: "accepted" })}><Check size={16} /> Kabul</button> : null}
            {member.role === "member" && member.status === "accepted" ? <button className="secondary-action" onClick={() => memberMutation.mutate({ userId: member.userId, role: "manager" })}>Yönetici yap</button> : null}
            {member.role !== "organizer" ? <button className="danger-action" onClick={() => memberMutation.mutate({ userId: member.userId, status: "banned" })}><X size={16} /> Çıkar</button> : null}
          </div>
        </div>)}</div>
      </section> : null}
    </article>
  );
}
