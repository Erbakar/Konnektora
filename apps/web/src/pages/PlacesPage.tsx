import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, LoaderCircle, MapPin, Plus, RefreshCw, Users } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createPlace, getUserSession, listPlaces, type PlaceInput } from "../lib/api";
import { RichText } from "../components/RichText";

export function PlacesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const user = getUserSession();
  const queryClient = useQueryClient();
  const selectedPage = Number(searchParams.get("page") ?? "1");
  const placesQuery = useQuery({ queryKey: ["places", searchParams.toString()], queryFn: () => listPlaces(searchParams) });
  const createMutation = useMutation({
    mutationFn: createPlace,
    onSuccess: () => {
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["places"] });
    }
  });

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  }

  function submitPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: PlaceInput = {
      name: String(form.get("name")),
      description: String(form.get("description") || "") || undefined,
      country: String(form.get("country") || "") || undefined,
      city: String(form.get("city") || "") || undefined,
      address: String(form.get("address") || "") || undefined,
      coverImageUrl: String(form.get("coverImageUrl") || "") || undefined
    };
    createMutation.mutate(input);
  }

  const placeList = placesQuery.data;
  return (
    <section className="page two-column places-page">
      <aside className="filters places-filters">
        <h2>Mekân filtreleri</h2>
        <label>Arama<input value={searchParams.get("q") ?? ""} onChange={(event) => updateFilter("q", event.target.value)} placeholder="Hub, kafe, stüdyo..." /></label>
        <label>Şehir<input value={searchParams.get("city") ?? ""} onChange={(event) => updateFilter("city", event.target.value)} placeholder="İstanbul" /></label>
        <label>Ülke<input value={searchParams.get("country") ?? ""} onChange={(event) => updateFilter("country", event.target.value)} placeholder="Türkiye" /></label>
        {user ? <button className="primary-action" onClick={() => setCreateOpen((open) => !open)} type="button"><Plus size={18} /> Mekân oluştur</button> : null}
      </aside>
      <div className="places-content">
        <div className="section-header"><h1>Mekânlar</h1><span>{placesQuery.isLoading ? "Yükleniyor" : `${placeList?.total ?? 0} sonuç`}</span></div>
        {createOpen ? (
          <form className="admin-form" onSubmit={submitPlace}>
            <h2>Yeni mekân</h2>
            <div className="form-grid">
              <label>Ad<input name="name" required minLength={2} maxLength={160} /></label>
              <label>Şehir<input name="city" maxLength={120} /></label>
              <label>Ülke<input name="country" maxLength={120} /></label>
              <label>Adres<input name="address" maxLength={240} /></label>
              <label>Kapak görseli URL<input name="coverImageUrl" type="url" /></label>
              <label>Açıklama<textarea name="description" rows={4} maxLength={2000} /></label>
            </div>
            <button className="primary-action" disabled={createMutation.isPending} type="submit">{createMutation.isPending ? "Oluşturuluyor" : "Mekânı oluştur"}</button>
            {createMutation.isError ? <p className="form-error">Mekân oluşturulamadı. Alanları kontrol et.</p> : null}
          </form>
        ) : null}
        {placesQuery.isLoading ? <div className="empty-state"><LoaderCircle className="spin" size={34}/><p>Mekânlar yükleniyor…</p></div> : null}
        {placesQuery.isError ? <div className="empty-state"><Building2 size={40}/><h2>Mekânlar yüklenemedi</h2><p>Bağlantını kontrol edip yeniden deneyebilirsin.</p><button className="secondary-action" onClick={() => void placesQuery.refetch()}><RefreshCw size={17}/>Yeniden dene</button></div> : null}
        <div className="event-grid place-grid">
          {placeList?.items.map((place) => (
            <article className="event-card place-card" key={place.id}>
              {place.coverImageUrl ? <Link className="event-card-media" to={`/places/${place.slug}`}><img alt="" src={place.coverImageUrl} /></Link> : null}
              <div><span className="eyebrow">Mekân</span><h2><Link to={`/places/${place.slug}`}>{place.name}</Link></h2></div>
              <p><RichText text={place.description || "Konnektora topluluk mekânı"} /></p>
              <div className="event-card-meta"><span><MapPin size={15} />{[place.city, place.country].filter(Boolean).join(", ") || "Konum belirtilmedi"}</span><span><Users size={15} />{place.followerCount} takipçi</span></div>
            </article>
          ))}
        </div>
        {!placesQuery.isLoading && !placesQuery.isError && !placeList?.items.length ? <div className="empty-state"><Building2 size={40}/><h2>{searchParams.size ? "Bu filtrelerle mekân bulunamadı" : "Henüz mekân eklenmedi"}</h2><p>{searchParams.size ? "Filtreleri değiştirerek yeniden deneyebilirsin." : "Topluluk mekânları oluşturulduğunda burada listelenecek."}</p>{user && !searchParams.size ? <button className="primary-action" onClick={() => setCreateOpen(true)}><Plus size={18}/>İlk mekânı oluştur</button> : null}</div> : null}
        {placeList ? <div className="pagination-row">
          <button className="secondary-action" disabled={selectedPage <= 1} onClick={() => updateFilter("page", String(selectedPage - 1))}>Önceki</button>
          <span>Sayfa {placeList.page}</span>
          <button className="secondary-action" disabled={!placeList.hasNextPage} onClick={() => updateFilter("page", String(selectedPage + 1))}>Sonraki</button>
        </div> : null}
      </div>
    </section>
  );
}
