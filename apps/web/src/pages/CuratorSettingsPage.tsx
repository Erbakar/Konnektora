import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CuratorLedger, curatorCategoryLabels } from "../components/CuratorLedger";
import { ServiceFeedback } from "../components/ServiceFeedback";
import { closeWallet, getOwnCuratorAgreement, getOwnCuratorWallet, getUserSession, requestCuratorPayout, requestWalletCode, verifyWalletCode } from "../lib/api";
import { useLanguage } from "../lib/i18n";
import { clearWalletGrant } from "../lib/wallet-session";

type Tab = "agreement" | "wallet" | "ledger" | "payout";

/**
 * 23/11 #10: Ayarlar Merkezi › Küratör bilgi ve ayarları.
 * Girişte telefona 8 haneli, 180 sn geçerli, tek kullanımlık kod gönderilir; 3 hatalı denemede 8 saat kilit; başarılı girişte e-posta.
 * (Cüzdan ile aynı güvenli erişim altyapısı kullanılır.)
 */
export function CuratorSettingsPage() {
  const user = getUserSession();
  const client = useQueryClient();
  const { language } = useLanguage();
  const t = (tr: string, en: string) => (language === "tr" ? tr : en);
  const [expires, setExpires] = useState(0);
  const [codeExpiry, setCodeExpiry] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [code, setCode] = useState("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [tab, setTab] = useState<Tab>("agreement");
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.clearInterval(timer); void closeWallet().catch(() => undefined); clearWalletGrant(); client.removeQueries({ predicate: (q) => ["curator-ledger", "curator-own"].includes(String(q.queryKey[0])) }); };
  }, [client]);
  const unlocked = expires > now;
  const agreement = useQuery({ queryKey: ["curator-own", "agreement"], queryFn: getOwnCuratorAgreement, enabled: unlocked && tab === "agreement" });
  const wallet = useQuery({ queryKey: ["curator-own", "wallet"], queryFn: getOwnCuratorWallet, enabled: unlocked && (tab === "wallet" || tab === "payout") });
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const payout = useMutation({ mutationFn: () => requestCuratorPayout({ amount: Number(amount), currency }), onSuccess: () => { setAmount(""); void client.invalidateQueries({ queryKey: ["curator-own", "wallet"] }); } });

  async function send() { setBusy(true); setError(""); try { const data = await requestWalletCode(); setHint(data.phoneHint); setCodeExpiry(Date.parse(data.expiresAt)); setResendAt(Date.now() + 60000); setCode(""); } catch (e) { setError(e instanceof Error ? e.message : t("Kod gönderilemedi.", "Could not send code.")); } finally { setBusy(false); } }
  async function verify() { setBusy(true); setError(""); try { const data = await verifyWalletCode(code, "curator"); setExpires(Date.parse(data.expiresAt)); } catch (e) { setError(e instanceof Error ? e.message : t("Kod doğrulanamadı.", "Verification failed.")); } finally { setBusy(false); } }

  if (!user) return <section className="page empty-state"><h1>{t("Küratör bilgi ve ayarları", "Curator details and settings")}</h1><Link to="/login">{t("Giriş yap", "Sign in")}</Link></section>;
  if (user.role !== "curator") return <section className="page empty-state"><h1>{t("Küratör bilgi ve ayarları", "Curator details and settings")}</h1><p>{t("Bu bölüm yalnız küratörler içindir.", "This section is for curators only.")}</p><Link to="/settings">{t("Ayarlara dön", "Back to settings")}</Link></section>;

  if (!unlocked) return <section className="page"><Link className="back-link" to="/settings">← {t("Ayarlar Merkezi", "Settings Centre")}</Link><div className="finance-panel curator-gate"><h1>{t("Küratör bilgi ve ayarları", "Curator details and settings")}</h1><p>{t("Hesabındaki doğrulanmış telefon numarasına 8 haneli bir kod göndereceğiz. Kod 180 saniye geçerli ve tek kullanımlıktır. Üç yanlış denemede bölüme 8 saat erişilemez; başarılı girişte e-posta adresine bilgilendirme gönderilir.", "We will send an 8-digit code to your verified phone. It is valid for 180 seconds and can be used once. Three wrong attempts lock this section for 8 hours; successful sign-ins are reported by email.")}</p>{hint && <p>{hint} · {Math.max(0, Math.ceil((codeExpiry - now) / 1000))} {t("saniye", "seconds")}</p>}<button className="secondary-action" disabled={busy || resendAt > now} onClick={() => void send()} type="button">{resendAt > now ? `${Math.ceil((resendAt - now) / 1000)} ${t("saniye bekle", "seconds")}` : t("SMS kodu gönder", "Send SMS code")}</button>{codeExpiry > now && <form onSubmit={(e) => { e.preventDefault(); void verify(); }}><label>{t("8 haneli kod", "8-digit code")}<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required/></label><button className="primary-action" disabled={busy || code.length !== 8}>{t("Giriş yap", "Enter")}</button></form>}{error && <p role="alert" className="form-error">{error}</p>}<p><Link to="/settings/account">{t("Telefon ve hesap ayarları", "Phone and account settings")}</Link></p></div></section>;

  const tabs: Array<[Tab, string]> = [["agreement", t("Anlaşma kapsamı", "Agreement scope")], ["wallet", t("Cüzdan", "Wallet")], ["ledger", t("Hesap hareketleri", "Account activity")], ["payout", t("Ödeme talep et", "Request payment")]];
  const money = (value: number, code: string) => { try { return new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-GB", { style: "currency", currency: code }).format(value); } catch { return `${value.toFixed(2)} ${code}`; } };
  return <section className="page curator-settings-page">
    <Link className="back-link" to="/settings">← {t("Ayarlar Merkezi", "Settings Centre")}</Link>
    <header className="section-header"><div><p className="eyebrow">{t("Ayarlar", "Settings")}</p><h1>{t("Küratör bilgi ve ayarları", "Curator details and settings")}</h1><p className="lead">{t("Güvenli erişim 15 dakika sonra sona erer. Sayfadan ayrılınca bölüm kilitlenir.", "Secure access expires after 15 minutes. Leaving the page locks this section.")}</p></div><button className="secondary-action" onClick={() => { void closeWallet(); clearWalletGrant(); setExpires(0); setCodeExpiry(0); setCode(""); }} type="button">{t("Kilitle", "Lock")}</button></header>
    <nav className="feed-tabs" role="tablist">{tabs.map(([key, label]) => <button key={key} className={tab === key ? "active" : ""} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} type="button">{label}</button>)}</nav>

    {tab === "agreement" ? <section className="finance-panel">
      {agreement.isLoading ? <p role="status">{t("Yükleniyor…", "Loading…")}</p> : null}
      {agreement.isError ? <ServiceFeedback error={agreement.error} title={t("Anlaşma yüklenemedi", "Agreement unavailable")}/> : null}
      {agreement.data ? !agreement.data.agreement ? <p>{t("Henüz tanımlı bir anlaşma yok.", "No agreement yet.")}</p> : <>
        <p><strong>{agreement.data.agreement.active ? t("Aktif", "Active") : t("Pasif", "Inactive")}</strong>{agreement.data.agreement.active ? ` · ${t("Başlangıç", "Start")}: ${new Date(agreement.data.agreement.effectiveAt).toLocaleDateString(language === "tr" ? "tr-TR" : "en-GB")}` : ""}</p>
        <h3>{t("Sorumlu olduğun bölgeler", "Your territories")}</h3>
        <ul>{agreement.data.agreement.territories.map((row, index) => <li key={index}>{[row.country, row.region, row.city].filter(Boolean).join(" · ") || t("Ülkenin tamamı", "Whole country")}</li>)}</ul>
        <h3>{t("Kazanacağın gelirlerin oranları", "Your revenue shares")}</h3>
        <div className="admin-finance-table"><table><thead><tr><th>{t("Gelir kaynağı", "Income source")}</th><th>{t("Oran", "Rate")}</th></tr></thead><tbody>{Object.entries(agreement.data.agreement.rates).filter(([, rate]) => rate > 0).map(([key, rate]) => <tr key={key}><td>{curatorCategoryLabels[key] ?? key}</td><td>%{rate}</td></tr>)}</tbody></table></div>
        <h3>{t("Referans olduğun küratörler", "Curators you refer")}</h3>
        {agreement.data.referred.length ? <div className="admin-finance-table"><table><thead><tr><th>{t("Küratör", "Curator")}</th><th>{t("Gelirlerinden kazanacağın oran", "Your share of their income")}</th></tr></thead><tbody>{agreement.data.referred.map((row) => <tr key={row.curator.id}><td>{row.curator.username ? `@${row.curator.username}` : row.curator.name}</td><td>%{row.referralRate}</td></tr>)}</tbody></table></div> : <p>{t("Referans olduğun küratör yok.", "You don't refer any curators.")}</p>}
        <p className="form-help">{t("Bu bilgiler yalnız görüntülenir; değişiklik için Konnektora ile iletişime geçin.", "These details are read-only; contact Konnektora to change them.")}</p>
      </> : null}
    </section> : null}

    {tab === "wallet" ? <section className="finance-panel">
      {wallet.isLoading ? <p role="status">{t("Yükleniyor…", "Loading…")}</p> : null}
      {wallet.isError ? <ServiceFeedback error={wallet.error} title={t("Cüzdan yüklenemedi", "Wallet unavailable")}/> : null}
      {wallet.data ? <>
        <div className="finance-metrics">{Object.keys(wallet.data.balances).length ? Object.entries(wallet.data.balances).map(([code, value]) => <article key={code}><strong>{t("Toplam bakiye", "Total balance")}: {money(value.total, code)}</strong><span>{t("Mevcut bakiye", "Available")}: {money(value.available, code)}</span><span>{t("Blokeli bakiye", "Held")}: {money(value.held, code)}</span></article>) : <article><strong>{t("Toplam bakiye", "Total balance")}: 0</strong></article>}</div>
        <h3>{t("Kayıtlı banka bilgileri", "Saved bank details")}</h3>
        <dl className="curator-bank">{([["bankName", t("Banka adı", "Bank name")], ["accountName", t("Hesap sahibi", "Account holder")], ["iban", "IBAN"], ["paymentDetails", t("Diğer ödeme bilgileri", "Other payment details")]] as const).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{wallet.data.bank[key] || "—"}</dd></div>)}</dl>
        <p className="form-help">{t("Banka bilgileri yalnız görüntülenir; değişiklik için Konnektora ile iletişime geçin.", "Bank details are read-only; contact Konnektora to change them.")}</p>
      </> : null}
    </section> : null}

    {tab === "ledger" ? <CuratorLedger/> : null}

    {tab === "payout" ? <section className="finance-panel">
      <h2>{t("Ödeme talep et", "Request payment")}</h2>
      {wallet.data ? <p>{Object.entries(wallet.data.balances).map(([code, value]) => `${t("Mevcut", "Available")} ${money(value.available, code)}`).join(" · ") || t("Mevcut bakiye yok.", "No available balance.")}</p> : null}
      <form className="finance-row" onSubmit={(event) => { event.preventDefault(); payout.mutate(); }}>
        <label>{t("Tutar", "Amount")}<input inputMode="decimal" min="1" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} required/></label>
        <label>{t("Para birimi", "Currency")}<select value={currency} onChange={(event) => setCurrency(event.target.value)}>{["TRY", "EUR", "USD", "GBP"].map((code) => <option key={code}>{code}</option>)}</select></label>
        <button className="primary-action" disabled={payout.isPending || !Number(amount)}>{t("Talep gönder", "Send request")}</button>
      </form>
      {payout.isSuccess ? <p className="form-success" role="status">{t("Ödeme talebin alındı. Konnektora ekibi inceleyip kayıtlı banka hesabına ödeme yapacak.", "Your request was received. The Konnektora team will review it and pay to your saved bank account.")}</p> : null}
      {payout.isError ? <ServiceFeedback error={payout.error} title={t("Talep gönderilemedi", "Request failed")}/> : null}
      {wallet.data?.pendingRequests.length ? <><h3>{t("Bekleyen taleplerin", "Pending requests")}</h3><ul>{wallet.data.pendingRequests.map((row) => <li key={row.id}>{money(row.amount, row.currency)} · {new Date(row.requestedAt).toLocaleDateString(language === "tr" ? "tr-TR" : "en-GB")}</li>)}</ul></> : null}
    </section> : null}
  </section>;
}
