import { useLanguage } from "../lib/i18n";

export function ComposerTips() {
  const { language } = useLanguage();
  return <details className="composer-tips"><summary>{language === "tr" ? "İpuçları" : "Tips"}</summary><div><strong>{language === "tr" ? "İçeriğinizi zenginleştirin" : "Enrich your content"}</strong><code>{language === "tr" ? "“görünen etiket|gidilecek etiket”" : "“visible tag|target tag”"}</code><code>{language === "tr" ? "“bağlantının adı|https://ornek.com”" : "“link title|https://example.com”"}</code><code>email@domain.com</code><code>@Username</code><p>{language === "tr" ? "YouTube ve SoundCloud bağlantıları mümkün olduğunda güvenli oynatıcılara dönüştürülür." : "YouTube and SoundCloud links are converted into safe embedded players when possible."}</p></div></details>;
}
