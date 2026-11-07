import { getUserSession } from "../lib/api";
import { BusinessFaq } from "../components/BusinessFaq";
import { ProductGuide } from "../components/ProductGuide";
import { ArrowRight, BadgeCheck, BarChart3, Building2, ClipboardList, MessageSquare, QrCode, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../lib/i18n";

const copy = {
  tr: {
    eyebrow: "Konnektora İşletme", title: "Etkinliklerini ve mekânını topluluğun merkezine taşı.", lead: "Etkinliklerini ve mekânını tanıt; davetlerini, katılımcılarını ve topluluğunla iletişimini tek yerden yönet.",
    create: "Kurumsal hesap oluştur", center: "İşletme merkezine git", audience: "Organizatörler ve mekânlar için", audienceCopy: "Topluluğunu büyüt, operasyonunu sadeleştir, gelirini izle.", packages: "Kurumsal paketler", packagesTitle: "İşletmen büyüdükçe yanında büyür.", inspect: "Paketi incele", cta: "Konnektora ile işletmeni büyütmeye hazır mısın?", ctaCopy: "Size uygun paketler ve hizmetlerimizi listeleyin.", start: "Hemen başla",
    benefits: [
      ["Topluluk Yönetimi", "Sınırsız ilgi alanlarında topluluğunuza uygun kitleleri gelişmiş filtreler ile kolaylıkla keşfedin."],
      ["Misafir listeleri", "Üyeler arasından basın, sanatçı, VIP gibi hayal gücünüze ve işinize uygun misafir listeleri oluşturun ve onları check-in sırasında fark edin."],
      ["Hızlı giriş", "QR ve NFC ile temassız, hızlı giriş sağlayın."],
      ["Çeşitli davet et seçenekleri", "Google bağlantılarınızı, rehberinizi ve geçmiş etkinliklerinizdeki kişileri davet ederek etkinlik ve mekânlarınıza katılımcıları hızla taşıyın."],
      ["Gelir, performans ve AI içgörüleri", "Bakiye, ödeme ve iade bilgilerini tek panelde izle. AI içgörüleri ve istatistiklerle işinizi büyütün."],
      ["Sosyal Line-up", "Üyelerin line-up'ınızdaki sanatçı ve performanslar hakkında yazılı ve görsel bilgi almaları ve tartışabilecekleri sosyal bir mecra kurduk."],
      ["Güvenli işletme", "Kurumsal doğrulama, yetki yönetimi ve raporlama araçlarını kullan."],
      ["Daha görünür ol", "Yerel keşif, ilgi alanı ve takip akışlarında doğru kitleye ulaş."],
    ],
    plans: [["Başlangıç", "Ücretsiz", ["Etkinlik ve mekân oluşturma", "Temel davet yönetimi", "Gelir özeti"]], ["Büyüme", "₺499 / ay", ["Gelişmiş katılımcı yönetimi", "Öncelikli keşif görünürlüğü", "Performans raporları"]], ["Ölçek", "₺1.499 / ay", ["Sınırsız yönetici", "Gelişmiş işletme araçları", "Öncelikli destek"]]]
  },
  en: {
    eyebrow: "Konnektora for Business", title: "Put your events and venue at the heart of the community.", lead: "Present your events and places; manage invitations, participants and community communication in one place.",
    create: "Create a business account", center: "Go to business center", audience: "For organizers and venues", audienceCopy: "Grow your community, simplify operations and track revenue.", packages: "Business plans", packagesTitle: "Plans that grow with your business.", inspect: "View plan", cta: "Ready to grow your business with Konnektora?", ctaCopy: "Explore our plans and services.", start: "Get started",
    benefits: [
      ["Community management", "Discover the audiences that fit your community across unlimited interests with advanced filters."],
      ["Guest lists", "Create press, artist, VIP and other guest lists from your members, then identify them easily during check-in."],
      ["Fast entry", "Provide fast, contactless entry with QR and NFC."],
      ["Flexible invitation options", "Invite people from your Google contacts, address book and past events to bring attendees to your events and venues quickly."],
      ["Revenue, performance and AI insights", "Track balances, payments and refunds in one dashboard. Grow your business with AI insights and analytics."],
      ["Social line-up", "Give members a social space to learn about your line-up's artists and performances through text and visuals, and discuss them together."],
      ["Secure business", "Use company verification, permission management and reporting tools."],
      ["More visibility", "Reach the right audience through local discovery, interests and following feeds."],
    ],
    plans: [["Starter", "Free", ["Create events and venues", "Basic invite management", "Revenue summary"]], ["Growth", "₺499 / month", ["Advanced attendee management", "Priority discovery visibility", "Performance reports"]], ["Scale", "₺1,499 / month", ["Unlimited managers", "Advanced business tools", "Priority support"]]]
  }
} as const;
const icons = [Users, ClipboardList, QrCode, UserPlus, BarChart3, MessageSquare, ShieldCheck, BadgeCheck];

export function BusinessLandingPage() {
  const { language } = useLanguage(); const c = copy[language]; const user = getUserSession();
  return <div className="business-landing">
    <section className="business-hero"><div><span className="eyebrow">{c.eyebrow}</span><h1>{c.title}</h1><p>{c.lead}</p><div className="business-hero-actions"><Link className="primary-action" to={user ? "/settings/business" : "/onboarding?type=corporate"}>{user?.accountType === "corporate" ? c.center : c.create} <ArrowRight size={18}/></Link></div></div><div className="business-hero-card"><Building2 size={34}/><strong>{c.audience}</strong><span>{c.audienceCopy}</span></div></section>
    <section className="business-value-grid">{c.benefits.map(([title, body], index) => { const Icon = icons[index]!; return <article key={title}><Icon/><h2>{title}</h2><p>{body}</p></article>; })}</section>

    <ProductGuide kind="business"/>
    <BusinessFaq/>
    <section className="business-cta"><h2>{c.cta}</h2><p>{c.ctaCopy}</p><Link className="primary-action" to="/store">{c.start} <ArrowRight size={18}/></Link></section>
  </div>;
}
