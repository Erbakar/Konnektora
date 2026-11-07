import { useMutation } from "@tanstack/react-query";
import { type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmailInput } from "../components/FormInputs";
import { ServiceFeedback } from "../components/ServiceFeedback";
import { confirmDeletionRequest, createUserMessage } from "../lib/api";
import { useLanguage } from "../lib/i18n";
import { DATA_DELETION_CATEGORY, dataRequestResponseDeadline, formatDataRequestDate } from "../lib/dataDeletion";

export function DataDeletionPage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const request = useMutation({ mutationFn: createUserMessage });
  const [params] = useSearchParams();
  const token = params.get("token");
  const confirm = useMutation({ mutationFn: () => confirmDeletionRequest(token!) });
  const responseDeadline = dataRequestResponseDeadline(request.data?.createdAt);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    request.mutate({
      type: "write_to_us",
      category: DATA_DELETION_CATEGORY,
      name: String(form.get("name")).trim(),
      email: String(form.get("email")).trim(),
      body: `Veri silme talebi / Data deletion request\n${String(form.get("scope"))}\n${String(form.get("details") || "").trim()}`,
      appVersion: "web",
    });
  }

  return (
    <section className="page policy-page">
      <div className="policy-header">
        <p className="eyebrow">Konnektora · Erbakar Yazılım</p>
        <h1>{t("Veri silme talebi", "Data deletion request")}</h1>
        <p>{t("Hesabınıza veya sosyal giriş verilerinize ilişkin silme talebinizi giriş yapmadan iletebilirsiniz.", "You can request deletion of your account or social login data without signing in.")}</p>
      </div>
      <article className="policy-content">
        <h2>{t("Google ve Facebook verileri", "Google and Facebook data")}</h2>
        <p>{t("Sosyal giriş sırasında adınız, e-posta adresiniz, profil resmi adresiniz ve sağlayıcının hesap kimliği işlenir. Bu bilgilerin silinmesini veya Konnektora hesabınızın silinmesini aşağıdaki formdan talep edebilirsiniz.", "Social login processes your name, email address, profile picture URL and provider account ID. Use the form below to request deletion of these details or your Konnektora account.")}</p>
        <h2>{t("Talep nasıl işlenir?", "How is a request handled?")}</h2>
        <p>{t("Hesabınıza bağlı e-posta adresini kullanın. Talebiniz destek sistemine kaydedilir; bu adrese gönderilen bağlantıyı açıp talebi onaylamanız gerekir. Gönderim hesabınızı otomatik silmez. İşlem sonucu ve varsa saklanması gereken veriler size e-posta ile bildirilir. Şifrenizi veya kimlik belgenizi bu forma eklemeyin.", "Use the email address linked to your account. Your request is recorded in our support system; we may contact that address to verify account ownership. Submitting does not automatically delete your account. We will email the outcome and explain any data that must be retained. Do not include your password or identity documents in this form.")}</p>
        <p>{t("Alternatif olarak aynı talebi hesabınıza bağlı e-posta adresinden kadirerbakar@hotmail.com adresine, “Konnektora veri silme talebi” konusuyla gönderebilirsiniz.", "Alternatively, send the request from your account email to kadirerbakar@hotmail.com with the subject “Konnektora data deletion request”.")}</p>
        <h2>{t("Yanıt süresi ve takip", "Response time and tracking")}</h2>
        <p>{t("Başvurunuz, niteliğine göre en kısa sürede ve en geç 30 gün içinde sonuçlandırılarak size yazılı veya elektronik ortamda yanıt verilir. Bu süre, tüm yedeklerin aynı gün silindiği anlamına gelmez. Saklanması gereken kayıtlar varsa gerekçe ve kapsam yanıtta açıklanır. Gönderimden sonra gösterilen takip numarasını saklayın; durumunu iletişim adresimizden sorabilirsiniz. Talebinizi Erbakar Yazılım Teknolojileri Ticaret Anonim Şirketi değerlendirir.", "Your request will be reviewed and answered in writing or electronically as soon as possible and within 30 days. This does not mean every backup is erased on the same day. Any records that must be retained, and the reasons and scope, will be explained in the response. Keep the reference number shown after submission and use it to ask our contact address about progress. Erbakar Yazılım Teknolojileri Ticaret Anonim Şirketi handles your request.")}</p>
        <h2>{t("Sosyal bağlantıyı kaldırmak", "Disconnecting social login")}</h2>
        <p>{t("Ayarlar → Hesap → Bağlı hesaplar bölümünden Google veya Facebook bağlantısını kaldırabilirsiniz. Bağlantıyı kaldırmak veya hesabı dondurmak, Konnektora hesabını ve diğer verilerini silmez. Tam silme için ayrıca talep gönderin.", "You can disconnect Google or Facebook under Settings → Account → Connected accounts. Disconnecting or freezing an account does not delete your Konnektora account or its other data. Submit a separate request for deletion.")}</p>
        <Link className="corp-link" to="/privacy">{t("Gizlilik politikasını oku", "Read the privacy policy")}</Link>
      </article>
      {token ? <section className="support-success"><h2>{t("E-posta adresini doğrula", "Verify your email")}</h2><p>{confirm.isSuccess ? t("E-posta adresiniz doğrulandı. Talep destek ekibince değerlendirilecek; hesabınız otomatik silinmedi.", "Your email is verified. Support will review the request; your account has not been automatically deleted.") : t("Bu veri silme talebini siz gönderdiyseniz aşağıdaki düğmeyle onaylayın.", "Confirm below if you submitted this deletion request.")}</p>{!confirm.isSuccess ? <button className="primary-action" disabled={confirm.isPending} onClick={() => confirm.mutate()}>{t("Talebimi onaylıyorum", "Confirm my request")}</button> : null}{confirm.isError ? <ServiceFeedback compact error={confirm.error} fallback={t("Onay bağlantısı geçersiz veya süresi dolmuş.", "The confirmation link is invalid or expired.")}/> : null}</section> : request.isSuccess ? (
        <div className="support-success" role="status">
          <strong>{t("Silme talebiniz kaydedildi.", "Your deletion request was recorded.")}</strong>
          <span>{t("E-posta adresinize onay bağlantısı gönderdik. Talebin işleme alınması için bağlantıyı açıp onaylayın. Bu, silme işleminin tamamlandığı anlamına gelmez.", "We sent a confirmation link to your email. Open it and confirm so the request can be reviewed. This does not mean deletion is complete.")}</span>
          <span>{t("Takip numarası", "Reference number")}: {request.data.id}</span>
          {responseDeadline ? <span>{t("Yanıt son tarihi", "Response deadline")}: {formatDataRequestDate(responseDeadline, language)}</span> : null}
        </div>
      ) : (
        <form className="admin-form compact-form" onSubmit={submit}>
          <label>{t("Ad soyad", "Full name")}<input name="name" autoComplete="name" required minLength={2} maxLength={160} /></label>
          <label>{t("Hesaba bağlı e-posta", "Account email")}<EmailInput name="email" autoComplete="email" required maxLength={255} /></label>
          <label>{t("Silinmesini istediğiniz veriler", "Data to delete")}
            <select name="scope" required>
              <option value="account">{t("Konnektora hesabım ve ilişkili verilerim", "My Konnektora account and associated data")}</option>
              <option value="facebook">{t("Facebook giriş verilerim", "My Facebook login data")}</option>
              <option value="google">{t("Google giriş verilerim", "My Google login data")}</option>
            </select>
          </label>
          <label>{t("Ek açıklama (isteğe bağlı)", "Additional details (optional)")}<textarea name="details" rows={4} maxLength={4500} /></label>
          <button className="primary-action" type="submit" disabled={request.isPending}>{request.isPending ? t("Gönderiliyor…", "Sending…") : t("Silme talebi gönder", "Request deletion")}</button>
          {request.isError ? <ServiceFeedback compact error={request.error} fallback={t("Talebiniz kaydedilemedi. Yeniden deneyin veya belirtilen e-posta adresinden bize ulaşın.", "Your request could not be recorded. Retry or contact us at the email address above.")} /> : null}
        </form>
      )}
    </section>
  );
}
