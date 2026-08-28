import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ListFilter, LoaderCircle, MapPinned, Plus, RefreshCw } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createPlace, getUserSession, invitePlaceMember, listMemberSuggestions, listPlaces, listTags, uploadContentMedia, type PlaceInput } from "../lib/api";
import { LocationMap } from "../components/LocationMap";
import { LocationPicker } from "../components/LocationPicker";
import { TagPicker } from "../components/TagPicker";
import { CountryCityFields } from "../components/CountryCityFields";
import { PlaceCard } from "../components/PlaceCard";
import { useLanguage } from "../lib/i18n";

const placeCopy = {
  tr: {
    filterSearch: "Filtrele & Ara", filters: "Mekân filtreleri", search: "Arama", searchPlaceholder: "Hub, kafe, stüdyo...", city: "Şehir", cityPlaceholder: "İstanbul", country: "Ülke", countryPlaceholder: "Türkiye", trending: "Trend etiketler", clear: "Filtreleri temizle",
    title: "Mekânlar", loading: "Yükleniyor", result: (count: number) => `${count} sonuç`, showMap: "Haritada göster", showList: "Listeyi göster", create: "Mekân oluştur", groups: "Mekân grupları",
    all: "Tümü", near: "Yakındaki mekânlar", popular: "Popüler mekânlar", forYou: "Sizin için", following: "Takip ettiklerim", mine: "Mekânlarım",
    newPlace: "Yeni mekân", name: "Ad", placeType: "Mekân türü", visibility: "Katılım tipi", open: "Herkese açık", approval: "Onay gerekli", inviteOnly: "Sadece davetli", media: "Fotoğraf ve videolar", managers: "Yönetici kullanıcı adları", description: "Açıklama", creating: "Oluşturuluyor", createPlace: "Mekânı oluştur", createFailed: "Mekân oluşturulamadı. Alanları kontrol et.",
    loadingPlaces: "Mekânlar yükleniyor…", loadFailed: "Mekânlar yüklenemedi", retryCopy: "Bağlantını kontrol edip yeniden deneyebilirsin.", retry: "Yeniden dene", locationMissing: "Konum belirtilmedi", previous: "Önceki", next: "Sonraki", page: (page: number) => `Sayfa ${page}`,
    mineEmpty: "Üyesi ve yöneticisi olduğunuz mekânlar burada gösterilecek", noMatch: "Bu filtrelerle mekân bulunamadı", none: "Henüz mekân eklenmedi", changeFilters: "Filtreleri değiştirerek yeniden deneyebilirsin.", noneCopy: "Topluluk mekânları oluşturulduğunda burada listelenecek.", first: "İlk mekânı oluştur",
  },
  en: {
    filterSearch: "Filter & Search", filters: "Place filters", search: "Search", searchPlaceholder: "Hub, cafe, studio...", city: "City", cityPlaceholder: "London", country: "Country", countryPlaceholder: "United Kingdom", trending: "Trending tags", clear: "Clear filters",
    title: "Places", loading: "Loading", result: (count: number) => `${count} results`, showMap: "Show on map", showList: "Show list", create: "Create place", groups: "Place groups",
    all: "All", near: "Places nearby", popular: "Popular places", forYou: "For you", following: "Following", mine: "My places",
    newPlace: "New place", name: "Name", placeType: "Place type", visibility: "Access type", open: "Open to everyone", approval: "Approval required", inviteOnly: "Invite only", media: "Photos and videos", managers: "Manager usernames", description: "Description", creating: "Creating", createPlace: "Create place", createFailed: "Place could not be created. Check the fields.",
    loadingPlaces: "Loading places…", loadFailed: "Places could not be loaded", retryCopy: "Check your connection and try again.", retry: "Try again", locationMissing: "Location not specified", previous: "Previous", next: "Next", page: (page: number) => `Page ${page}`,
    mineEmpty: "Places you belong to or manage will appear here", noMatch: "No places match these filters", none: "No places yet", changeFilters: "Change the filters and try again.", noneCopy: "Community places will appear here when they are created.", first: "Create the first place",
  },
} as const;

export function PlacesPage() {
  const { language } = useLanguage();
  const c = placeCopy[language];
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
      <button className="mobile-filter-toggle secondary-action" aria-expanded={filtersOpen} aria-controls="place-filters" onClick={() => setFiltersOpen((open) => !open)} type="button"><ListFilter size={18}/> {c.filterSearch}</button>
      <aside className={`filters places-filters ${filtersOpen ? "mobile-filters-open" : ""}`} id="place-filters">
        <h2>{c.filters}</h2>
        <label>{c.search}<input value={searchParams.get("q") ?? ""} onChange={(event) => updateFilter("q", event.target.value)} placeholder={c.searchPlaceholder} /></label>
        <label>{c.city}<input value={searchParams.get("city") ?? ""} onChange={(event) => updateFilter("city", event.target.value)} placeholder={c.cityPlaceholder} /></label>
        <label>{c.country}<input value={searchParams.get("country") ?? ""} onChange={(event) => updateFilter("country", event.target.value)} placeholder={c.countryPlaceholder} /></label>
        {tagsQuery.data?.length ? <div className="place-trendy-tags"><strong>{c.trending}</strong><div className="tag-cloud">{[...tagsQuery.data].filter((tag) => (tag.placeCount ?? 0) > 0).sort((a, b) => (b.placeCount ?? 0) - (a.placeCount ?? 0) || b.usageCount - a.usageCount).slice(0, 10).map((tag) => <button className={searchParams.get("tag") === tag.slug ? "active" : ""} key={tag.id} onClick={() => updateFilter("tag", searchParams.get("tag") === tag.slug ? "" : tag.slug)} type="button">#{tag.name} ({tag.placeCount})</button>)}</div></div> : null}
        {hasFilters ? <button className="clear-filters-link" onClick={() => setSearchParams({})} type="button">{c.clear}</button> : null}
      </aside>
      <div className="places-content">
        <div className="section-header"><h1>{c.title}</h1><div className="row-actions"><span>{placesQuery.isLoading ? c.loading : c.result(placeList?.total ?? 0)}</span><button className="create-inline-link" onClick={() => setMapOpen((open) => !open)}><MapPinned size={16}/>{mapOpen ? c.showList : c.showMap}</button>{user ? <button className="create-inline-link" onClick={() => setCreateOpen((open) => !open)} type="button"><Plus size={16}/> {c.create}</button> : null}</div></div>
        <nav className="discovery-tabs" aria-label={c.groups}>
          {([["all", c.all], ["near", c.near], ["popular", c.popular], ["for_you", c.forYou], ["following", c.following], ["mine", c.mine]] as const).map(([scope, label]) => (
            <button key={scope} className={selectedScope === scope ? "active" : ""} disabled={!user && ["near", "for_you", "following", "mine"].includes(scope)} onClick={() => updateFilter("scope", scope === "all" ? "" : scope)} type="button">{label}</button>
          ))}
        </nav>
        {createOpen ? (
          <form className="admin-form" onSubmit={submitPlace}>
            <h2>{c.newPlace}</h2>
            <div className="form-grid">
              <label>{c.name}<input name="name" required minLength={2} maxLength={160} /></label>
              <label>{c.placeType}<select name="placeType"><option value="food_drink">🍽️ {language === "tr" ? "Yeme & İçme" : "Food & Drink"}</option><option value="nightlife_music">🎵 {language === "tr" ? "Gece Hayatı & Müzik" : "Nightlife & Music"}</option><option value="events_venues">🎭 {language === "tr" ? "Etkinlik & Mekân" : "Events & Venues"}</option><option value="arts_culture">🎨 {language === "tr" ? "Sanat & Kültür" : "Arts & Culture"}</option><option value="sports_activities">🏃 {language === "tr" ? "Spor & Aktiviteler" : "Sports & Activities"}</option><option value="cafes">☕ {language === "tr" ? "Kafeler" : "Cafés"}</option><option value="outdoors">🌳 {language === "tr" ? "Açık Hava" : "Outdoors"}</option><option value="games_hobbies">🎮 {language === "tr" ? "Oyun & Hobiler" : "Games & Hobbies"}</option><option value="work_networking">💼 {language === "tr" ? "İş & Networking" : "Work & Networking"}</option><option value="wellness">🧘 {language === "tr" ? "Sağlık & İyi Yaşam" : "Wellness"}</option><option value="shopping">🛍️ {language === "tr" ? "Alışveriş" : "Shopping"}</option><option value="hotels_hostels">🏨 {language === "tr" ? "Otel / Hostel" : "Hotels / Hostels"}</option><option value="other">{language === "tr" ? "Diğer" : "Other"}</option></select></label>
              <label>{c.visibility}<select name="visibility"><option value="open">{c.open}</option><option value="approval_required">{c.approval}</option><option value="invite_only">{c.inviteOnly}</option></select></label>
              <TagPicker label={language === "tr" ? "Mekân etiketleri" : "Place tags"} tags={tagsQuery.data ?? []}/>
              <div className="location-fields-group"><CountryCityFields/><LocationPicker addressName="address" /></div>
              <label>{c.media}<input accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple name="placeMedia" type="file" /></label>
              <label>{c.managers}<input list="place-manager-suggestions" name="managerUsernames" placeholder="@ayse, @mehmet" /><datalist id="place-manager-suggestions">{suggestionsQuery.data?.map((member) => member.username ? <option key={member.id} value={`@${member.username}`}>{member.name}</option> : null)}</datalist></label>
              <label>{c.description}<textarea name="description" rows={4} maxLength={2000} /></label>
            </div>
            <button className="primary-action" disabled={createMutation.isPending} type="submit">{createMutation.isPending ? c.creating : c.createPlace}</button>
            {createMutation.isError ? <p className="form-error">{c.createFailed}</p> : null}
          </form>
        ) : null}
        {placesQuery.isLoading ? <div className="empty-state"><LoaderCircle className="spin" size={34}/><p>{c.loadingPlaces}</p></div> : null}
        {placesQuery.isError ? <div className="empty-state"><Building2 size={40}/><h2>{c.loadFailed}</h2><p>{c.retryCopy}</p><button className="secondary-action" onClick={() => void placesQuery.refetch()}><RefreshCw size={17}/>{c.retry}</button></div> : null}
        {mapOpen ? <LocationMap items={(placeList?.items ?? []).map((place) => ({ id: place.id, title: place.name, latitude: place.latitude, longitude: place.longitude, location: [place.city, place.country].filter(Boolean).join(", ") || c.locationMissing }))}/> : <div className="event-grid place-grid">
          {placeList?.items.map((place) => <PlaceCard key={place.id} place={place}/>) }
        </div>}
        {!placesQuery.isLoading && !placesQuery.isError && !placeList?.items.length ? <div className="empty-state"><Building2 size={40}/><h2>{selectedScope === "mine" ? c.mine : searchParams.size ? c.noMatch : c.none}</h2><p>{selectedScope === "mine" ? c.mineEmpty : searchParams.size ? c.changeFilters : c.noneCopy}</p>{user && !searchParams.size ? <button className="primary-action" onClick={() => setCreateOpen(true)}><Plus size={18}/>{c.first}</button> : null}</div> : null}
        {placeList ? <div className="pagination-row">
          <button className="secondary-action" disabled={selectedPage <= 1} onClick={() => updateFilter("page", String(selectedPage - 1))}>{c.previous}</button>
          <span>{c.page(placeList.page)}</span>
          <button className="secondary-action" disabled={!placeList.hasNextPage} onClick={() => updateFilter("page", String(selectedPage + 1))}>{c.next}</button>
        </div> : null}
      </div>
    </section>
  );
}
