import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Nfc, QrCode, RefreshCw } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  completeOnboarding,
  getMemberPass,
  getOnboardingStatus,
  getUserSession,
  listMemberScans,
  rotateMemberPass,
} from "../lib/api";
import { MemberDeviceScanner } from "../components/MemberDeviceScanner";

export function IdentityPage() {
  const user = getUserSession();
  const queryClient = useQueryClient();
  const [qrImage, setQrImage] = useState("");
  const onboarding = useQuery({
    queryKey: ["onboarding", user?.id],
    queryFn: getOnboardingStatus,
    enabled: Boolean(user),
  });
  const memberPass = useQuery({
    queryKey: ["member-pass", user?.id],
    queryFn: getMemberPass,
    enabled: Boolean(user),
  });
  const history = useQuery({
    queryKey: ["member-scans", user?.id],
    queryFn: listMemberScans,
    enabled: Boolean(user),
  });
  useEffect(() => {
    if (memberPass.data)
      void QRCode.toDataURL(memberPass.data.qrPayload, {
        width: 280,
        margin: 1,
      }).then(setQrImage);
  }, [memberPass.data]);
  const completeMutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: (data) =>
      queryClient.setQueryData(["onboarding", user?.id], data),
  });
  const rotateMutation = useMutation({
    mutationFn: rotateMemberPass,
    onSuccess: (data) =>
      queryClient.setQueryData(["member-pass", user?.id], data),
  });
  if (!user)
    return (
      <section className="page empty-state">
        <QrCode size={42} />
        <h1>Üye kartı</h1>
        <p>QR kartını kullanmak için giriş yap.</p>
        <Link className="primary-action" to="/account">
          Giriş yap
        </Link>
      </section>
    );

  return (
    <section className="page identity-page">
      <header className="identity-hero">
        <div>
          <span className="eyebrow">Konnektora Kimlik</span>
          <h1>Onboarding ve üye kartın</h1>
          <p>
            Profilini tamamla, QR veya NFC ile tanıştığın kişileri hızlıca takip
            et.
          </p>
        </div>
        <div className="identity-progress">
          <strong>%{onboarding.data?.progress ?? 0}</strong>
          <span>profil tamamlandı</span>
        </div>
      </header>
      <div className="identity-grid">
        <section className="identity-panel">
          <div className="section-header compact">
            <h2>Başlangıç adımları</h2>
            <span>
              {onboarding.data?.steps.filter((step) => step.completed).length ??
                0}
              /5
            </span>
          </div>
          <div className="onboarding-steps">
            {onboarding.data?.steps.map((step, index) => (
              <Link
                className={
                  step.completed
                    ? "onboarding-step is-complete"
                    : "onboarding-step"
                }
                key={step.key}
                to={step.path}
              >
                <span>{step.completed ? <Check size={18} /> : index + 1}</span>
                <strong>{step.title}</strong>
                <small>{step.completed ? "Tamamlandı" : "Devam et"}</small>
              </Link>
            ))}
          </div>
          {!onboarding.data?.completed ? (
            <button
              className="primary-action"
              disabled={
                completeMutation.isPending ||
                onboarding.data?.steps
                  .slice(0, 4)
                  .some((step) => !step.completed)
              }
              onClick={() => completeMutation.mutate()}
              type="button"
            >
              Onboarding'i tamamla
            </button>
          ) : (
            <p className="success-note">
              <Check size={18} /> Onboarding tamamlandı.
            </p>
          )}
        </section>
        <section className="identity-panel member-pass-panel">
          <div className="section-header compact">
            <h2>Üye QR kartın</h2>
            <span>v{memberPass.data?.version ?? 1}</span>
          </div>
          {qrImage ? (
            <img
              className="member-qr"
              alt="Konnektora üye QR kodu"
              src={qrImage}
            />
          ) : (
            <div className="qr-placeholder">QR hazırlanıyor…</div>
          )}
          <strong>{memberPass.data?.member.name}</strong>
          <span>
            {memberPass.data?.member.username
              ? `@${memberPass.data.member.username}`
              : user.email}
          </span>
          <button
            className="ghost-action"
            disabled={rotateMutation.isPending}
            onClick={() => rotateMutation.mutate()}
            type="button"
          >
            <RefreshCw size={17} /> Kartı yenile
          </button>
        </section>
      </div>
      <MemberDeviceScanner
        nfcPayload={memberPass.data?.nfcPayload}
        userId={user.id}
      />
      <section className="identity-panel">
        <div className="section-header compact">
          <h2>Tarama geçmişi</h2>
          <span>{history.data?.length ?? 0}</span>
        </div>
        <div className="scan-history">
          {history.data?.map((scan) => (
            <article key={scan.id}>
              <span>{scan.method === "nfc" ? <Nfc /> : <QrCode />}</span>
              <div>
                <strong>
                  {scan.member.username
                    ? `@${scan.member.username}`
                    : scan.member.name}
                </strong>
                <small>
                  {new Intl.DateTimeFormat("tr-TR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(scan.createdAt))}
                </small>
              </div>
              <b>Takipte</b>
            </article>
          ))}
          {!history.isLoading && !history.data?.length ? (
            <p className="form-help">Henüz tarama geçmişin yok.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
