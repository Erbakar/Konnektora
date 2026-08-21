import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Sparkles, UserPlus } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { TagSentiment } from "@konnektora/shared";
import { EmailInput, PhoneInput, VerificationCodeInput } from "../components/FormInputs";
import { SocialAuthButtons } from "../components/SocialAuthButtons";
import { checkAvailability, completeOnboarding, confirmPhoneVerification, followUser, getMyProfile, getOnboardingStatus, getProfileAffinities, getUserSession, listMemberSuggestions, listProfileMedia, listTags, registerUser, requestPhoneVerification, setUserSession, socialLogin, updateMyProfile, updateProfileAffinities, updateUserSession, uploadProfileMedia } from "../lib/api";
import { normalizeEmail, normalizePhone } from "../lib/formats";

const steps = ["Hesap", "Telefon", "Temel bilgiler", "Profil fotoğrafı", "İlgi alanları", "Topluluk"];
const statusStep: Record<string, number> = {
  phone: 1,
  personal_info: 2,
  photo: 3,
  interests: 4,
  people: 5,
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState(getUserSession());
  const [step, setStep] = useState(session ? 1 : 0);
  const [accountType, setAccountType] = useState<"individual" | "corporate">("individual");
  const [phone, setPhone] = useState("");
  const [expires, setExpires] = useState(0);
  const [demoCode, setDemoCode] = useState("");
  const [demoVerification, setDemoVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoQueue, setPhotoQueue] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoRotation, setPhotoRotation] = useState(0);
  const [availabilityText, setAvailabilityText] = useState("");
  const [verificationEmailSent, setVerificationEmailSent] = useState<boolean | undefined>();
  const [sentiments, setSentiments] = useState<Record<string, TagSentiment>>({});
  const [emotionTagId, setEmotionTagId] = useState("");
  const onboarding = useQuery({
    queryKey: ["onboarding", session?.id],
    queryFn: getOnboardingStatus,
    enabled: Boolean(session),
  });
  const profile = useQuery({
    queryKey: ["profile", session?.id],
    queryFn: getMyProfile,
    enabled: Boolean(session),
  });
  const media = useQuery({
    queryKey: ["profile-media", session?.id],
    queryFn: listProfileMedia,
    enabled: Boolean(session),
  });
  const tags = useQuery({
    queryKey: ["tags", "onboarding"],
    queryFn: listTags,
    enabled: Boolean(session),
  });
  const affinities = useQuery({
    queryKey: ["profile-affinities", session?.id],
    queryFn: getProfileAffinities,
    enabled: Boolean(session),
  });
  const suggestions = useQuery({
    queryKey: ["member-suggestions", session?.id],
    queryFn: listMemberSuggestions,
    enabled: Boolean(session) && step === 5,
  });

  useEffect(() => {
    if (onboarding.data && !onboarding.data.completed) setStep(statusStep[onboarding.data.currentStep?.key ?? "people"] ?? 5);
  }, [onboarding.data]);
  useEffect(() => {
    if (affinities.data) setSentiments(Object.fromEntries(affinities.data.map((item) => [item.tag.id, item.sentiment])));
  }, [affinities.data]);
  useEffect(() => {
    if (!expires) return;
    const timer = window.setInterval(() => setExpires((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [expires > 0]);
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const register = useMutation({
    mutationFn: registerUser,
    onSuccess: (response) => {
      setUserSession(response);
      setSession(response.user);
      setVerificationEmailSent(response.verificationEmailSent);
      setStep(1);
    },
  });
  const phoneRequest = useMutation({
    mutationFn: requestPhoneVerification,
    onSuccess: (data) => {
      setExpires(data.expiresInSeconds);
      setDemoCode(data.demoCode ?? data.developmentCode ?? "");
      setVerificationCode("");
      setDemoVerification(data.verificationMode === "demo" || data.verificationMode === "temporary_bypass");
    },
  });
  const phoneConfirm = useMutation({
    mutationFn: (code: string) => confirmPhoneVerification(phone, code),
    onSuccess: () => {
      if (session) {
        const activeSession = { ...session, status: "active" as const };
        setSession(activeSession);
        updateUserSession(activeSession);
      }
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      setStep(2);
    },
  });
  const profileSave = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      setStep(3);
    },
  });
  const photoUpload = useMutation({
    mutationFn: uploadProfileMedia,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile-media"] });
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    },
  });
  const affinitySave = useMutation({
    mutationFn: () =>
      updateProfileAffinities(
        Object.entries(sentiments).map(([tagId, sentiment]) => ({
          tagId,
          sentiment,
        })),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      setStep(5);
    },
  });
  const finish = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => navigate("/identity"),
  });
  const selectedCount = Object.keys(sentiments).length;
  const currentTag = useMemo(() => tags.data?.find((tag) => tag.id === emotionTagId), [emotionTagId, tags.data]);

  return (
    <section className="page onboarding-shell">
      <header className="onboarding-header">
        <div>
          <span className="eyebrow">Konnektora’ya hoş geldin</span>
          <h1>Profilini birlikte hazırlayalım</h1>
        </div>
        <strong>{Math.round(((step + 1) / steps.length) * 100)}%</strong>
      </header>
      <nav className="onboarding-progress" aria-label="Onboarding adımları">
        {steps.map((label, index) => (
          <span className={index < step ? "is-complete" : index === step ? "is-active" : ""} key={label}>
            <b>{index < step ? <Check size={15} /> : index + 1}</b>
            <small>{label}</small>
          </span>
        ))}
      </nav>
      <div className="onboarding-card">
        {session?.status === "pending" && step === 1 ? <div className="onboarding-verification-choice"><Sparkles size={22}/><p>{verificationEmailSent === false ? "Hesabın oluşturuldu ancak aktivasyon e-postası şu an teslim edilemedi. Aşağıda ekranda üretilen demo GSM kodunu girerek üyeliğini hemen aktifleştirebilirsin." : "Hesabın oluşturuldu. Aktivasyon e-postasındaki bağlantıyı açabilir veya aşağıda ekranda üretilen demo GSM kodunu girerek hemen devam edebilirsin."}</p></div> : null}
        {step === 0 ? (
          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const password = String(form.get("password"));
              if (password !== String(form.get("passwordAgain"))) return;
              register.mutate({
                name: String(form.get("name")),
                email: normalizeEmail(String(form.get("email"))),
                phone: normalizePhone(String(form.get("phone"))),
                password,
                accountType,
                ...(accountType === "corporate"
                  ? {
                      companyName: String(form.get("companyName")),
                      tradeName: String(form.get("tradeName")),
                      companyType: "limited_or_corporation",
                      businessCategory: "event_organizer",
                    }
                  : {}),
              });
            }}
          >
            <h2>Hesap bilgileri</h2>
            <label>
              Hesap türü
              <select value={accountType} onChange={(event) => setAccountType(event.target.value as typeof accountType)}>
                <option value="individual">Bireysel</option>
                <option value="corporate">Kurumsal</option>
              </select>
            </label>
            <label>
              Ad Soyad
              <input autoComplete="name" name="name" minLength={2} placeholder="Adın ve soyadın" required />
            </label>
            {accountType === "corporate" ? (
              <>
                <label>
                  İşletme adı
                  <input name="companyName" required />
                </label>
                <label>
                  Ticari unvan
                  <input name="tradeName" required />
                </label>
              </>
            ) : null}
            <label>
              E-posta
              <EmailInput name="email" onBlur={(event) => void checkAvailability({ email: normalizeEmail(event.target.value) }).then((data) => setAvailabilityText(data.emailAvailable ? "E-posta kullanılabilir" : "E-posta kullanımda"))} required />
              <span className="form-help">Örnek: ada@ornek.com</span>
              {availabilityText ? <span className={availabilityText.includes("kullanımda") ? "field-error" : "form-help"}>{availabilityText}</span> : null}
              {register.isError ? <span className="field-error">Bu e-posta kullanımdaysa giriş yapın; değilse adresi kontrol edip yeniden deneyin.</span> : null}
            </label>
            <label>
              GSM numarası
              <PhoneInput name="phone" pattern="\+?[0-9 ]{10,19}" required />
              <span className="form-help">Bir sonraki adımda ekranda oluşturulan demo koduyla doğrulayabilirsin.</span>
            </label>
            <label>
              Şifre
              <input name="password" minLength={8} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}" required type="password" />
              <span className="form-help">En az 8 karakter; bir büyük harf, bir küçük harf ve bir rakam içermeli.</span>
            </label>
            <label>
              Şifre tekrar
              <input name="passwordAgain" minLength={8} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}" required type="password" />
            </label>
            <label className="check-row">
              <input required type="checkbox" />{" "}
              <span>
                <Link to="/terms">Koşulları</Link> ve <Link to="/privacy">Gizlilik Politikasını</Link> kabul ediyorum.
              </span>
            </label>
            <button className="primary-action" disabled={register.isPending} type="submit">
              Hesabı oluştur <ArrowRight size={18} />
            </button>
          </form>
        ) : null}

        {step === 0 ? (
          <SocialAuthButtons
            action={socialLogin}
            onSuccess={(response) => {
              setUserSession(response);
              setSession(response.user);
              setStep(1);
            }}
          />
        ) : null}

        {step === 1 ? (
          <div>
            <h2>Telefonunu doğrula</h2>
            <p>Telefon numaranı yazıp kod oluştur. Üretilen 6 haneli kodu hemen aşağıda açılan alana gir; bu adım üyeliğini engellemez.</p>
            <form
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                const normalized = normalizePhone(String(new FormData(event.currentTarget).get("phone")));
                setPhone(normalized);
                setVerificationCode("");
                phoneRequest.mutate(normalized);
              }}
            >
              <label>
                Telefon numarası
                <PhoneInput defaultValue={profile.data?.phone ?? ""} name="phone" pattern="\+?[0-9 ]{10,19}" required />
                <span className="form-help">0555… veya +90 555… biçiminde yazabilirsin.</span>
              </label>
              <button className="primary-action" disabled={phoneRequest.isPending || expires > 0} type="submit">
                {phoneRequest.isPending ? "Kod oluşturuluyor…" : expires ? `${expires} sn` : "Doğrulama kodu oluştur"}
              </button>
              {phoneRequest.isError ? <p className="form-error" role="alert">Kod oluşturulamadı. Telefon numaranı kontrol edip tekrar dene.</p> : null}
            </form>
            {demoCode ? (
              <div className="demo-verification-code" role="status">
                <span>Demo doğrulama kodun</span>
                <strong aria-label={`Demo doğrulama kodu ${demoCode}`}>{demoCode}</strong>
                <p>Bu kodu aşağıdaki alana kendin gir. Kod iki dakika geçerlidir.</p>
              </div>
            ) : null}
            {phoneRequest.isSuccess || expires > 0 || demoCode ? (
              <form
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  phoneConfirm.mutate(verificationCode);
                }}
              >
                <label>
                  Doğrulama kodu
                  <VerificationCodeInput autoFocus name="code" onChange={(event) => setVerificationCode(event.target.value)} required value={verificationCode} />
                  <span className="form-help">{demoVerification ? "Yukarıda senin için oluşturulan 6 haneli kodu yaz." : "Telefonuna gelen 6 haneli kodu yaz."}</span>
                </label>
                <button className="primary-action" disabled={phoneConfirm.isPending || verificationCode.length !== 6} type="submit">
                  {phoneConfirm.isPending ? "Doğrulanıyor…" : "Doğrula ve devam et"}
                </button>
                {phoneConfirm.isError ? <p className="form-error">Kod hatalı veya süresi dolmuş. Yeni kod isteyip tekrar dene.</p> : null}
              </form>
            ) : null}
          </div>
        ) : null}

        {step === 2 && profile.data ? (
          <form
            key={profile.data.updatedAt ? String(profile.data.updatedAt) : profile.data.id}
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const birthDateValue = form.get("birthDate");
              const birthDate = typeof birthDateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(birthDateValue)
                ? new Date(`${birthDateValue}T00:00:00.000Z`).toISOString()
                : undefined;
              profileSave.mutate({
                name: profile.data.name,
                username: String(form.get("username")),
                country: String(form.get("country")),
                city: String(form.get("city")),
                birthDate,
                gender: (String(form.get("gender")) as "male" | "female") || undefined,
                website: normalizeWebsite(String(form.get("website"))),
              });
            }}
          >
            <h2>Temel bilgiler</h2>
            <label>
              Kullanıcı adı
              <input defaultValue={profile.data.username ?? ""} name="username" onChange={(event) => {
                const value = event.target.value.trim();
                if (value.length < 2) return setAvailabilityText("Kullanıcı adı en az 2 karakter olmalı");
                void checkAvailability({ username: value }).then((data) => setAvailabilityText(data.usernameAvailable || value === profile.data?.username ? "Kullanıcı adı uygun" : "Kullanıcı adı kullanımda"));
              }} pattern="[A-Za-z0-9 .-]+" required />
              {availabilityText ? <span className={availabilityText.includes("uygun") ? "form-success" : "form-error"}>{availabilityText}</span> : null}
            </label>
            <label>
              Ülke
              <input defaultValue={profile.data.country ?? ""} name="country" required />
            </label>
            <label>
              Şehir
              <input defaultValue={profile.data.city ?? ""} name="city" />
            </label>
            <label>
              Doğum tarihi
              <input defaultValue={profile.data.birthDate ? String(profile.data.birthDate).slice(0, 10) : ""} name="birthDate" required type="date" />
            </label>
            <label>
              Cinsiyet
              <select defaultValue={profile.data.gender ?? ""} name="gender">
                <option value="">Belirtmek istemiyorum</option>
                <option value="female">Kadın</option>
                <option value="male">Erkek</option>
              </select>
            </label>
            <label>
              Web sitesi
              <input defaultValue={profile.data.website ?? ""} name="website" placeholder="ornek.com (isteğe bağlı)" />
            </label>
            {profileSave.isError ? <p className="form-error">Bilgiler kaydedilemedi: {(profileSave.error as Error).message}</p> : null}
            <WizardButtons back={() => setStep(1)} nextLabel="Kaydet ve devam et" />
          </form>
        ) : null}
        {step === 2 && profile.isError ? (
          <div className="empty-state">
            <h2>Profil yüklenemedi</h2>
            <p>{(profile.error as Error).message}</p>
            <button className="secondary-action" onClick={() => profile.refetch()} type="button">
              Tekrar dene
            </button>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <h2>Profil fotoğrafı</h2>
            <p>En az bir fotoğraf eklemelisin. İlk fotoğraf profil görselin olur.</p>
            <label className="onboarding-upload">
              <ImagePlus size={36} />
              <span>Fotoğraf seç</span>
              <input accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                setPhotoQueue(files);
                setPhotoFile(files[0] ?? null);
              }} type="file" />
            </label>
            {photoPreview ? (
              <div className="photo-editor">
                <div className="photo-crop-frame">
                  <img
                    alt="Düzenlenecek profil fotoğrafı"
                    src={photoPreview}
                    style={{
                      transform: `scale(${photoZoom}) rotate(${photoRotation}deg)`,
                    }}
                  />
                </div>
                <label>
                  Zoom
                  <input max="2.5" min="1" onChange={(event) => setPhotoZoom(Number(event.target.value))} step="0.1" type="range" value={photoZoom} />
                </label>
                <div className="photo-editor-actions">
                  <button className="secondary-action" onClick={() => setPhotoRotation((value) => (value + 90) % 360)} type="button">
                    Sağa döndür
                  </button>
                  <button
                    className="primary-action"
                    disabled={photoUpload.isPending}
                    onClick={() =>
                      void renderProfileImage(photoFile!, photoZoom, photoRotation).then((file) =>
                        photoUpload.mutate(file, {
                          onSuccess: () => {
                            const remaining = photoQueue.slice(1);
                            setPhotoQueue(remaining);
                            setPhotoFile(remaining[0] ?? null);
                          },
                        }),
                      )
                    }
                    type="button"
                  >
                    Düzenleyip yükle
                  </button>
                </div>
              </div>
            ) : null}
            <div className="onboarding-media-row">{media.data?.map((item) => (item.type === "image" ? <img alt="Profil yüklemesi" key={item.id} src={item.url} /> : <video key={item.id} src={item.url} />))}</div>
            <WizardButtons back={() => setStep(2)} disabled={!media.data?.some((item) => item.type === "image")} next={() => setStep(4)} />
          </div>
        ) : null}

        {step === 4 ? (
          <div>
            <h2>İlgi alanların</h2>
            <p>Bir tag seç ve sende uyandırdığı duyguyu belirt.</p>
            <div className="onboarding-tag-grid">
              {tags.data?.map((tag) => (
                <button className={sentiments[tag.id] ? "is-selected" : ""} key={tag.id} onClick={() => setEmotionTagId(tag.id)} type="button">
                  #{tag.name}
                  <small>{sentiments[tag.id] ?? "Seç"}</small>
                </button>
              ))}
            </div>
            <p className="form-help">{selectedCount} tag seçildi</p>
            <WizardButtons back={() => setStep(3)} disabled={!selectedCount} next={() => affinitySave.mutate()} />
          </div>
        ) : null}

        {step === 5 ? (
          <div>
            <h2>Takip edebileceklerin</h2>
            <p>Takip ettiğin üyeler bu işlemden bildirim almaz.</p>
            <Link className="secondary-action contacts-cta" to="/contacts">
              Telefon ve Google rehberinden arkadaşlarını bul
            </Link>
            <div className="onboarding-people">
              {suggestions.data?.map((member) => (
                <article key={member.id}>
                  {member.username ? <Link to={`/users/${member.username}`}>{member.name.slice(0, 1)}</Link> : <span>{member.name.slice(0, 1)}</span>}
                  <div>
                    <strong>{member.username ? <Link to={`/users/${member.username}`}>@{member.username}</Link> : member.name}</strong>
                    <small>
                      {member.commonTagCount} ortak ilgi · {member.followerCount} takipçi
                    </small>
                  </div>
                  <button
                    className="secondary-action"
                    onClick={() =>
                      followUser(member.id).then(
                        () =>
                          void queryClient.invalidateQueries({
                            queryKey: ["member-suggestions"],
                          }),
                      )
                    }
                    type="button"
                  >
                    <UserPlus size={17} /> Takip et
                  </button>
                </article>
              ))}
            </div>
            <WizardButtons back={() => setStep(4)} next={() => finish.mutate()} nextLabel="Kaydet ve tamamla" />
          </div>
        ) : null}
      </div>
      {currentTag ? (
        <div className="emotion-modal" role="dialog" aria-modal="true" aria-label="Tag duygusu">
          <div>
            <button aria-label="Kapat" onClick={() => setEmotionTagId("")} type="button">
              ×
            </button>
            <h2>#{currentTag.name}</h2>
            <p>Bu tag sende hangi duyguyu uyandırıyor?</p>
            {(["like", "ok", "dislike"] as TagSentiment[]).map((sentiment) => (
              <button
                className="secondary-action"
                key={sentiment}
                onClick={() => {
                  setSentiments((current) => ({
                    ...current,
                    [currentTag.id]: sentiment,
                  }));
                  setEmotionTagId("");
                }}
                type="button"
              >
                {sentiment === "like" ? "Beğeniyorum" : sentiment === "ok" ? "Sorun değil" : "Beğenmiyorum"}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function WizardButtons({ back, next, disabled, nextLabel = "Devam et" }: { back: () => void; next?: () => void; disabled?: boolean; nextLabel?: string }) {
  return (
    <div className="wizard-buttons">
      <button className="ghost-action" onClick={back} type="button">
        <ArrowLeft size={18} /> Geri
      </button>
      <button className="primary-action" disabled={disabled} onClick={next} type={next ? "button" : "submit"}>
        {nextLabel} <ArrowRight size={18} />
      </button>
    </div>
  );
}

async function renderProfileImage(source: File, zoom: number, rotation: number) {
  const image = new Image();
  const url = URL.createObjectURL(source);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Fotoğraf açılamadı"));
      image.src = url;
    });
    const size = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Fotoğraf düzenleyici açılamadı");
    context.translate(size / 2, size / 2);
    context.rotate((rotation * Math.PI) / 180);
    const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight) * zoom;
    context.drawImage(image, (-image.naturalWidth * scale) / 2, (-image.naturalHeight * scale) / 2, image.naturalWidth * scale, image.naturalHeight * scale);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Fotoğraf oluşturulamadı"))), "image/jpeg", 0.9));
    return new File([blob], source.name.replace(/\.[^.]+$/, "") + "-profile.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
