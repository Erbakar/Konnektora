import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Nfc, QrCode, RefreshCw } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getMemberPass,
  getUserSession,
  listIncomingMemberScans,
  listMemberScans,
  rotateMemberPass,
} from "../lib/api";
import { MemberDeviceScanner } from "../components/MemberDeviceScanner";
import { useLanguage } from "../lib/i18n";

export function IdentityPage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const user = getUserSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [qrImage, setQrImage] = useState("");
  const [incomingSince] = useState(() => new Date().toISOString());
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
  const incoming = useQuery({
    queryKey: ["member-scans", user?.id, "incoming", incomingSince],
    queryFn: () => listIncomingMemberScans(incomingSince),
    enabled: Boolean(user),
    refetchInterval: 2_000,
  });
  useEffect(() => {
    const latest = incoming.data?.at(-1);
    if (latest) navigate(`/users/id/${latest.member.id}`);
  }, [incoming.data, navigate]);
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
        <h1>{t("Üye kartı", "Member card")}</h1>
        <p>{t("QR kartını kullanmak için giriş yap.", "Log in to use your QR member card.")}</p>
        <Link className="primary-action" to="/login">
          {t("Giriş yap", "Log in")}
        </Link>
      </section>
    );

  return (
    <section className="page identity-page">
      <header className="identity-hero">
        <div>
          <span className="eyebrow">{t("Konnektora Kimlik", "Konnektora Identity")}</span>
          <h1>{t("Üye kartın", "Your member card")}</h1>
          <p>
            {t("QR veya NFC ile tanıştığın kişinin profilini iki cihazda da aç.", "Use QR or NFC to open each other's profiles on both devices.")}
          </p>
        </div>
      </header>
      <div className="identity-grid">
        <section className="identity-panel member-pass-panel">
          <div className="section-header compact">
            <h2>{t("Üye QR kartın", "Your member QR card")}</h2>
            <span>v{memberPass.data?.version ?? 1}</span>
          </div>
          {qrImage ? (
            <img
              className="member-qr"
              alt={t("Konnektora üye QR kodu", "Konnektora member QR code")}
              src={qrImage}
            />
          ) : (
            <div className="qr-placeholder">{t("QR hazırlanıyor…", "Preparing QR…")}</div>
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
            <RefreshCw size={17} /> {t("Kartı yenile", "Refresh card")}
          </button>
        </section>
      </div>
      <MemberDeviceScanner
        nfcPayload={memberPass.data?.nfcPayload}
        userId={user.id}
      />
      <section className="identity-panel">
        <div className="section-header compact">
          <h2>{t("Tarama geçmişi", "Scan history")}</h2>
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
                  {new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(scan.createdAt))}
                </small>
              </div>
              <b>{scan.method === "nfc" ? "NFC" : "QR"}</b>
            </article>
          ))}
          {!history.isLoading && !history.data?.length ? (
            <p className="form-help">{t("Henüz tarama geçmişin yok.", "You have no scan history yet.")}</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
