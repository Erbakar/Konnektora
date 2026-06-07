import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Globe2, MapPin, ShieldCheck, Sparkles, Tag, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { EventCard } from "../components/EventCard";
import { listEvents, listTags } from "../lib/api";

const categoryCopy: Record<string, string> = {
  startup: "Demo nights, product clinics and builder sessions.",
  networking: "Curated rooms for meaningful professional connections.",
  yatirim: "Investor AMAs, funding clinics and capital roundtables.",
  founder: "Founder circles, matching labs and accountability groups."
};

export function HomePage() {
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["events", "home"],
    queryFn: () => listEvents()
  });
  const { data: tags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ["tags", "home"],
    queryFn: listTags
  });

  const onlineEvents = events.filter((event) => event.format === "online").slice(0, 4);
  const upcomingEvents = events.slice(0, 6);
  const cityCount = new Set(events.map((event) => event.city).filter(Boolean)).size;

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">Closed community for global events</p>
          <h1>Find the right rooms before they become crowded.</h1>
          <p className="lead">
            Konnektora brings founders, operators, investors and community builders into curated
            events where attendance, invites and follow-ups are managed in one trusted network.
          </p>
          <div className="hero-actions">
            <Link className="primary-action" to="/events">
              Explore events
              <ArrowRight size={18} />
            </Link>
            <Link className="secondary-action" to="/admin">
              Manage community
            </Link>
          </div>
          <div className="hero-trust-row" aria-label="Konnektora MVP highlights">
            <span>
              <ShieldCheck size={16} />
              Closed beta
            </span>
            <span>
              <Globe2 size={16} />
              Global by default
            </span>
            <span>
              <Users size={16} />
              Organizer-led guest lists
            </span>
          </div>
        </div>
        <aside className="hero-command-panel" aria-label="Konnektora live community snapshot">
          <div className="command-panel-header">
            <img alt="Konnektora" src="/brand/konnektora-logo.svg" />
            <span>Live MVP</span>
          </div>
          <div className="hero-stat-grid">
            <div>
              <strong>{eventsLoading ? "-" : events.length}</strong>
              <span>curated events</span>
            </div>
            <div>
              <strong>{tagsLoading ? "-" : tags.length}</strong>
              <span>active tags</span>
            </div>
            <div>
              <strong>{cityCount || "Global"}</strong>
              <span>cities</span>
            </div>
          </div>
          <div className="hero-next-event">
            <span>Next up</span>
            <strong>{events[0]?.title ?? "Community event"}</strong>
            <small>{events[0] ? [events[0].city, events[0].country].filter(Boolean).join(", ") || "Online" : "Loading"}</small>
          </div>
        </aside>
      </section>

      <section className="home-band">
        <div className="section-header">
          <div>
            <p className="eyebrow">Discover</p>
            <h2>Events built around intent</h2>
          </div>
          <Link to="/events">See all events</Link>
        </div>
        <div className="event-grid featured-events">
          {upcomingEvents.slice(0, 3).map((event) => (
            <EventCard event={event} key={event.id} />
          ))}
        </div>
      </section>

      <section className="home-band split-band">
        <div>
          <p className="eyebrow">Explore tags</p>
          <h2>Start with what you are looking for.</h2>
          <p className="section-copy">
            Tags are the discovery layer of Konnektora. They connect people, event formats and
            guest-list intent without turning the product into a generic public directory.
          </p>
        </div>
        <div className="category-grid">
          {tags.map((tag) => (
            <Link className="category-card" key={tag.id} to={`/events?tag=${tag.slug}`}>
              <Tag size={20} />
              <strong>{tag.name}</strong>
              <span>{categoryCopy[tag.slug] ?? "Find relevant people and events."}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-band">
        <div className="section-header">
          <div>
            <p className="eyebrow">Online and local</p>
            <h2>Join from anywhere, meet where it matters.</h2>
          </div>
        </div>
        <div className="compact-event-list">
          {(onlineEvents.length ? onlineEvents : upcomingEvents.slice(0, 4)).map((event) => (
            <Link className="compact-event-row" key={event.id} to={`/events/${event.slug}`}>
              <div>
                <strong>{event.title}</strong>
                <span>
                  <CalendarDays size={15} />
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.startsAt))}
                </span>
              </div>
              <span>
                <MapPin size={15} />
                {[event.city, event.country].filter(Boolean).join(", ") || "Online"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-band how-it-works">
        <div className="section-header">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>A trusted loop for community-led events</h2>
          </div>
        </div>
        <div className="workflow-grid">
          <div>
            <Sparkles size={22} />
            <strong>Discover by tag</strong>
            <p>Members find events through intent-rich tags instead of broad public categories.</p>
          </div>
          <div>
            <Users size={22} />
            <strong>Request or get invited</strong>
            <p>Organizers control attendance with open, approval-required and invite-only modes.</p>
          </div>
          <div>
            <ShieldCheck size={22} />
            <strong>Manage the room</strong>
            <p>Guest lists, roles and check-in flows keep the community focused and accountable.</p>
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div>
          <p className="eyebrow">Closed beta</p>
          <h2>Build the network before opening the doors.</h2>
          <p>
            Konnektora is currently shaped for a controlled community launch: enough structure for
            real events, enough focus to fix bugs and improve the product with the right users.
          </p>
        </div>
        <Link className="primary-action" to="/events">
          Open event feed
          <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
