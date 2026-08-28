import type { LoginResponse, SocialProvider } from "@konnektora/shared";
import { useMutation } from "@tanstack/react-query";
import { getSocialCredential } from "../lib/socialProviders";
import { ServiceFeedback } from "./ServiceFeedback";
import { useLanguage } from "../lib/i18n";

export function SocialAuthButtons({
  action,
  onSuccess,
}: {
  action: (
    provider: SocialProvider,
    credential: string,
  ) => Promise<LoginResponse>;
  onSuccess: (response: LoginResponse) => void;
}) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const mutation = useMutation({
    mutationFn: async (provider: SocialProvider) =>
      action(provider, await getSocialCredential(provider)),
    onSuccess,
  });
  return (
    <div className="social-auth">
      <div className="auth-divider">
        <span>{t("veya", "or")}</span>
      </div>
      <div className="social-auth-grid">
        <button
          className="social-provider-button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate("google")}
          type="button"
        >
          <span className="provider-letter">G</span> {t("Google ile devam et", "Continue with Google")}
        </button>
        <button
          className="social-provider-button facebook"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate("facebook")}
          type="button"
        >
          <span className="provider-letter">f</span> {t("Facebook ile devam et", "Continue with Facebook")}
        </button>
      </div>
      {mutation.isError ? (
        <ServiceFeedback
          compact
          error={mutation.error}
          fallback={t("Sosyal hesapla giriş tamamlanamadı. Yeniden deneyebilir veya e-posta ile devam edebilirsin.", "Social sign-in could not be completed. Try again or continue with email.")}
        />
      ) : null}
    </div>
  );
}
