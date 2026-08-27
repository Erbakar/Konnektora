import { ArrowLeft, Home, SearchX } from "lucide-react";
import { Link } from "react-router-dom";

type NotFoundKind = "event" | "place" | "page";

const copy: Record<NotFoundKind, { eyebrow: string; title: string; body: string }> = {
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
};

export function NotFoundPage({ kind = "page" }: { kind?: NotFoundKind }) {
  const content = copy[kind];

  return (
    <section className="page not-found-page" role="status">
      <SearchX aria-hidden="true" size={42} />
      <p className="eyebrow">{content.eyebrow}</p>
      <h1>{content.title}</h1>
      <p>{content.body}</p>
      <div className="row-actions">
        {kind !== "page" ? (
          <Link className="secondary-action" to={kind === "event" ? "/events" : "/places"}>
            <ArrowLeft size={17} /> Listeye dön
          </Link>
        ) : null}
        <Link className="primary-action" to="/">
          <Home size={17} /> Ana sayfa
        </Link>
      </div>
    </section>
  );
}
