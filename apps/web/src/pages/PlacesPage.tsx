import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ListFilter, LoaderCircle, MapPin, MapPinned, Plus, RefreshCw, Users } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createPlace, getUserSession, invitePlaceMember, listPlaces, listTags, uploadContentMedia, type PlaceInput } from "../lib/api";
import { RichText } from "../components/RichText";
import { DistanceLabel } from "../components/DistanceLabel";
import { LocationMap } from "../components/LocationMap";

export function PlacesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const user = getUserSession();
  const queryClient = useQueryClient();
  const selectedPage = Number(searchParams.get("page") ?? "1");
  const selectedScope = searchParams.get("scope") ?? "all";
  const placesQuery = useQuery({ queryKey: ["places", searchParams.toString()], queryFn: () => listPlaces(searchParams) });
  const tagsQuery = useQuery({ queryKey: ["tags"], queryFn: listTags });
  const createMutation = useMutation({
    mutationFn: async (input: PlaceInput & { mediaFiles?: File[]; managerUsernames?: string[] }) => { const { mediaFiles = [], managerUsernames = [], ...data } = input; const created = await createPlace(data); await Promise.allSettled([...mediaFiles.map((file) => uploadContentMedia("place", created.id, file)), ...managerUsernames.map((username) => invitePlaceMember(created.id, { username, role: "manager" }))]); return created; },
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
    const input: PlaceInput & { mediaFiles?: File[]; managerUsernames?: string[] } = {
      name: String(form.get("name")),
      description: String(form.get("description") || "") || undefined,
      placeType: String(form.get("placeType") || "community"),
      tagIds: form.getAll("tagIds").map(String),
      country: String(form.get("country") || "") || undefined,
      city: String(form.get("city") || "") || undefined,
      address: String(form.get("address") || "") || undefined,
      latitude: form.get("latitude") ? Number(form.get("latitude")) : undefined,
      longitude: form.get("longitude") ? Number(form.get("longitude")) : undefined,
      coverImageUrl: String(form.get("coverImageUrl") || "") || undefined,
      mediaFiles: form.getAll("placeMedia").filter((item): item is File => item instanceof File && item.size > 0).slice(0, 20),
      managerUsernames: String(form.get("managerUsernames") || "").split(",").map((item) => item.trim().replace(/^@/, "")).filter(Boolean)
    };
    createMutation.mutate(input);
  }

  const placeList = placesQuery.data;
  const hasFilters = [...searchParams.keys()].some((key) => key !== "page");
  return (
    <section className="page two-column places-page">
      <button className="mobile-filter-toggle secondary-action" aria-expanded={filtersOpen} aria-controls="place-filters" onClick={() => setFiltersOpen((open) => !open)} type="button"><ListFilter size={18}/> Filtrele &amp; Ara</button>
      <aside className={`filters places-filters ${filtersOpen ? "mobile-filters-open" : ""}`} id="place-filters">
        <h2>Mekân filtreleri</h2>
        <label>Arama<input value={searchParams.get("q") ?? ""} onChange={(event) => updateFilter("q", event.target.value)} placeholder="Hub, kafe, stüdyo..." /></label>
        <label>Şehir<input value={searchParams.get("city") ?? ""} onChange={(event) => updateFilter("city", event.target.value)} placeholder="İstanbul" /></label>
        <label>Ülke<input value={searchParams.get("country") ?? ""} onChange={(event) => updateFilter("country", event.target.value)} placeholder="Türkiye" /></label>
        {hasFilters ? <button className="clear-filters-link" onClick={() => setSearchParams({})} type="button">Filtreleri temizle</button> : null}
      </aside>
      <div className="places-content">
        <div className="section-header"><h1>Mekânlar</h1><div className="row-actions"><span>{placesQuery.isLoading ? "Yükleniyor" : `${placeList?.total ?? 0} sonuç`}</span><button className="create-inline-link" onClick={() => setMapOpen((open) => !open)}><MapPinned size={16}/>{mapOpen ? "Listeyi göster" : "Haritada göster"}</button>{user ? <button className="create-inline-link" onClick={() => setCreateOpen((open) => !open)} type="button"><Plus size={16}/> Mekân oluştur</button> : null}</div></div>
        <nav className="discovery-tabs" aria-label="Mekân grupları">
          {([["all", "Tümü"], ["popular", "Popüler"], ["following", "Takip ettiklerim"], ["mine", "Mekânlarım"]] as const).map(([scope, label]) => (
            <button key={scope} className={selectedScope === scope ? "active" : ""} disabled={!user && ["following", "mine"].includes(scope)} onClick={() => updateFilter("scope", scope === "all" ? "" : scope)} type="button">{label}</button>
          ))}
        </nav>
        {createOpen ? (
          <form className="admin-form" onSubmit={submitPlace}>
            <h2>Yeni mekân</h2>
            <div className="form-grid">
              <label>Ad<input name="name" required minLength={2} maxLength={160} /></label>
              <label>Şehir<input name="city" maxLength={120} /></label>
              <label>Mekân türü<select name="placeType"><option value="community">Topluluk alanı</option><option value="coworking">Ortak çalışma</option><option value="cafe">Kafe</option><option value="restaurant">Restoran</option><option value="venue">Etkinlik alanı</option><option value="studio">Stüdyo</option><option value="office">Ofis</option><option value="other">Diğer</option></select></label>
              <fieldset className="tag-checkboxes"><legend>Etiketler</legend>{tagsQuery.data?.map((tag) => <label key={tag.id}><input name="tagIds" type="checkbox" value={tag.id}/><span>#{tag.name}</span></label>)}</fieldset>
              <label>Ülke<input name="country" maxLength={120} /></label>
              <label>Adres<input name="address" maxLength={240} /></label>
              <label>Enlem<input name="latitude" min="-90" max="90" step="any" type="number" /></label>
              <label>Boylam<input name="longitude" min="-180" max="180" step="any" type="number" /></label>
              <label>Kapak görseli URL<input name="coverImageUrl" type="url" /></label>
              <label>Fotoğraf ve videolar<input accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple name="placeMedia" type="file" /></label>
              <label>Yönetici kullanıcı adları<input name="managerUsernames" placeholder="@ayse, @mehmet" /></label>
              <label>Açıklama<textarea name="description" rows={4} maxLength={2000} /></label>
            </div>
            <button className="primary-action" disabled={createMutation.isPending} type="submit">{createMutation.isPending ? "Oluşturuluyor" : "Mekânı oluştur"}</button>
            {createMutation.isError ? <p className="form-error">Mekân oluşturulamadı. Alanları kontrol et.</p> : null}
          </form>
        ) : null}
        {placesQuery.isLoading ? <div className="empty-state"><LoaderCircle className="spin" size={34}/><p>Mekânlar yükleniyor…</p></div> : null}
        {placesQuery.isError ? <div className="empty-state"><Building2 size={40}/><h2>Mekânlar yüklenemedi</h2><p>Bağlantını kontrol edip yeniden deneyebilirsin.</p><button className="secondary-action" onClick={() => void placesQuery.refetch()}><RefreshCw size={17}/>Yeniden dene</button></div> : null}
        {mapOpen ? <LocationMap items={(placeList?.items ?? []).map((place) => ({ id: place.id, title: place.name, latitude: place.latitude, longitude: place.longitude, location: [place.city, place.country].filter(Boolean).join(", ") || "Konum belirtilmedi" }))}/> : <div className="event-grid place-grid">
          {placeList?.items.map((place) => (
            <article className="event-card place-card" key={place.id}>
              {place.coverImageUrl ? <Link className="event-card-media" to={`/places/${place.slug}`}><img alt="" src={place.coverImageUrl} /></Link> : null}
              <div><span className="eyebrow">{({ community: "Topluluk alanı", coworking: "Ortak çalışma", cafe: "Kafe", restaurant: "Restoran", venue: "Etkinlik alanı", studio: "Stüdyo", office: "Ofis", other: "Diğer" } as Record<string, string>)[place.placeType ?? ""] ?? "Mekân"}</span><h2><Link to={`/places/${place.slug}`}>{place.name}</Link></h2></div>
              <p><RichText text={place.description || "Konnektora topluluk mekânı"} /></p>
              {place.tags?.length ? <div className="tag-row">{place.tags.map((tag) => <Link key={tag.id} to={`/tags/${tag.slug}`}>#{tag.name}</Link>)}</div> : null}
              <div className="event-card-meta"><span><MapPin size={15} />{[place.city, place.country].filter(Boolean).join(", ") || "Konum belirtilmedi"}</span><span><Users size={15} />{place.followerCount} takipçi</span></div>
              <div className="event-card-meta"><DistanceLabel latitude={place.latitude} longitude={place.longitude}/></div>
            </article>
          ))}
        </div>}
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
