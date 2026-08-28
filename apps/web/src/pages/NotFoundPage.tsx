import { ArrowLeft, Home, SearchX } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../lib/i18n";

type NotFoundKind = "event" | "place" | "page";

const copy: Record<"tr" | "en", Record<NotFoundKind, { eyebrow: string; title: string; body: string }>> = {
  tr: {
  event: {
    eyebrow: "Etkinlik bulunamadı",
    title: "Bu etkinlik artık burada değil.",
    body: "Etkinlik kaldırılmış, arşivlenmiş veya bağlantısı değişmiş olabilir.",
  },
  place: {
    eyebrow: "Mekân bulunamadı",
    title: "Bu mekâna ulaşılamıyor.",
    body: "Mekân kaldırılmış, gizlenmiş veya bağlantısı değişmiş olabilir.",
  },
  page: {
    eyebrow: "404 · Sayfa bulunamadı",
    title: "Aradığın sayfa burada değil.",
    body: "Bağlantı hatalı veya sayfa taşınmış olabilir. Ana sayfadan devam edebilirsin.",
  },
  },
  en: {
    event: {
      eyebrow: "Event not found",
      title: "This event is no longer here.",
      body: "The event may have been removed, archived or moved to a different address.",
    },
    place: {
      eyebrow: "Place not found",
      title: "This place cannot be reached.",
      body: "The place may have been removed, hidden or moved to a different address.",
    },
    page: {
      eyebrow: "404 · Page not found",
      title: "The page you are looking for is not here.",
      body: "The link may be incorrect or the page may have moved. You can continue from the home page.",
    },
  },
};

export function NotFoundPage({ kind = "page" }: { kind?: NotFoundKind }) {
  const { language } = useLanguage();
  const content = copy[language][kind];

  return (
    <section className="page not-found-page" role="status">
      <SearchX aria-hidden="true" size={42} />
      <p className="eyebrow">{content.eyebrow}</p>
      <h1>{content.title}</h1>
      <p>{content.body}</p>
      <div className="row-actions">
        {kind !== "page" ? (
          <Link className="secondary-action" to={kind === "event" ? "/events" : "/places"}>
            <ArrowLeft size={17} /> {language === "tr" ? "Listeye dön" : "Back to list"}
          </Link>
        ) : null}
        <Link className="primary-action" to="/">
          <Home size={17} /> {language === "tr" ? "Ana sayfa" : "Home"}
        </Link>
      </div>
    </section>
  );
}
