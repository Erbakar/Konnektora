import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Briefcase,
  Globe2,
  Lightbulb,
  MapPin,
  Rocket,
  Search,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { HomeEventTile } from "../components/HomeEventTile";
import { listEvents, listTags } from "../lib/api";

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
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["events", "home"],
    queryFn: () => listEvents()
  });
  const { data: tags = [] } = useQuery({
    queryKey: ["tags", "home"],
    queryFn: listTags
  });

  const localEvents = events.filter((event) => event.city).slice(0, 8);
  const onlineEvents = events.filter((event) => event.format === "online").slice(0, 8);
  const featuredEvents = events.slice(0, 8);

  return (
    <div className="corp-home">
      <section className="corp-hero">
        <div className="corp-hero-inner">
          <p className="corp-eyebrow">The curated community platform</p>
          <h1>
            Where intent becomes
            <span> trusted connections.</span>
          </h1>
          <p className="corp-hero-lead">
            From startup demos to investor roundtables, Konnektora helps founders, operators and
            community builders discover events, manage guest lists and grow meaningful networks in one
            closed platform.
          </p>
          <div className="corp-hero-actions">
            <Link className="corp-btn corp-btn-primary" to="/events">
              Explore events
            </Link>
            <Link className="corp-btn corp-btn-secondary" to="/admin">
              Join the beta
            </Link>
          </div>
        </div>
      </section>

      <section className="corp-section">
        <div className="corp-section-head">
          <div>
            <h2>
              Events across <span className="corp-accent">Europe & beyond</span>
            </h2>
            <p>Curated rooms for builders, investors and community leaders.</p>
          </div>
          <Link className="corp-link" to="/events">
            See all events
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="corp-carousel" aria-label="Featured events">
          {eventsLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div className="home-event-tile home-event-tile-skeleton" key={index} />
              ))
            : (localEvents.length ? localEvents : featuredEvents).map((event) => (
                <HomeEventTile event={event} key={event.id} />
              ))}
        </div>
      </section>

      <section className="corp-section corp-section-muted">
        <div className="corp-section-head">
          <div>
            <h2>Upcoming online events</h2>
            <p>Join from anywhere. Meet where it matters.</p>
          </div>
          <Link className="corp-link" to="/events">
            See all events
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
            <h2>Explore top categories</h2>
            <p>Start with what you are looking for.</p>
          </div>
        </div>
        <div className="corp-category-grid">
          {tags.map((tag) => {
            const meta = categoryMeta[tag.slug] ?? { icon: Briefcase, copy: "Find relevant people and events." };
            const Icon = meta.icon;

            return (
              <Link className="corp-category-card" key={tag.id} to={`/events?tag=${tag.slug}`}>
                <span className="corp-category-icon">
                  <Icon size={22} />
                </span>
                <strong>{tag.name}</strong>
                <span>{meta.copy}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="corp-section corp-section-muted">
        <div className="corp-section-head corp-section-head-center">
          <div>
            <h2>Popular cities on Konnektora</h2>
            <p>We are building a global network, city by city.</p>
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
            <h2>How Konnektora works</h2>
            <p>A trusted loop for community-led events.</p>
          </div>
        </div>
        <div className="corp-steps">
          <article>
            <Search size={28} />
            <strong>Discover events and groups</strong>
            <p>See who is hosting curated events for the topics you care about.</p>
            <Link className="corp-link" to="/events">
              Start exploring
            </Link>
          </article>
          <article>
            <UserPlus size={28} />
            <strong>Find your people</strong>
            <p>Connect over shared interests through tags, invites and approval flows.</p>
          </article>
          <article>
            <Sparkles size={28} />
            <strong>Host with confidence</strong>
            <p>Create events, manage guest lists and keep your community accountable.</p>
            <Link className="corp-link" to="/admin">
              Organizer tools
            </Link>
          </article>
        </div>
      </section>

      <section className="corp-proof">
        <div className="corp-proof-copy">
          <p className="corp-eyebrow">Community-first</p>
          <h2>Connections are made on Konnektora</h2>
          <p>
            Members use Konnektora to meet the right people, join curated rooms, get invited to the
            right events and build professional relationships before the crowd arrives.
          </p>
          <Link className="corp-btn corp-btn-primary" to="/events">
            Join the community
          </Link>
        </div>
        <div className="corp-proof-stats">
          <div>
            <strong>{events.length || "15+"}</strong>
            <span>curated events</span>
          </div>
          <div>
            <strong>{tags.length || "4"}</strong>
            <span>active tags</span>
          </div>
          <div>
            <strong>
              <Globe2 size={28} />
            </strong>
            <span>global by default</span>
          </div>
        </div>
      </section>

      <section className="corp-cta-band">
        <div>
          <h2>Build the network before opening the doors.</h2>
          <p>
            Konnektora is shaped for a controlled community launch with enough structure for real
            events and enough focus to improve with the right users.
          </p>
        </div>
        <Link className="corp-btn corp-btn-light" to="/events">
          Open event feed
          <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
