import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Nfc, QrCode, RefreshCw, ScanLine } from "lucide-react";
import QRCode from "qrcode";
import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { completeOnboarding, getMemberPass, getOnboardingStatus, getUserSession, listMemberScans, rotateMemberPass, scanMember } from "../lib/api";

export function IdentityPage() {
  const user = getUserSession();
  const queryClient = useQueryClient();
  const [qrImage, setQrImage] = useState("");
  const onboarding = useQuery({ queryKey: ["onboarding", user?.id], queryFn: getOnboardingStatus, enabled: Boolean(user) });
  const memberPass = useQuery({ queryKey: ["member-pass", user?.id], queryFn: getMemberPass, enabled: Boolean(user) });
  const history = useQuery({ queryKey: ["member-scans", user?.id], queryFn: listMemberScans, enabled: Boolean(user) });
  useEffect(() => { if (memberPass.data) void QRCode.toDataURL(memberPass.data.qrPayload, { width: 280, margin: 1 }).then(setQrImage); }, [memberPass.data]);
  const completeMutation = useMutation({ mutationFn: completeOnboarding, onSuccess: (data) => queryClient.setQueryData(["onboarding", user?.id], data) });
  const rotateMutation = useMutation({ mutationFn: rotateMemberPass, onSuccess: (data) => queryClient.setQueryData(["member-pass", user?.id], data) });
  const scanMutation = useMutation({
    mutationFn: ({ payload, method }: { payload: string; method: "qr" | "nfc" }) => scanMember(payload, method),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["member-scans", user?.id] })
  });
  if (!user) return <section className="page empty-state"><QrCode size={42} /><h1>Üye kartı</h1><p>QR kartını kullanmak için giriş yap.</p><Link className="primary-action" to="/account">Giriş yap</Link></section>;

  return <section className="page identity-page">
    <header className="identity-hero"><div><span className="eyebrow">Konnektora Identity</span><h1>Onboarding ve üye kartın</h1><p>Profilini tamamla, QR veya NFC ile tanıştığın kişileri hızlıca takip et.</p></div><div className="identity-progress"><strong>%{onboarding.data?.progress ?? 0}</strong><span>profil tamamlandı</span></div></header>
    <div className="identity-grid">
      <section className="identity-panel"><div className="section-header compact"><h2>Başlangıç adımları</h2><span>{onboarding.data?.steps.filter((step) => step.completed).length ?? 0}/5</span></div>
        <div className="onboarding-steps">{onboarding.data?.steps.map((step, index) => <Link className={step.completed ? "onboarding-step is-complete" : "onboarding-step"} key={step.key} to={step.path}><span>{step.completed ? <Check size={18} /> : index + 1}</span><strong>{step.title}</strong><small>{step.completed ? "Tamamlandı" : "Devam et"}</small></Link>)}</div>
        {!onboarding.data?.completed ? <button className="primary-action" disabled={completeMutation.isPending || onboarding.data?.steps.slice(0, 4).some((step) => !step.completed)} onClick={() => completeMutation.mutate()} type="button">Onboarding'i tamamla</button> : <p className="success-note"><Check size={18} /> Onboarding tamamlandı.</p>}
      </section>
      <section className="identity-panel member-pass-panel"><div className="section-header compact"><h2>Üye QR kartın</h2><span>v{memberPass.data?.version ?? 1}</span></div>
        {qrImage ? <img className="member-qr" alt="Konnektora üye QR kodu" src={qrImage} /> : <div className="qr-placeholder">QR hazırlanıyor…</div>}
        <strong>{memberPass.data?.member.name}</strong><span>{memberPass.data?.member.username ? `@${memberPass.data.member.username}` : user.email}</span>
        <button className="ghost-action" disabled={rotateMutation.isPending} onClick={() => rotateMutation.mutate()} type="button"><RefreshCw size={17} /> Kartı yenile</button>
      </section>
    </div>
    <section className="identity-panel"><div className="section-header compact"><h2>QR / NFC tara</h2><span><ScanLine size={18} /> Hızlı takip</span></div>
      <form className="identity-scan-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const payload = String(form.get("payload") ?? "").trim(); const method = String(form.get("method")) === "nfc" ? "nfc" : "qr"; if (payload) scanMutation.mutate({ payload, method }); }}>
        <textarea aria-label="Üye kartı verisi" name="payload" placeholder="QR kodunu tara veya kart verisini yapıştır" required rows={3} />
        <select aria-label="Tarama yöntemi" name="method"><option value="qr">QR</option><option value="nfc">NFC</option></select>
        <button className="primary-action" type="submit"><Nfc size={18} /> Üyeyi bul ve takip et</button>
      </form>
      {scanMutation.isSuccess ? <p className="success-note"><Check size={18} /> {scanMutation.data.member.name} takip edildi.</p> : null}
      {scanMutation.isError ? <p className="form-error">Kart geçersiz, eski veya bu üyeyle bağlantı kurulmasına izin verilmiyor.</p> : null}
      <div className="scan-history">{history.data?.map((scan) => <article key={scan.id}><span>{scan.method === "nfc" ? <Nfc /> : <QrCode />}</span><div><strong>{scan.member.username ? `@${scan.member.username}` : scan.member.name}</strong><small>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(scan.createdAt))}</small></div><b>Takipte</b></article>)}{!history.isLoading && !history.data?.length ? <p className="form-help">Henüz tarama geçmişin yok.</p> : null}</div>
    </section>
  </section>;
}
