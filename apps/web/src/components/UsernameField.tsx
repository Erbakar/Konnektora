import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { checkAvailability } from "../lib/api";
import { useLanguage } from "../lib/i18n";

export function UsernameField({ initialValue }: { initialValue: string }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<"checking" | "available" | "taken" | "error">("available");
  const input = useRef<HTMLInputElement>(null);
  const trimmed = value.trim();
  const valid = value === trimmed && trimmed.length >= 2 && trimmed.length <= 80 && /^[\p{L}\p{N}.-]+$/u.test(trimmed);
  useEffect(() => {
    let active = true;
    if (!valid || trimmed === initialValue) return;
    const timeout = window.setTimeout(() => {
      void checkAvailability({ username: trimmed }).then(result => {
        if (active) setStatus(result.usernameAvailable ? "available" : "taken");
      }).catch(() => { if (active) setStatus("error"); });
    }, 350);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [trimmed, initialValue, valid]);
  const message = !valid ? t("2–80 karakter kullan; harf, sayı, nokta ve tire kabul edilir; boşluk kullanılamaz.", "Use 2–80 characters: letters, numbers, dots and hyphens; no spaces.") : status === "checking" ? t("Kontrol ediliyor…", "Checking…") : status === "taken" ? t("Kullanıcı adı kullanımda.", "Username is already in use.") : status === "error" ? t("Kontrol yapılamadı. Tekrar dene.", "Unable to check. Try again.") : t("Kullanıcı adı uygun.", "Username is available.");
  useEffect(() => {
    input.current?.setCustomValidity(!valid || status === "taken" || status === "checking" ? message : "");
  }, [valid, status, message]);
  return <label>{t("Kullanıcı adı", "Username")}
    <input ref={input} aria-label={t("Kullanıcı adı", "Username")} name="username" pattern={String.raw`[\p{L}\p{N}.\-]+`} required minLength={2} maxLength={80} value={value} aria-describedby="username-feedback" aria-invalid={!valid || status === "taken"} onChange={event => { setValue(event.target.value); setStatus(event.target.value.trim() === initialValue ? "available" : "checking"); }}/>
    <span id="username-feedback" role="status" className={`username-feedback ${valid && status === "available" ? "is-valid" : ""}`}>{valid && status === "checking" ? <LoaderCircle size={16} className="spin"/> : valid && status === "available" ? <CheckCircle2 size={16}/> : <XCircle size={16}/>} {message}</span>
  </label>;
}
