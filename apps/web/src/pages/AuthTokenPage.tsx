import { useMutation } from "@tanstack/react-query";
import { Check, KeyRound, MailCheck, UserRound } from "lucide-react";
import { type FormEvent, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ServiceFeedback } from "../components/ServiceFeedback";
import { acceptInvite, confirmEmail, resetPassword, setUserSession } from "../lib/api";
import { useLanguage } from "../lib/i18n";

export function VerifyEmailPage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => (language === "tr" ? tr : en);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const mutation = useMutation({
    mutationFn: confirmEmail,
    onSuccess: (response) => setUserSession(response)
  });

  useEffect(() => {
    if (token && !mutation.data && !mutation.isPending && !mutation.isError) {
      mutation.mutate(token);
    }
  }, [mutation, token]);

  return (
    <section className="page auth-token-page">
      <MailCheck size={36} />
      <h1>{t("E-posta doğrulama", "Email verification")}</h1>
      {mutation.isPending ? <p>{t("E-posta adresin doğrulanıyor...", "Verifying your email address...")}</p> : null}
      {mutation.data ? (
        <>
          <p>{t("E-posta adresin doğrulandı.", "Your email address has been verified.")}</p>
          <Link className="primary-action" to="/onboarding">
            <Check size={18} />
            {t("Telefon doğrulamasına devam et", "Continue to phone verification")}
          </Link>
        </>
      ) : null}
      {mutation.isError ? (
        <ServiceFeedback
          error={mutation.error}
          fallback={t("Doğrulama bağlantısı geçersiz, daha önce kullanılmış veya süresi dolmuş olabilir. Yeni bir doğrulama e-postası isteyebilirsin.", "The verification link may be invalid, already used or expired. You can request a new verification email.")}
          title={t("E-posta doğrulanamadı", "Email could not be verified")}
        />
      ) : null}
      {!token ? (
        <ServiceFeedback
          message={t("E-postadaki doğrulama butonunu kullanarak bu sayfayı yeniden aç.", "Open this page again using the verification button in your email.")}
          title={t("Doğrulama bağlantısı eksik", "Verification link is missing")}
        />
      ) : null}
    </section>
  );
}

export function ResetPasswordPage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => (language === "tr" ? tr : en);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const mutation = useMutation({
    mutationFn: (password: string) => resetPassword(token, password),
    onSuccess: (response) => setUserSession(response)
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate(String(form.get("password")));
  }

  return (
    <section className="page auth-token-page">
      <KeyRound size={36} />
      <h1>{t("Şifre sıfırla", "Reset password")}</h1>
      <form className="admin-form compact-form" onSubmit={handleSubmit}>
        <label>
          {t("Yeni şifre", "New password")}
          <input maxLength={128} minLength={8} name="password" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,128}" required title={t("En az 8 karakter, bir büyük harf, bir küçük harf ve bir özel karakter kullanın.", "Use at least 8 characters with an uppercase letter, a lowercase letter and a special character.")} type="password" />
        </label>
        <button className="primary-action" disabled={mutation.isPending || !token} type="submit">
          {t("Şifreyi kaydet", "Save password")}
        </button>
      </form>
      {mutation.data ? <><ServiceFeedback compact message={t("Şifren güncellendi ve hesabına giriş yapıldı.", "Your password was updated and you are signed in.")} tone="success" /><Link className="primary-action" to="/feed">{t("Akışa geç", "Go to feed")}</Link></> : null}
      {mutation.isError ? (
        <ServiceFeedback
          error={mutation.error}
          fallback={t("Şifre sıfırlama bağlantısı geçersiz, daha önce kullanılmış veya süresi dolmuş olabilir.", "The password reset link may be invalid, already used or expired.")}
          title={t("Şifre güncellenemedi", "Password could not be updated")}
        />
      ) : null}
      {!token ? (
        <ServiceFeedback
          message={t("Yeni bir şifre sıfırlama e-postası isteyip gelen bağlantıyı aç.", "Request a new password reset email and open the link it contains.")}
          title={t("Şifre sıfırlama bağlantısı eksik", "Password reset link is missing")}
        />
      ) : null}
    </section>
  );
}

export function AcceptInvitePage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => (language === "tr" ? tr : en);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const mutation = useMutation({
    mutationFn: (input: { name?: string; email?: string; password: string }) => acceptInvite({ token, ...input }),
    onSuccess: (response) => setUserSession(response)
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      name: String(form.get("name") || "") || undefined,
      email: String(form.get("email") || "") || undefined,
      password: String(form.get("password"))
    });
  }

  return (
    <section className="page auth-token-page">
      <UserRound size={36} />
      <h1>{t("Daveti kabul et", "Accept invitation")}</h1>
      <form className="admin-form compact-form" onSubmit={handleSubmit}>
        <label>
          {t("Ad Soyad", "Full name")}
          <input name="name" minLength={2} />
        </label>
        <label>
          {t("E-posta", "Email")}
          <input name="email" type="email" />
          <span className="form-help">{t("Davet telefonuna geldiyse hesabına giriş yapabilmek için e-posta adresini yaz.", "If the invitation arrived by phone, enter your email so you can log in to your account.")}</span>
        </label>
        <label>
          {t("Şifre", "Password")}
          <input maxLength={128} minLength={8} name="password" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}" required title={t("En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam kullanın.", "Use at least 8 characters with an uppercase letter, a lowercase letter and a number.")} type="password" />
        </label>
        <button className="primary-action" disabled={mutation.isPending || !token} type="submit">
          {t("Daveti kabul et", "Accept invitation")}
        </button>
      </form>
      {mutation.data ? (
        <p className="form-success">
          {t("Davet kabul edildi.", "Invitation accepted.")} <Link to="/feed">{t("Akışa geç", "Go to feed")}</Link>
        </p>
      ) : null}
      {mutation.isError ? (
        <ServiceFeedback
          error={mutation.error}
          fallback={t("Davet bağlantısı geçersiz, daha önce kullanılmış veya süresi dolmuş olabilir.", "The invitation link may be invalid, already used or expired.")}
          title={t("Davet kabul edilemedi", "Invitation could not be accepted")}
        />
      ) : null}
      {!token ? (
        <ServiceFeedback
          message={t("Sana gönderilen davet e-postasındaki bağlantıyı kullanarak yeniden aç.", "Open this page again using the link in the invitation email.")}
          title={t("Davet bağlantısı eksik", "Invitation link is missing")}
        />
      ) : null}
    </section>
  );
}
