import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Nfc, QrCode, RefreshCw } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMemberPass,
  getUserSession,
  listMemberScans,
  rotateMemberPass,
} from "../lib/api";
import { MemberDeviceScanner } from "../components/MemberDeviceScanner";

export function IdentityPage() {
  const user = getUserSession();
  const queryClient = useQueryClient();
  const [qrImage, setQrImage] = useState("");
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
        <Link className="primary-action" to="/login">
          Giriş yap
        </Link>
      </section>
    );

  return (
    <section className="page identity-page">
      <header className="identity-hero">
        <div>
          <span className="eyebrow">Konnektora Kimlik</span>
          <h1>Üye kartın</h1>
          <p>
            QR veya NFC ile tanıştığın kişinin profilini iki cihazda da aç.
          </p>
        </div>
      </header>
      <div className="identity-grid">
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
