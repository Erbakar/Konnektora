import {
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import { getServiceErrorPresentation } from "../lib/serviceErrors";
import { useLanguage } from "../lib/i18n";

type ServiceFeedbackProps = {
  actionLabel?: string;
  className?: string;
  compact?: boolean;
  error?: unknown;
  fallback?: string;
  message?: string;
  onRetry?: () => void;
  title?: string;
  tone?: "error" | "success" | "info";
};

export function ServiceFeedback({
  actionLabel,
  className = "",
  compact = false,
  error,
  fallback,
  message,
  onRetry,
  title,
  tone = "error",
}: ServiceFeedbackProps) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const presentation =
    tone === "error"
      ? getServiceErrorPresentation(error, fallback)
      : undefined;
  const resolvedTitle =
    title ??
    presentation?.title ??
    (tone === "success" ? t("İşlem tamamlandı", "Action completed") : t("Bilgilendirme", "Information"));
  const resolvedMessage =
    message ?? presentation?.message ?? fallback ?? t("İşlem tamamlandı.", "The action was completed.");
  const kind = presentation?.kind ?? tone;
  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "info"
        ? Info
        : kind === "network"
          ? WifiOff
          : kind === "permission" || kind === "authentication"
            ? ShieldAlert
            : AlertTriangle;

  return (
    <div
      className={`service-feedback service-feedback--${tone}${compact ? " service-feedback--compact" : ""}${className ? ` ${className}` : ""}`}
      data-service-error-kind={kind}
      role={tone === "error" ? "alert" : "status"}
    >
      <span className="service-feedback__icon" aria-hidden="true">
        <Icon size={20} />
      </span>
      <div className="service-feedback__copy">
        <strong>{resolvedTitle}</strong>
        <p>{resolvedMessage}</p>
      </div>
      {onRetry ? (
        <button
          className="service-feedback__action"
          onClick={onRetry}
          type="button"
        >
          <RefreshCw size={15} />
          {actionLabel ?? t("Yeniden dene", "Try again")}
        </button>
      ) : null}
    </div>
  );
}
