import { Link } from "react-router-dom";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <img alt="Konnektora" src="/brand/konnektora-logo.svg" />
          <p>The curated community platform for global events, trusted guest lists and meaningful connections.</p>
        </div>
        <div className="site-footer-columns">
          <div>
            <strong>Discover</strong>
            <Link to="/events">Events</Link>
            <Link to="/events?tag=startup">Tags</Link>
            <Link to="/events?tag=networking">Networking</Link>
          </div>
          <div>
            <strong>Community</strong>
            <Link to="/events?tag=founder">Founders</Link>
            <Link to="/events?tag=yatirim">Investment</Link>
            <Link to="/admin">Organizer tools</Link>
          </div>
          <div>
            <strong>Konnektora</strong>
            <a href="https://github.com/Erbakar/Konnektora" rel="noreferrer" target="_blank">
              GitHub
            </a>
            <Link to="/admin">Admin login</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
      <div className="site-footer-bottom">
        <span>© {new Date().getFullYear()} Konnektora</span>
        <span>Closed beta · EU MVP</span>
      </div>
    </footer>
  );
}
