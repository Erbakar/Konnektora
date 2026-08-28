import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Camera, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getProfileVerification, submitProfileVerification } from "../lib/api";
import { getServiceErrorMessage } from "../lib/serviceErrors";
import { useLanguage } from "../lib/i18n";

const challenges = [
  { value: "blink" as const, tr: "İki kez göz kırp", en: "Blink twice" },
  { value: "smile" as const, tr: "Gülümse", en: "Smile" },
  { value: "turn_left" as const, tr: "Başını hafifçe sola çevir", en: "Turn your head slightly left" },
  { value: "turn_right" as const, tr: "Başını hafifçe sağa çevir", en: "Turn your head slightly right" },
];

export function ProfileVerificationPanel({ userId }: { userId: string }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState(
    () => challenges[Math.floor(Math.random() * challenges.length)]!,
  );
  const verification = useQuery({
    queryKey: ["profile-verification", userId],
    queryFn: getProfileVerification,
  });
  const submit = useMutation({
    mutationFn: (blob: Blob) =>
      submitProfileVerification(blob, challenge.value),
    onSuccess: (data) => {
      queryClient.setQueryData(["profile-verification", userId], data);
      stopCamera();
      void queryClient.invalidateQueries({ queryKey: ["public-profile"] });
    },
    onError: (reason) =>
      setError(
        getServiceErrorMessage(
          reason,
          t("Fotoğraf doğrulaması tamamlanamadı. Lütfen yeniden dene.", "Photo verification could not be completed. Please try again."),
        ),
      ),
  });

  useEffect(
    () => () => streamRef.current?.getTracks().forEach((track) => track.stop()),
    [],
  );
  async function startCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError(
        t("Kamera açılamadı. Tarayıcı kamera iznini kontrol et veya aşağıdan fotoğraf seç.", "The camera could not be opened. Check your browser permission or choose a photo below."),
      );
    }
  }
  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }
  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth)
      return setError(t("Kamera görüntüsü henüz hazır değil.", "The camera image is not ready yet."));
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => blob && submit.mutate(blob), "image/jpeg", 0.9);
  }
  const status = verification.data;
  if (status?.verified)
    return (
      <section className="admin-form verification-panel is-verified">
        <BadgeCheck size={38} />
        <div>
          <h2>{t("Profilin doğrulandı", "Your profile is verified")}</h2>
          <p>
            {t("Mavi tik herkese açık profilinde görünür. Doğrulama: ", "The blue tick is visible on your public profile. Verification: ")}
            {status.request?.provider === "development_simulator"
              ? t("geliştirme simülasyonu", "development simulation")
              : t("yüz ve canlılık kontrolü", "face and liveness check")}
            .
          </p>
        </div>
      </section>
    );
  if (status && !status.eligible)
    return (
      <section className="admin-form verification-panel">
        <ShieldCheck size={34} />
        <div>
          <h2>{t("Kurumsal hesap doğrulaması", "Business account verification")}</h2>
          <p>
            {t("Kurumsal profiller mavi tiki KYC sürecini tamamladıktan sonra alır.", "Business profiles receive the blue tick after completing the KYC process.")}
          </p>
        </div>
      </section>
    );
  if (status?.request?.status === "pending")
    return (
      <section className="admin-form verification-panel">
        <RefreshCw size={34} />
        <div>
          <h2>{t("Başvurun inceleniyor", "Your application is under review")}</h2>
          <p>
            {t("Otomatik kontrol kesin karar veremediği için ekip incelemesine aktarıldı.", "The automated check could not reach a final decision, so your application was sent for team review.")}
          </p>
        </div>
      </section>
    );

  return (
    <section className="admin-form verification-flow">
      <div className="section-header compact">
        <div>
          <h2>{t("Fotoğrafını doğrula", "Verify your photo")}</h2>
          <p className="form-help">
            {t("Profil fotoğrafındaki kişinin sen olduğunu canlı kamera kontrolüyle doğrula ve mavi tik al.", "Use a live camera check to confirm that you are the person in your profile photo and receive a blue tick.")}
          </p>
        </div>
        <ShieldCheck size={34} />
      </div>
      <div className="verification-privacy">
        <strong>{t("Gizlilik", "Privacy")}</strong>
        <span>
          {t("Doğrulama karesi profilinde yayınlanmaz ve yalnızca yetkili inceleme için erişilebilir.", "Your verification frame is not published on your profile and is accessible only for authorised review.")}
        </span>
      </div>
      <div className="verification-challenge">
        <span>{t("Canlılık hareketin", "Your liveness action")}</span>
        <strong>{challenge[language]}</strong>
        <button
          className="ghost-action"
          onClick={() =>
            setChallenge(
              challenges[
                (challenges.indexOf(challenge) + 1) % challenges.length
              ]!,
            )
          }
          type="button"
        >
          {t("Başka hareket", "Choose another action")}
        </button>
      </div>
      {cameraOpen ? (
        <div className="verification-camera">
          <video muted playsInline ref={videoRef} />
          <div>
            <button
              className="primary-action"
              disabled={submit.isPending}
              onClick={capture}
              type="button"
            >
              <Camera size={18} /> {t("Kareyi çek ve doğrula", "Capture and verify")}
            </button>
            <button className="ghost-action" onClick={stopCamera} type="button">
              {t("Kamerayı kapat", "Close camera")}
            </button>
          </div>
        </div>
      ) : (
        <button
          className="primary-action"
          onClick={() => void startCamera()}
          type="button"
        >
          <Camera size={18} /> {t("Kamerayı aç", "Open camera")}
        </button>
      )}
      <label className="verification-fallback">
        {t("Kamera kullanamıyor musun?", "Cannot use the camera?")}
        <input
          accept="image/jpeg"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) submit.mutate(file);
          }}
          type="file"
        />
        <span>{t("JPEG doğrulama karesi seç", "Choose a JPEG verification image")}</span>
      </label>
      {status?.request?.status === "rejected" ? (
        <p className="form-error">
          {t("Önceki kontrol başarısız: ", "Previous check failed: ")}
          {status.request.decisionReason ??
            t("Yeni bir kareyle tekrar deneyebilirsin.", "You can try again with a new image.")}
        </p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
