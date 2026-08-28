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
import { useLanguage } from "../lib/i18n";

export function CuratorsPage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const locale = language === "tr" ? "tr-TR" : "en-GB";
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
      <div className="page curator-page">
        <header>
          <span className="eyebrow">{t("Küratör çalışma alanı", "Curator workspace")}</span>
          <h1>{dashboard.data.city} {t("topluluğu", "community")}</h1>
          <p>
            {t("Şehrindeki etkinlikleri, mekânları, organizatörleri ve gelir görünümünü tek yerden takip et.", "Track events, places, organisers and revenue in your city from one workspace.")}
          </p>
        </header>
        <section className="curator-metrics">
          <article>
            <CalendarDays />
            <strong>{dashboard.data.events.length}</strong>
            <span>{t("etkinlik", "events")}</span>
          </article>
          <article>
            <MapPin />
            <strong>{dashboard.data.places.length}</strong>
            <span>{t("mekân", "places")}</span>
          </article>
          <article>
            <Building2 />
            <strong>{dashboard.data.organizers.length}</strong>
            <span>{t("organizatör", "organisers")}</span>
          </article>
          <article>
            <BarChart3 />
            <strong>
              {new Intl.NumberFormat(locale, {
                style: "currency",
                currency: "TRY",
              }).format(dashboard.data.revenue.platformRevenue)}
            </strong>
            <span>{t("platform geliri", "platform revenue")}</span>
          </article>
        </section>
        <div className="curator-columns">
          <section>
            <h2>{t("Şehir etkinlikleri", "City events")}</h2>
            {dashboard.data.events.map((event) => (
              <Link key={event.id} to={`/events/${event.slug}`}>
                <strong>{event.title}</strong>
                <span>
                  {event.status} ·{" "}
                  {new Date(event.startsAt).toLocaleDateString(locale)}
                </span>
              </Link>
            ))}
          </section>
          <section>
            <h2>{t("Mekânlar ve organizatörler", "Places and organisers")}</h2>
            {dashboard.data.places.map((place) => (
              <Link key={place.id} to={`/places/${place.slug}`}>
                <strong>{place.name}</strong>
                <span>{place.createdBy?.name}</span>
              </Link>
            ))}
            {dashboard.data.organizers.map((organizer) => (
              <article key={organizer.id}>
                <strong>{organizer.companyName || organizer.name}</strong>
                <span>{organizer.businessCategory || t("Organizatör", "Organiser")}</span>
              </article>
            ))}
          </section>
        </div>
      </div>
    );
  return (
    <div className="curator-recruitment">
      <section>
        <span className="eyebrow">{t("Küratörler aranıyor", "We are looking for curators")}</span>
        <h1>{t("Şehrindeki Konnektora topluluğuna yön ver.", "Shape the Konnektora community in your city.")}</h1>
        <p>
          {t("Küratörler şehirlerindeki etkinlik, mekân ve organizatör ekosisteminin büyümesine yardımcı olur; resmi buluşmalar düzenler ve yerel gelirlerden pay kazanır.", "Curators help grow their city's event, place and organiser ecosystem, host official meetups and earn a share of local revenue.")}
        </p>
      </section>
      <section className="curator-role-grid">
        {[
          t("Organizatörler ve mekânlarla iletişim kur", "Connect with organisers and places"),
          t("Yerel etkinlikleri sisteme kazandır", "Bring local events to the platform"),
          t("Resmî topluluk buluşmaları düzenle", "Host official community meetups"),
          t("Konnektora’yı aktif kullan ve topluluğu büyüt", "Use Konnektora actively and grow the community"),
        ].map((item) => (
          <article key={item}>
            <CheckCircle2 />
            <strong>{item}</strong>
          </article>
        ))}
      </section>
      <section className="curator-application">
        <div>
          <h2>{t("Hemen başvur", "Apply now")}</h2>
          <p>{t("Motivasyon mektubunu ve özgeçmiş bağlantını bize gönder.", "Send us your motivation letter and CV link.")}</p>
        </div>
        {apply.isSuccess ? (
          <div className="form-success">
            <CheckCircle2 /> {t("Başvurun alındı. Ekibimiz seninle iletişime geçecek.", "Your application has been received. Our team will contact you.")}
          </div>
        ) : (
          <form onSubmit={submit}>
            <label>
              {t("Ad soyad", "Full name")}
              <input
                name="name"
                defaultValue={user?.name}
                required
                minLength={2}
              />
            </label>
            <label>
              {t("E-posta", "Email")}
              <input
                name="email"
                type="email"
                defaultValue={user?.email}
                required
              />
            </label>
            <div>
              <label>
                {t("Şehir", "City")}
                <input
                  name="city"
                  defaultValue={params.get("city") ?? ""}
                  required
                />
              </label>
              <label>
                {t("Ülke", "Country")}
                <input name="country" />
              </label>
            </div>
            <label>
              {t("Motivasyon mektubu", "Motivation letter")}
              <textarea
                name="motivation"
                required
                minLength={50}
                placeholder={t("Neden şehrinin Konnektora küratörü olmak istediğini anlat…", "Tell us why you want to become your city's Konnektora curator…")}
              />
            </label>
            <label>
              {t("Özgeçmiş bağlantısı (LinkedIn, Instagram profiliniz vb. linki)", "CV link (LinkedIn, Instagram profile or similar)")}
              <input name="cvUrl" inputMode="url" placeholder="https://…" />
            </label>
            <button className="primary-action" disabled={apply.isPending}>
              <Send size={17} />
              {apply.isPending ? t("Gönderiliyor…", "Sending…") : t("Başvuruyu gönder", "Submit application")}
            </button>
            {apply.isError ? (
              <p className="form-error">{t("Başvuru gönderilemedi.", "The application could not be submitted.")}</p>
            ) : null}
          </form>
        )}
      </section>
    </div>
  );
}
