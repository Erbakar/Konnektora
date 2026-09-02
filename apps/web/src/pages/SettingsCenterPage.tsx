import {
  Bell,
  BriefcaseBusiness,
  CreditCard,
  Image,
  LockKeyhole,
  Settings,
  UserRound,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import type {
  NotificationPreference,
  PrivacyAudience,
  SocialProvider,
} from "@konnektora/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  changePassword,
  clearUserSession,
  confirmPhoneVerification,
  connectSocialAccount,
  deactivateAccount,
  deleteProfileMedia,
  getMyProfile,
  getNotificationPreferences,
  getPrivacySettings,
  getProfileAffinities,
  getUserSession,
  listProfileMedia,
  listSocialAccounts,
  listTags,
  makeProfilePicture,
  removeSocialAccount,
  requestEmailVerification,
  requestPhoneVerification,
  resolveMediaUrl,
  updateMyProfile,
  updateNotificationPreferences,
  updatePrivacySettings,
  updateProfileAffinities,
  updateUserSession,
  upgradeCorporateAccount,
  uploadProfileMedia,
} from "../lib/api";
import { CountryCityFields } from "../components/CountryCityFields";
import {
  EmailInput,
  PhoneInput,
  VerificationCodeInput,
} from "../components/FormInputs";
import { ProfileVerificationPanel } from "../components/ProfileVerificationPanel";
import { getSocialCredential } from "../lib/socialProviders";
import { useLanguage } from "../lib/i18n";

const settings = [
  {
    icon: Image,
    title: "Profil fotoğrafları",
    description: "Profil görsellerini ekle, sırala veya kaldır.",
    href: "/settings/profile-pictures",
  },
  {
    icon: UserRound,
    title: "Profili düzenle",
    description: "Temel bilgilerini ve ilgi alanlarını güncelle.",
    href: "/settings/profile",
  },
  {
    icon: Settings,
    title: "Hesap ayarları",
    description: "Hesap, güvenlik ve oturum seçeneklerini yönet.",
    href: "/settings/account",
  },
  {
    icon: Bell,
    title: "Bildirim ayarları",
    description: "Bildirim kanallarını ve tercihlerini belirle.",
    href: "/settings/notifications",
  },
  {
    icon: LockKeyhole,
    title: "Gizlilik ayarları",
    description:
      "Kimlerin sana ulaşabileceğini ve içeriklerini görebileceğini seç.",
    href: "/settings/privacy",
  },
  {
    icon: BriefcaseBusiness,
    title: "Business ve ödeme ayarları",
    description: "Paket, fatura ve ödeme bilgilerini yönet.",
    href: "/settings/business",
  },
] as const;

export function SettingsCenterPage() {
  const { language } = useLanguage();
  const translated = language === "tr" ? settings : [
    { ...settings[0], title: "Profile media", description: "Add, organise or remove your profile media." },
    { ...settings[1], title: "Edit profile", description: "Update your basic information and interests." },
    { ...settings[2], title: "Account settings", description: "Manage your account, security and session options." },
    { ...settings[3], title: "Notification settings", description: "Choose your notification channels and preferences." },
    { ...settings[4], title: "Privacy settings", description: "Choose who can contact you and view your content." },
    { ...settings[5], title: "Business and payment settings", description: "Manage plans, billing and payment details." },
  ];
  return (
    <section className="page settings-center-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">{language === "tr" ? "Hesabın" : "Your account"}</p>
          <h1>{language === "tr" ? "Ayarlar Merkezi" : "Settings Centre"}</h1>
          <p className="lead">{language === "tr" ? "Profil ve hesap tercihlerini tek yerden yönet." : "Manage your profile and account preferences in one place."}</p>
        </div>
        <CreditCard size={36} />
      </div>
      <div className="settings-center-grid">
        {translated.map(({ icon: Icon, ...item }) => (
          <Link key={item.title} to={item.href}>
            <Icon size={24} />
            <span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </span>
            <b>→</b>
          </Link>
        ))}
      </div>
    </section>
  );
}

const sections: Record<
  string,
  { title: string; description: string; target: string }
> = {
  "profile-pictures": {
    title: "Profil fotoğrafları",
    description: "Profil görsellerini ekle, sırala ve profil fotoğrafını seç.",
    target: "/settings/profile-pictures",
  },
  profile: {
    title: "Profili düzenle",
    description:
      "Temel bilgiler, kurumsal bilgiler ve ilgi alanlarını düzenle.",
    target: "/settings/profile",
  },
  account: {
    title: "Hesap ayarları",
    description: "Telefon, parola, bağlı hesaplar ve hesap durumunu yönet.",
    target: "/settings/account",
  },
  notifications: {
    title: "Bildirim ayarları",
    description: "E-posta ve anlık bildirim tercihlerini düzenle.",
    target: "/settings/notifications",
  },
  privacy: {
    title: "Gizlilik ayarları",
    description: "Profil, mesaj, etkinlik ve mekân görünürlüğünü yönet.",
    target: "/settings/privacy",
  },
  business: {
    title: "Business ve ödeme ayarları",
    description: "Paket, fatura, banka ve ödeme ayarlarını yönet.",
    target: "/finance",
  },
};

export function SettingsSectionPage({ section }: { section: string }) {
  const { language } = useLanguage();
  const selected = sections[section] ?? sections.account!;
  const englishSections: typeof sections = {
    "profile-pictures": { title: "Profile media", description: "Add, organise and choose your profile picture.", target: "/settings/profile-pictures" },
    profile: { title: "Edit profile", description: "Edit your basic information, business details and interests.", target: "/settings/profile" },
    account: { title: "Account settings", description: "Manage your phone, password, connected accounts and account status.", target: "/settings/account" },
    notifications: { title: "Notification settings", description: "Manage email and push notification preferences.", target: "/settings/notifications" },
    privacy: { title: "Privacy settings", description: "Manage profile, message, event and place visibility.", target: "/settings/privacy" },
    business: { title: "Business and payment settings", description: "Manage plans, billing, bank and payment settings.", target: "/finance" },
  };
  const item = language === "tr" ? selected : englishSections[section] ?? englishSections.account!;
  const user = getUserSession();
  return (
    <section className="page settings-section-page">
      <Link className="back-link" to="/settings">
        ← {language === "tr" ? "Ayarlar Merkezi" : "Settings Centre"}
      </Link>
      <div className="section-header">
        <div>
          <p className="eyebrow">{language === "tr" ? "Ayarlar" : "Settings"}</p>
          <h1>{item.title}</h1>
          <p className="lead">{item.description}</p>
        </div>
      </div>
      {!user ? (
        <div className="identity-panel">
          <h2>{language === "tr" ? "Giriş gerekli" : "Login required"}</h2>
          <p>
            {language === "tr" ? "Bu ayarları görüntülemek ve değiştirmek için hesabınıza giriş yapın." : "Log in to view and change these settings."}
          </p>
          <Link className="primary-action" to="/login">
            {language === "tr" ? "Giriş yap" : "Log in"}
          </Link>
        </div>
      ) : section === "profile-pictures" ? (
        <ProfilePicturesSettings />
      ) : section === "profile" ? (
        <ProfileSettings />
      ) : section === "account" ? (
        <AccountSettings />
      ) : section === "notifications" ? (
        <NotificationSettings />
      ) : section === "privacy" ? (
        <PrivacySettings />
      ) : (
        <BusinessSettings user={user} />
      )}
    </section>
  );
}

function ProfilePicturesSettings() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const client = useQueryClient();
  const media = useQuery({
    queryKey: ["profile-media"],
    queryFn: listProfileMedia,
  });
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["profile-media"] });
  const upload = useMutation({
    mutationFn: uploadProfileMedia,
    onSuccess: refresh,
  });
  const primary = useMutation({
    mutationFn: makeProfilePicture,
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: deleteProfileMedia,
    onSuccess: refresh,
  });
  return (
    <div className="identity-panel">
      <label className="primary-action">
        {t("Yeni fotoğraf/video yükle", "Upload a new photo/video")}
        <input
          accept="image/*,video/mp4,video/webm"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload.mutate(file);
            event.target.value = "";
          }}
          type="file"
        />
      </label>
      <div className="settings-media-grid">
        {media.data?.map((item) => (
          <article key={item.id}>
            {item.type === "image" ? (
              <img alt={t("Profil medyası", "Profile media")} src={resolveMediaUrl(item.url)} />
            ) : (
              <video controls src={resolveMediaUrl(item.url)} />
            )}
            <div className="row-actions">
              {item.type === "image" && !item.isProfilePicture ? (
                <button onClick={() => primary.mutate(item.id)}>
                  {t("Profil fotoğrafı yap", "Set as profile picture")}
                </button>
              ) : null}
              {item.isProfilePicture ? (
                <strong>{t("Aktif profil fotoğrafı", "Current profile picture")}</strong>
              ) : null}
              <button
                className="danger-action"
                onClick={() =>
                  window.confirm(t("Bu medya silinsin mi?", "Delete this media?")) &&
                  remove.mutate(item.id)
                }
              >
                {t("Sil", "Delete")}
              </button>
            </div>
          </article>
        ))}
      </div>
      {upload.isError || primary.isError || remove.isError ? (
        <p className="form-error">{t("Medya işlemi tamamlanamadı.", "The media action could not be completed.")}</p>
      ) : null}
    </div>
  );
}

function ProfileSettings() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const client = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: getMyProfile });
  const tags = useQuery({
    queryKey: ["tags", "profile-settings"],
    queryFn: () => listTags(),
  });
  const affinities = useQuery({
    queryKey: ["profile-affinities", "settings"],
    queryFn: getProfileAffinities,
  });
  const save = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (updated) => {
      const session = getUserSession();
      if (session) updateUserSession({ ...session, name: updated.name, username: updated.username, city: updated.city, country: updated.country, accountType: updated.accountType });
      void client.invalidateQueries({ queryKey: ["profile"] });
    },
  });
  const saveInterests = useMutation({
    mutationFn: updateProfileAffinities,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["profile-affinities"] }),
  });
  if (!profile.data || !tags.data || !affinities.data)
    return <div className="identity-panel">{t("Profil yükleniyor…", "Loading profile…")}</div>;
  const currentSentiments = new Map(
    (affinities.data ?? []).map((item) => [item.tag.id, item.sentiment]),
  );
  return (
    <div className="settings-profile-stack">
      <form
        className="identity-panel settings-form"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const value = (key: string) =>
            String(form.get(key) || "").trim() || undefined;
          save.mutate({
            name: value("name")!,
            username: value("username"),
            city: value("city"),
            country: value("country"),
            district: value("district"),
            address: value("address"),
            website: value("website"),
            birthDate: value("birthDate")
              ? new Date(`${value("birthDate")}T00:00:00.000Z`).toISOString()
              : undefined,
            gender: value("gender") as "male" | "female" | undefined,
            companyName: value("companyName"),
            tradeName: value("tradeName"),
            companyType: value("companyType"),
            businessCategory: value("businessCategory"),
          });
        }}
      >
        <div className="form-grid">
          <label>
            {profile.data.accountType === "corporate"
              ? t("Yetkili Ad Soyadı", "Authorised representative")
              : t("Ad soyad", "Full name")}
            <input defaultValue={profile.data.name} name="name" required />
          </label>
          <label>
            {t("Kullanıcı adı", "Username")}
            <input defaultValue={profile.data.username ?? ""} name="username" />
          </label>
          <CountryCityFields
            defaultCity={profile.data.city}
            defaultCountry={profile.data.country}
          />
          {profile.data.accountType === "individual" ? (
            <>
              <label>
                {t("Doğum tarihi", "Date of birth")}
                <input
                  defaultValue={
                    profile.data.birthDate
                      ? String(profile.data.birthDate).slice(0, 10)
                      : ""
                  }
                  name="birthDate"
                  type="date"
                />
              </label>
              <label>
                {t("Cinsiyet", "Gender")}
                <select defaultValue={profile.data.gender ?? ""} name="gender">
                  <option value="">{t("Belirtmek istemiyorum", "Prefer not to say")}</option>
                  <option value="female">{t("Kadın", "Female")}</option>
                  <option value="male">{t("Erkek", "Male")}</option>
                </select>
              </label>
            </>
          ) : (
            <>
              <label>
                {t("İlçe", "District")}
                <input
                  defaultValue={profile.data.district ?? ""}
                  name="district"
                />
              </label>
              <label>
                {t("Adres", "Address")}
                <input
                  defaultValue={profile.data.address ?? ""}
                  name="address"
                />
              </label>
              <label>
                {t("İşletme adı", "Business name")}
                <input
                  defaultValue={profile.data.companyName ?? ""}
                  name="companyName"
                  required
                />
              </label>
              <label>
                {t("Ticari unvan", "Registered business name")}
                <input
                  defaultValue={profile.data.tradeName ?? ""}
                  name="tradeName"
                  required
                />
              </label>
              <label>
                {t("Şirket türü", "Company type")}
                <input
                  defaultValue={profile.data.companyType ?? ""}
                  name="companyType"
                />
              </label>
              <label>
                {t("Faaliyet alanı", "Business category")}
                <input
                  defaultValue={profile.data.businessCategory ?? ""}
                  name="businessCategory"
                />
              </label>
            </>
          )}
          <label>
            {t("Web sitesi", "Website")}
            <input
              defaultValue={profile.data.website ?? ""}
              name="website"
              type="url"
            />
          </label>
        </div>
        <button className="primary-action" disabled={save.isPending}>
          {t("Kaydet", "Save")}
        </button>
        {save.isSuccess ? (
          <p className="form-success">{t("Profil kaydedildi.", "Profile saved.")}</p>
        ) : null}
        {save.isError ? (
          <p className="form-error">{t("Profil kaydedilemedi.", "Profile could not be saved.")}</p>
        ) : null}
      </form>
      <form
        className="identity-panel settings-form"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          saveInterests.mutate(
            form
              .getAll("tagIds")
              .map(String)
              .map((tagId) => ({
                tagId,
                sentiment: String(
                  form.get(`sentiment:${tagId}`) ||
                    currentSentiments.get(tagId) ||
                    "like",
                ) as "like" | "ok" | "dislike",
              })),
          );
        }}
      >
        <h2>{t("İlgi alanları", "Interests")}</h2>
        <p>{t("Profilinde göstermek istediğin etiketleri ve duygunu seç.", "Choose the tags and sentiment you want to show on your profile.")}</p>
        <div className="settings-interest-grid">
          {tags.data?.map((tag) => (
            <article key={tag.id}>
              <label>
                <input
                  defaultChecked={currentSentiments.has(tag.id)}
                  name="tagIds"
                  type="checkbox"
                  value={tag.id}
                />
                <span>#{tag.name}</span>
              </label>
              <select
                aria-label={t(`${tag.name} duygusu`, `${tag.name} sentiment`)}
                defaultValue={currentSentiments.get(tag.id) ?? "like"}
                name={`sentiment:${tag.id}`}
              >
                <option value="like">{t("Beğeniyorum", "Like")}</option>
                <option value="ok">{t("Nötr", "Neutral")}</option>
                <option value="dislike">{t("Beğenmiyorum", "Dislike")}</option>
              </select>
            </article>
          ))}
        </div>
        <button className="primary-action" disabled={saveInterests.isPending}>
          {t("İlgi alanlarını kaydet", "Save interests")}
        </button>
        {saveInterests.isSuccess ? (
          <p className="form-success">{t("İlgi alanları güncellendi.", "Interests updated.")}</p>
        ) : null}
        {saveInterests.isError ? (
          <p className="form-error">{t("İlgi alanları güncellenemedi.", "Interests could not be updated.")}</p>
        ) : null}
      </form>
    </div>
  );
}

function AccountSettings() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const client = useQueryClient();
  const user = getUserSession()!;
  const profile = useQuery({
    queryKey: ["profile", "account"],
    queryFn: getMyProfile,
  });
  const socials = useQuery({
    queryKey: ["social-accounts", "settings"],
    queryFn: listSocialAccounts,
  });
  const [pendingPhone, setPendingPhone] = useState("");
  const [demoPhoneCode, setDemoPhoneCode] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const change = useMutation({ mutationFn: changePassword });
  const updateEmail = useMutation({
    mutationFn: async (email: string) => {
      const updated = await updateMyProfile({
        name: profile.data!.name,
        email,
      });
      await requestEmailVerification(email);
      return updated;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["profile"] }),
  });
  const requestPhone = useMutation({
    mutationFn: requestPhoneVerification,
    onSuccess: (result, phone) => {
      setPendingPhone(phone);
      setDemoPhoneCode(result.demoCode ?? result.developmentCode ?? "");
    },
  });
  const confirmPhone = useMutation({
    mutationFn: ({ phone, code }: { phone: string; code: string }) =>
      confirmPhoneVerification(phone, code),
    onSuccess: () => {
      setPendingPhone("");
      setDemoPhoneCode("");
      void client.invalidateQueries({ queryKey: ["profile"] });
    },
  });
  const social = useMutation({
    mutationFn: async ({
      provider,
      remove,
    }: {
      provider: SocialProvider;
      remove: boolean;
    }) =>
      remove
        ? removeSocialAccount(provider)
        : connectSocialAccount(provider, await getSocialCredential(provider)),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["social-accounts"] }),
  });
  const freeze = useMutation({
    mutationFn: deactivateAccount,
    onSuccess: () => {
      clearUserSession();
      window.sessionStorage.setItem("konnektora_account_frozen", "1");
      window.location.assign("/login");
    },
  });
  return (
    <div className="settings-profile-stack">
      <ProfileVerificationPanel userId={user.id} />
      <form
        className="identity-panel settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          updateEmail.mutate(String(new FormData(event.currentTarget).get("email") || ""));
        }}
      >
        <h2>{t("E-posta adresi", "Email address")}</h2>
        <EmailInput aria-label={t("E-posta", "Email")} defaultValue={profile.data?.email ?? user.email} name="email" required />
        <button className="primary-action" disabled={updateEmail.isPending}>{t("E-postayı güncelle", "Update email")}</button>
        {updateEmail.isSuccess ? <p className="form-success">{t("E-posta güncellendi; doğrulama bağlantısı gönderildi.", "Email updated; a verification link has been sent.")}</p> : null}
        {updateEmail.isError ? <p className="form-error">{t("E-posta güncellenemedi.", "Email could not be updated.")}</p> : null}
      </form>
      <form
        className="identity-panel settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const phone = String(form.get("phone") || "");
          const code = String(form.get("code") || "");
          if (pendingPhone) confirmPhone.mutate({ phone: pendingPhone, code });
          else requestPhone.mutate(phone);
        }}
      >
        <h2>{t("Telefon numarası", "Phone number")}</h2>
        {pendingPhone ? (
          <>
            <p>{t(`${pendingPhone} numarasına gelen kodu girin.`, `Enter the code sent to ${pendingPhone}.`)}</p>
            {demoPhoneCode ? (
              <div className="demo-verification-code">
                <span>{t("Demo doğrulama kodu", "Demo verification code")}</span>
                <strong>{demoPhoneCode}</strong>
              </div>
            ) : null}
            <VerificationCodeInput name="code" required />
          </>
        ) : (
          <PhoneInput
            aria-label={t("Telefon", "Phone")}
            defaultValue={profile.data?.phone ?? ""}
            name="phone"
            required
          />
        )}
        <button
          className="primary-action"
          disabled={requestPhone.isPending || confirmPhone.isPending}
        >
          {pendingPhone ? t("Numarayı doğrula", "Verify number") : t("Doğrulama kodu gönder", "Send verification code")}
        </button>
        {requestPhone.isError || confirmPhone.isError ? (
          <p className="form-error">{t("Telefon doğrulanamadı.", "Phone number could not be verified.")}</p>
        ) : null}
      </form>
      <section className="identity-panel settings-form">
        <h2>{t("Bağlı hesaplar", "Connected accounts")}</h2>
        {(["google", "facebook"] as SocialProvider[]).map((provider) => {
          const connected = socials.data?.some(
            (item) => item.provider === provider,
          );
          return (
            <div className="connected-account-row" key={provider}>
              <strong>{provider === "google" ? "Google" : "Facebook"}</strong>
              <button
                className="secondary-action"
                disabled={social.isPending}
                onClick={() =>
                  social.mutate({ provider, remove: Boolean(connected) })
                }
                type="button"
              >
                {connected ? t("Bağlantıyı kaldır", "Disconnect") : t("Bağla", "Connect")}
              </button>
            </div>
          );
        })}
      </section>
      <form
        className="identity-panel settings-form"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const currentPassword = String(form.get("currentPassword") || "");
          const newPassword = String(form.get("newPassword") || "");
          const confirmation = String(form.get("confirmation") || "");
          if (newPassword !== confirmation) {
            setPasswordMismatch(true);
            return;
          }
          setPasswordMismatch(false);
          change.mutate({ currentPassword, newPassword });
        }}
      >
        <h2>{t("Şifreyi değiştir", "Change password")}</h2>
        <label>
          {t("Mevcut şifre", "Current password")}
          <input
            autoComplete="current-password"
            name="currentPassword"
            required
            type="password"
          />
        </label>
        <label>
          {t("Yeni şifre", "New password")}
          <input
            autoComplete="new-password"
            minLength={8}
            name="newPassword"
            required
            type="password"
          />
        </label>
        <label>
          {t("Yeni şifre tekrar", "Confirm new password")}
          <input
            autoComplete="new-password"
            minLength={8}
            name="confirmation"
            required
            type="password"
          />
        </label>
        <button className="primary-action" disabled={change.isPending}>
          {t("Şifreyi güncelle", "Update password")}
        </button>
        {passwordMismatch ? <p className="form-error" role="alert">{t("Yeni şifreler eşleşmiyor.", "The new passwords do not match.")}</p> : null}
        {change.isSuccess ? (
          <p className="form-success">{t("Şifre güncellendi.", "Password updated.")}</p>
        ) : null}
        {change.isError ? (
          <p className="form-error">{t("Şifre güncellenemedi.", "Password could not be updated.")}</p>
        ) : null}
      </form>
      <form
        className="identity-panel settings-form danger-zone"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          freeze.mutate({
            currentPassword: String(form.get("currentPassword")),
            reason: String(form.get("reason")),
          });
        }}
      >
        <h2>{t("Hesabı dondur", "Freeze account")}</h2>
        <label>
          {t("Neden", "Reason")}
          <textarea minLength={5} name="reason" required />
        </label>
        <label>
          {t("Mevcut şifre", "Current password")}
          <input name="currentPassword" required type="password" />
        </label>
        <button className="danger-action" disabled={freeze.isPending}>
          {t("Hesabı dondur", "Freeze account")}
        </button>
        {freeze.isError ? (
          <p className="form-error">{t("Hesap dondurulamadı.", "Account could not be frozen.")}</p>
        ) : null}
      </form>
    </div>
  );
}

const notificationLabels: Record<string, string> = {
  tag_request: "Etiket talebi",
  private_message: "Özel mesaj",
  mention: "Bahsedilme",
  comment: "Yorum",
  password_changed: "Şifre değişikliği",
  email_changed: "E-posta değişikliği",
  phone_changed: "Telefon değişikliği",
  login: "Yeni giriş",
  admin_message: "Yönetim mesajı",
  event_invite: "Etkinlik daveti",
  event_manager: "Etkinlik yöneticiliği",
  place_invite: "Mekân daveti",
  place_manager: "Mekân yöneticiliği",
};
const notificationLabelsEn: Record<string, string> = {
  tag_request: "Tag request",
  private_message: "Private message",
  mention: "Mention",
  comment: "Comment",
  password_changed: "Password change",
  email_changed: "Email change",
  phone_changed: "Phone change",
  login: "New login",
  admin_message: "Admin message",
  event_invite: "Event invitation",
  event_manager: "Event manager role",
  place_invite: "Place invitation",
  place_manager: "Place manager role",
};
function NotificationSettings() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const client = useQueryClient();
  const preferences = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: getNotificationPreferences,
  });
  const save = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["notification-preferences"] }),
  });
  return (
    <form
      className="identity-panel settings-form"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        save.mutate(
          (preferences.data ?? []).map((item) => ({
            topic: item.topic,
            channel: String(
              form.get(item.topic) || item.channel,
            ) as NotificationPreference["channel"],
          })),
        );
      }}
    >
      <div className="settings-preference-list">
        {preferences.data?.map((item) => (
          <label key={item.topic}>
            <span>{(language === "tr" ? notificationLabels : notificationLabelsEn)[item.topic] ?? item.topic}</span>
            <select defaultValue={item.channel} name={item.topic}>
              <option value="both">{t("E-posta ve push", "Email and push")}</option>
              <option value="email">{t("Yalnız e-posta", "Email only")}</option>
              <option value="push">{t("Yalnız push", "Push only")}</option>
              <option value="none">{t("Kapalı", "Off")}</option>
            </select>
          </label>
        ))}
      </div>
      <button className="primary-action" disabled={save.isPending}>
        {t("Tercihleri kaydet", "Save preferences")}
      </button>
      {save.isSuccess ? (
        <p className="form-success">{t("Bildirim tercihleri kaydedildi.", "Notification preferences saved.")}</p>
      ) : null}
    </form>
  );
}

const privacyFields = [
  "messageAudience",
  "eventAudience",
  "eventInviteAudience",
  "placeAudience",
  "placeInviteAudience",
  "profileNameAudience",
  "demographicsAudience",
  "locationAudience",
  "websiteAudience",
  "addressAudience",
  "tradeNameAudience",
] as const;
const privacyLabels: Record<(typeof privacyFields)[number], string> = {
  messageAudience: "Kimler mesaj gönderebilir?",
  eventAudience: "Etkinliklerimi kim görebilir?",
  eventInviteAudience: "Kimler etkinliğe davet edebilir?",
  placeAudience: "Mekânlarımı kim görebilir?",
  placeInviteAudience: "Kimler mekâna davet edebilir?",
  profileNameAudience: "Ad soyad görünürlüğü",
  demographicsAudience: "Yaş ve cinsiyet görünürlüğü",
  locationAudience: "Profil ayarlarımda kayıtlı şehri kim görebilir?",
  websiteAudience: "Web sitesi görünürlüğü",
  addressAudience: "Profil ayarlarımda kayıtlı adresimi kim görebilir?",
  tradeNameAudience: "Ticari unvanımı kim görebilir?",
};
function PrivacySettings() {
  const { language } = useLanguage();
  const user = getUserSession()!;
  const client = useQueryClient();
  const privacy = useQuery({
    queryKey: ["privacy-settings"],
    queryFn: getPrivacySettings,
  });
  const save = useMutation({
    mutationFn: updatePrivacySettings,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["privacy-settings"] }),
  });
  if (!privacy.data)
    return <div className="identity-panel">{language === "tr" ? "Gizlilik ayarları yükleniyor…" : "Loading privacy settings…"}</div>;
  const visibleFields = privacyFields.filter((field) =>
    user.accountType === "corporate"
      ? field !== "locationAudience"
      : field !== "addressAudience" && field !== "tradeNameAudience",
  );
  const fixedAudience = new Set([
    "messageAudience",
    "eventInviteAudience",
    "placeInviteAudience",
  ]);
  return (
    <form
      className="identity-panel settings-form"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const read = (field: (typeof privacyFields)[number]) =>
          String(form.get(field) ?? privacy.data[field]) as PrivacyAudience;
        save.mutate({
          messageAudience: read("messageAudience"),
          eventAudience: read("eventAudience"),
          eventInviteAudience: read("eventInviteAudience"),
          placeAudience: read("placeAudience"),
          placeInviteAudience: read("placeInviteAudience"),
          profileNameAudience: read("profileNameAudience"),
          demographicsAudience: read("demographicsAudience"),
          locationAudience: read("locationAudience"),
          websiteAudience: read("websiteAudience"),
          addressAudience: read("addressAudience"),
          tradeNameAudience: read("tradeNameAudience"),
          businessAudience: privacy.data.businessAudience,
          directoryDiscoverable: form.get("directoryDiscoverable") === "on",
        });
      }}
    >
      <label className="checkbox-line">
        <input
          defaultChecked={privacy.data.directoryDiscoverable}
          name="directoryDiscoverable"
          type="checkbox"
        />
        {language === "tr" ? "Arkadaşlarım beni aramada bulabilsin" : "Let my friends find me in search"}
      </label>
      <div className="form-grid">
        {visibleFields.map((field) => (
          <label key={field}>
            {language === "tr" ? privacyLabels[field] : ({
              messageAudience: "Who can message me?",
              eventAudience: "Who can see my events?",
              eventInviteAudience: "Who can invite me to events?",
              placeAudience: "Who can see my places?",
              placeInviteAudience: "Who can invite me to places?",
              profileNameAudience: "Full name visibility",
              demographicsAudience: "Age and gender visibility",
              locationAudience: "Who can see the city saved in my profile?",
              websiteAudience: "Website visibility",
              addressAudience: "Who can see the address saved in my profile?",
              tradeNameAudience: "Who can see my registered business name?",
            } as typeof privacyLabels)[field]}
            <select defaultValue={privacy.data[field]} name={field}>
              <option value="everybody">{language === "tr" ? "Herkes" : "Everyone"}</option>
              <option value="following">{language === "tr" ? "Takip ettiklerim" : "People I follow"}</option>
              <option value="network">{language === "tr" ? "Ağım" : "My network"}</option>
              {!fixedAudience.has(field) ? (
                <option value="nobody">{language === "tr" ? "Hiç kimse" : "Nobody"}</option>
              ) : null}
            </select>
          </label>
        ))}
      </div>
      <button className="primary-action" disabled={save.isPending}>
        {language === "tr" ? "Gizliliği kaydet" : "Save privacy settings"}
      </button>
      {save.isSuccess ? (
        <p className="form-success">{language === "tr" ? "Gizlilik ayarları kaydedildi." : "Privacy settings saved."}</p>
      ) : null}
    </form>
  );
}

const companyTypeOptions = [
  ["sole_proprietorship", "Şahıs firması", "Sole proprietorship"],
  ["limited_or_corporation", "Limited / Anonim", "Limited company / corporation"],
  ["association", "Dernek", "Association"],
  ["foundation", "Vakıf", "Foundation"],
  ["public_body", "Kamu kurumu", "Public body"],
  ["other", "Diğer", "Other"],
] as const;

const businessCategoryOptions = [
  ["event_organizer", "Etkinlik organizatörü", "Event organiser"],
  ["restaurant_bar_cafe", "Restoran / Bar / Kafe", "Restaurant / Bar / Café"],
  ["night_club", "Gece kulübü", "Nightclub"],
  ["university_club", "Üniversite kulübü", "University club"],
  ["ngo", "STK", "NGO"],
  ["brand", "Marka", "Brand"],
  ["tourism_company", "Turizm şirketi", "Tourism company"],
  ["sports_club", "Spor kulübü", "Sports club"],
  ["other", "Diğer", "Other"],
] as const;

function BusinessSettings({ user }: { user: NonNullable<ReturnType<typeof getUserSession>> }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const upgrade = useMutation({
    mutationFn: (input: { companyName: string; tradeName: string; companyType: string; businessCategory: string; country: string; city?: string; district?: string; address?: string }) => upgradeCorporateAccount(input),
    onSuccess: () => {
      updateUserSession({ ...user, accountType: "corporate" });
      window.location.assign("/settings/business");
    },
  });
  if (user.accountType !== "corporate") return (
    <form className="identity-panel settings-form" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const optional = (name: string) => String(form.get(name) ?? "").trim() || undefined;
      upgrade.mutate({
        companyName: String(form.get("companyName") ?? ""),
        tradeName: String(form.get("tradeName") ?? ""),
        companyType: String(form.get("companyType") ?? ""),
        businessCategory: String(form.get("businessCategory") ?? ""),
        country: String(form.get("country") ?? ""),
        city: optional("city"),
        district: optional("district"),
        address: optional("address"),
      });
    }}>
      <h2>{t("Kurumsal hesaba geç", "Switch to a business account")}</h2>
      <p>{t("Etkinlik, mekân, finans ve kurumsal doğrulama araçlarını aç. Mevcut profilin ve bağlantıların korunur.", "Unlock event, place, finance and business verification tools. Your existing profile and connections are preserved.")}</p>
      <label>{t("İşletme adı", "Business name")}<input name="companyName" minLength={2} required /></label>
      <label>{t("Ticari unvan", "Registered business name")}<input name="tradeName" minLength={2} required /></label>
      <div className="form-grid">
        <label>
          {t("Şirket türü", "Company type")}
          <select defaultValue="" name="companyType" required>
            <option disabled value="">{t("Şirket türü seçin", "Select company type")}</option>
            {companyTypeOptions.map(([value, tr, en]) => <option key={value} value={value}>{t(tr, en)}</option>)}
          </select>
        </label>
        <label>
          {t("İşletme kategorisi", "Business category")}
          <select defaultValue="" name="businessCategory" required>
            <option disabled value="">{t("İşletme kategorisi seçin", "Select business category")}</option>
            {businessCategoryOptions.map(([value, tr, en]) => <option key={value} value={value}>{t(tr, en)}</option>)}
          </select>
        </label>
        <CountryCityFields
          countryLabel={t("Firmanın ülkesi", "Company country")}
          cityLabel={t("Firmanın şehri (opsiyonel)", "Company city (optional)")}
          defaultCity={user.city}
          defaultCountry={user.country}
          requiredCountry
        />
        <label>
          {t("Firmanın ilçesi (opsiyonel)", "Company district (optional)")}
          <input maxLength={120} name="district" />
        </label>
        <label>
          {t("Firmanın açık adresi (opsiyonel)", "Company address (optional)")}
          <input maxLength={500} name="address" />
        </label>
      </div>
      <button className="primary-action" disabled={upgrade.isPending}>{upgrade.isPending ? t("Geçiş yapılıyor…", "Switching…") : t("Kurumsal hesaba geç", "Switch to a business account")}</button>
      {upgrade.isError ? <p className="form-error">{t("Hesap türü güncellenemedi. Bilgileri kontrol edip tekrar deneyin.", "The account type could not be updated. Check your details and try again.")}</p> : null}
    </form>
  );
  return (
    <div className="identity-panel settings-form">
      <h2>{t("Business ve ödeme", "Business and payments")}</h2>
      <p>
        {t("Kurumsal paketini, cüzdanını, ödeme yöntemlerini, hesap hareketlerini ve faturalarını yönet.", "Manage your business plan, wallet, payment methods, transactions and invoices.")}
      </p>
      <div className="row-actions">
        <Link className="primary-action" to="/finance">
          {t("Cüzdan ve ödeme ayarları", "Wallet and payment settings")}
        </Link>
        <Link className="secondary-action" to="/store">
          {t("Paketleri görüntüle", "View plans")}
        </Link>
        <Link className="secondary-action" to="/business">
          {t("Business çözümleri", "Business solutions")}
        </Link>
      </div>
    </div>
  );
}
