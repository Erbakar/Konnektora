import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  Globe2,
  Hash,
  MapPin,
  Megaphone,
  Search,
  Sparkles,
  TrendingUp,
  UserRoundPlus,
  UserPlus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { HomeEventTile } from "../components/HomeEventTile";
import { DiscoveryCard } from "../components/DiscoveryCard";
import { RichText } from "../components/RichText";
import {
  getDiscoveryFeed,
  listAnnouncements,
  listEvents,
  listPlaces,
  listTags,
} from "../lib/api";
import { mockEvents } from "../lib/mockData";
import { useLanguage } from "../lib/i18n";

const popularCities = [
  { name: "London", country: "United Kingdom" },
  { name: "Berlin", country: "Germany" },
  { name: "Amsterdam", country: "Netherlands" },
  { name: "Paris", country: "France" },
  { name: "New York", country: "United States" },
  { name: "Istanbul", country: "Turkey" },
];

export function HomePage() {
  const { language } = useLanguage();
  const [trendScope, setTrendScope] = useState<"local" | "global">("local");
  const c =
    language === "tr"
      ? {
          eyebrow: "Seçkin topluluk platformu",
          title: "Niyetin güvenilir bağlantılara dönüştüğü yer.",
          lead: "Startup demolarından yatırımcı buluşmalarına Konnektora; kurucuların, profesyonellerin ve topluluk yöneticilerinin etkinlik keşfetmesini, davetli listelerini yönetmesini ve kapalı bir platformda anlamlı ağlar kurmasını sağlar.",
          explore: "Etkinlikleri keşfet",
          join: "Topluluğa katıl",
          searchPlaceholder: "Her şeyi ara",
          search: "Ara",
          curated: "Senin için seçildi",
          pulse: "Topluluğun nabzını yakala.",
          pulseCopy:
            "Yeni bağlantılar kur, yükselen profilleri keşfet ve gündemdeki konulara katıl.",
          discoverCommunity: "Topluluğu keşfet",
          popular: "Popüler hesaplar",
          popularCopy: "Bu hafta topluluğun dikkatini çeken üyeler",
          newMembers: "Yeni üyeler",
          newMembersCopy: "Ağa yeni katılan, tanışmaya açık insanlar",
          trends: "Gündemdeki ilgi alanları",
          trendsCopy: "Topluluğun şu anda konuştuğu başlıklar",
          allCategories: "Tüm kategoriler",
          europe: "Size yakın etkinlikler",
          europeCopy: "Konumuna en yakın buluşmaları keşfet.",
          allEvents: "Tüm etkinlikler",
          online: "Yaklaşan online etkinlikler",
          onlineCopy: "Her yerden katıl, önemli insanlarla buluş.",
          categories: "Popüler kategorileri keşfet",
          categoriesCopy: "Aradığın konuyla başla.",
          cities: "Şehir şehir global bir ağ kuruyoruz",
          citiesCopy:
            "Şehrindeki etkinliklerden sorumlu küratör olmak ve gelirlerden pay kazanmak ister miydin? Ayrıntıları öğrenmek için tıkla.",
          how: "Konnektora nasıl çalışır?",
          howCopy: "Topluluk odaklı etkinlikler için güvenilir bir döngü.",
          discoverEvents: "Etkinlikleri ve grupları keşfet",
          discoverEventsCopy:
            "Önemsediğin konularda seçkin etkinlikleri kimlerin düzenlediğini gör.",
          start: "Keşfetmeye başla",
          findPeople: "Doğru insanları bul",
          findPeopleCopy:
            "Ortak ilgi alanları, davetler ve onay akışlarıyla bağlantı kur.",
          host: "Güvenle etkinlik düzenle",
          hostCopy:
            "Etkinlik oluştur, davetli listelerini yönet ve topluluğunu güvenle büyüt.",
          organizer: "Organizatör araçları",
          communityFirst: "Önce topluluk",
          connections: "Bağlantılar Konnektora'da kurulur",
          connectionsCopy:
            "Üyeler doğru insanlarla tanışmak, seçilmiş buluşmalara katılmak ve kalabalık gelmeden profesyonel ilişkiler kurmak için Konnektora'yı kullanır.",
          joinCommunity: "Topluluğa katıl",
          curatedEvents: "seçilmiş etkinlik",
          activeTags: "aktif ilgi alanı",
          global: "varsayılan olarak global",
          finalTitle: "Kapılar açılmadan önce ağını kur.",
          finalCopy:
            "Konnektora; gerçek etkinlikler için yeterli yapıya, doğru kullanıcılarla gelişmek için gereken odağa sahip kontrollü bir topluluk deneyimi sunar.",
          openFeed: "Etkinlik akışını aç",
        }
      : {
          eyebrow: "The curated community platform",
          title: "Where intent becomes trusted connections.",
          lead: "From startup demos to investor roundtables, Konnektora helps founders, operators and community builders discover events, manage guest lists and grow meaningful networks in one closed platform.",
          explore: "Explore events",
          join: "Join the beta",
          searchPlaceholder: "Search anything",
          search: "Search",
          curated: "Curated for you",
          pulse: "Feel the pulse of the community.",
          pulseCopy:
            "Build new connections, discover rising profiles and join trending conversations.",
          discoverCommunity: "Explore community",
          popular: "Popular accounts",
          popularCopy: "Members catching attention this week",
          newMembers: "New members",
          newMembersCopy: "New people open to connecting",
          trends: "Trending interests",
          trendsCopy: "Topics the community is discussing now",
          allCategories: "All categories",
          europe: "Events across Europe & beyond",
          europeCopy:
            "Curated rooms for builders, investors and community leaders.",
          allEvents: "See all events",
          online: "Upcoming online events",
          onlineCopy: "Join from anywhere. Meet where it matters.",
          categories: "Explore top categories",
          categoriesCopy: "Start with what you are looking for.",
          cities: "Popular cities on Konnektora",
          citiesCopy: "We are building a global network, city by city.",
          how: "How Konnektora works",
          howCopy: "A trusted loop for community-led events.",
          discoverEvents: "Discover events and groups",
          discoverEventsCopy:
            "See who is hosting curated events for the topics you care about.",
          start: "Start exploring",
          findPeople: "Find your people",
          findPeopleCopy:
            "Connect over shared interests through tags, invites and approval flows.",
          host: "Host with confidence",
          hostCopy:
            "Create events, manage guest lists and keep your community accountable.",
          organizer: "Organizer tools",
          communityFirst: "Community-first",
          connections: "Connections are made on Konnektora",
          connectionsCopy:
            "Members use Konnektora to meet the right people, join curated rooms, get invited to the right events and build professional relationships before the crowd arrives.",
          joinCommunity: "Join the community",
          curatedEvents: "curated events",
          activeTags: "active tags",
          global: "global by default",
          finalTitle: "Build the network before opening the doors.",
          finalCopy:
            "Konnektora is shaped for a controlled community launch with enough structure for real events and enough focus to improve with the right users.",
          openFeed: "Open event feed",
        };
  const { data: eventList } = useQuery({
    queryKey: ["events", "home"],
    queryFn: () => listEvents(),
    placeholderData: {
      items: mockEvents,
      total: mockEvents.length,
      page: 1,
      pageSize: mockEvents.length,
      hasNextPage: false,
    },
  });
  const { data: tags = [] } = useQuery({
    queryKey: ["tags", "home"],
    queryFn: listTags,
  });
  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements", "home"],
    queryFn: listAnnouncements,
  });
  const { data: recentPlaces } = useQuery({
    queryKey: ["places", "home", "recent"],
    queryFn: () => listPlaces(new URLSearchParams({ page: "1", pageSize: "8" })),
  });
  const { data: discovery } = useQuery({
    queryKey: ["discovery-feed", trendScope],
    queryFn: () => getDiscoveryFeed({ scope: trendScope }),
  });
  const events = eventList?.items ?? [];

  const localEvents = events.filter((event) => event.city).slice(0, 8);
  const onlineEvents = events
    .filter((event) => event.format === "online")
    .slice(0, 8);
  const featuredEvents = events.slice(0, 8);

  return (
    <div className="corp-home">
      <section className="corp-hero">
        <div className="corp-hero-inner">
          <p className="corp-eyebrow">{c.eyebrow}</p>
          <h1>
            {c.title.split(" ").slice(0, 3).join(" ")}
            <span> {c.title.split(" ").slice(3).join(" ")}</span>
          </h1>
          <p className="corp-hero-lead">{c.lead}</p>
          <div className="corp-hero-actions">
            <Link className="corp-btn corp-btn-primary" to="/events">
              {c.explore}
            </Link>
            <Link className="corp-btn corp-btn-secondary" to="/onboarding">
              {c.join}
            </Link>
          </div>
          <form className="hero-search" action="/search">
            <Search size={20} />
            <input
              aria-label={c.searchPlaceholder}
              name="q"
              placeholder={c.searchPlaceholder}
              minLength={2}
              required
            />
            <button type="submit">{c.search}</button>
          </form>
        </div>
      </section>

      {announcements.length ? (
        <section className="corp-announcements" aria-label="Announcements">
          {announcements.slice(0, 3).map((announcement) => (
            <article className="corp-announcement" key={announcement.id}>
              <span>
                <Megaphone size={18} />
              </span>
              <div>
                <strong>{announcement.title}</strong>
                <p>
                  <RichText text={announcement.body} />
                </p>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {discovery ? (
        <section className="corp-section discovery-feed-section">
          <div className="discovery-feed-hero">
            <div>
              <span className="discovery-kicker">
                <Sparkles size={15} /> {c.curated}
              </span>
              <h2>{c.pulse}</h2>
              <p>{c.pulseCopy}</p>
            </div>
            <Link className="discovery-search-action" to="/community">
              {c.discoverCommunity} <ArrowRight size={18} />
            </Link>
            <span className="active-community-count">
              <i />
              {discovery.activeUserCount} aktif üye
            </span>
          </div>

          <div className="discovery-member-layout">
            <section className="discovery-member-panel discovery-member-panel-featured">
              <header>
                <span>
                  <TrendingUp size={18} />
                </span>
                <div>
                  <h3>{c.popular}</h3>
                  <p>{c.popularCopy}</p>
                </div>
              </header>
              <div className="discovery-row">
                {discovery.popularMembers.slice(0, 4).map((item) => (
                  <DiscoveryCard item={item} key={item.id} />
                ))}
              </div>
            </section>
            <section className="discovery-member-panel">
              <header>
                <span>
                  <UserRoundPlus size={18} />
                </span>
                <div>
                  <h3>{c.newMembers}</h3>
                  <p>{c.newMembersCopy}</p>
                </div>
              </header>
              <div className="discovery-row">
                {discovery.newMembers.slice(0, 4).map((item) => (
                  <DiscoveryCard item={item} key={item.id} />
                ))}
              </div>
            </section>
          </div>

          {discovery.localEvents.length ? (
            <section className="discovery-trends regional-discovery">
              <header>
                <div>
                  <span className="discovery-trends-icon">
                    <MapPin size={20} />
                  </span>
                  <div>
                    <h3>
                      {language === "tr"
                        ? "Yakınındaki etkinlikler"
                        : "Events near you"}
                    </h3>
                    <p>
                      {discovery.location ? `${discovery.location} · ` : ""}
                      {language === "tr"
                        ? "Bölgen için seçilen yaklaşan buluşmalar"
                        : "Upcoming gatherings selected for your region"}
                    </p>
                  </div>
                </div>
                <Link to="/events">
                  {c.allEvents}
                  <ArrowRight size={16} />
                </Link>
              </header>
              <div className="discovery-row compact">
                {discovery.localEvents.slice(0, 8).map((item) => (
                  <DiscoveryCard item={item} key={item.id} />
                ))}
              </div>
            </section>
          ) : null}
        </section>
      ) : null}

      <section className="corp-section home-category-section">
        <div className="corp-section-head">
          <div>
            <h2>{c.europe}</h2>
            <p>{c.europeCopy}</p>
          </div>
          <Link className="corp-link" to="/events">
            {c.allEvents}
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="corp-carousel" aria-label="Featured events">
          {(localEvents.length ? localEvents : featuredEvents).map((event) => (
            <HomeEventTile event={event} key={event.id} />
          ))}
        </div>
      </section>

      <section className="corp-section corp-section-muted">
        <div className="corp-section-head">
          <div>
            <h2>{c.online}</h2>
            <p>{c.onlineCopy}</p>
          </div>
          <Link className="corp-link" to="/events">
            {c.allEvents}
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="corp-carousel">
          {(onlineEvents.length ? onlineEvents : featuredEvents).map(
            (event) => (
              <HomeEventTile event={event} key={event.id} />
            ),
          )}
        </div>
      </section>

      <section
        className="corp-section home-story-section"
        aria-labelledby="home-story-title"
      >
        <div className="home-story-copy">
          <p className="corp-eyebrow">
            {language === "tr" ? "Konnektora'yı keşfet" : "Discover Konnektora"}
          </p>
          <h2 id="home-story-title">
            {language === "tr"
              ? "Keşfet, bağlantı kur, birlikte deneyimle."
              : "Discover, connect, experience together."}
          </h2>
          <p>
            {language === "tr"
              ? "Yakınındaki etkinliklerden güvenli davetli listelerine kadar topluluğun bütün yolculuğunu tek yerde gör."
              : "See the full community journey, from nearby events to trusted guest lists, in one place."}
          </p>
          <Link className="corp-btn corp-btn-primary" to="/onboarding">
            {c.joinCommunity}
          </Link>
        </div>
        <div className="home-story-media">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/media/konnektora-community-ai.png"
            preload="metadata"
          >
            <source src="/media/konnektora-community-ai.mp4" type="video/mp4" />
          </video>
          <span>
            {language === "tr"
              ? "Konnektora topluluğu"
              : "The Konnektora community"}
          </span>
        </div>
      </section>

      {discovery ? (
        <section className="corp-section home-trending-interests">
          <header className="corp-section-head">
            <div>
              <span className="discovery-trends-icon"><Hash size={20} /></span>
              <h2>{c.trends}</h2>
              <p>{c.trendsCopy}</p>
            </div>
            <div className="trend-scope-tabs">
              <button className={trendScope === "local" ? "active" : ""} onClick={() => setTrendScope("local")} type="button">{language === "tr" ? "Ülkemde" : "My country"}</button>
              <button className={trendScope === "global" ? "active" : ""} onClick={() => setTrendScope("global")} type="button">Global</button>
            </div>
          </header>
          <div className="home-trending-tag-cloud">
            {discovery.trendingTags.map((item) => <Link key={item.id} to={item.href}>#{item.title.replace(/^#/, "")}</Link>)}
          </div>
        </section>
      ) : null}

      {recentPlaces?.items.length ? (
        <section className="corp-section corp-section-muted">
          <div className="corp-section-head">
            <div><h2>{language === "tr" ? "Yeni eklenen mekânlar" : "Recently added places"}</h2><p>{language === "tr" ? "Topluluğa en son katılan mekânları keşfet." : "Discover the newest places in the community."}</p></div>
            <Link className="corp-link" to="/places">{language === "tr" ? "Tüm mekânlar" : "All places"}<ArrowRight size={18}/></Link>
          </div>
          <div className="corp-carousel">
            {recentPlaces.items.map((place) => <Link className="home-place-tile" key={place.id} to={`/places/${place.slug}`}>
              {place.coverImageUrl ? <img alt="" src={place.coverImageUrl}/> : <span className="home-place-fallback"><Building2 size={28}/></span>}
              <span><strong>{place.name}</strong><small>{[place.city, place.country].filter(Boolean).join(", ") || (language === "tr" ? "Konum belirtilmedi" : "Location not specified")}</small></span>
            </Link>)}
          </div>
        </section>
      ) : null}

      <section className="corp-section corp-section-muted">
        <div className="corp-section-head corp-section-head-center">
          <div>
            <h2>{c.cities}</h2>
            <p>{c.citiesCopy}</p>
          </div>
        </div>
        <div className="corp-city-grid">
          {popularCities.map((city, index) => (
            <Link
              className="corp-city-card"
              key={city.name}
              to={`/curators?city=${encodeURIComponent(index === popularCities.length - 1 ? "" : city.name)}`}
            >
              <MapPin size={18} />
              <strong>
                {index === popularCities.length - 1
                  ? "ve diğerleri"
                  : city.name}
              </strong>
              <span>
                {index === popularCities.length - 1
                  ? "Kendi şehrinde başvur"
                  : city.country}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="corp-section">
        <div className="corp-section-head corp-section-head-center">
          <div>
            <h2>{c.how}</h2>
            <p>{c.howCopy}</p>
          </div>
        </div>
        <div className="corp-steps">
          <article>
            <Search size={28} />
            <strong>{language === "tr" ? "Etkinlikleri ve mekânları keşfet" : "Discover events and places"}</strong>
            <p>{c.discoverEventsCopy}</p>
            <Link className="corp-link" to="/events">
              {c.start}
            </Link>
          </article>
          <article>
            <UserPlus size={28} />
            <strong>{language === "tr" ? "Doğru insanları bul" : "Find the right people"}</strong>
            <p>{language === "tr" ? "İlgi alanlarını profiline ekleyerek kendini ifade et; ortak ilgi alanlarını ve AI destekli uyumunu gör, davetler ve onay akışlarıyla bağlantı kur." : c.findPeopleCopy}</p>
          </article>
          <article>
            <Sparkles size={28} />
            <strong>{c.host}</strong>
            <p>{language === "tr" ? "Etkinlik oluştur, davetli listelerini yönet, check-in sırasında listeleri gör ve topluluğunu güvenle büyüt." : c.hostCopy}</p>
            <Link className="corp-link" to="/admin">
              {c.organizer}
            </Link>
          </article>
        </div>
      </section>

      <section className="corp-proof">
        <div className="corp-proof-copy">
          <p className="corp-eyebrow">{c.communityFirst}</p>
          <h2>{c.connections}</h2>
          <p>{c.connectionsCopy}</p>
          <Link className="corp-btn corp-btn-primary" to="/events">
            {c.joinCommunity}
          </Link>
        </div>
        <div className="corp-proof-stats">
          <div>
            <strong>{events.length || "15+"}</strong>
            <span>{c.curatedEvents}</span>
          </div>
          <div>
            <strong>{tags.length || "4"}</strong>
            <span>{c.activeTags}</span>
          </div>
          <div>
            <strong>
              <Globe2 size={28} />
            </strong>
            <span>{c.global}</span>
          </div>
        </div>
      </section>

      <section className="corp-cta-band">
        <div>
          <h2>{c.finalTitle}</h2>
          <p>{c.finalCopy}</p>
        </div>
        <Link className="corp-btn corp-btn-light" to="/events">
          {c.openFeed}
          <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
