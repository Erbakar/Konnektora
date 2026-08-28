import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Globe2,
  Hash,
  MapPin,
  Megaphone,
  Search,
  Sparkles,
  TrendingUp,
  UserRoundPlus,
  UserPlus,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { HomeEventTile } from "../components/HomeEventTile";
import { PlaceCard } from "../components/PlaceCard";
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
          lead: "Konnektora, insanların ilgi alanları, etkinlikler, mekânlar ve ortak tutkular üzerinden birbirlerini keşfetmesini ve gerçek hayatta bağlantı kurmasını sağlayan sosyal keşif platformudur. İnsanlar nelerle ilgileniyor, ne yapmak istiyor ve bunu kimlerle birlikte yapabilir sorusuna odaklanır.",
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
          online: "Yaklaşan çevrim içi etkinlikler",
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
          connections: "Markalarınızı Konnektora'ya taşıyın.",
          connectionsCopy:
            "Kurumsal üyelik, mekân ve etkinlik oluşturmak ve bağlantılarınızı buraya taşımak için sunduğumuz araçlar ücretsiz. Kişiselleştirebileceğiniz özel davetli listelerini check-in sırasında görmek ya da işinizi büyütmek için ihtiyaç duyduğunuz gelişmiş istatistikler ile yapay zekâ içgörüleri için daha fazlasını keşfedin.",
          joinCommunity: "Topluluğa katıl",
          curatedEvents: "seçilmiş etkinlik",
          activeTags: "aktif ilgi alanı",
          global: "çoklu dil ile varsayılan olarak global",
          finalTitle: "Kapılar açılmadan önce ağını kur.",
          finalCopy:
            "Konnektora; gerçek etkinlikler için yeterli yapıya, doğru kullanıcılarla gelişmek için gereken odağa sahip kontrollü bir topluluk deneyimi sunar.",
          openFeed: "Etkinlik akışını aç",
        }
      : {
          eyebrow: "The curated community platform",
          title: "From interests to real-life connections.",
          lead: "Konnektora is a social discovery platform that helps people discover one another through interests, events, places and shared passions, then connect in real life. It focuses on what people care about, what they want to do and who they can do it with.",
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
          connections: "Bring your brands to Konnektora.",
          connectionsCopy:
            "Business membership and the tools for creating places and events and bringing your connections here are free. Explore more for custom guest lists at check-in, advanced analytics and AI insights that help grow your business.",
          joinCommunity: "Join the community",
          curatedEvents: "curated events",
          activeTags: "active tags",
          global: "multilingual and global by default",
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
    queryKey: ["events", "home", "popular", discovery?.city, discovery?.country],
    queryFn: () => listEvents(new URLSearchParams({ scope: "popular", pageSize: "8", ...(discovery?.city ? { city: discovery.city } : {}), ...(discovery?.country ? { country: discovery.country } : {}) })),
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
    return announcement.target === "all" && !localStorage.getItem(`konnektora_announcement_done_${announcement.id}`) && !sessionStorage.getItem(`konnektora_announcement_later_${announcement.id}`);
  });
  const announcementCopy = activeAnnouncement ? localizeAnnouncement(activeAnnouncement.title, activeAnnouncement.body, language, activeAnnouncement.titleEn, activeAnnouncement.bodyEn) : null;
  const dismissAnnouncement = (mode: "done" | "later") => {
    if (!activeAnnouncement) return;
    const storage = mode === "done" ? localStorage : sessionStorage;
    storage.setItem(`konnektora_announcement_${mode}_${activeAnnouncement.id}`, "1");
    setAnnouncementRevision((value) => value + 1);
  };
  const memberAnnouncements = !user
    ? []
    : language === "tr"
      ? user.accountType === "corporate"
        ? [
            <><Link to={`/users/id/${user.id}`}>Profiline etiketler ekle</Link>yerek devam et; çalıştığın sanatçı ve markaların <Link to="/tags">etiket sayfalarına</Link> içerik yazmayı unutma.</>,
            <>Mekânlarını oluştur, ayarlarını kişiselleştir ve <Link to="/contacts">bağlantılarını buraya taşı</Link>.</>,
            <><Link to="/finance/kyc">Kimliğini güvenle doğrula</Link>, doğrulanmış simgesini kazan ve sunduğumuz hizmetler için <Link to="/business">İşletmeler için</Link> sayfasını incele.</>,
          ]
        : [
            <>Üyesin; şimdi içerideki <Link to="/contacts">arkadaşlarını bul ve diğerlerini davet et</Link>.</>,
            <>Kendin ile arkadaşlarının profillerine <Link to={`/users/id/${user.id}`}>etiketler ekle</Link>yerek tarzınızı ifade edin; sevdiğiniz mekânları takip edin.</>,
            <><Link to="/settings">Ayarlarını kişiselleştirerek</Link> tercihlerine göre sosyalleşmeye başla.</>,
          ]
      : user.accountType === "corporate"
        ? [
            <>Start by <Link to={`/users/id/${user.id}`}>adding tags to your profile</Link>, and contribute to the <Link to="/tags">tag pages</Link> for the artists and brands you work with.</>,
            <>Create your venues, personalize their settings and <Link to="/contacts">bring your connections here</Link>.</>,
            <><Link to="/finance/kyc">Verify your identity securely</Link>, earn the verified badge and explore our <Link to="/business">For business</Link> services.</>,
          ]
        : [
            <>You are in; now <Link to="/contacts">find friends already here and invite others</Link>.</>,
            <>Express your style by <Link to={`/users/id/${user.id}`}>adding tags</Link> to your profile and your friends' profiles, and follow the venues you like.</>,
            <>Personalize your <Link to="/settings">settings</Link> and start connecting based on your preferences.</>,
          ];

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
            {user ? <Link className="corp-btn corp-btn-secondary" to="/tags">{language === "tr" ? "İlgi alanlarını gör" : "View your interests"}</Link> : <a className="corp-btn corp-btn-secondary" href={publicSiteHref("/onboarding")}>{c.join}</a>}
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
        <section className="corp-announcements" aria-label={language === "tr" ? "Üye duyuruları" : "Member announcements"}>
          {memberAnnouncements.map((message, index) => (
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

      {activeAnnouncement && announcementCopy ? (
        <div className="emotion-modal announcement-modal" onMouseDown={() => dismissAnnouncement("later")} role="presentation">
          <section aria-describedby="active-announcement-description" aria-labelledby="active-announcement-title" aria-modal="true" className="announcement-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <aside className="announcement-visual" aria-hidden="true">
              <span className="announcement-new-badge">{language === "tr" ? "YENİ" : "NEW"}</span>
              <img className="announcement-art" src="/media/announcement-community-discovery-v1.webp" alt="" />
              <strong>Konnektora</strong>
              <small>{language === "tr" ? "Toplulukta yeni bir gelişme var." : "Something new is happening in the community."}</small>
            </aside>
            <div className="announcement-content">
              <button className="announcement-close" aria-label={language === "tr" ? "Kapat" : "Close"} onClick={() => dismissAnnouncement("later")} type="button"><X size={20}/></button>
              <p className="announcement-eyebrow"><span />{announcementCopy.eyebrow}</p>
              <h2 id="active-announcement-title">{announcementCopy.title}</h2>
              <p className="announcement-description" id="active-announcement-description"><RichText text={announcementCopy.body}/></p>
              {announcementCopy.highlights?.length ? <div className="announcement-highlights">{announcementCopy.highlights.map((highlight) => <article key={highlight.title}><span><Sparkles size={15}/></span><div><strong>{highlight.title}</strong><small>{highlight.body}</small></div></article>)}</div> : null}
              <div className="announcement-actions">
                {announcementCopy.primaryHref ? <Link className="announcement-primary-action" onClick={() => dismissAnnouncement("done")} to={announcementCopy.primaryHref}>{announcementCopy.primaryLabel}<ArrowRight size={18}/></Link> : <button className="announcement-primary-action" onClick={() => dismissAnnouncement("done")} type="button">{announcementCopy.primaryLabel}</button>}
                <button className="announcement-secondary-action" onClick={() => dismissAnnouncement("later")} type="button">{language === "tr" ? "Sonra hatırlat" : "Remind me later"}</button>
              </div>
            </div>
          </section>
        </div>
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
            <a className="discovery-search-action" href={publicSiteHref("/community")}>
              {c.discoverCommunity} <ArrowRight size={18} />
            </a>
            <span className="active-community-count">
              <i />
              {Math.max(discovery.activeUserCount, new Set([...discovery.popularMembers, ...discovery.newMembers].map((member) => member.id)).size)} {language === "tr" ? "aktif üye" : "active members"}
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
        <div className="corp-carousel" aria-label={language === "tr" ? "Öne çıkan etkinlikler" : "Featured events"}>
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

      {popularEvents.length ? <section className="corp-section"><div className="corp-section-head"><div><h2>{language === "tr" ? discovery?.location ? `${discovery.location} yakınında popüler etkinlikler` : "Popüler etkinlikler" : discovery?.location ? `Popular events near ${discovery.location}` : "Popular events"}</h2><p>{language === "tr" ? "Konumuna ve topluluk ilgisine göre öne çıkan buluşmalar." : "Gatherings highlighted for your location and community interests."}</p></div><Link className="corp-link" to="/events?scope=popular">{c.allEvents}<ArrowRight size={18}/></Link></div><div className="corp-carousel">{popularEvents.map((event) => <HomeEventTile event={event} key={event.id}/>)}</div></section> : null}

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
              : "While browsing profiles, use AI-assisted compatibility insights and even get suggestions for events you could attend together. Messaging is free, too."}
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
            {(discovery?.trendingTags.length ? discovery.trendingTags : tags.slice().sort((a, b) => b.usageCount - a.usageCount).slice(0, 10).map((tag) => ({ id: tag.id, href: `/tags/${tag.slug}`, title: tag.name }))).map((item) => <Link key={item.id} to={item.href}>#{item.title.replace(/^#/, "")}</Link>)}
          </div>
        </section>

      {recentPlaces?.items.length ? (
        <section className="corp-section corp-section-muted">
          <div className="corp-section-head">
            <div><h2>{language === "tr" ? "Yeni eklenen mekânlar" : "Recently added places"}</h2><p>{language === "tr" ? "Topluluğa en son katılan mekânları keşfet." : "Discover the newest places in the community."}</p></div>
            <Link className="corp-link" to="/places">{language === "tr" ? "Tüm mekânlar" : "All places"}<ArrowRight size={18}/></Link>
          </div>
          <div className="corp-carousel">
            {recentPlaces.items.map((place) => <PlaceCard key={place.id} place={place} />)}
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
                  ? language === "tr" ? "ve diğerleri" : "and more"
                  : city.name}
              </strong>
              <span>
                {index === popularCities.length - 1
                  ? language === "tr" ? "Kendi şehrinde başvur" : "Apply in your city"
                  : language === "tr" ? localizeCountry(city.country) : city.country}
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
          <p className="corp-eyebrow">{c.communityFirst}</p>
          <h2>{c.connections}</h2>
          <p>{c.connectionsCopy}</p>
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
            <span>{c.global}</span>
          </div>
        </div>
      </section>

      <section className="corp-cta-band">
        <div>
          <h2>{c.finalTitle}</h2>
          <p>{c.finalCopy}</p>
        </div>
        <div className="corp-cta-memberships"><button className="corp-btn corp-btn-light" onClick={() => user ? setSignupChoice("individual") : navigateToSignup("individual")} type="button">{language === "tr" ? "Bireysel üyelik" : "Individual membership"}<ArrowRight size={18}/></button><button className="corp-btn corp-btn-light" onClick={() => user ? setSignupChoice("corporate") : navigateToSignup("corporate")} type="button">{language === "tr" ? "Kurumsal üyelik" : "Business membership"}<ArrowRight size={18}/></button></div>
      </section>
      {signupChoice ? <div className="dialog-backdrop" role="presentation" onMouseDown={() => setSignupChoice(null)}><section aria-modal="true" className="content-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog"><h2>{language === "tr" ? "Zaten üyesiniz" : "You are already a member"}</h2><p>{language === "tr" ? "Farklı bir üyelik için çıkış yapmak ister misiniz?" : "Would you like to log out and choose a different membership?"}</p><div className="row-actions"><button aria-label={language === "tr" ? "Kapat" : "Close"} className="ghost-action" onClick={() => setSignupChoice(null)} type="button">{language === "tr" ? "Vazgeç" : "Cancel"}</button><button className="primary-action" onClick={() => { const choice = signupChoice; clearUserSession(); navigateToSignup(choice); }} type="button">{language === "tr" ? "Çıkış yap" : "Log out"}</button></div></section></div> : null}
    </div>
  );
}

function navigateToSignup(account: "individual" | "corporate") {
  window.location.assign(publicSiteHref(`/onboarding?account=${account}`));
}

function localizeAnnouncement(title: string, body: string, language: "tr" | "en", titleEn?: string | null, bodyEn?: string | null) {
  const normalizedTitle = title
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  if (normalizedTitle.includes("ikinci bir duyuru basligi") || normalizedTitle.includes("bir duyuru basligidir")) {
    return language === "tr"
      ? {
          eyebrow: "Keşif deneyimi yenilendi",
          title: "Şehrindeki doğru etkinlikleri daha kolay keşfet",
          body: "Etkinlikler sayfasını daha düzenli ve hızlı bir keşif deneyimi sunacak şekilde yeniledik. Sana uygun buluşmaları artık tek bakışta inceleyebilirsin.",
          primaryLabel: "Etkinlikleri keşfet",
          primaryHref: "/events",
          highlights: [
            { title: "Düzenli akış", body: "Her sayfada 15 seçilmiş etkinlik" },
            { title: "Akıllı filtreler", body: "Şehir, tarih ve formata göre daralt" },
            { title: "Gerçek bağlantılar", body: "Toplulukla birlikte katıl" },
          ],
        }
      : {
          eyebrow: "A better discovery experience",
          title: "Discover the right events in your city, faster",
          body: "We redesigned the Events page to make discovery clearer and faster. You can now review the most relevant gatherings at a glance.",
          primaryLabel: "Explore events",
          primaryHref: "/events",
          highlights: [
            { title: "A clearer feed", body: "15 curated events on every page" },
            { title: "Smart filters", body: "Narrow by city, date and format" },
            { title: "Real connections", body: "Join alongside the community" },
          ],
        };
  }
  return {
    eyebrow: language === "tr" ? "Topluluk duyurusu" : "Community update",
    title: language === "en" ? titleEn?.trim() || title : title,
    body: language === "en" ? bodyEn?.trim() || body : body,
    primaryLabel: language === "tr" ? "Anladım" : "Got it",
    primaryHref: null,
    highlights: null,
  };
}

function localizeCountry(country: string) {
  return ({
    "United Kingdom": "Birleşik Krallık",
    Germany: "Almanya",
    Netherlands: "Hollanda",
    France: "Fransa",
    "United States": "Amerika Birleşik Devletleri",
    Turkey: "Türkiye",
  } as Record<string, string>)[country] ?? country;
}
