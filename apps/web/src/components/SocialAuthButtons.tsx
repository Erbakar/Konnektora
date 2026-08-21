import type { LoginResponse, SocialProvider } from "@konnektora/shared";
import { useMutation } from "@tanstack/react-query";
import { getSocialCredential } from "../lib/socialProviders";
import { ServiceFeedback } from "./ServiceFeedback";

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
  const mutation = useMutation({
    mutationFn: async (provider: SocialProvider) =>
      action(provider, await getSocialCredential(provider)),
    onSuccess,
  });
  return (
    <div className="social-auth">
      <div className="auth-divider">
        <span>veya</span>
      </div>
      <div className="social-auth-grid">
        <button
          className="social-provider-button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate("google")}
          type="button"
        >
          <span className="provider-letter">G</span> Google ile devam et
        </button>
        <button
          className="social-provider-button facebook"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate("facebook")}
          type="button"
        >
          <span className="provider-letter">f</span> Facebook ile devam et
        </button>
      </div>
      {mutation.isError ? (
        <ServiceFeedback
          compact
          error={mutation.error}
          fallback="Sosyal hesapla giriş tamamlanamadı. Yeniden deneyebilir veya e-posta ile devam edebilirsin."
        />
      ) : null}
    </div>
  );
}
