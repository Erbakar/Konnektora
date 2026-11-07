import { Link } from "react-router-dom";
import { useLanguage } from "../lib/i18n";

export function SocialLoginPrivacyNotice() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  return (
    <section>
      <h2>{t("Google ve Facebook ile giriş", "Google and Facebook login")}</h2>
      <p>{t("Konnektora, Erbakar Yazılım tarafından geliştirilir. Google veya Facebook ile giriş yaptığınızda, izninizle adınız, e-posta adresiniz, profil resmi adresiniz ve sağlayıcı hesabınızın kimliği alınır. Bu bilgiler hesabınızı oluşturmak, sosyal hesabınızı bağlamak ve sonraki girişlerde sizi tanımak için kullanılır. Facebook girişinde public_profile ve email izinleri istenir.", "Konnektora is developed by Erbakar Yazılım. When you sign in with Google or Facebook, your name, email address, profile picture URL and provider account ID are received with your permission. These details are used to create your account, link your social account and identify you on subsequent sign-ins. Facebook login requests public_profile and email permissions.")}</p>
      <p>{t("Giriş bilgileri sağlayıcının sunucularında doğrulanır. Google ve Facebook şifreniz Konnektora tarafından alınmaz. Sosyal giriş için arkadaş listeniz, Facebook gönderileriniz veya reklam hesabınız istenmez.", "Login credentials are verified with the provider. Konnektora does not receive your Google or Facebook password. Social login does not request your friend list, Facebook posts or advertising account.")}</p>
      <p>{t("Bağlı hesabı Ayarlar → Hesap bölümünden kaldırabilirsiniz. Hesap veya sosyal giriş verilerinin silinmesini veri silme sayfasından talep edebilirsiniz. Gizlilik soruları için iletişim: kadirerbakar@hotmail.com.", "You can disconnect a linked account under Settings → Account. Use the data deletion page to request deletion of your account or social login data. Privacy contact: kadirerbakar@hotmail.com.")}</p>
      <Link className="corp-link" to="/data-deletion">{t("Veri silme talebi oluştur", "Request data deletion")}</Link>
    </section>
  );
}
