import { ArrowRight, BadgeCheck, BarChart3, Building2, CalendarCheck, Check, QrCode, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../lib/i18n";

const copy = {
  tr: {
    eyebrow: "Konnektora İşletme", title: "Etkinliklerini ve mekânını topluluğun merkezine taşı.", lead: "Keşiften bilete, davet listesinden girişe ve gelir takibine kadar işletmenin ihtiyaç duyduğu tüm araçlar tek yerde.",
    create: "Kurumsal hesap oluştur", center: "İşletme merkezine git", audience: "Organizatörler ve mekânlar için", audienceCopy: "Topluluğunu büyüt, operasyonunu sadeleştir, gelirini izle.", packages: "Kurumsal paketler", packagesTitle: "İşletmen büyüdükçe yanında büyür.", inspect: "Paketi incele", cta: "Konnektora ile işletmeni büyütmeye hazır mısın?", ctaCopy: "Kurumsal hesabını oluştur ve ilk etkinliğini bugün yayınla.", start: "Hemen başla",
    benefits: [["Etkinlik yönetimi", "Etkinlik, bilet, program ve yönetici araçlarını birlikte kullan."], ["Davet ve misafir listeleri", "Rol bazlı davet, onay, giriş ve geçmiş kayıtlarını yönet."], ["Hızlı giriş", "QR bilet ve kontrollü giriş ile güvenli karşılama yap."], ["Gelir ve performans", "Bakiye, ödeme, iade ve içerik istatistiklerini tek panelde izle."], ["Güvenli işletme", "Kurumsal doğrulama, yetki yönetimi ve raporlama araçlarını kullan."], ["Daha görünür ol", "Yerel keşif, ilgi alanı ve takip akışlarında doğru kitleye ulaş."]],
    plans: [["Başlangıç", "Ücretsiz", ["Etkinlik ve mekân oluşturma", "Temel davet yönetimi", "Gelir özeti"]], ["Büyüme", "₺499 / ay", ["Gelişmiş katılımcı yönetimi", "Öncelikli keşif görünürlüğü", "Performans raporları"]], ["Ölçek", "₺1.499 / ay", ["Sınırsız yönetici", "Gelişmiş işletme araçları", "Öncelikli destek"]]]
  },
  en: {
    eyebrow: "Konnektora for Business", title: "Put your events and venue at the heart of the community.", lead: "Everything your business needs—from discovery and tickets to guest lists, check-in and revenue tracking—in one place.",
    create: "Create a business account", center: "Go to business center", audience: "For organizers and venues", audienceCopy: "Grow your community, simplify operations and track revenue.", packages: "Business plans", packagesTitle: "Plans that grow with your business.", inspect: "View plan", cta: "Ready to grow your business with Konnektora?", ctaCopy: "Create your business account and publish your first event today.", start: "Get started",
    benefits: [["Event management", "Manage events, tickets, lineups and admin tools together."], ["Invites and guest lists", "Manage role-based invites, approvals, check-in and history."], ["Fast entry", "Welcome guests securely with QR tickets and controlled check-in."], ["Revenue and performance", "Track balances, payments, refunds and content metrics in one dashboard."], ["Secure business", "Use company verification, permissions and reporting tools."], ["More visibility", "Reach the right audience through local discovery, tags and following feeds."]],
    plans: [["Starter", "Free", ["Create events and venues", "Basic invite management", "Revenue summary"]], ["Growth", "₺499 / month", ["Advanced attendee management", "Priority discovery visibility", "Performance reports"]], ["Scale", "₺1,499 / month", ["Unlimited managers", "Advanced business tools", "Priority support"]]]
  }
} as const;
const icons = [CalendarCheck, Users, QrCode, BarChart3, ShieldCheck, BadgeCheck];

export function BusinessLandingPage() {
  const { language } = useLanguage(); const c = copy[language];
  return <div className="business-landing">
    <section className="business-hero"><div><span className="eyebrow">{c.eyebrow}</span><h1>{c.title}</h1><p>{c.lead}</p><div className="business-hero-actions"><Link className="primary-action" to="/settings/business">{c.create} <ArrowRight size={18}/></Link><Link className="secondary-action" to="/finance">{c.center}</Link></div></div><div className="business-hero-card"><Building2 size={34}/><strong>{c.audience}</strong><span>{c.audienceCopy}</span></div></section>
    <section className="business-value-grid">{c.benefits.map(([title, body], index) => { const Icon = icons[index]!; return <article key={title}><Icon/><h2>{title}</h2><p>{body}</p></article>; })}</section>
    <section className="business-packages"><header><span className="eyebrow">{c.packages}</span><h2>{c.packagesTitle}</h2></header><div>{c.plans.map(([name, price, items]) => <article key={name}><h3>{name}</h3><strong>{price}</strong><ul>{items.map((item) => <li key={item}><Check size={16}/>{item}</li>)}</ul><Link to="/store">{c.inspect}</Link></article>)}</div></section>
    <section className="business-cta"><h2>{c.cta}</h2><p>{c.ctaCopy}</p><Link className="primary-action" to="/settings/business">{c.start} <ArrowRight size={18}/></Link></section>
  </div>;
}
