import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Camera, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getProfileVerification, submitProfileVerification } from "../lib/api";
import { getServiceErrorMessage } from "../lib/serviceErrors";

const challenges = [
  { value: "blink" as const, label: "İki kez göz kırp" },
  { value: "smile" as const, label: "Gülümse" },
  { value: "turn_left" as const, label: "Başını hafifçe sola çevir" },
  { value: "turn_right" as const, label: "Başını hafifçe sağa çevir" },
];

export function ProfileVerificationPanel({ userId }: { userId: string }) {
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
          "Fotoğraf doğrulaması tamamlanamadı. Lütfen yeniden dene.",
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
        "Kamera açılamadı. Tarayıcı kamera iznini kontrol et veya aşağıdan fotoğraf seç.",
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
      return setError("Kamera görüntüsü henüz hazır değil.");
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
          <h2>Profilin doğrulandı</h2>
          <p>
            Mavi tik public profilinde görünür. Doğrulama:{" "}
            {status.request?.provider === "development_simulator"
              ? "geliştirme simülasyonu"
              : "yüz ve canlılık kontrolü"}
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
          <h2>Kurumsal hesap doğrulaması</h2>
          <p>
            Kurumsal profiller mavi tiki KYC sürecini tamamladıktan sonra alır.
          </p>
        </div>
      </section>
    );
  if (status?.request?.status === "pending")
    return (
      <section className="admin-form verification-panel">
        <RefreshCw size={34} />
        <div>
          <h2>Başvurun inceleniyor</h2>
          <p>
            Otomatik kontrol kesin karar veremediği için ekip incelemesine
            aktarıldı.
          </p>
        </div>
      </section>
    );

  return (
    <section className="admin-form verification-flow">
      <div className="section-header compact">
        <div>
          <h2>Fotoğrafını doğrula</h2>
          <p className="form-help">
            Profil fotoğrafındaki kişinin sen olduğunu canlı kamera kontrolüyle
            doğrula ve mavi tik al.
          </p>
        </div>
        <ShieldCheck size={34} />
      </div>
      <div className="verification-privacy">
        <strong>Gizlilik</strong>
        <span>
          Doğrulama karesi profilinde yayınlanmaz ve yalnızca yetkili inceleme
          için erişilebilir.
        </span>
      </div>
      <div className="verification-challenge">
        <span>Canlılık hareketin</span>
        <strong>{challenge.label}</strong>
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
          Başka hareket
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
              <Camera size={18} /> Kareyi çek ve doğrula
            </button>
            <button className="ghost-action" onClick={stopCamera} type="button">
              Kamerayı kapat
            </button>
          </div>
        </div>
      ) : (
        <button
          className="primary-action"
          onClick={() => void startCamera()}
          type="button"
        >
          <Camera size={18} /> Kamerayı aç
        </button>
      )}
      <label className="verification-fallback">
        Kamera kullanamıyor musun?
        <input
          accept="image/jpeg"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) submit.mutate(file);
          }}
          type="file"
        />
        <span>JPEG doğrulama karesi seç</span>
      </label>
      {status?.request?.status === "rejected" ? (
        <p className="form-error">
          Önceki kontrol başarısız:{" "}
          {status.request.decisionReason ??
            "Yeni bir kareyle tekrar deneyebilirsin."}
        </p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
