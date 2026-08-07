import { ArrowRight, BadgeCheck, BarChart3, Building2, CalendarCheck, Check, QrCode, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";

const benefits = [
  { icon: <CalendarCheck/>, title: "Etkinlik yönetimi", text: "Etkinlik, bilet, lineup ve yönetici araçlarını birlikte kullan." },
  { icon: <Users/>, title: "Davet ve misafir listeleri", text: "Rol bazlı davet, onay, check-in ve geçmiş kayıtlarını yönet." },
  { icon: <QrCode/>, title: "Hızlı giriş", text: "QR bilet ve kontrollü check-in ile güvenli karşılama yap." },
  { icon: <BarChart3/>, title: "Gelir ve performans", text: "Bakiye, ödeme, iade ve içerik istatistiklerini tek panelde izle." },
  { icon: <ShieldCheck/>, title: "Güvenli işletme", text: "Kurumsal doğrulama, yetki yönetimi ve raporlama araçlarını kullan." },
  { icon: <BadgeCheck/>, title: "Daha görünür ol", text: "Yerel keşif, tag ve takip akışlarında doğru kitleye ulaş." }
];
const plans = [
  { name: "Başlangıç", price: "Ücretsiz", items: ["Etkinlik ve mekân oluşturma", "Temel davet yönetimi", "Gelir özeti"] },
  { name: "Büyüme", price: "₺499 / ay", items: ["Gelişmiş katılımcı yönetimi", "Öncelikli keşif görünürlüğü", "Performans raporları"] },
  { name: "Ölçek", price: "₺1.499 / ay", items: ["Sınırsız yönetici", "Gelişmiş işletme araçları", "Öncelikli destek"] }
];
export function BusinessLandingPage() { return <main className="business-landing">
  <section className="business-hero"><div><span className="eyebrow">Konnektora for Business</span><h1>Etkinliklerini ve mekânını topluluğun merkezine taşı.</h1><p>Keşiften bilete, davet listesinden check-in’e ve gelir takibine kadar işletmenin ihtiyaç duyduğu tüm araçlar tek yerde.</p><div className="business-hero-actions"><Link className="primary-action" to="/onboarding?account=corporate">Kurumsal hesap oluştur <ArrowRight size={18}/></Link><Link className="secondary-action" to="/finance">İşletme merkezine git</Link></div></div><div className="business-hero-card"><Building2 size={34}/><strong>Organizatörler ve mekânlar için</strong><span>Topluluğunu büyüt, operasyonunu sadeleştir, gelirini izle.</span></div></section>
  <section className="business-value-grid">{benefits.map((item) => <article key={item.title}>{item.icon}<h2>{item.title}</h2><p>{item.text}</p></article>)}</section>
  <section className="business-packages"><header><span className="eyebrow">Kurumsal paketler</span><h2>İşletmen büyüdükçe yanında büyür.</h2></header><div>{plans.map((plan) => <article key={plan.name}><h3>{plan.name}</h3><strong>{plan.price}</strong><ul>{plan.items.map((item) => <li key={item}><Check size={16}/>{item}</li>)}</ul><Link to="/finance">Paketi incele</Link></article>)}</div></section>
  <section className="business-cta"><h2>Konnektora ile işletmeni büyütmeye hazır mısın?</h2><p>Kurumsal hesabını oluştur ve ilk etkinliğini bugün yayınla.</p><Link className="primary-action" to="/onboarding?account=corporate">Hemen başla <ArrowRight size={18}/></Link></section>
</main>; }
