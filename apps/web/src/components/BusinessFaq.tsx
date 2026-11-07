import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

const items = [
  ["İlgi alanlarıma uygun etkinlikleri ve mekânları keşfedebilir miyim?", "Konnektora, profilinize ve deneyimlerinize uygun etkinlikleri gösterir. Daha iyi öneriler için profilinizi tamamlayın; profilinize, mekânlarınıza ve etkinliklerinize ilgili etiketleri ekleyin ve içeriklerle etkileşimde bulunun."],
  ["Konumuma yakın etkinlikleri ve mekânları haritada görebilir miyim?", "Evet, yakınınızdaki etkinlikleri ve mekânları harita üzerinden keşfedebilirsiniz."],
  ["Etkinlik ve mekân oluşturmak ücretli mi?", "Etkinlik ve mekân oluşturmak ücretsizdir. Kullanım limitleri paketinize göre değişir. Ayrıntılar için Mağaza & Fiyatlar sayfasını ziyaret edin."],
  ["Sadece davetlilerin veya onayladığımız üyelerin katılacağı etkinlik oluşturabilir miyim?", "Evet. Etkinliği oluştururken katılım tipini herkese açık, yönetici onaylı veya yalnızca davetlilere açık olarak seçebilirsiniz."],
  ["Giriş saatine bağlı ücretsiz bilet oluşturabilir miyim?", "Evet. Ücretsiz biletler için komisyon ödemeden giriş saati koşullu veya koşulsuz bilet oluşturabilir, kontenjan belirleyebilirsiniz."],
  ["Bileti başka bir uygulamada satılan etkinliğimi tanıtabilir miyim?", "Evet. Bunun için komisyon ödemezsiniz. Kullanıcılar bilet bağlantısına tıkladığında ilgili satış sitesine yönlendirilir."],
  ["Yalnızca kapıda ödemeli etkinliğimi duyurabilir miyim?", "Evet. Kapıda ödeme dâhil farklı bilet seçenekleri bulunur; bu duyuru için komisyon ödemezsiniz."],
  ["Organizasyonumun biletlerini Konnektora’da satabilir miyim?", "Biletlerinize kontenjan, kullanıcı başına bilet sınırı, satış zamanı ve geçerli giriş saatlerini tanımlayabilirsiniz. Çevrim içi ödeme hizmetinin etkinleştirilmesi beklenmektedir."],
  ["Bilet satışında ne kadar komisyon alınıyor?", "Konnektora bilet satışlarında, ödeme sağlayıcısının işlem ücreti dahil toplam %5 komisyon alır. Çevrim içi ödeme hizmeti henüz açık değildir; güncel durum için Mağaza & Fiyatlar sayfasını inceleyin."],
  ["Line-up oluşturabilir miyim?", "Evet. Farklı gün ve sahneleri kapsayan etkinlik programları oluşturabilirsiniz. Programdaki sanatçı veya performansın etiket sayfasından ilgili üyeleri, yorumları, fotoğrafları ve videoları inceleyebilirsiniz."],
  ["Yorumlarda YouTube ve SoundCloud oynatıcıları ve etiket bağlantıları kullanabilir miyim?", "İlgi alanı, etkinlik ve mekân sayfalarında metin, fotoğraf ve video paylaşabilirsiniz. YouTube ve SoundCloud bağlantıları sayfada oynatıcı olarak gösterilir. Paylaşımlarınızda diğer etiketlere de bağlantı verebilirsiniz."],
  ["Guest List yönetimi nedir?", "Uygun paketlerle VIP, basın, ikram, indirim veya yasaklı kişi gibi misafir listeleri oluşturabilir ve check-in sırasında kişinin hangi listelerde olduğunu görebilirsiniz. Listeler etkinliğe veya mekâna değil, hesabınıza bağlıdır; Üyeler bölümündeki Guest Listler alanından tekrar kullanılabilir. Keşfettiğiniz üyeleri listelere ekleyebilir, çıkarabilir ve etkinliklere topluca davet edebilirsiniz. Bir liste, paylaşılmadığı sürece başkalarına görünmez; uygun pakete sahip kullanıcılarla paylaşılabilir. Paket koşulları için Mağaza & Fiyatlar sayfasını inceleyin."],
  ["QR ve NFC ile check-in var mı?", "QR ve destekleyen cihazlarda NFC ile katılımcı bilgilerine erişebilirsiniz. Cihazın kullanılamadığı durumlarda katılımcı listesi de kullanılabilir. Yetkiniz kapsamında biletler, rol, paket, takipçi bilgileri, davet eden kişi ve misafir listeleri görüntülenir."],
  ["Profil, mekân ve etkinlik istatistikleri ile yapay zekâ içgörüleri nedir?", "Paketinizin izin verdiği kapsamda performans istatistiklerini ve yapay zekâ içgörülerini inceleyebilirsiniz. Erişim hakları için Mağaza & Fiyatlar sayfasını ziyaret edin."],
  ["İlgi alanı istatistikleri ne işe yarar?", "Sanatçılar, DJ’ler, topluluklar, markalar, filmler ve müzik türleri birer etiket olabilir. Etiket istatistikleri ve yapay zekâ içgörüleri topluluğunuzu anlamanıza yardımcı olur. Ayrıntılar Mağaza & Fiyatlar sayfasındadır."],
  ["Profil takası nedir?", "Bir kişinin QR kodunu taradığınızda veya desteklenen NFC seçeneğini kullandığınızda karşılıklı profil erişimi sağlanır. Üye kartı sayfasındaki seçeneklerle uyumlu NFC etiket veya aksesuarınızı kullanabilirsiniz."],
  ["Aldığım biletleri nerede görebilirim?", "Ücretli ve ücretsiz biletlerinizi kullanıcı menüsündeki Biletlerim sayfasından görüntüleyebilirsiniz."],
  ["Biletler başka bir üyeye devredilebilir mi?", "Biletler kısmen veya tamamen başka bir üyeye bedelsiz devredilebilir."],
  ["Biletler iade edilebilir mi?", "Etkinliğin yeri veya zamanı değiştiğinde Biletlerim sayfasından iade talep edebilirsiniz. Çevrim içi ödeme henüz açık değildir. Ücretli satış başladığında iptal ve iadenin kapsamı, ödeme yöntemi ve işlem süreleri satın alma koşullarında belirtilecektir."],
  ["Profil, mekân, etkinlik ve ilgi alanı bildirimlerini yönetebilir miyim?", "Evet. İlgilendiğiniz profil, mekân, etkinlik ve etiketlerin bildirimlerini açıp kapatabilirsiniz. Örneğin takip ettiğiniz bir mekânda oluşturulan veya bir etiketle ilişkilendirilen etkinliklerden haberdar olabilirsiniz."],
] as const;

const answerLinks: Record<string, string> = {
  "Mağaza & Fiyatlar": "/store",
  "Üyeler": "/community",
  "Üye kartı": "/identity",
  "Biletlerim": "/tickets",
};

function Answer({ text }: { text: string }) {
  return <p>{text.split(/(Mağaza & Fiyatlar|Üyeler|Üye kartı|Biletlerim)/g).map((part, index) =>
    answerLinks[part] ? <Link key={index} to={answerLinks[part]}>{part}</Link> : part,
  )}</p>;
}

export function BusinessFaq() {
  const headingId = useId();
  return (
    <section className="business-faq" aria-labelledby={headingId} lang="tr">
      <h2 id={headingId}>Sıkça sorulan sorular</h2>
      <div className="business-faq-list">
        {items.map(([question, answer]) => (
          <details key={question}>
            <summary><span>{question}</span><ChevronDown size={20} aria-hidden="true" /></summary>
            <div className="business-faq-answer"><Answer text={answer} /></div>
          </details>
        ))}
      </div>
    </section>
  );
}
