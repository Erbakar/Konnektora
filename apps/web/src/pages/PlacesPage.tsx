import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ListFilter, LoaderCircle, MapPin, MapPinned, Plus, RefreshCw, Users } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createPlace, getUserSession, invitePlaceMember, listMemberSuggestions, listPlaces, listTags, resolveMediaUrl, uploadContentMedia, type PlaceInput } from "../lib/api";
import { RichText } from "../components/RichText";
import { DistanceLabel } from "../components/DistanceLabel";
import { LocationMap } from "../components/LocationMap";
import { LocationPicker } from "../components/LocationPicker";
import { TagPicker } from "../components/TagPicker";
import { CountryCityFields } from "../components/CountryCityFields";

export function PlacesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const user = getUserSession();
  const queryClient = useQueryClient();
  const selectedPage = Number(searchParams.get("page") ?? "1");
  const selectedScope = searchParams.get("scope") ?? "all";
  useEffect(() => {
    if (selectedScope !== "near" || searchParams.has("latitude") || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(({ coords }) => { const next = new URLSearchParams(searchParams); next.set("latitude", String(coords.latitude)); next.set("longitude", String(coords.longitude)); next.delete("page"); setSearchParams(next, { replace: true }); });
  }, [searchParams, selectedScope, setSearchParams]);
  const placesQuery = useQuery({ queryKey: ["places", searchParams.toString()], queryFn: () => listPlaces(searchParams) });
  const tagsQuery = useQuery({ queryKey: ["tags"], queryFn: () => listTags() });
  const suggestionsQuery = useQuery({ queryKey: ["member-suggestions", user?.id], queryFn: listMemberSuggestions, enabled: Boolean(user && createOpen) });
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
    const tagIds = form.getAll("tagIds").map(String);
    if (tagIds.length > 10) return;
    const address = String(form.get("address") || "").trim();
    const coordinateMatch = address.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    const input: PlaceInput & { mediaFiles?: File[]; managerUsernames?: string[] } = {
      name: String(form.get("name")),
      description: String(form.get("description") || "") || undefined,
      placeType: String(form.get("placeType") || "events_venues"),
      visibility: String(form.get("visibility") || "open"),
      tagIds,
      country: String(form.get("country") || "") || undefined,
      city: String(form.get("city") || "") || undefined,
      address: address || undefined,
      latitude: form.get("latitude") ? Number(form.get("latitude")) : coordinateMatch ? Number(coordinateMatch[1]) : undefined,
      longitude: form.get("longitude") ? Number(form.get("longitude")) : coordinateMatch ? Number(coordinateMatch[2]) : undefined,
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
        {tagsQuery.data?.length ? <div className="place-trendy-tags"><strong>Trend etiketler</strong><div className="tag-cloud">{[...tagsQuery.data].filter((tag) => (tag.placeCount ?? 0) > 0).sort((a, b) => (b.placeCount ?? 0) - (a.placeCount ?? 0) || b.usageCount - a.usageCount).slice(0, 10).map((tag) => <button className={searchParams.get("tag") === tag.slug ? "active" : ""} key={tag.id} onClick={() => updateFilter("tag", searchParams.get("tag") === tag.slug ? "" : tag.slug)} type="button">#{tag.name} ({tag.placeCount})</button>)}</div></div> : null}
        {hasFilters ? <button className="clear-filters-link" onClick={() => setSearchParams({})} type="button">Filtreleri temizle</button> : null}
      </aside>
      <div className="places-content">
        <div className="section-header"><h1>Mekânlar</h1><div className="row-actions"><span>{placesQuery.isLoading ? "Yükleniyor" : `${placeList?.total ?? 0} sonuç`}</span><button className="create-inline-link" onClick={() => setMapOpen((open) => !open)}><MapPinned size={16}/>{mapOpen ? "Listeyi göster" : "Haritada göster"}</button>{user ? <button className="create-inline-link" onClick={() => setCreateOpen((open) => !open)} type="button"><Plus size={16}/> Mekân oluştur</button> : null}</div></div>
        <nav className="discovery-tabs" aria-label="Mekân grupları">
          {([["all", "Tümü"], ["near", "Yakındaki mekânlar"], ["popular", "Popüler mekânlar"], ["for_you", "Sizin için"], ["following", "Takip ettiklerim"], ["mine", "Mekânlarım"]] as const).map(([scope, label]) => (
            <button key={scope} className={selectedScope === scope ? "active" : ""} disabled={!user && ["near", "for_you", "following", "mine"].includes(scope)} onClick={() => updateFilter("scope", scope === "all" ? "" : scope)} type="button">{label}</button>
          ))}
        </nav>
        {createOpen ? (
          <form className="admin-form" onSubmit={submitPlace}>
            <h2>Yeni mekân</h2>
            <div className="form-grid">
              <label>Ad<input name="name" required minLength={2} maxLength={160} /></label>
              <label>Mekân türü<select name="placeType"><option value="food_drink">🍽️ Food &amp; Drink</option><option value="nightlife_music">🎵 Nightlife &amp; Music</option><option value="events_venues">🎭 Events &amp; Venues</option><option value="arts_culture">🎨 Arts &amp; Culture</option><option value="sports_activities">🏃 Sports &amp; Activities</option><option value="cafes">☕ Cafés</option><option value="outdoors">🌳 Outdoors</option><option value="games_hobbies">🎮 Games &amp; Hobbies</option><option value="work_networking">💼 Work &amp; Networking</option><option value="wellness">🧘 Wellness</option><option value="shopping">🛍️ Shopping</option><option value="hotels_hostels">🏨 Hotels / Hostels</option><option value="other">Others</option></select></label>
              <label>Katılım tipi<select name="visibility"><option value="open">Open</option><option value="approval_required">Approval</option><option value="invite_only">Secret</option></select></label>
              <TagPicker label="Mekân etiketleri" tags={tagsQuery.data ?? []}/>
              <div className="location-fields-group"><CountryCityFields/><LocationPicker addressName="address" /></div>
              <label>Fotoğraf ve videolar<input accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple name="placeMedia" type="file" /></label>
              <label>Yönetici kullanıcı adları<input list="place-manager-suggestions" name="managerUsernames" placeholder="@ayse, @mehmet" /><datalist id="place-manager-suggestions">{suggestionsQuery.data?.map((member) => member.username ? <option key={member.id} value={`@${member.username}`}>{member.name}</option> : null)}</datalist></label>
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
              {place.coverImageUrl ? <Link className="event-card-media" to={`/places/${place.slug}`}><img alt="" src={resolveMediaUrl(place.coverImageUrl)} /></Link> : null}
              <div><span className="eyebrow">{({ food_drink: "🍽️ Food & Drink", nightlife_music: "🎵 Nightlife & Music", events_venues: "🎭 Events & Venues", arts_culture: "🎨 Arts & Culture", sports_activities: "🏃 Sports & Activities", cafes: "☕ Cafés", outdoors: "🌳 Outdoors", games_hobbies: "🎮 Games & Hobbies", work_networking: "💼 Work & Networking", wellness: "🧘 Wellness", shopping: "🛍️ Shopping", hotels_hostels: "🏨 Hotels / Hostels", other: "Others" } as Record<string, string>)[place.placeType ?? ""] ?? "Mekân"} · {place.visibility === "invite_only" ? "Secret" : place.visibility === "approval_required" ? "Approval" : "Open"}</span><h2><Link to={`/places/${place.slug}`}>{place.name}</Link></h2></div>
              <p><RichText text={place.description || "Konnektora topluluk mekânı"} /></p>
              {place.tags?.length ? <div className="tag-row">{place.tags.map((tag) => <Link key={tag.id} to={`/tags/${tag.slug}`}>#{tag.name}</Link>)}</div> : null}
              <div className="event-card-meta"><span><MapPin size={15} />{[place.city, place.country].filter(Boolean).join(", ") || "Konum belirtilmedi"}</span><span><Users size={15} />{place.followerCount} members / {place.followingMemberCount ?? 0} following</span></div>
              <div className="event-card-meta"><DistanceLabel latitude={place.latitude} longitude={place.longitude}/></div>
            </article>
          ))}
        </div>}
        {!placesQuery.isLoading && !placesQuery.isError && !placeList?.items.length ? <div className="empty-state"><Building2 size={40}/><h2>{selectedScope === "mine" ? "Mekânlarım" : searchParams.size ? "Bu filtrelerle mekân bulunamadı" : "Henüz mekân eklenmedi"}</h2><p>{selectedScope === "mine" ? "Üyesi ve yöneticisi olduğunuz mekanlar burada gösterilecek" : searchParams.size ? "Filtreleri değiştirerek yeniden deneyebilirsin." : "Topluluk mekânları oluşturulduğunda burada listelenecek."}</p>{user && !searchParams.size ? <button className="primary-action" onClick={() => setCreateOpen(true)}><Plus size={18}/>İlk mekânı oluştur</button> : null}</div> : null}
        {placeList ? <div className="pagination-row">
          <button className="secondary-action" disabled={selectedPage <= 1} onClick={() => updateFilter("page", String(selectedPage - 1))}>Önceki</button>
          <span>Sayfa {placeList.page}</span>
          <button className="secondary-action" disabled={!placeList.hasNextPage} onClick={() => updateFilter("page", String(selectedPage + 1))}>Sonraki</button>
        </div> : null}
      </div>
    </section>
  );
}
