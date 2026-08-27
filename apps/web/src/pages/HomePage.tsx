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
import { useEffect, useState } from "react";
import { HomeEventTile } from "../components/HomeEventTile";
import { DiscoveryCard } from "../components/DiscoveryCard";
import { RichText } from "../components/RichText";
import {
  getDiscoveryFeed,
  clearUserSession,
  getUserSession,
  listAnnouncements,
  listEvents,
  listPlaces,
  listTags,
} from "../lib/api";
import { publicSiteHref } from "../lib/domains";
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
  const user = getUserSession();
  const [signupChoice, setSignupChoice] = useState<"individual" | "corporate" | null>(null);
  const [announcementRevision, setAnnouncementRevision] = useState(0);
  const [trendScope, setTrendScope] = useState<"local" | "global">("local");
  const c =
    language === "tr"
      ? {
          eyebrow: "Seçkin topluluk platformu",
          title: "İlgi alanlarından gerçek hayattaki bağlantılara.",
          lead: "Konnektora, insanların ilgi alanları, etkinlikler, mekanlar ve ortak tutkular üzerinden birbirlerini keşfetmesini ve gerçek hayatta bağlantı kurmasını sağlayan sosyal keşif platformudur. İnsanlar nelerle ilgileniyor, ne yapmak istiyor ve bunu kimlerle birlikte yapabilir sorusuna odaklanır.",
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
    queryFn: () => listTags(),
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
    placeholderData: (previous) => previous,
  });
  useEffect(() => {
    if (trendScope === "local" && discovery && !discovery.trendingTags.length) setTrendScope("global");
  }, [discovery, trendScope]);
  const { data: popularEventList } = useQuery({
    queryKey: ["events", "home", "popular", discovery?.location],
    queryFn: () => listEvents(new URLSearchParams({ scope: "popular", pageSize: "8", ...(discovery?.location ? { city: discovery.location } : {}) })),
    enabled: discovery !== undefined,
  });
  const events = eventList?.items ?? [];

  const localEvents = events.filter((event) => event.city).slice(0, 8);
  const onlineEvents = events
    .filter((event) => event.format === "online")
    .slice(0, 8);
  const featuredEvents = events.slice(0, 8);
  const popularEvents = popularEventList?.items ?? [];
  const activeAnnouncement = announcements.find((announcement) => {
    void announcementRevision;
    return !localStorage.getItem(`konnektora_announcement_done_${announcement.id}`) && !sessionStorage.getItem(`konnektora_announcement_later_${announcement.id}`);
  });

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
            {user ? <Link className="corp-btn corp-btn-secondary" to="/tags">İlgi Alanlarını Gör</Link> : <a className="corp-btn corp-btn-secondary" href={publicSiteHref("/onboarding")}>{c.join}</a>}
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

      {user ? (
        <section className="corp-announcements" aria-label="Announcements">
          {(user.accountType === "corporate" ? [
            <><Link to={`/users/id/${user.id}`}>Profiline etiketler ekle</Link>yerek devam et; çalıştığın sanatçı ve markaların <Link to="/tags">etiket sayfalarına</Link> içerik yazmayı unutma.</>,
            <>Mekânlarını oluştur, ayarlarını kişiselleştir ve <Link to="/contacts">bağlantılarını buraya taşı</Link>.</>,
            <><Link to="/finance/kyc">Kimliğini güvenle doğrula</Link>, verified ikonunu kazan ve sunduğumuz hizmetler için <Link to="/business">For business</Link> sayfasını incele.</>,
          ] : [
            <>Üyesin; şimdi içerideki <Link to="/contacts">arkadaşlarını bul ve diğerlerini davet et</Link>.</>,
            <>Kendin ile arkadaşlarının profillerine <Link to={`/users/id/${user.id}`}>etiketler ekle</Link>yerek tarzınızı ifade edin; sevdiğiniz mekânları takip edin.</>,
            <><Link to="/settings">Ayarlarını kişiselleştirerek</Link> tercihlerine göre sosyalleşmeye başla.</>,
          ]).map((message, index) => (
            <article className="corp-announcement" key={index}>
              <span>
                <Megaphone size={18} />
              </span>
              <div>
                <p>{message}</p>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {activeAnnouncement ? <div className="emotion-modal announcement-modal" role="dialog" aria-modal="true" aria-label="Duyuru"><div><span className="announcement-icon"><Megaphone size={24}/></span><h2>{activeAnnouncement.title}</h2><p><RichText text={activeAnnouncement.body}/></p><div className="row-actions"><button className="primary-action" onClick={() => { localStorage.setItem(`konnektora_announcement_done_${activeAnnouncement.id}`, "1"); setAnnouncementRevision((value) => value + 1); }} type="button">Tamam</button><button className="secondary-action" onClick={() => { sessionStorage.setItem(`konnektora_announcement_later_${activeAnnouncement.id}`, "1"); setAnnouncementRevision((value) => value + 1); }} type="button">Sonra hatırlat</button></div></div></div> : null}

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
            <a className="discovery-search-action" href={publicSiteHref("/community")}>
              {c.discoverCommunity} <ArrowRight size={18} />
            </a>
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

      {popularEvents.length ? <section className="corp-section"><div className="corp-section-head"><div><h2>{discovery?.location ? `${discovery.location} yakınında popüler etkinlikler` : "Popüler etkinlikler"}</h2><p>Konumuna ve topluluk ilgisine göre öne çıkan buluşmalar.</p></div><Link className="corp-link" to="/events?scope=popular">{c.allEvents}<ArrowRight size={18}/></Link></div><div className="corp-carousel">{popularEvents.map((event) => <HomeEventTile event={event} key={event.id}/>)}</div></section> : null}

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
              ? "Sen diğer profil sayfaları arasında gezinirken diğer kullanıcılarla uyumunu yapay zekâ desteğiyle görüp, AI'dan beraber katılabileceğin etkinlikler hakkında dahi akıl alabilirsin. Üstelik mesajlaşma ücretsiz."
              : "See the full community journey, from nearby events to trusted guest lists, in one place."}
          </p>
          {!user ? <a className="corp-btn corp-btn-primary" href={publicSiteHref("/onboarding")}>
            {c.joinCommunity}
          </a> : null}
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
            <Link className="corp-link" to="/tags">{language === "tr" ? "Etiketler" : "Tags"}</Link>
          </article>
          <article>
            <Sparkles size={28} />
            <strong>{c.host}</strong>
            <p>{language === "tr" ? "Etkinlik oluştur, davetli listelerini yönet, check-in sırasında listeleri gör ve topluluğunu güvenle büyüt." : c.hostCopy}</p>
            <Link className="corp-link" to="/business">
              {c.organizer}
            </Link>
          </article>
        </div>
      </section>

      <section className="corp-proof">
        <div className="corp-proof-copy">
          <p className="corp-eyebrow">{language === "tr" ? "Önce topluluk" : c.communityFirst}</p>
          <h2>{language === "tr" ? "Markalarınızı Konnektora'ya taşıyın." : c.connections}</h2>
          <p>{language === "tr" ? "Kurumsal üyelik, mekân ve etkinlik oluşturmak ve bağlantılarınızı buraya taşımak için sunduğumuz araçlar ücretsiz. Kişiselleştirebileceğiniz özel davetli listelerini check-in sırasında görmek ya da işinizi büyütmek için ihtiyaç duyduğunuz gelişmiş istatistikler ile AI içgörüleri için daha fazlasını keşfedin." : c.connectionsCopy}</p>
          <Link className="corp-btn corp-btn-primary" to="/business">
            {language === "tr" ? "Daha fazla" : "Learn more"}
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
            <span>{language === "tr" ? "çoklu dil ile varsayılan olarak global" : c.global}</span>
          </div>
        </div>
      </section>

      <section className="corp-cta-band">
        <div>
          <h2>{c.finalTitle}</h2>
          <p>{c.finalCopy}</p>
        </div>
        <div className="corp-cta-memberships"><button className="corp-btn corp-btn-light" onClick={() => user ? setSignupChoice("individual") : navigateToSignup("individual")} type="button">Bireysel üyelik<ArrowRight size={18}/></button><button className="corp-btn corp-btn-light" onClick={() => user ? setSignupChoice("corporate") : navigateToSignup("corporate")} type="button">Kurumsal üyelik<ArrowRight size={18}/></button></div>
      </section>
      {signupChoice ? <div className="dialog-backdrop" role="presentation" onMouseDown={() => setSignupChoice(null)}><section aria-modal="true" className="content-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog"><h2>Zaten üyesiniz</h2><p>Farklı bir üyelik için çıkış yapmak ister misiniz?</p><div className="row-actions"><button className="ghost-action" onClick={() => setSignupChoice(null)} type="button">Vazgeç</button><button className="primary-action" onClick={() => { const choice = signupChoice; clearUserSession(); navigateToSignup(choice); }} type="button">Çıkış yap</button></div></section></div> : null}
    </div>
  );
}

function navigateToSignup(account: "individual" | "corporate") {
  window.location.assign(publicSiteHref(`/onboarding?account=${account}`));
}
