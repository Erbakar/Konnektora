import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Briefcase,
  Globe2,
  Hash,
  Lightbulb,
  MapPin,
  Megaphone,
  Rocket,
  Search,
  Sparkles,
  TrendingUp,
  UserRoundPlus,
  UserPlus,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { HomeEventTile } from "../components/HomeEventTile";
import { DiscoveryCard } from "../components/DiscoveryCard";
import { RichText } from "../components/RichText";
import { getDiscoveryFeed, listAnnouncements, listEvents, listTags } from "../lib/api";
import { mockEvents } from "../lib/mockData";
import { useLanguage } from "../lib/i18n";

const categoryMeta: Record<string, { icon: typeof Rocket; copy: string }> = {
  startup: {
    icon: Rocket,
    copy: "Demo nights, product clinics and builder sessions."
  },
  networking: {
    icon: Users,
    copy: "Curated rooms for meaningful professional connections."
  },
  yatirim: {
    icon: TrendingUp,
    copy: "Investor AMAs, funding clinics and capital roundtables."
  },
  founder: {
    icon: Lightbulb,
    copy: "Founder circles, matching labs and accountability groups."
  }
};

const popularCities = [
  { name: "London", country: "United Kingdom" },
  { name: "Berlin", country: "Germany" },
  { name: "Amsterdam", country: "Netherlands" },
  { name: "Paris", country: "France" },
  { name: "New York", country: "United States" },
  { name: "Istanbul", country: "Turkey" }
];

export function HomePage() {
  const { language } = useLanguage();
  const c = language === "tr" ? {
    eyebrow: "Seçkin topluluk platformu",
    title: "Niyetin güvenilir bağlantılara dönüştüğü yer.",
    lead: "Startup demolarından yatırımcı buluşmalarına Konnektora; kurucuların, profesyonellerin ve topluluk yöneticilerinin etkinlik keşfetmesini, davetli listelerini yönetmesini ve kapalı bir platformda anlamlı ağlar kurmasını sağlar.",
    explore: "Etkinlikleri keşfet", join: "Topluluğa katıl", searchPlaceholder: "Her şeyi ara", search: "Ara",
    curated: "Senin için seçildi", pulse: "Topluluğun nabzını yakala.",
    pulseCopy: "Yeni bağlantılar kur, yükselen profilleri keşfet ve gündemdeki konulara katıl.",
    discoverCommunity: "Topluluğu keşfet", popular: "Popüler hesaplar",
    popularCopy: "Bu hafta topluluğun dikkatini çeken üyeler", newMembers: "Yeni üyeler",
    newMembersCopy: "Ağa yeni katılan, tanışmaya açık insanlar", trends: "Gündemdeki ilgi alanları",
    trendsCopy: "Topluluğun şu anda konuştuğu başlıklar", allCategories: "Tüm kategoriler",
    europe: "Avrupa ve ötesindeki etkinlikler", europeCopy: "Üretenler, yatırımcılar ve topluluk liderleri için seçilmiş buluşmalar.",
    allEvents: "Tüm etkinlikler", online: "Yaklaşan online etkinlikler",
    onlineCopy: "Her yerden katıl, önemli insanlarla buluş.", categories: "Popüler kategorileri keşfet",
    categoriesCopy: "Aradığın konuyla başla.", cities: "Konnektora'daki popüler şehirler",
    citiesCopy: "Şehir şehir global bir ağ kuruyoruz.", how: "Konnektora nasıl çalışır?",
    howCopy: "Topluluk odaklı etkinlikler için güvenilir bir döngü.", discoverEvents: "Etkinlikleri ve grupları keşfet",
    discoverEventsCopy: "Önemsediğin konularda seçkin etkinlikleri kimlerin düzenlediğini gör.", start: "Keşfetmeye başla",
    findPeople: "Doğru insanları bul", findPeopleCopy: "Ortak ilgi alanları, davetler ve onay akışlarıyla bağlantı kur.",
    host: "Güvenle etkinlik düzenle", hostCopy: "Etkinlik oluştur, davetli listelerini yönet ve topluluğunu güvenle büyüt.",
    organizer: "Organizatör araçları", communityFirst: "Önce topluluk", connections: "Bağlantılar Konnektora'da kurulur",
    connectionsCopy: "Üyeler doğru insanlarla tanışmak, seçilmiş buluşmalara katılmak ve kalabalık gelmeden profesyonel ilişkiler kurmak için Konnektora'yı kullanır.",
    joinCommunity: "Topluluğa katıl", curatedEvents: "seçilmiş etkinlik", activeTags: "aktif ilgi alanı",
    global: "varsayılan olarak global", finalTitle: "Kapılar açılmadan önce ağını kur.",
    finalCopy: "Konnektora; gerçek etkinlikler için yeterli yapıya, doğru kullanıcılarla gelişmek için gereken odağa sahip kontrollü bir topluluk deneyimi sunar.",
    openFeed: "Etkinlik akışını aç"
  } : {
    eyebrow: "The curated community platform", title: "Where intent becomes trusted connections.",
    lead: "From startup demos to investor roundtables, Konnektora helps founders, operators and community builders discover events, manage guest lists and grow meaningful networks in one closed platform.",
    explore: "Explore events", join: "Join the beta", searchPlaceholder: "Search anything", search: "Search",
    curated: "Curated for you", pulse: "Feel the pulse of the community.",
    pulseCopy: "Build new connections, discover rising profiles and join trending conversations.",
    discoverCommunity: "Explore community", popular: "Popular accounts", popularCopy: "Members catching attention this week",
    newMembers: "New members", newMembersCopy: "New people open to connecting", trends: "Trending interests",
    trendsCopy: "Topics the community is discussing now", allCategories: "All categories",
    europe: "Events across Europe & beyond", europeCopy: "Curated rooms for builders, investors and community leaders.",
    allEvents: "See all events", online: "Upcoming online events", onlineCopy: "Join from anywhere. Meet where it matters.",
    categories: "Explore top categories", categoriesCopy: "Start with what you are looking for.",
    cities: "Popular cities on Konnektora", citiesCopy: "We are building a global network, city by city.",
    how: "How Konnektora works", howCopy: "A trusted loop for community-led events.",
    discoverEvents: "Discover events and groups", discoverEventsCopy: "See who is hosting curated events for the topics you care about.",
    start: "Start exploring", findPeople: "Find your people", findPeopleCopy: "Connect over shared interests through tags, invites and approval flows.",
    host: "Host with confidence", hostCopy: "Create events, manage guest lists and keep your community accountable.",
    organizer: "Organizer tools", communityFirst: "Community-first", connections: "Connections are made on Konnektora",
    connectionsCopy: "Members use Konnektora to meet the right people, join curated rooms, get invited to the right events and build professional relationships before the crowd arrives.",
    joinCommunity: "Join the community", curatedEvents: "curated events", activeTags: "active tags",
    global: "global by default", finalTitle: "Build the network before opening the doors.",
    finalCopy: "Konnektora is shaped for a controlled community launch with enough structure for real events and enough focus to improve with the right users.",
    openFeed: "Open event feed"
  };
  const { data: eventList } = useQuery({
    queryKey: ["events", "home"],
    queryFn: () => listEvents(),
    placeholderData: {
      items: mockEvents,
      total: mockEvents.length,
      page: 1,
      pageSize: mockEvents.length,
      hasNextPage: false
    }
  });
  const { data: tags = [] } = useQuery({
    queryKey: ["tags", "home"],
    queryFn: listTags
  });
  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements", "home"],
    queryFn: listAnnouncements
  });
  const { data: discovery } = useQuery({ queryKey: ["discovery-feed"], queryFn: () => getDiscoveryFeed() });
  const events = eventList?.items ?? [];

  const localEvents = events.filter((event) => event.city).slice(0, 8);
  const onlineEvents = events.filter((event) => event.format === "online").slice(0, 8);
  const featuredEvents = events.slice(0, 8);

  return (
    <div className="corp-home">
      <section className="corp-hero">
        <div className="corp-hero-inner">
          <p className="corp-eyebrow">{c.eyebrow}</p>
          <h1>{c.title.split(" ").slice(0, 3).join(" ")}<span> {c.title.split(" ").slice(3).join(" ")}</span></h1>
          <p className="corp-hero-lead">{c.lead}</p>
          <div className="corp-hero-actions">
            <Link className="corp-btn corp-btn-primary" to="/events">
              {c.explore}
            </Link>
            <Link className="corp-btn corp-btn-secondary" to="/onboarding">
              {c.join}
            </Link>
          </div>
          <form className="hero-search" action="/search"><Search size={20} /><input aria-label={c.searchPlaceholder} name="q" placeholder={c.searchPlaceholder} minLength={2} required /><button type="submit">{c.search}</button></form>
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
                <p><RichText text={announcement.body} /></p>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {discovery ? (
        <section className="corp-section discovery-feed-section">
          <div className="discovery-feed-hero">
            <div>
              <span className="discovery-kicker"><Sparkles size={15} /> {c.curated}</span>
              <h2>{c.pulse}</h2>
              <p>{c.pulseCopy}</p>
            </div>
            <Link className="discovery-search-action" to="/search">
              {c.discoverCommunity} <ArrowRight size={18} />
            </Link>
          </div>

          <div className="discovery-member-layout">
            <section className="discovery-member-panel discovery-member-panel-featured">
              <header>
                <span><TrendingUp size={18} /></span>
                <div><h3>{c.popular}</h3><p>{c.popularCopy}</p></div>
              </header>
              <div className="discovery-row">
                {discovery.popularMembers.slice(0, 4).map((item) => <DiscoveryCard item={item} key={item.id} />)}
              </div>
            </section>
            <section className="discovery-member-panel">
              <header>
                <span><UserRoundPlus size={18} /></span>
                <div><h3>{c.newMembers}</h3><p>{c.newMembersCopy}</p></div>
              </header>
              <div className="discovery-row">
                {discovery.newMembers.slice(0, 4).map((item) => <DiscoveryCard item={item} key={item.id} />)}
              </div>
            </section>
          </div>

          <section className="discovery-trends">
            <header>
              <div><span className="discovery-trends-icon"><Hash size={20} /></span><div><h3>{c.trends}</h3><p>{c.trendsCopy}</p></div></div>
              <Link to="/events">{c.allCategories} <ArrowRight size={16} /></Link>
            </header>
            <div className="discovery-row compact">
              {discovery.trendingTags.slice(0, 8).map((item) => <DiscoveryCard item={item} key={item.id} />)}
            </div>
          </section>
        </section>
      ) : null}

      <section className="corp-section">
        <div className="corp-section-head">
          <div>
            <h2>
              {c.europe}
            </h2>
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
          {(onlineEvents.length ? onlineEvents : featuredEvents).map((event) => (
            <HomeEventTile event={event} key={event.id} />
          ))}
        </div>
      </section>

      <section className="corp-section">
        <div className="corp-section-head corp-section-head-center">
          <div>
            <h2>{c.categories}</h2>
            <p>{c.categoriesCopy}</p>
          </div>
        </div>
        <div className="corp-category-grid">
          {tags.map((tag) => {
            const meta = categoryMeta[tag.slug] ?? { icon: Briefcase, copy: "Find relevant people and events." };
            const Icon = meta.icon;
            const turkishCategoryCopy: Record<string, string> = {
              startup: "Demo geceleri, ürün klinikleri ve üretici buluşmaları.",
              networking: "Anlamlı profesyonel bağlantılar için seçilmiş ortamlar.",
              yatirim: "Yatırımcı buluşmaları, fon hazırlığı ve sermaye oturumları.",
              founder: "Kurucu çemberleri, eşleşme atölyeleri ve dayanışma grupları."
            };

            return (
              <Link className="corp-category-card" key={tag.id} to={`/events?tag=${tag.slug}`}>
                <span className="corp-category-icon">
                  <Icon size={22} />
                </span>
                <strong>{tag.name}</strong>
                <span>{language === "tr" ? turkishCategoryCopy[tag.slug] ?? "İlgili insanları ve etkinlikleri keşfet." : meta.copy}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="corp-section corp-section-muted">
        <div className="corp-section-head corp-section-head-center">
          <div>
            <h2>{c.cities}</h2>
            <p>{c.citiesCopy}</p>
          </div>
        </div>
        <div className="corp-city-grid">
          {popularCities.map((city) => (
            <Link className="corp-city-card" key={city.name} to="/events">
              <MapPin size={18} />
              <strong>{city.name}</strong>
              <span>{city.country}</span>
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
            <strong>{c.discoverEvents}</strong>
            <p>{c.discoverEventsCopy}</p>
            <Link className="corp-link" to="/events">
              {c.start}
            </Link>
          </article>
          <article>
            <UserPlus size={28} />
            <strong>{c.findPeople}</strong>
            <p>{c.findPeopleCopy}</p>
          </article>
          <article>
            <Sparkles size={28} />
            <strong>{c.host}</strong>
            <p>{c.hostCopy}</p>
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
