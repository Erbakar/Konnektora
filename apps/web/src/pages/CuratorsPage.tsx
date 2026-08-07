import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Send,
} from "lucide-react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getCuratorDashboard,
  getUserSession,
  submitCuratorApplication,
} from "../lib/api";

export function CuratorsPage() {
  const user = getUserSession();
  const [params] = useSearchParams();
  const dashboard = useQuery({
    queryKey: ["curator-dashboard", user?.id],
    queryFn: getCuratorDashboard,
    enabled: user?.role === "curator",
    retry: false,
  });
  const apply = useMutation({ mutationFn: submitCuratorApplication });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    apply.mutate(
      {
        name: String(form.get("name")),
        email: String(form.get("email")),
        city: String(form.get("city")),
        country: String(form.get("country") || "") || undefined,
        motivation: String(form.get("motivation")),
        cvUrl: String(form.get("cvUrl") || "") || undefined,
      },
      { onSuccess: () => event.currentTarget.reset() },
    );
  }
  if (user?.role === "curator" && dashboard.data)
    return (
      <main className="page curator-page">
        <header>
          <span className="eyebrow">Küratör çalışma alanı</span>
          <h1>{dashboard.data.city} topluluğu</h1>
          <p>
            Şehrindeki etkinlikleri, mekânları, organizatörleri ve gelir
            görünümünü tek yerden takip et.
          </p>
        </header>
        <section className="curator-metrics">
          <article>
            <CalendarDays />
            <strong>{dashboard.data.events.length}</strong>
            <span>etkinlik</span>
          </article>
          <article>
            <MapPin />
            <strong>{dashboard.data.places.length}</strong>
            <span>mekân</span>
          </article>
          <article>
            <Building2 />
            <strong>{dashboard.data.organizers.length}</strong>
            <span>organizatör</span>
          </article>
          <article>
            <BarChart3 />
            <strong>
              {new Intl.NumberFormat("tr-TR", {
                style: "currency",
                currency: "TRY",
              }).format(dashboard.data.revenue.platformRevenue)}
            </strong>
            <span>platform geliri</span>
          </article>
        </section>
        <div className="curator-columns">
          <section>
            <h2>Şehir etkinlikleri</h2>
            {dashboard.data.events.map((event) => (
              <Link key={event.id} to={`/events/${event.slug}`}>
                <strong>{event.title}</strong>
                <span>
                  {event.status} ·{" "}
                  {new Date(event.startsAt).toLocaleDateString("tr-TR")}
                </span>
              </Link>
            ))}
          </section>
          <section>
            <h2>Mekânlar ve organizatörler</h2>
            {dashboard.data.places.map((place) => (
              <Link key={place.id} to={`/places/${place.slug}`}>
                <strong>{place.name}</strong>
                <span>{place.createdBy?.name}</span>
              </Link>
            ))}
            {dashboard.data.organizers.map((organizer) => (
              <article key={organizer.id}>
                <strong>{organizer.companyName || organizer.name}</strong>
                <span>{organizer.businessCategory || "Organizatör"}</span>
              </article>
            ))}
          </section>
        </div>
      </main>
    );
  return (
    <main className="curator-recruitment">
      <section>
        <span className="eyebrow">Küratörler aranıyor</span>
        <h1>Şehrindeki Konnektora topluluğuna yön ver.</h1>
        <p>
          Küratörler şehirlerindeki etkinlik, mekân ve organizatör ekosisteminin
          büyümesine yardımcı olur; resmi buluşmalar düzenler ve yerel
          gelirlerden pay kazanır.
        </p>
      </section>
      <section className="curator-role-grid">
        {[
          "Organizatörler ve mekânlarla iletişim kur",
          "Yerel etkinlikleri sisteme kazandır",
          "Resmî topluluk buluşmaları düzenle",
          "Konnektora’yı aktif kullan ve topluluğu büyüt",
        ].map((item) => (
          <article key={item}>
            <CheckCircle2 />
            <strong>{item}</strong>
          </article>
        ))}
      </section>
      <section className="curator-application">
        <div>
          <h2>Hemen başvur</h2>
          <p>Motivasyon mektubunu ve özgeçmiş bağlantını bize gönder.</p>
        </div>
        {apply.isSuccess ? (
          <div className="form-success">
            <CheckCircle2 /> Başvurun alındı. Ekibimiz seninle iletişime
            geçecek.
          </div>
        ) : (
          <form onSubmit={submit}>
            <label>
              Ad soyad
              <input
                name="name"
                defaultValue={user?.name}
                required
                minLength={2}
              />
            </label>
            <label>
              E-posta
              <input
                name="email"
                type="email"
                defaultValue={user?.email}
                required
              />
            </label>
            <div>
              <label>
                Şehir
                <input
                  name="city"
                  defaultValue={params.get("city") ?? ""}
                  required
                />
              </label>
              <label>
                Ülke
                <input name="country" />
              </label>
            </div>
            <label>
              Motivasyon mektubu
              <textarea
                name="motivation"
                required
                minLength={50}
                placeholder="Neden şehrinin Konnektora küratörü olmak istediğini anlat…"
              />
            </label>
            <label>
              Özgeçmiş bağlantısı
              <input name="cvUrl" type="url" placeholder="https://…" />
            </label>
            <button className="primary-action" disabled={apply.isPending}>
              <Send size={17} />
              {apply.isPending ? "Gönderiliyor…" : "Başvuruyu gönder"}
            </button>
            {apply.isError ? (
              <p className="form-error">Başvuru gönderilemedi.</p>
            ) : null}
          </form>
        )}
      </section>
    </main>
  );
}
