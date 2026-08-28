import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Sparkles, UserPlus } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { TagSentiment } from "@konnektora/shared";
import { EmailInput, PhoneInput, VerificationCodeInput } from "../components/FormInputs";
import { ServiceFeedback } from "../components/ServiceFeedback";
import { SocialAuthButtons } from "../components/SocialAuthButtons";
import { CountryCityFields } from "../components/CountryCityFields";
import { checkAvailability, completeOnboarding, confirmPhoneVerification, followUser, getMyProfile, getOnboardingStatus, getProfileAffinities, getUserSession, listMemberSuggestions, listProfileMedia, listTags, registerUser, requestPhoneVerification, resolveMediaUrl, setUserSession, socialLogin, updateMyProfile, updateProfileAffinities, updateUserSession, uploadProfileMedia } from "../lib/api";
import { normalizeEmail, normalizePhone } from "../lib/formats";
import { useLanguage } from "../lib/i18n";

const individualSteps = {
  tr: ["Hesap", "Telefon", "Temel bilgiler", "Profil fotoğrafı", "İlgi alanları", "Topluluk"],
  en: ["Account", "Phone", "Basic information", "Profile photo", "Interests", "Community"],
};
const corporateSteps = {
  tr: ["Hesap", "Telefon", "Firma bilgileri", "Profil fotoğrafı", "İlgi alanları"],
  en: ["Account", "Phone", "Company information", "Profile photo", "Interests"],
};
const statusStep: Record<string, number> = {
  phone: 1,
  personal_info: 2,
  photo: 3,
  interests: 4,
  people: 5,
};

export function OnboardingPage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => (language === "tr" ? tr : en);
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
  const [registrationError, setRegistrationError] = useState("");
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
  const isCorporate = (profile.data?.accountType ?? session?.accountType ?? accountType) === "corporate";
  const steps = isCorporate ? corporateSteps[language] : individualSteps[language];
  const media = useQuery({
    queryKey: ["profile-media", session?.id],
    queryFn: listProfileMedia,
    enabled: Boolean(session),
  });
  const tags = useQuery({
    queryKey: ["tags", "onboarding"],
    queryFn: () => listTags(),
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
    if (onboarding.data && !onboarding.data.completed) {
      setStep(
        onboarding.data.currentStep
          ? (statusStep[onboarding.data.currentStep.key] ?? 5)
          : isCorporate
            ? 4
            : 5,
      );
    }
  }, [isCorporate, onboarding.data]);
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
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      setStep(2);
    },
  });
  const profileSave = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (savedProfile) => {
      if (session && savedProfile.status === "active") {
        const activeSession = { ...session, status: "active" as const };
        setSession(activeSession);
        updateUserSession(activeSession);
      }
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
  const finish = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      const current = getUserSession();
      if (current) updateUserSession({ ...current, onboardingCompleted: true });
      navigate("/feed");
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
      if (isCorporate) finish.mutate();
      else setStep(5);
    },
  });
  const follow = useMutation({
    mutationFn: followUser,
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["member-suggestions"],
      }),
  });
  const selectedCount = Object.keys(sentiments).length;
  const currentTag = useMemo(() => tags.data?.find((tag) => tag.id === emotionTagId), [emotionTagId, tags.data]);

  return (
    <section className="page onboarding-shell">
      <header className="onboarding-header">
        <div>
          <span className="eyebrow">{t("Konnektora’ya hoş geldin", "Welcome to Konnektora")}</span>
          <h1>{t("Profilini birlikte hazırlayalım", "Let's set up your profile")}</h1>
        </div>
        <strong>{Math.round(((step + 1) / steps.length) * 100)}%</strong>
      </header>
      <nav className="onboarding-progress" aria-label={t("Onboarding adımları", "Onboarding steps")}>
        {steps.map((label, index) => (
          <span className={index < step ? "is-complete" : index === step ? "is-active" : ""} key={label}>
            <b>{index < step ? <Check size={15} /> : index + 1}</b>
            <small>{label}</small>
          </span>
        ))}
      </nav>
      <div className="onboarding-card">
        {onboarding.isError ? (
          <ServiceFeedback
            error={onboarding.error}
            fallback={t("Profil adımların şu anda alınamadı. Bağlantını kontrol edip yeniden deneyebilirsin.", "Your profile steps could not be loaded. Check your connection and try again.")}
            onRetry={() => void onboarding.refetch()}
          />
        ) : null}
        {session?.status === "pending" && step === 1 ? <div className="onboarding-verification-choice"><Sparkles size={22}/><p>{verificationEmailSent === false ? t("Hesabın oluşturuldu ancak aktivasyon e-postası şu an teslim edilemedi. Aşağıda ekranda üretilen demo GSM kodunu girerek üyeliğini hemen aktifleştirebilirsin.", "Your account was created, but the activation email could not be delivered. Use the demo mobile code shown below to activate your membership now.") : t("Hesabın oluşturuldu. Aktivasyon e-postasındaki bağlantıyı açabilir veya aşağıda ekranda üretilen demo GSM kodunu girerek hemen devam edebilirsin.", "Your account was created. Open the activation link in the email or continue immediately with the demo mobile code shown below.")}</p></div> : null}
        {step === 0 ? (
          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const password = String(form.get("password"));
              setRegistrationError("");
              if (password !== String(form.get("passwordAgain"))) {
                setRegistrationError(t("Şifreler eşleşmiyor.", "Passwords do not match."));
                return;
              }
              if (/kullanımda|in use/i.test(availabilityText)) {
                setRegistrationError(t("Bu e-posta adresi zaten kullanımda.", "This email address is already in use."));
                return;
              }
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
            <h2>{t("Hesap bilgileri", "Account information")}</h2>
            <label>
              {t("Hesap türü", "Account type")}
              <select value={accountType} onChange={(event) => setAccountType(event.target.value as typeof accountType)}>
                <option value="individual">{t("Bireysel", "Individual")}</option>
                <option value="corporate">{t("Kurumsal", "Corporate")}</option>
              </select>
            </label>
            <label>
              {accountType === "corporate" ? t("Yetkili Ad Soyadı", "Authorised representative's full name") : t("Ad Soyad", "Full name")}
              <input autoComplete="name" name="name" minLength={2} placeholder={t("Adın ve soyadın", "Your full name")} required />
            </label>
            {accountType === "corporate" ? (
              <>
                <label>
                  {t("İşletme adı", "Business name")}
                  <input name="companyName" required />
                </label>
                <label>
                  {t("Ticari unvan", "Registered business name")}
                  <input name="tradeName" required />
                </label>
              </>
            ) : null}
            <label>
              {t("E-posta", "Email")}
              <EmailInput name="email" onBlur={(event) => void checkAvailability({ email: normalizeEmail(event.target.value) }).then((data) => setAvailabilityText(data.emailAvailable ? t("E-posta kullanılabilir", "Email is available") : t("E-posta kullanımda", "Email is in use")))} required />
              <span className="form-help">{t("Örnek: ada@ornek.com", "Example: ada@example.com")}</span>
              {availabilityText ? <span className={/kullanımda|in use/i.test(availabilityText) ? "field-error" : "form-help"}>{availabilityText}</span> : null}
            </label>
            <label>
              {t("GSM numarası", "Mobile number")}
              <PhoneInput name="phone" pattern="\+?[0-9 ]{10,19}" required />
              <span className="form-help">{t("Bir sonraki adımda ekranda oluşturulan demo koduyla doğrulayabilirsin.", "You can verify it with the on-screen demo code in the next step.")}</span>
            </label>
            <label>
              {t("Şifre", "Password")}
              <input name="password" minLength={8} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}" required type="password" />
              <span className="form-help">{t("En az 8 karakter; bir büyük harf, bir küçük harf ve bir rakam içermeli.", "At least 8 characters, including an uppercase letter, a lowercase letter and a number.")}</span>
            </label>
            <label>
              {t("Şifre tekrar", "Repeat password")}
              <input name="passwordAgain" minLength={8} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}" required type="password" />
            </label>
            <label className="check-row">
              <input required type="checkbox" />{" "}
              <span>
                <Link to="/terms">{t("Koşulları", "Terms")}</Link> {t("ve", "and")} <Link to="/privacy">{t("Gizlilik Politikasını", "Privacy Policy")}</Link> {t("kabul ediyorum.", "I accept.")}
              </span>
            </label>
            <button className="primary-action" disabled={register.isPending} type="submit">
              {t("Hesabı oluştur", "Create account")} <ArrowRight size={18} />
            </button>
            {registrationError ? <p className="form-error">{registrationError}</p> : null}
            {register.isError ? (
              <ServiceFeedback
                compact
                error={register.error}
                fallback={t("Hesap oluşturulamadı. Bilgilerini kontrol edip yeniden dene.", "The account could not be created. Check your details and try again.")}
              />
            ) : null}
          </form>
        ) : null}

        {step === 0 ? (
          <SocialAuthButtons
            action={socialLogin}
            onSuccess={(response) => {
              setUserSession(response);
              setSession(response.user);
              if (response.user.status === "active") navigate("/feed");
              else setStep(1);
            }}
          />
        ) : null}

        {step === 1 ? (
          <div>
            <h2>{t("Telefonunu doğrula", "Verify your phone")}</h2>
            <p>{t("Telefon numaranı yazıp kod oluştur. Üretilen 6 haneli kodu hemen aşağıda açılan alana gir; bu adım üyeliğini engellemez.", "Enter your phone number and generate a code. Type the generated six-digit code into the field below; this step will not block your membership.")}</p>
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
                {t("Telefon numarası", "Phone number")}
                <PhoneInput defaultValue={profile.data?.phone ?? ""} name="phone" pattern="\+?[0-9 ]{10,19}" required />
                <span className="form-help">{t("0555… veya +90 555… biçiminde yazabilirsin.", "Use a local or international format, such as +44 7700…")}</span>
              </label>
              <button className="primary-action" disabled={phoneRequest.isPending || expires > 0} type="submit">
                {phoneRequest.isPending ? t("Kod oluşturuluyor…", "Generating code…") : expires ? `${expires} ${t("sn", "sec")}` : t("Doğrulama kodu oluştur", "Generate verification code")}
              </button>
              {phoneRequest.isError ? (
                <ServiceFeedback
                  compact
                  error={phoneRequest.error}
                  fallback={t("Kod oluşturulamadı. Telefon numaranı kontrol edip tekrar dene.", "The code could not be generated. Check your phone number and try again.")}
                />
              ) : null}
            </form>
            {demoCode ? (
              <div className="demo-verification-code" role="status">
                <span>{t("Demo doğrulama kodun", "Your demo verification code")}</span>
                <strong aria-label={t(`Demo doğrulama kodu ${demoCode}`, `Demo verification code ${demoCode}`)}>{demoCode}</strong>
                <p>{t("Bu kodu aşağıdaki alana kendin gir. Kod iki dakika geçerlidir.", "Enter this code in the field below. It is valid for two minutes.")}</p>
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
                  {t("Doğrulama kodu", "Verification code")}
                  <VerificationCodeInput autoFocus name="code" onChange={(event) => setVerificationCode(event.target.value)} required value={verificationCode} />
                  <span className="form-help">{demoVerification ? t("Yukarıda senin için oluşturulan 6 haneli kodu yaz.", "Enter the six-digit code generated for you above.") : t("Telefonuna gelen 6 haneli kodu yaz.", "Enter the six-digit code sent to your phone.")}</span>
                </label>
                <button className="primary-action" disabled={phoneConfirm.isPending || verificationCode.length !== 6} type="submit">
                  {phoneConfirm.isPending ? t("Doğrulanıyor…", "Verifying…") : t("Doğrula ve devam et", "Verify and continue")}
                </button>
                {phoneConfirm.isError ? (
                  <ServiceFeedback
                    compact
                    error={phoneConfirm.error}
                    fallback={t("Kod doğru değil veya süresi dolmuş. Yeni kod isteyip tekrar dene.", "The code is incorrect or expired. Request a new code and try again.")}
                  />
                ) : null}
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
                ...(profile.data.accountType === "corporate" ? { district: String(form.get("district") || "") } : {}),
              });
            }}
          >
            <h2>{profile.data.accountType === "corporate" ? t("Firma bilgileri", "Company information") : t("Temel bilgiler", "Basic information")}</h2>
            <label>
              {t("Kullanıcı adı", "Username")}
              <input defaultValue={profile.data.username ?? ""} name="username" onChange={(event) => {
                const value = event.target.value.trim();
                if (value.length < 2) return setAvailabilityText(t("Kullanıcı adı en az 2 karakter olmalı", "Username must be at least 2 characters"));
                void checkAvailability({ username: value }).then((data) => setAvailabilityText(data.usernameAvailable || value === profile.data?.username ? t("Kullanıcı adı uygun", "Username is available") : t("Kullanıcı adı kullanımda", "Username is in use")));
              }} pattern="[A-Za-z0-9 .-]+" required />
              {availabilityText ? <span className={/uygun|available/i.test(availabilityText) ? "form-success" : "form-error"}>{availabilityText}</span> : null}
            </label>
            <CountryCityFields defaultCity={profile.data.city} defaultCountry={profile.data.country} requiredCountry />
            {profile.data.accountType === "corporate" ? <label>
              {t("Firmanın ilçesi", "Company district")}
              <input defaultValue={profile.data.district ?? ""} name="district" placeholder={t("İsteğe bağlı", "Optional")} />
            </label> : null}
            {profile.data.accountType === "individual" ? <><label>
              {t("Doğum tarihi", "Date of birth")}
              <input defaultValue={profile.data.birthDate ? String(profile.data.birthDate).slice(0, 10) : ""} name="birthDate" required type="date" />
            </label>
            <label>
              {t("Cinsiyet", "Gender")}
              <select defaultValue={profile.data.gender ?? ""} name="gender">
                <option value="">{t("Belirtmek istemiyorum", "Prefer not to say")}</option>
                <option value="female">{t("Kadın", "Female")}</option>
                <option value="male">{t("Erkek", "Male")}</option>
              </select>
            </label></> : null}
            <label>
              {t("Web sitesi", "Website")}
              <input defaultValue={profile.data.website ?? ""} name="website" placeholder={t("ornek.com (isteğe bağlı)", "example.com (optional)")} />
            </label>
            {profileSave.isError ? (
              <ServiceFeedback
                compact
                error={profileSave.error}
                fallback={t("Profil bilgilerin kaydedilemedi. Alanları kontrol edip yeniden dene.", "Your profile information could not be saved. Check the fields and try again.")}
              />
            ) : null}
            <WizardButtons back={() => setStep(1)} nextLabel={t("Kaydet ve devam et", "Save and continue")} />
          </form>
        ) : null}
        {step === 2 && profile.isError ? (
          <div className="empty-state">
            <ServiceFeedback
              error={profile.error}
              fallback={t("Profil bilgilerin şu anda yüklenemedi.", "Your profile information could not be loaded.")}
              onRetry={() => void profile.refetch()}
              title={t("Profil yüklenemedi", "Profile could not be loaded")}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <h2>{t("Profil fotoğrafı", "Profile photo")}</h2>
            <p>{t("En az bir fotoğraf eklemelisin. İlk fotoğraf profil görselin olur.", "Add at least one photo. The first photo becomes your profile image.")}</p>
            <label className="onboarding-upload">
              <ImagePlus size={36} />
              <span>{t("Fotoğraf seç", "Choose photo")}</span>
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
                    alt={t("Düzenlenecek profil fotoğrafı", "Profile photo being edited")}
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
                    {t("Sağa döndür", "Rotate right")}
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
                    {t("Düzenleyip yükle", "Edit and upload")}
                  </button>
                </div>
              </div>
            ) : null}
            {photoUpload.isError ? (
              <ServiceFeedback
                compact
                error={photoUpload.error}
                fallback={t("Fotoğraf yüklenemedi. JPG, PNG veya WebP biçiminde daha küçük bir görsel deneyebilirsin.", "The photo could not be uploaded. Try a smaller JPG, PNG or WebP image.")}
              />
            ) : null}
            {media.isError ? (
              <ServiceFeedback
                compact
                error={media.error}
                fallback={t("Yüklediğin fotoğraflar alınamadı.", "Your uploaded photos could not be loaded.")}
                onRetry={() => void media.refetch()}
              />
            ) : null}
            <div className="onboarding-media-row">{media.data?.map((item) => (item.type === "image" ? <img alt={t("Profil yüklemesi", "Profile upload")} key={item.id} src={resolveMediaUrl(item.url)} /> : <video key={item.id} src={resolveMediaUrl(item.url)} />))}</div>
            <WizardButtons back={() => setStep(2)} disabled={!media.data?.some((item) => item.type === "image")} next={() => setStep(4)} />
          </div>
        ) : null}

        {step === 4 ? (
          <div>
            <h2>{t("İlgi alanların", "Your interests")}</h2>
            <p>{t("Bir etiket seç ve sende uyandırdığı duyguyu belirt.", "Choose a tag and select how it makes you feel.")}</p>
            <div className="onboarding-tag-grid">
              {tags.data?.map((tag) => (
                <button className={sentiments[tag.id] ? "is-selected" : ""} key={tag.id} onClick={() => setEmotionTagId(tag.id)} type="button">
                  #{tag.name}
                  <small>{sentiments[tag.id] ? sentimentLabel(sentiments[tag.id]!, language) : t("Seç", "Select")}</small>
                </button>
              ))}
            </div>
            {tags.isError || affinities.isError ? (
              <ServiceFeedback
                compact
                error={tags.error ?? affinities.error}
                fallback={t("İlgi alanların şu anda yüklenemedi.", "Your interests could not be loaded.")}
                onRetry={() => {
                  void tags.refetch();
                  void affinities.refetch();
                }}
              />
            ) : null}
            <p className="form-help">{selectedCount} {t("etiket seçildi", "tags selected")}</p>
            <WizardButtons back={() => setStep(3)} disabled={!selectedCount} next={() => affinitySave.mutate()} />
            {affinitySave.isError ? (
              <ServiceFeedback
                compact
                error={affinitySave.error}
                fallback={t("İlgi alanların kaydedilemedi. Seçimlerini kontrol edip yeniden dene.", "Your interests could not be saved. Check your selections and try again.")}
              />
            ) : null}
          </div>
        ) : null}

        {step === 5 ? (
          <div>
            <h2>{t("Takip edebileceklerin", "People you can follow")}</h2>
            <p>{t("Takip ettiğin üyeler bu işlemden bildirim almaz.", "Members you follow are not notified by this action.")}</p>
            <Link className="secondary-action contacts-cta" to="/contacts">
              {t("Telefon ve Google rehberinden arkadaşlarını bul", "Find friends from phone and Google contacts")}
            </Link>
            <div className="onboarding-people">
              {suggestions.data?.map((member) => (
                <article key={member.id}>
                  {member.username ? <Link to={`/users/${member.username}`}>{member.name.slice(0, 1)}</Link> : <span>{member.name.slice(0, 1)}</span>}
                  <div>
                    <strong>{member.username ? <Link to={`/users/${member.username}`}>@{member.username}</Link> : member.name}</strong>
                    <small>
                      {member.commonTagCount} {t("ortak ilgi", "shared interests")} · {member.followerCount} {t("takipçi", "followers")}
                    </small>
                  </div>
                  <button
                    className="secondary-action"
                    disabled={follow.isPending}
                    onClick={() => follow.mutate(member.id)}
                    type="button"
                  >
                    <UserPlus size={17} /> {t("Takip et", "Follow")}
                  </button>
                </article>
              ))}
            </div>
            {suggestions.isError ? (
              <ServiceFeedback
                compact
                error={suggestions.error}
                fallback={t("Üye önerileri şu anda yüklenemedi. Bu adımı daha sonra da tamamlayabilirsin.", "Member suggestions could not be loaded. You can complete this step later.")}
                onRetry={() => void suggestions.refetch()}
              />
            ) : null}
            {follow.isError ? (
              <ServiceFeedback
                compact
                error={follow.error}
                fallback={t("Bu üyeyi şu anda takip edemedik. Yeniden deneyebilirsin.", "This member could not be followed right now. Try again.")}
              />
            ) : null}
            <WizardButtons back={() => setStep(4)} next={() => finish.mutate()} nextLabel={t("Kaydet ve tamamla", "Save and finish")} />
            {finish.isError ? (
              <ServiceFeedback
                compact
                error={finish.error}
                fallback={t("Profil tamamlanamadı. Eksik adımları kontrol edip yeniden dene.", "The profile could not be completed. Check any missing steps and try again.")}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      {currentTag ? (
        <div className="emotion-modal" role="dialog" aria-modal="true" aria-label={t("Etiket duygusu", "Tag sentiment")}>
          <div>
            <button aria-label={t("Kapat", "Close")} onClick={() => setEmotionTagId("")} type="button">
              ×
            </button>
            <h2>#{currentTag.name}</h2>
            <p>{t("Bu etiket sende hangi duyguyu uyandırıyor?", "How does this tag make you feel?")}</p>
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
                {sentimentLabel(sentiment, language)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function WizardButtons({ back, next, disabled, nextLabel }: { back: () => void; next?: () => void; disabled?: boolean; nextLabel?: string }) {
  const { language } = useLanguage();
  const label = nextLabel ?? (language === "tr" ? "Devam et" : "Continue");
  return (
    <div className="wizard-buttons">
      <button className="ghost-action" onClick={back} type="button">
        <ArrowLeft size={18} /> {language === "tr" ? "Geri" : "Back"}
      </button>
      <button className="primary-action" disabled={disabled} onClick={next} type={next ? "button" : "submit"}>
        {label} <ArrowRight size={18} />
      </button>
    </div>
  );
}

function sentimentLabel(sentiment: TagSentiment, language: "tr" | "en") {
  if (sentiment === "like") return language === "tr" ? "Beğeniyorum" : "Like";
  if (sentiment === "ok") return language === "tr" ? "Nötr" : "Neutral";
  return language === "tr" ? "Beğenmiyorum" : "Dislike";
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
