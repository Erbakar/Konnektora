import { HeldEventDetail } from "./HeldEventDetail";
import { PlatformIncomeReport } from "./PlatformIncomeReport";
import { PlanAdmin } from "./PlanAdmin";
import { FinanceInvoices } from "./FinanceInvoices";
import { FinanceHistory } from "./FinanceHistory";
import { CuratorFinanceAdmin } from "./CuratorFinanceAdmin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { listAdminFinanceAccounts, listAdminFinancePayouts, listAdminFinanceTransactions, listFinanceCurators, listHeldFinanceEvents, releaseHeldFinanceEvent } from "../lib/api";
import { downloadFinanceExcel, matchesFinanceDate } from "../lib/financeExport";
import { ServiceFeedback } from "./ServiceFeedback";
import { PlatformRevenueAdmin } from "./PlatformRevenueAdmin";
import { CuratorLedger } from "./CuratorLedger";
import { BackofficePlaceholder } from "./BackofficeNavigation";

const statuses: Record<string, string> = { not_started: "Başlatılmadı", pending: "Bekliyor", approved: "Onaylı", rejected: "Reddedildi", succeeded: "Başarılı", processing: "İşleniyor", paid: "Ödendi", failed: "Başarısız", cancelled: "İptal", refunded: "İade", partially_refunded: "Kısmi iade" };
const money = (amount: number, currency: string) => new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(amount);
/**
 * 17/10 #1 madde 4.6 — Muhasebe & Finans alt kategorileri.
 * `view` verilmezse panel eskisi gibi tüm finans bölümlerini tek sayfada gösterir.
 */
export type AdminFinanceView =
  | "held-events"
  | "curator-agreements"
  | "curator-revenue"
  | "curator-payouts"
  | "curator-ledger"
  | "customer-accounts"
  | "customer-transactions"
  | "customer-plan-usage"
  | "customer-payouts"
  | "invoices"
  | "plans"
  | "plan-gifts"
  | "platform-income";
const viewQueries: Partial<Record<AdminFinanceView, Array<"accounts" | "payouts" | "transactions" | "held">>> = {
  "held-events": ["held"],
  "curator-payouts": ["payouts"],
  "customer-payouts": ["payouts"],
  "customer-accounts": ["accounts", "payouts", "transactions"],
  "customer-transactions": ["accounts", "payouts", "transactions"],
};
function CuratorLedgerAdmin() {
  const [selected, setSelected] = useState("");
  const curators = useQuery({ queryKey: ["finance-curators"], queryFn: listFinanceCurators });
  return <section className="admin-form"><h2>Küratör hesap ekstresi</h2>{curators.isError ? <ServiceFeedback error={curators.error} title="Küratörler yüklenemedi" onRetry={() => void curators.refetch()}/> : null}<label>Küratör<select value={selected} onChange={event => setSelected(event.target.value)}><option value="">Küratör seçin</option>{curators.data?.map(row => <option key={row.id} value={row.id}>{row.name}{row.username ? ` @${row.username}` : ""}</option>)}</select></label>{curators.data?.length === 0 ? <p>Henüz küratör anlaşması yok.</p> : null}{selected ? <CuratorLedger key={selected} userId={selected}/> : <p>Ekstresini görmek için bir küratör seçin.</p>}</section>;
}
export function AdminFinancePanel({ view }: { view?: AdminFinanceView } = {}) {
  const needs = (key: "accounts" | "payouts" | "transactions" | "held") => !view || Boolean(viewQueries[view]?.includes(key));
  const [heldDetail,setHeldDetail] = useState<string|null>(null);
  const [heldSearch,setHeldSearch] = useState("");
  const [showPlatform,setShowPlatform] = useState(false);
  const [showPlans,setShowPlans] = useState(false);
  const [showInvoices, setShowInvoices] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCurators, setShowCurators] = useState(false);
  const client = useQueryClient();
  const heldEvents = useQuery({ queryKey: ["admin-finance-held-events"], queryFn: listHeldFinanceEvents, enabled: needs("held") });
  const release = useMutation({ mutationFn: releaseHeldFinanceEvent, onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["admin-finance-held-events"] }), client.invalidateQueries({ queryKey: ["admin-finance-accounts"] }), client.invalidateQueries({ queryKey: ["finance"] }), client.invalidateQueries({ queryKey: ["platform-report"] })]); } });
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(""); const [until, setUntil] = useState(""); const [currency, setCurrency] = useState(""); const [status, setStatus] = useState("");
  const [exporting, setExporting] = useState(false); const [exportError, setExportError] = useState<unknown>(null);
  const accounts = useQuery({ queryKey: ["admin-finance-accounts"], queryFn: listAdminFinanceAccounts, enabled: needs("accounts") });
  const payouts = useQuery({ queryKey: ["admin-finance-payouts"], queryFn: listAdminFinancePayouts, enabled: needs("payouts") });
  const transactions = useQuery({ queryKey: ["admin-finance-transactions"], queryFn: listAdminFinanceTransactions, enabled: needs("transactions") });
  const matches = (value: string) => value.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr"));
  const failed = [accounts, payouts, transactions, heldEvents].find(query => query.isError);
  const accountRows = accounts.data?.filter(account => matches(`${account.user.name} ${account.user.email}`) && (!currency || account.preferredCurrency === currency)) ?? [];
  const payoutRows = payouts.data?.filter(payout => matches(`${payout.user.name} ${payout.user.email}`) && (!currency || payout.currency === currency) && (!status || payout.status === status) && matchesFinanceDate(payout.requestedAt, from, until)) ?? [];
  const transactionRows = transactions.data?.filter(item => matches(`${item.event?.title ?? ""} ${item.payer?.name ?? ""} ${item.payee?.name ?? ""}`) && (!currency || item.currency === currency) && (!status || item.status === status) && matchesFinanceDate(item.createdAt, from, until)) ?? [];
  async function exportRecords() {
    setExporting(true); setExportError(null);
    try { await downloadFinanceExcel([
      { name: "Hesaplar", headers: ["Üye ID", "Üye", "E-posta", "Hesap türü", "KYC", "Kullanılabilir", "Çekim bekleyen", "Blokeli gelir", "Para birimi"], rows: accountRows.map(item => [item.userId, item.user.name, item.user.email, item.user.accountType, item.kycStatus, item.availableBalance, item.pendingBalance, item.heldBalance ?? 0, item.preferredCurrency]) },
      { name: "Para çekme", headers: ["İşlem ID", "Üye", "Tutar", "Para birimi", "Durum", "Talep zamanı"], rows: payoutRows.map(item => [item.id, item.user.name, item.amount, item.currency, item.status, new Date(item.requestedAt)]) },
      { name: "Hareketler", headers: ["İşlem ID", "Etkinlik", "Ödeyen", "Alıcı", "Brüt", "Platform payı", "Net", "İade", "Para birimi", "Durum", "Zaman"], rows: transactionRows.map(item => [item.id, item.event?.title ?? item.eventId, item.payer?.name, item.payee?.name, item.grossAmount, item.platformFee, item.netAmount, item.refundedAmount, item.currency, item.status, new Date(item.createdAt)]) },
    ], "konnektora-finans"); } catch (error) { setExportError(error); } finally { setExporting(false); }
  }
  const filterBar = <><label>Üye / etkinlik ara<input value={search} onChange={event => setSearch(event.target.value)}/></label><div className="finance-row"><label>Başlangıç tarihi<input type="date" value={from} onChange={event => setFrom(event.target.value)}/></label><label>Bitiş tarihi<input type="date" min={from || undefined} value={until} onChange={event => setUntil(event.target.value)}/></label><label>Para birimi<select value={currency} onChange={event => setCurrency(event.target.value)}><option value="">Tümü</option>{["TRY", "EUR", "USD", "GBP"].map(value => <option key={value}>{value}</option>)}</select></label><label>İşlem durumu<select value={status} onChange={event => setStatus(event.target.value)}><option value="">Tümü</option>{Object.entries(statuses).filter(([key]) => !["not_started", "approved", "rejected"].includes(key)).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div><button type="button" className="secondary-action" disabled={exporting || Boolean(failed) || !accounts.data || !payouts.data || !transactions.data} onClick={() => void exportRecords()}>{exporting ? "Hazırlanıyor…" : "Görünen kayıtları Excel indir"}</button>{exportError ? <ServiceFeedback error={exportError} title="Excel dosyası hazırlanamadı"/> : null}</>;
  const feedback = <>{failed ? <ServiceFeedback error={failed.error} title="Finans kayıtları yüklenemedi" onRetry={() => { void accounts.refetch(); void payouts.refetch(); void transactions.refetch(); void heldEvents.refetch(); }}/> : null}
    {accounts.isLoading || payouts.isLoading || transactions.isLoading || heldEvents.isLoading ? <p role="status">Finans kayıtları yükleniyor…</p> : null}</>;
  const heldSection = <section className="admin-form"><h2>Blokeli etkinlik gelirleri</h2><p>Onay zamanı gelen: {heldEvents.data?.filter(e=>e.status==="published"&&e.eligibleAt&&new Date(e.eligibleAt).getTime()<=Date.now()).length??0}</p><label>Blokeli etkinlik ara<input value={heldSearch} onChange={e=>setHeldSearch(e.target.value)} placeholder="Etkinlik, mekân, şehir veya kurucu"/></label><p>Gelirler etkinlik bitişinden 72 saat sonra yönetici onayıyla serbest bırakılır. Bitiş tarihi eksik veya yayımdan kaldırılmış etkinlikler onaylanamaz. Bitiş tarihine göre ilk 100 etkinlik gösterilir.</p>{release.isError ? <ServiceFeedback error={release.error} title="Gelir serbest bırakılamadı"/> : null}{release.isSuccess ? <p role="status">{release.data.released} bilet ödemesi ve {release.data.releasedSources ?? 0} diğer gelir kaydı serbest bırakıldı.</p> : null}{heldEvents.data?.filter(event=>!heldSearch||[event.title,event.locationName,event.city,event.region,event.country,event.creatorUsername].join(" ").toLocaleLowerCase("tr").includes(heldSearch.toLocaleLowerCase("tr"))).map(event => <article key={event.id}><Link to={`/events/${event.slug}`}>{event.title}</Link><p>{[event.locationName,event.city,event.region,event.country].filter(Boolean).join(", ")} · @{event.creatorUsername}</p><button type="button" onClick={()=>setHeldDetail(heldDetail===event.id?null:event.id)}>Denetim detayı</button>{heldDetail===event.id&&<HeldEventDetail id={event.id}/>}<p>Organizatör: {event.totals.map(total => money(total.amount, total.currency)).join(" · ") || "—"}</p><p>Küratör payları: {(event.curatorTotals ?? []).map(total => money(total.amount, total.currency)).join(" · ") || "—"}</p><p>{event.eligibleAt ? `Onay zamanı: ${new Date(event.eligibleAt).toLocaleString("tr-TR")}` : "Etkinlik bitiş tarihi eksik"}</p><button type="button" className="secondary-action" disabled={release.isPending || event.status !== "published" || !event.eligibleAt || new Date(event.eligibleAt).getTime() > Date.now()} onClick={() => release.mutate(event.id)}>Geliri serbest bırak</button></article>)}{heldEvents.data?.length === 0 ? <p>Blokeli etkinlik geliri yok.</p> : null}</section>;
  const accountsSection = <section className="admin-form"><h2>Üye hesapları ve doğrulama</h2><div className="admin-finance-table"><table><thead><tr><th>Üye</th><th>Hesap türü</th><th>KYC</th><th>Kullanılabilir</th><th>Çekim bekleyen</th><th>Blokeli gelir</th><th>Banka bağlantısı</th></tr></thead><tbody>{accountRows.map(account => <tr key={account.userId}><td><Link to={`/users/id/${account.userId}`}>{account.user.name}</Link><small>{account.user.email}</small></td><td>{account.user.accountType === "corporate" ? "Kurumsal" : "Bireysel"}</td><td>{statuses[account.kycStatus] ?? account.kycStatus}</td><td>{money(account.availableBalance, account.preferredCurrency)}</td><td>{money(account.pendingBalance, account.preferredCurrency)}</td><td>{money(account.heldBalance ?? 0, account.preferredCurrency)}</td><td>{account.bankProvider ? `${account.bankProvider} · ${account.bankAccountLabel ?? ""} · ****${account.bankAccountLast4 ?? ""}` : "Bağlantı yok"}</td></tr>)}</tbody></table></div>{accounts.data && accountRows.length === 0 ? <p>Filtreye uygun hesap yok.</p> : null}</section>;
  const payoutsSection = (title: string, rows: typeof payoutRows, pendingNote = false) => <section className="admin-form"><h2>{title}</h2>{pendingNote ? <p>Değerlendirilmeyi bekleyen: {rows.filter(payout => payout.status === "pending").length}</p> : null}<div className="admin-finance-table"><table><thead><tr><th>Üye</th><th>Tutar</th><th>Durum</th><th>Talep zamanı</th></tr></thead><tbody>{rows.map(payout => <tr key={payout.id}><td>{payout.user.name}</td><td>{money(payout.amount, payout.currency)}</td><td>{statuses[payout.status] ?? payout.status}</td><td>{new Date(payout.requestedAt).toLocaleString("tr-TR")}</td></tr>)}</tbody></table></div>{payouts.data && rows.length === 0 ? <p>Filtreye uygun para çekme talebi yok.</p> : null}</section>;
  const transactionsSection = <section className="admin-form"><h2>Hesap hareketleri</h2><div className="admin-finance-table"><table><thead><tr><th>Etkinlik / müşteri</th><th>Brüt tutar</th><th>Platform payı</th><th>Net tutar</th><th>İade</th><th>Durum</th><th>Zaman</th></tr></thead><tbody>{transactionRows.map(item => <tr key={item.id}><td>{item.event ? <Link to={`/events/${item.event.slug}`}>{item.event.title}</Link> : item.eventId}<small>{item.payer?.name} → {item.payee?.name}</small></td><td>{money(item.grossAmount, item.currency)}</td><td>{money(item.platformFee, item.currency)}</td><td>{money(item.netAmount, item.currency)}</td><td>{money(item.refundedAmount, item.currency)}</td><td>{statuses[item.status] ?? item.status}</td><td>{new Date(item.createdAt).toLocaleString("tr-TR")}</td></tr>)}</tbody></table></div>{transactions.data && transactionRows.length === 0 ? <p>Filtreye uygun finansal işlem yok.</p> : null}</section>;
  if (view === "held-events") return <div className="admin-finance-panel">{feedback}{heldSection}</div>;
  if (view === "curator-agreements") return <div className="admin-finance-panel"><CuratorFinanceAdmin showRevenue={false}/></div>;
  if (view === "curator-revenue") return <div className="admin-finance-panel"><PlatformRevenueAdmin/></div>;
  if (view === "curator-payouts") return <div className="admin-finance-panel">{feedback}{payoutsSection("Küratör para çekme talepleri", (payouts.data ?? []).filter(payout => payout.isCurator), true)}</div>;
  if (view === "curator-ledger") return <div className="admin-finance-panel"><CuratorLedgerAdmin/></div>;
  if (view === "customer-payouts") return <div className="admin-finance-panel">{feedback}{payoutsSection("Müşteri para çekme talepleri", (payouts.data ?? []).filter(payout => !payout.isCurator), true)}</div>;
  if (view === "customer-accounts") return <div className="admin-finance-panel">{filterBar}{feedback}{accountsSection}</div>;
  if (view === "customer-transactions") return <div className="admin-finance-panel"><FinanceHistory admin/>{filterBar}{feedback}{transactionsSection}</div>;
  if (view === "customer-plan-usage") return <div className="admin-finance-panel"><BackofficePlaceholder title="Kullanıcının paket kullanım raporu">Üye bazında paket ve kota kullanım raporu henüz hazır değil. Paket tanımları ve hediye denemeler “Paket ve hizmetlerin yönetimi” altında yönetilir.</BackofficePlaceholder></div>;
  if (view === "invoices") return <div className="admin-finance-panel"><FinanceInvoices admin/></div>;
  if (view === "plans") return <div className="admin-finance-panel"><PlanAdmin view="catalog"/></div>;
  if (view === "plan-gifts") return <div className="admin-finance-panel"><PlanAdmin view="gifts"/></div>;
  if (view === "platform-income") return <div className="admin-finance-panel"><PlatformIncomeReport/></div>;
  return <div className="admin-finance-panel"><button type="button" aria-expanded={showPlatform} onClick={()=>setShowPlatform(!showPlatform)}>Konnektora gelirleri</button>{showPlatform && <PlatformIncomeReport/>}<button type="button" aria-expanded={showPlans} onClick={()=>setShowPlans(!showPlans)}>Paket yönetimi</button>{showPlans && <PlanAdmin/>}<button type="button" className="secondary-action" aria-expanded={showInvoices} onClick={() => setShowInvoices(!showInvoices)}>Faturalar</button>{showInvoices ? <FinanceInvoices admin/> : null}<button type="button" className="secondary-action" aria-expanded={showHistory} onClick={() => setShowHistory(!showHistory)}>Tüm hesap hareketleri</button>{showHistory ? <FinanceHistory admin/> : null}<button type="button" className="secondary-action" aria-expanded={showCurators} onClick={() => setShowCurators(!showCurators)}>Küratörler ve gelir oranları</button>{showCurators ? <CuratorFinanceAdmin/> : null}{filterBar}<p>Her tabloda en güncel 200 kayıt gösterilir. Banka bağlantısı bilgileri yalnız görüntülenir.</p>
    {feedback}
    {heldSection}
    {accountsSection}
    {payoutsSection("Para çekme talepleri", payoutRows)}
    {transactionsSection}
  </div>;
}
