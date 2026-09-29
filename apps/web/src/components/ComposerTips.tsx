import { useLanguage } from "../lib/i18n";

export function ComposerTips() {
  const { language } = useLanguage();
  return <details className="composer-tips"><summary>{language === "tr" ? "İpuçları" : "Tips"}</summary><div><strong>{language === "tr" ? "İçeriğinizi zenginleştirin" : "Enrich your content"}</strong><code>{language === "tr" ? '""görünen etiket|gidilecek etiket""' : '""visible tag|target tag""'}</code><code>{language === "tr" ? '""bağlantının adı|https://ornek.com""' : '""link title|https://example.com""'}</code><code>email@domain.com</code><code>@Username</code><p>{language === "tr" ? "Çift tırnakla yazılan YouTube ve SoundCloud bağlantıları yalnızca bağlantı olur; diğer bağlantılar mümkün olduğunda güvenli oynatıcıya dönüşür. Tek tırnak normal metin olarak kalır." : "YouTube and SoundCloud URLs wrapped in double quotes stay as links; other URLs become safe embedded players when possible. A single quote remains normal text."}</p></div></details>;
}
