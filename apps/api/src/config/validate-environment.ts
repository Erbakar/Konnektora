const PLACEHOLDER_SECRETS = new Set(["change-me-in-env", "change-this-before-production", "changeme"]);

export function validateEnvironment(config: Record<string, unknown>) {
  if (config.NODE_ENV !== "production") return config;

  const required = ["DATABASE_URL", "JWT_SECRET", "WEB_ORIGIN", "PUBLIC_APP_URL", "EMAIL_FROM", "RESEND_API_KEY", "SMS_WEBHOOK_URL"];
  const missing = required.filter((key) => typeof config[key] !== "string" || !String(config[key]).trim());
  if (missing.length) throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);

  const jwtSecret = String(config.JWT_SECRET);
  if (jwtSecret.length < 32 || PLACEHOLDER_SECRETS.has(jwtSecret.toLowerCase())) {
    throw new Error("JWT_SECRET must be a non-placeholder value with at least 32 characters in production");
  }
  for (const key of ["WEB_ORIGIN", "PUBLIC_APP_URL", "SMS_WEBHOOK_URL"]) {
    try {
      const url = new URL(String(config[key]));
      if (url.protocol !== "https:") throw new Error();
    } catch {
      throw new Error(`${key} must be a valid HTTPS URL in production`);
    }
  }
  return config;
}
