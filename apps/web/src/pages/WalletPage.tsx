import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FinancePage } from "./FinancePage";
import { CuratorLedger } from "../components/CuratorLedger";
import { closeWallet, getUserSession, requestWalletCode, verifyWalletCode } from "../lib/api";
import { clearWalletGrant } from "../lib/wallet-session";
import { useLanguage } from "../lib/i18n";
export function WalletPage({ billingOnly = false }: { billingOnly?: boolean } = {}) {
  const user = getUserSession(); const client = useQueryClient();
  const { language } = useLanguage(); const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const [expires, setExpires] = useState(0); const [codeExpiry, setCodeExpiry] = useState(0); const [now, setNow] = useState(Date.now());
  const [code, setCode] = useState(""); const [hint, setHint] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [resendAt, setResendAt] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.clearInterval(timer); void closeWallet().catch(() => undefined); clearWalletGrant(); client.removeQueries({ predicate: q => ["finance", "finance-history", "curator-ledger", "finance-invoices"].includes(String(q.queryKey[0])) }); };
  }, [client]);
  const allowed = user?.accountType === "corporate" || user?.role === "curator";
  async function send() { setBusy(true); setError(""); try { const data = await requestWalletCode(); setHint(data.phoneHint); setCodeExpiry(Date.parse(data.expiresAt)); setResendAt(Date.now() + 60000); setCode(""); } catch (e) { setError(e instanceof Error ? e.message : t("Kod gönderilemedi.", "Could not send code.")); } finally { setBusy(false); } }
  async function verify() { setBusy(true); setError(""); try { const data = await verifyWalletCode(code); client.removeQueries({ predicate: q => ["finance", "finance-history", "curator-ledger"].includes(String(q.queryKey[0])) }); setExpires(Date.parse(data.expiresAt)); } catch (e) { setError(e instanceof Error ? e.message : t("Kod doğrulanamadı.", "Verification failed.")); } finally { setBusy(false); } }
  if (!user) return <section className="page empty-state"><h1>{t("Cüzdan", "Wallet")}</h1><Link to="/login">{t("Giriş yap", "Sign in")}</Link></section>;
  if (!allowed) return <section className="page empty-state"><h1>{t("Cüzdan", "Wallet")}</h1><p>{t("Cüzdan kurumsal üyeler ve küratörler içindir.", "Wallet is for corporate members and curators.")}</p><Link to="/settings">{t("Ayarlara dön", "Back to settings")}</Link></section>;
  if (expires > now) return <><div className="page"><button className="secondary-action" onClick={() => { void closeWallet(); clearWalletGrant(); setExpires(0); setCodeExpiry(0); setCode(""); }}>{t("Cüzdanı kilitle", "Lock wallet")}</button><p>{t("Güvenli erişim 15 dakika sonra sona erer. Sayfadan ayrılınca cüzdan kilitlenir.", "Access expires after 15 minutes. Leaving this page locks the wallet.")}</p></div>{user.role === "curator" ? <div className="page"><CuratorLedger/></div> : <FinancePage billingOnly={billingOnly}/>}</>;
  return <section className="page"><div className="finance-panel" style={{ maxWidth: 520, margin: "2rem auto" }}><h1>{t("Cüzdan doğrulaması", "Verify wallet access")}</h1><p>{t("Hesabındaki doğrulanmış telefon numarasına 8 haneli bir kod göndereceğiz. Kod 3 dakika geçerlidir. Üç yanlış denemede cüzdan 8 saat kilitlenir.", "We will send an 8-digit code to your verified phone. It expires in 3 minutes. Three incorrect attempts lock your wallet for 8 hours.")}</p>{hint && <p>{hint} · {Math.max(0, Math.ceil((codeExpiry - now) / 1000))} {t("saniye", "seconds")}</p>}<button className="secondary-action" disabled={busy || resendAt > now} onClick={() => void send()}>{resendAt > now ? `${Math.ceil((resendAt - now) / 1000)} ${t("saniye bekle", "seconds")}` : t("SMS kodu gönder", "Send SMS code")}</button>{codeExpiry > now && <form onSubmit={e => { e.preventDefault(); void verify(); }}><label>{t("8 haneli kod", "8-digit code")}<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} required/></label><button className="primary-action" disabled={busy || code.length !== 8}>{t("Cüzdanı aç", "Open wallet")}</button></form>}{error && <p role="alert">{error}</p>}<p><Link to="/settings/account">{t("Telefon ve hesap ayarları", "Phone and account settings")}</Link></p></div></section>;
}
