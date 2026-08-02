import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardCheck, Image, LogOut, Plus, Trash2, UserRound, Users, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import type { AccountType, Event, EventParticipant, MemberCard, NotificationPreference, PrivacyAudience, ProfileMedia, Tag, TagAffinity, TagSentiment, SocialProvider } from "@konnektora/shared";
import { EmailInput, PhoneInput, VerificationCodeInput } from "../components/FormInputs";
import { SocialAuthButtons } from "../components/SocialAuthButtons";
import { ProfileVerificationPanel } from "../components/ProfileVerificationPanel";
import { PushNotificationControl } from "../components/PushNotificationControl";
import { RichText } from "../components/RichText";
import { getSocialCredential } from "../lib/socialProviders";
import { normalizeEmail, normalizePhone } from "../lib/formats";
import { type AdminEventInput, type RegistrationInput, archiveMyEvent, checkAvailability, checkInEventParticipant, changePassword, connectSocialAccount, confirmPhoneVerification, clearUserSession, createUserEvent, createUserTag, createTagComment, deactivateAccount, deleteProfileMedia, deleteTagComment, getProfileAffinities, getMyProfile, getNotificationPreferences, getPrivacySettings, getUserSession, getUserToken, followUser, inviteEventParticipant, isMockApiMode, listMyNotifications, listBlocks, listFollowing, listMemberSuggestions, listEventParticipants, listMyEvents, listProfileMedia, listSocialAccounts, listTags, listTagComments, markMyNotificationRead, makeProfilePicture, registerUser, reactivateAccount, removeBlock, removeSocialAccount, requestEmailVerification, requestPhoneVerification, requestPasswordReset, reorderProfileMedia, resolveMediaUrl, scanEventTicket, setUserSession, updateEventParticipantStatus, updateMyEvent, updateProfileAffinities, unfollowUser, updateMyProfile, updateNotificationPreferences, updatePrivacySettings, uploadProfileMedia, userLogin, socialLogin } from "../lib/api";

export function AccountPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(() => getUserSession());
  const [mode, setMode] = useState<"login" | "register">("register");
  const [registrationAccountType, setRegistrationAccountType] = useState<AccountType>("individual");
  const [showFrozenConfirmation, setShowFrozenConfirmation] = useState(() => window.sessionStorage.getItem("konnektora_account_frozen") === "1");
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [developmentPhoneCode, setDevelopmentPhoneCode] = useState<string | null>(null);
  const [commentTagId, setCommentTagId] = useState("");
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: listTags,
  });
  const myEventsQuery = useQuery({
    queryKey: ["my-events", user?.id],
    queryFn: listMyEvents,
    enabled: Boolean(user),
  });
  const interestsQuery = useQuery({
    queryKey: ["profile-interests", user?.id],
    queryFn: getProfileAffinities,
    enabled: Boolean(user),
  });
  const profileQuery = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: getMyProfile,
    enabled: Boolean(user),
  });
  const profileMediaQuery = useQuery({
    queryKey: ["profile-media", user?.id],
    queryFn: listProfileMedia,
    enabled: Boolean(user),
  });
  const privacyQuery = useQuery({
    queryKey: ["privacy-settings", user?.id],
    queryFn: getPrivacySettings,
    enabled: Boolean(user),
  });
  const socialAccountsQuery = useQuery({
    queryKey: ["social-accounts", user?.id],
    queryFn: listSocialAccounts,
    enabled: Boolean(user),
  });
  const notificationPreferencesQuery = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: getNotificationPreferences,
    enabled: Boolean(user),
  });
  const blocksQuery = useQuery({
    queryKey: ["blocks", user?.id],
    queryFn: listBlocks,
    enabled: Boolean(user),
  });
  const followingQuery = useQuery({
    queryKey: ["following", user?.id],
    queryFn: listFollowing,
    enabled: Boolean(user),
  });
  const suggestionsQuery = useQuery({
    queryKey: ["member-suggestions", user?.id],
    queryFn: listMemberSuggestions,
    enabled: Boolean(user),
  });
  const notificationsQuery = useQuery({
    queryKey: ["my-notifications", user?.id],
    queryFn: listMyNotifications,
    enabled: Boolean(user),
  });
  const tagCommentsQuery = useQuery({
    queryKey: ["tag-comments", commentTagId],
    queryFn: () => listTagComments(commentTagId),
    enabled: Boolean(user && commentTagId),
  });
  const interestTagIds = interestsQuery.data?.map((affinity) => affinity.tag.id) ?? [];
  const interestSentiments = new Map(interestsQuery.data?.map((affinity) => [affinity.tag.id, affinity.sentiment]) ?? []);
  const interestTags = tags.filter((tag) => interestTagIds.includes(tag.id));

  const authMutation = useMutation({
    mutationFn: (input: RegistrationInput) => (mode === "register" ? registerUser(input) : userLogin(input.email, input.password)),
    onSuccess: (response) => {
      setUserSession(response);
      setUser(response.user);
      void queryClient.invalidateQueries({
        queryKey: ["profile-interests", response.user.id],
      });
      setNotice({
        tone: "success",
        message: response.user.status === "pending" ? "Hesap oluşturuldu. Email doğrulama linkini kontrol et." : "Giriş yapıldı. Artık etkinlik oluşturabilirsin.",
      });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar dene.",
      }),
  });
  const socialAccountMutation = useMutation({
    mutationFn: async ({ provider, remove = false }: { provider: SocialProvider; remove?: boolean }) => (remove ? removeSocialAccount(provider) : connectSocialAccount(provider, await getSocialCredential(provider))),
    onSuccess: (accounts) => {
      queryClient.setQueryData(["social-accounts", user?.id], accounts);
      setNotice({ tone: "success", message: "Bağlı hesaplar güncellendi." });
    },
    onError: (error: Error) => setNotice({ tone: "error", message: error.message }),
  });
  const forgotPasswordMutation = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: () =>
      setNotice({
        tone: "success",
        message: "Şifre sıfırlama linki email adresine gönderildi.",
      }),
    onError: () =>
      setNotice({
        tone: "error",
        message: "Şifre sıfırlama isteği gönderilemedi.",
      }),
  });
  const reactivateMutation = useMutation({
    mutationFn: (input: { email: string; password: string }) => reactivateAccount(input.email, input.password),
    onSuccess: (response) => {
      setUserSession(response);
      setUser(response.user);
      setNotice({
        tone: "success",
        message: "Hesabınız yeniden aktifleştirildi.",
      });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: "Dondurulmuş hesap bulunamadı veya şifre hatalı.",
      }),
  });
  const resendVerificationMutation = useMutation({
    mutationFn: requestEmailVerification,
    onSuccess: () =>
      setNotice({
        tone: "success",
        message: "Doğrulama emaili tekrar gönderildi.",
      }),
    onError: () => setNotice({ tone: "error", message: "Doğrulama emaili gönderilemedi." }),
  });

  const eventMutation = useMutation({
    mutationFn: createUserEvent,
    onSuccess: () => {
      setNotice({
        tone: "success",
        message: "Etkinlik yayınlandı ve public listede görünür.",
      });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["my-events", user?.id] });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: "Etkinlik oluşturulamadı. Zorunlu alanları kontrol et.",
      }),
  });
  const tagMutation = useMutation({
    mutationFn: createUserTag,
    onSuccess: (tag) => {
      setNotice({ tone: "success", message: `${tag.name} tag'i hazır.` });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      void queryClient.invalidateQueries({ queryKey: ["tags", "home"] });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: "Tag oluşturulamadı. Aynı isimde sorunlu bir tag olabilir.",
      }),
  });
  const interestsMutation = useMutation({
    mutationFn: updateProfileAffinities,
    onSuccess: (affinities) => {
      queryClient.setQueryData<TagAffinity[]>(["profile-interests", user?.id], affinities);
      void queryClient.invalidateQueries({
        queryKey: ["member-suggestions", user?.id],
      });
      setNotice({ tone: "success", message: "İlgi alanların kaydedildi." });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: "İlgi alanları kaydedilemedi. Lütfen tekrar dene.",
      }),
  });
  const createTagCommentMutation = useMutation({
    mutationFn: (body: string) => createTagComment(commentTagId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tag-comments", commentTagId],
      });
      setNotice({ tone: "success", message: "Tag yorumunuz eklendi." });
    },
    onError: () => setNotice({ tone: "error", message: "Tag yorumu eklenemedi." }),
  });
  const deleteTagCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteTagComment(commentTagId, commentId),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["tag-comments", commentTagId],
      }),
  });
  const profileMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (profile) => {
      const session = getUserSession();
      if (session) {
        const response = {
          accessToken: getUserToken() ?? "",
          user: {
            ...session,
            name: profile.name,
            accountType: profile.accountType,
          },
        };
        setUserSession(response);
        setUser(response.user);
      }
      queryClient.setQueryData(["my-profile", profile.id], profile);
      setNotice({ tone: "success", message: "Profil bilgileri kaydedildi." });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: "Profil kaydedilemedi. Kullanıcı adı ve zorunlu alanları kontrol et.",
      }),
  });
  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => setNotice({ tone: "success", message: "Şifreniz değiştirildi." }),
    onError: () =>
      setNotice({
        tone: "error",
        message: "Şifre değiştirilemedi. Mevcut şifrenizi kontrol edin.",
      }),
  });
  const deactivateMutation = useMutation({
    mutationFn: deactivateAccount,
    onSuccess: () => {
      clearUserSession();
      window.sessionStorage.setItem("konnektora_account_frozen", "1");
      window.location.assign("/account");
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: "Hesap dondurulamadı. Mevcut şifrenizi kontrol edin.",
      }),
  });
  const requestPhoneMutation = useMutation({
    mutationFn: requestPhoneVerification,
    onSuccess: (response, phone) => {
      setPendingPhone(phone);
      setDevelopmentPhoneCode(response.developmentCode ?? null);
      setNotice({
        tone: "success",
        message: "Doğrulama kodu gönderildi. Kod 2 dakika geçerlidir.",
      });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: "Kod gönderilemedi. Numarayı +905551112233 biçiminde kontrol edin.",
      }),
  });
  const confirmPhoneMutation = useMutation({
    mutationFn: (input: { phone: string; code: string }) => confirmPhoneVerification(input.phone, input.code),
    onSuccess: () => {
      setPendingPhone(null);
      setDevelopmentPhoneCode(null);
      void queryClient.invalidateQueries({
        queryKey: ["my-profile", user?.id],
      });
      setNotice({ tone: "success", message: "Telefon numaranız doğrulandı." });
    },
    onError: () => setNotice({ tone: "error", message: "Kod hatalı veya süresi dolmuş." }),
  });
  const privacyMutation = useMutation({
    mutationFn: updatePrivacySettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(["privacy-settings", user?.id], settings);
      setNotice({ tone: "success", message: "Gizlilik ayarları kaydedildi." });
    },
    onError: () => setNotice({ tone: "error", message: "Gizlilik ayarları kaydedilemedi." }),
  });
  const notificationPreferencesMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (preferences) => {
      queryClient.setQueryData(["notification-preferences", user?.id], preferences);
      setNotice({
        tone: "success",
        message: "Bildirim tercihleri kaydedildi.",
      });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: "Bildirim tercihleri kaydedilemedi.",
      }),
  });
  const removeBlockMutation = useMutation({
    mutationFn: (input: { targetType: "user" | "tag" | "event" | "place"; targetId: string }) => removeBlock(input.targetType, input.targetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blocks", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      setNotice({ tone: "success", message: "Engel kaldırıldı." });
    },
  });
  const followMutation = useMutation({
    mutationFn: (input: { userId: string; following: boolean }) => (input.following ? unfollowUser(input.userId) : followUser(input.userId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["following", user?.id] });
      void queryClient.invalidateQueries({
        queryKey: ["member-suggestions", user?.id],
      });
    },
  });
  const readNotificationMutation = useMutation({
    mutationFn: markMyNotificationRead,
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["my-notifications", user?.id],
      }),
  });

  function handleLogout() {
    clearUserSession();
    setUser(null);
    setNotice(null);
  }

  function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    authMutation.mutate({
      name: String(form.get("name") || ""),
      email: normalizeEmail(String(form.get("email"))),
      phone: normalizePhone(String(form.get("phone") || "")),
      password: String(form.get("password")),
      accountType: String(form.get("accountType") || "individual") as AccountType,
      companyName: String(form.get("companyName") || "") || undefined,
      tradeName: String(form.get("tradeName") || "") || undefined,
      companyType: String(form.get("companyType") || "") || undefined,
      businessCategory: String(form.get("businessCategory") || "") || undefined,
    });
  }

  function handleEventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const startsAt = String(form.get("startsAt"));
    const coverImageUrl = String(form.get("coverImageUrl") || "");
    const input: AdminEventInput = {
      title: String(form.get("title")),
      description: String(form.get("description")),
      startsAt: new Date(startsAt).toISOString(),
      format: String(form.get("format") || "online"),
      visibility: String(form.get("visibility") || "open"),
      status: "published",
      city: String(form.get("city") || ""),
      country: String(form.get("country") || ""),
      organizerName: user?.name ?? "Konnektora User",
      tagIds: form.getAll("tagIds").map(String),
    };

    if (coverImageUrl) {
      input.coverImageUrl = coverImageUrl;
    }

    eventMutation.mutate(input);
    event.currentTarget.reset();
  }

  function handleTagSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const description = String(form.get("description") || "").trim();

    if (!name) {
      return;
    }

    tagMutation.mutate({
      name,
      description: description || undefined,
    });
    event.currentTarget.reset();
  }

  function handleInterestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedTagIds = form.getAll("interestTagIds").map(String);
    interestsMutation.mutate(
      selectedTagIds.map((tagId) => ({
        tagId,
        sentiment: String(form.get(`sentiment:${tagId}`) || "like") as TagSentiment,
      })),
    );
  }

  function handleTagCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createTagCommentMutation.mutate(String(form.get("body") || "").trim());
    event.currentTarget.reset();
  }

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) || "").trim() || undefined;
    const birthDate = value("birthDate");
    profileMutation.mutate({
      name: String(form.get("name") || "").trim(),
      username: value("username"),
      phone: value("phone"),
      country: value("country"),
      city: value("city"),
      district: value("district"),
      address: value("address"),
      gender: value("gender") as "male" | "female" | undefined,
      birthDate: birthDate ? new Date(`${birthDate}T00:00:00.000Z`).toISOString() : undefined,
      website: normalizeWebsite(value("website")),
      companyName: value("companyName"),
      tradeName: value("tradeName"),
      companyType: value("companyType"),
      businessCategory: value("businessCategory"),
    });
  }

  function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") || "");
    const newPassword = String(form.get("newPassword") || "");
    const confirmation = String(form.get("newPasswordAgain") || "");
    if (newPassword !== confirmation) {
      setNotice({
        tone: "error",
        message: "Yeni şifreler birbiriyle eşleşmiyor.",
      });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  }

  function handleDeactivate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    deactivateMutation.mutate({
      currentPassword: String(form.get("currentPassword") || ""),
      reason: String(form.get("reason") || "").trim(),
    });
  }

  function handlePhoneRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    requestPhoneMutation.mutate(normalizePhone(String(new FormData(event.currentTarget).get("phone") || "")));
  }

  function handlePhoneConfirmation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingPhone) return;
    confirmPhoneMutation.mutate({
      phone: pendingPhone,
      code: String(new FormData(event.currentTarget).get("code") || ""),
    });
  }

  function handlePrivacySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const audience = (name: string) => String(form.get(name)) as PrivacyAudience;
    privacyMutation.mutate({
      messageAudience: audience("messageAudience"),
      directoryDiscoverable: form.get("directoryDiscoverable") === "true",
      eventAudience: audience("eventAudience"),
      eventInviteAudience: audience("eventInviteAudience"),
      placeAudience: audience("placeAudience"),
      placeInviteAudience: audience("placeInviteAudience"),
    });
  }

  function handleNotificationPreferencesSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const preferences = (notificationPreferencesQuery.data ?? []).map((preference) => ({
      topic: preference.topic,
      channel: String(form.get(preference.topic)) as NotificationPreference["channel"],
    }));
    notificationPreferencesMutation.mutate(preferences);
  }

  return (
    <section className="page account-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Community</p>
          <h1>Üye alanı</h1>
        </div>
        {user ? (
          <button className="secondary-action" onClick={handleLogout} type="button">
            <LogOut size={18} />
            Çıkış
          </button>
        ) : null}
      </div>

      {notice ? <p className={notice.tone === "success" ? "form-success" : "form-error"}>{notice.message}</p> : null}
      {showFrozenConfirmation ? (
        <div className="emotion-modal" role="dialog" aria-modal="true" aria-label="Hesap donduruldu">
          <div>
            <button aria-label="Kapat" onClick={() => {
              window.sessionStorage.removeItem("konnektora_account_frozen");
              setShowFrozenConfirmation(false);
            }} type="button">×</button>
            <h2>Hesap donduruldu</h2>
            <p>Oturumun güvenli biçimde kapatıldı. Dilediğin zaman giriş bilgilerinle hesabını yeniden aktifleştirebilirsin.</p>
          </div>
        </div>
      ) : null}
      {user?.status === "pending" ? (
        <button className="secondary-action" disabled={resendVerificationMutation.isPending} onClick={() => resendVerificationMutation.mutate(user.email)} type="button">
          Doğrulama emailini tekrar gönder
        </button>
      ) : null}

      {!user ? (
        <div className="account-grid">
          <div>
            <p className="lead">Üye hesabı oluştur, giriş yap ve Konnektora community içinde kendi etkinliğini yayınla.</p>
            {isMockApiMode ? <p className="form-help">Demo modunda üyelik ve etkinlikler bu tarayıcıya kaydedilir.</p> : null}
          </div>
          <form className="admin-form compact-form" onSubmit={handleAuthSubmit}>
            <div className="segmented-control" aria-label="Hesap modu">
              <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">
                Üye ol
              </button>
              <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
                Giriş yap
              </button>
            </div>
            {mode === "register" ? (
              <>
                <label>
                  Hesap türü
                  <select name="accountType" onChange={(event) => setRegistrationAccountType(event.target.value as AccountType)} value={registrationAccountType}>
                    <option value="individual">Bireysel</option>
                    <option value="corporate">Kurumsal</option>
                  </select>
                </label>
                <label>
                  {registrationAccountType === "corporate" ? "Yetkili kişi adı soyadı" : "Ad Soyad"}
                  <input autoComplete="name" name="name" placeholder="Kadir Erbakar" required minLength={2} />
                </label>
                {registrationAccountType === "corporate" ? (
                  <>
                    <label>
                      İşletme adı
                      <input name="companyName" placeholder="Konnektora" required minLength={2} maxLength={160} />
                    </label>
                    <label>
                      Ticari unvan
                      <input name="tradeName" placeholder="Konnektora Teknoloji Ltd." required minLength={2} maxLength={160} />
                    </label>
                    <label>
                      Şirket türü
                      <select name="companyType" required defaultValue="">
                        <option disabled value="">
                          Seçiniz
                        </option>
                        <option value="sole_proprietorship">Şahıs firması</option>
                        <option value="limited_or_corporation">Limited / Anonim</option>
                        <option value="association">Dernek</option>
                        <option value="foundation">Vakıf</option>
                        <option value="public_body">Kamu kurumu</option>
                        <option value="other">Diğer</option>
                      </select>
                    </label>
                    <label>
                      İşletme kategorisi
                      <select name="businessCategory" required defaultValue="">
                        <option disabled value="">
                          Seçiniz
                        </option>
                        <option value="event_organizer">Etkinlik organizatörü</option>
                        <option value="restaurant_bar_cafe">Restoran / Bar / Kafe</option>
                        <option value="night_club">Gece kulübü</option>
                        <option value="university_club">Üniversite kulübü</option>
                        <option value="ngo">STK</option>
                        <option value="brand">Marka</option>
                        <option value="tourism_company">Turizm şirketi</option>
                        <option value="sports_club">Spor kulübü</option>
                        <option value="other">Diğer</option>
                      </select>
                    </label>
                  </>
                ) : null}
              </>
            ) : null}
            <label>
              Email
              <EmailInput name="email" required />
              <span className="form-help">Örnek: ada@ornek.com</span>
            </label>
            {mode === "register" ? (
              <label>
                GSM numarası
                <PhoneInput name="phone" required />
                <span className="form-help">Hesabın açıldıktan sonra bu numarayı doğrulaman gerekir.</span>
              </label>
            ) : null}
            <label>
              Şifre
              <input autoComplete={mode === "login" ? "current-password" : "new-password"} maxLength={128} minLength={8} name="password" pattern={mode === "register" ? "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,128}" : undefined} required title={mode === "register" ? "En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam kullanın." : undefined} type="password" />
              {mode === "register" ? <span className="form-help">En az 8 karakter; bir büyük harf, bir küçük harf ve bir rakam içermeli.</span> : null}
            </label>
            {mode === "register" ? (
              <label className="check-row">
                <input required type="checkbox" />
                <span><Link to="/terms">Kullanım Koşullarını</Link> ve <Link to="/privacy">Gizlilik Politikasını</Link> kabul ediyorum.</span>
              </label>
            ) : null}
            <button className="primary-action" disabled={authMutation.isPending} type="submit">
              <UserRound size={18} />
              {mode === "register" ? "Üye ol" : "Giriş yap"}
            </button>
            {mode === "login" ? (
              <>
                <button
                  className="ghost-action"
                  disabled={forgotPasswordMutation.isPending}
                  onClick={() => {
                    const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]');
                    if (emailInput?.value) forgotPasswordMutation.mutate(emailInput.value);
                  }}
                  type="button"
                >
                  Şifremi unuttum
                </button>
                <button
                  className="ghost-action"
                  disabled={reactivateMutation.isPending}
                  onClick={() => {
                    const email = document.querySelector<HTMLInputElement>('input[name="email"]')?.value;
                    const password = document.querySelector<HTMLInputElement>('input[name="password"]')?.value;
                    if (email && password) reactivateMutation.mutate({ email, password });
                  }}
                  type="button"
                >
                  Dondurulmuş hesabı aktifleştir
                </button>
              </>
            ) : null}
            <SocialAuthButtons
              action={socialLogin}
              onSuccess={(response) => {
                setUserSession(response);
                setUser(response.user);
                setNotice({
                  tone: "success",
                  message: "Sosyal hesapla giriş yapıldı.",
                });
              }}
            />
          </form>
        </div>
      ) : (
        <div className="account-grid">
          <aside className="account-summary">
            {profileMediaQuery.data?.find((media) => media.isProfilePicture) ? <img alt={`${user.name} profil resmi`} className="profile-avatar-image" src={resolveMediaUrl(profileMediaQuery.data.find((media) => media.isProfilePicture)!.url)} /> : <UserRound size={28} />}
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <span>Rol: {user.role}</span>
            <span>Hesap: {user.accountType === "corporate" ? "Kurumsal" : "Bireysel"}</span>
            {interestTags.length > 0 ? (
              <div className="profile-tag-row">
                {interestTags.map((tag) => (
                  <span key={tag.id}>{tag.name}</span>
                ))}
              </div>
            ) : (
              <span>İlgi alanı seçilmedi</span>
            )}
          </aside>
          <div className="account-stack">
            <ProfileVerificationPanel userId={user.id} />
            <section className="admin-form">
              <h2>Bağlı hesaplar</h2>
              <p className="form-help">Google veya Facebook hesabını bağlayarak tek dokunuşla giriş yapabilirsin.</p>
              <div className="connected-account-list">
                {(["google", "facebook"] as SocialProvider[]).map((provider) => {
                  const account = socialAccountsQuery.data?.find((item) => item.provider === provider);
                  return (
                    <div key={provider}>
                      <span className="provider-letter">{provider === "google" ? "G" : "f"}</span>
                      <div>
                        <strong>{provider === "google" ? "Google" : "Facebook"}</strong>
                        <small>{account ? (account.email ?? account.displayName ?? "Bağlı") : "Bağlı değil"}</small>
                      </div>
                      <button
                        className="secondary-action"
                        disabled={socialAccountMutation.isPending}
                        onClick={() =>
                          socialAccountMutation.mutate({
                            provider,
                            remove: Boolean(account),
                          })
                        }
                        type="button"
                      >
                        {account ? "Bağlantıyı kaldır" : "Hesabı bağla"}
                      </button>
                    </div>
                  );
                })}
              </div>
              <Link className="ghost-action" to="/contacts">
                Rehberden arkadaş bul ve davet et
              </Link>
            </section>
            <ProfileMediaPanel media={profileMediaQuery.data ?? []} userId={user.id} />
            <MemberList members={followingQuery.data ?? []} title="Takip ettiklerim" onToggle={(member) => followMutation.mutate({ userId: member.id, following: true })} />
            <MemberList members={suggestionsQuery.data ?? []} title="Sana benzer üyeler" onToggle={(member) => followMutation.mutate({ userId: member.id, following: false })} />
            {profileQuery.data ? (
              <form className="admin-form" key={String(profileQuery.data.updatedAt)} onSubmit={handleProfileSubmit}>
                <h2>Profili düzenle</h2>
                <div className="form-grid">
                  <label>
                    {profileQuery.data.accountType === "corporate" ? "Yetkili kişi / görünen ad" : "Ad Soyad"}
                    <input defaultValue={profileQuery.data.name} name="name" required minLength={2} maxLength={160} />
                  </label>
                  <label>
                    Kullanıcı adı
                    <input defaultValue={profileQuery.data.username ?? ""} name="username" minLength={2} maxLength={80} pattern="[A-Za-zÀ-ž0-9 .-]+" onChange={(event) => {
                      const value = event.target.value.trim();
                      if (value.length < 2) return;
                      void checkAvailability({ username: value }).then((result) => setNotice({
                        tone: result.usernameAvailable || value === profileQuery.data?.username ? "success" : "error",
                        message: result.usernameAvailable || value === profileQuery.data?.username ? "Kullanıcı adı uygun." : "Kullanıcı adı kullanımda.",
                      }));
                    }} />
                  </label>
                  <label>
                    Telefon
                    <input defaultValue={profileQuery.data.phone ?? ""} name="phone" readOnly type="tel" />
                    <span className="form-help">{profileQuery.data.phoneVerified ? "Doğrulandı" : "Doğrulanmadı"}</span>
                  </label>
                  <label>
                    Web sitesi
                    <input defaultValue={profileQuery.data.website ?? ""} name="website" placeholder="ornek.com (isteğe bağlı)" />
                  </label>
                  <label>
                    Ülke
                    <input defaultValue={profileQuery.data.country ?? ""} name="country" />
                  </label>
                  <label>
                    Şehir
                    <input defaultValue={profileQuery.data.city ?? ""} name="city" />
                  </label>
                  {profileQuery.data.accountType === "individual" ? (
                    <>
                      <label>
                        Doğum tarihi
                        <input defaultValue={profileQuery.data.birthDate ? new Date(profileQuery.data.birthDate).toISOString().slice(0, 10) : ""} name="birthDate" type="date" />
                      </label>
                      <label>
                        Cinsiyet
                        <select defaultValue={profileQuery.data.gender ?? ""} name="gender">
                          <option value="">Belirtmek istemiyorum</option>
                          <option value="female">Kadın</option>
                          <option value="male">Erkek</option>
                        </select>
                      </label>
                    </>
                  ) : (
                    <>
                      <label>
                        İşletme adı
                        <input defaultValue={profileQuery.data.companyName ?? ""} name="companyName" required />
                      </label>
                      <label>
                        Ticari unvan
                        <input defaultValue={profileQuery.data.tradeName ?? ""} name="tradeName" required />
                      </label>
                      <label>
                        Şirket türü
                        <input defaultValue={profileQuery.data.companyType ?? ""} name="companyType" />
                      </label>
                      <label>
                        İşletme kategorisi
                        <input defaultValue={profileQuery.data.businessCategory ?? ""} name="businessCategory" />
                      </label>
                      <label>
                        İlçe
                        <input defaultValue={profileQuery.data.district ?? ""} name="district" />
                      </label>
                      <label>
                        Adres
                        <input defaultValue={profileQuery.data.address ?? ""} name="address" />
                      </label>
                    </>
                  )}
                </div>
                <button className="secondary-action" disabled={profileMutation.isPending} type="submit">
                  {profileMutation.isPending ? "Kaydediliyor" : "Profili kaydet"}
                </button>
              </form>
            ) : null}
            <form className="admin-form" onSubmit={pendingPhone ? handlePhoneConfirmation : handlePhoneRequest}>
              <h2>Telefon doğrulama</h2>
              {!pendingPhone ? (
                <label>
                  Yeni telefon numarası
                  <PhoneInput name="phone" pattern="\+?[0-9 ]{10,19}" required />
                  <span className="form-help">Örnek: +90 555 111 22 33</span>
                </label>
              ) : (
                <>
                  <p className="form-help">{pendingPhone} numarasına gönderilen 6 haneli kodu girin.</p>
                  {developmentPhoneCode ? <p className="form-help">Geliştirme kodu: {developmentPhoneCode}</p> : null}
                  <label>
                    Doğrulama kodu
                    <VerificationCodeInput defaultValue={developmentPhoneCode ?? ""} name="code" required />
                  </label>
                </>
              )}
              <button className="secondary-action" disabled={requestPhoneMutation.isPending || confirmPhoneMutation.isPending} type="submit">
                {pendingPhone ? "Numarayı doğrula" : "Kod gönder"}
              </button>
              {pendingPhone ? (
                <button
                  className="ghost-action"
                  onClick={() => {
                    setPendingPhone(null);
                    setDevelopmentPhoneCode(null);
                  }}
                  type="button"
                >
                  İptal
                </button>
              ) : null}
            </form>
            {privacyQuery.data ? (
              <form className="admin-form" key={String(privacyQuery.data.updatedAt ?? "privacy-defaults")} onSubmit={handlePrivacySubmit}>
                <h2>Gizlilik ayarları</h2>
                <p className="form-help">Network: takip ettikleriniz ve onların takip ettiği kişiler.</p>
                <PrivacyAudienceField defaultValue={privacyQuery.data.messageAudience} label="Kimler özel mesaj gönderebilir?" name="messageAudience" />
                <label>
                  Rehberinde kayıtlı olduğum üyeler beni bulabilsin
                  <select defaultValue={String(privacyQuery.data.directoryDiscoverable)} name="directoryDiscoverable">
                    <option value="true">Evet</option>
                    <option value="false">Hayır</option>
                  </select>
                </label>
                <PrivacyAudienceField defaultValue={privacyQuery.data.eventAudience} label="Etkinliklerimi kimler görebilir?" name="eventAudience" />
                <PrivacyAudienceField defaultValue={privacyQuery.data.eventInviteAudience} label="Kimler etkinliğe davet edebilir?" name="eventInviteAudience" />
                <PrivacyAudienceField defaultValue={privacyQuery.data.placeAudience} label="Mekânlarımı kimler görebilir?" name="placeAudience" />
                <PrivacyAudienceField defaultValue={privacyQuery.data.placeInviteAudience} label="Kimler mekâna davet edebilir?" name="placeInviteAudience" />
                <button className="secondary-action" disabled={privacyMutation.isPending} type="submit">
                  {privacyMutation.isPending ? "Kaydediliyor" : "Gizlilik ayarlarını kaydet"}
                </button>
              </form>
            ) : null}
            <section className="admin-form">
              <h2>Engellenenler</h2>
              {blocksQuery.data?.length ? (
                <div className="admin-list">
                  {blocksQuery.data.map((block) => (
                    <div className="admin-list-row" key={`${block.targetType}:${block.targetId}`}>
                      <div>
                        <strong>{block.label}</strong>
                        <span>
                          {block.targetType}
                          {block.subtitle ? ` · ${block.subtitle}` : ""}
                        </span>
                      </div>
                      <button className="ghost-action" disabled={removeBlockMutation.isPending} onClick={() => removeBlockMutation.mutate(block)} type="button">
                        Engeli kaldır
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Engellenen kullanıcı veya içerik yok.</p>
              )}
            </section>
            {notificationPreferencesQuery.data ? (
              <form className="admin-form" onSubmit={handleNotificationPreferencesSubmit}>
                <h2>Bildirim tercihleri</h2>
                <PushNotificationControl />
                <div className="form-grid">
                  {notificationPreferencesQuery.data.map((preference) => (
                    <label key={preference.topic}>
                      {notificationTopicLabels[preference.topic]}
                      <select defaultValue={preference.channel} name={preference.topic}>
                        <option value="none">Kapalı</option>
                        <option value="both">E-posta ve push</option>
                        <option value="email">Yalnız e-posta</option>
                        <option value="push">Yalnız push</option>
                      </select>
                    </label>
                  ))}
                </div>
                <button className="secondary-action" disabled={notificationPreferencesMutation.isPending} type="submit">
                  {notificationPreferencesMutation.isPending ? "Kaydediliyor" : "Bildirim tercihlerini kaydet"}
                </button>
              </form>
            ) : null}
            <form className="admin-form" onSubmit={handleChangePassword}>
              <h2>Şifre değiştir</h2>
              <label>
                Mevcut şifre
                <input autoComplete="current-password" minLength={8} name="currentPassword" required type="password" />
              </label>
              <div className="form-grid">
                <label>
                  Yeni şifre
                  <input autoComplete="new-password" maxLength={128} minLength={8} name="newPassword" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}" required type="password" />
                  <span className="form-help">En az 8 karakter; bir büyük harf, bir küçük harf ve bir rakam içermeli.</span>
                </label>
                <label>
                  Yeni şifre tekrar
                  <input autoComplete="new-password" maxLength={128} minLength={8} name="newPasswordAgain" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}" required type="password" />
                  <span className="form-help">Yukarıdaki güçlü şifreyle aynı olmalı.</span>
                </label>
              </div>
              <button className="secondary-action" disabled={changePasswordMutation.isPending} type="submit">
                {changePasswordMutation.isPending ? "Değiştiriliyor" : "Şifreyi değiştir"}
              </button>
            </form>
            <form className="admin-form" onSubmit={handleDeactivate}>
              <h2>Hesabı dondur</h2>
              <p className="form-help">Profiliniz ve tek yöneticisi olduğunuz içerikler yayından kaldırılır. Giriş bilgilerinizle hesabı yeniden açabilirsiniz.</p>
              <label>
                Mevcut şifre
                <input autoComplete="current-password" minLength={8} name="currentPassword" required type="password" />
              </label>
              <label>
                Ayrılma nedeni
                <textarea maxLength={1000} minLength={3} name="reason" required rows={3} />
              </label>
              <button className="secondary-action" disabled={deactivateMutation.isPending} type="submit">
                Hesabı dondur
              </button>
            </form>
            <section className="admin-form">
              <div className="section-header compact">
                <h2>Bildirimler</h2>
                <span>{notificationsQuery.data?.filter((item) => !item.readAt).length ?? 0} okunmamış</span>
              </div>
              {notificationsQuery.data?.length ? (
                <div className="admin-list">
                  {notificationsQuery.data.map((notification) => (
                    <div className="admin-list-row" key={notification.id}>
                      <div>
                        <strong>{notification.title}</strong>
                        <span><RichText text={notification.body} /></span>
                        <span>
                          {notification.createdAt
                            ? new Intl.DateTimeFormat("tr-TR", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(new Date(notification.createdAt))
                            : ""}
                        </span>
                      </div>
                      <span className={`status-pill status-${notification.readAt ? "resolved" : "open"}`}>{notification.readAt ? "Okundu" : "Yeni"}</span>
                      {!notification.readAt ? (
                        <button className="secondary-action" disabled={readNotificationMutation.isPending} onClick={() => readNotificationMutation.mutate(notification.id)} type="button">
                          Okundu yap
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Henüz bildirim yok.</p>
              )}
            </section>
            <form className="admin-form" onSubmit={handleTagSubmit}>
              <h2>Tag oluştur</h2>
              <p className="form-help">Var olan tag'leri önce arayıp öneriyoruz; yeni ihtiyaç varsa kullanıcılar direkt aktif tag oluşturabilir.</p>
              <div className="form-grid">
                <label>
                  Tag adı
                  <input name="name" placeholder="AI Builders" required minLength={2} maxLength={80} />
                </label>
              </div>
              <button className="secondary-action" disabled={tagMutation.isPending} type="submit">
                <Plus size={18} />
                {tagMutation.isPending ? "Oluşturuluyor" : "Tag oluştur"}
              </button>
            </form>
            <MyEventsPanel events={myEventsQuery.data ?? []} isLoading={myEventsQuery.isLoading} tags={tags} userId={user.id} />
            <form className="admin-form" onSubmit={handleInterestSubmit}>
              <h2>İlgi alanları</h2>
              <p className="form-help">Seçtiğin tag'ler profilinde görünür ve etkinlik oluştururken varsayılan seçili gelir.</p>
              <fieldset className="tag-fieldset">
                <legend>Tag'ler</legend>
                {tags.map((tag) => (
                  <label key={tag.id}>
                    <input defaultChecked={interestTagIds.includes(tag.id)} name="interestTagIds" type="checkbox" value={tag.id} />
                    {tag.name}
                    <select defaultValue={interestSentiments.get(tag.id) ?? "like"} name={`sentiment:${tag.id}`}>
                      <option value="like">Like</option>
                      <option value="ok">OK, no problem</option>
                      <option value="dislike">Dislike</option>
                    </select>
                  </label>
                ))}
              </fieldset>
              <button className="secondary-action" type="submit">
                {interestsMutation.isPending ? "Kaydediliyor" : "İlgi alanlarını kaydet"}
              </button>
            </form>
            <section className="admin-form">
              <h2>Tag yorumları</h2>
              <label>
                İlgi alanı
                <select onChange={(event) => setCommentTagId(event.target.value)} value={commentTagId}>
                  <option value="">Tag seçin</option>
                  {interestTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </label>
              {commentTagId ? (
                <>
                  <form className="compact-form" onSubmit={handleTagCommentSubmit}>
                    <label>
                      Yorumunuz
                      <textarea maxLength={1000} minLength={1} name="body" required rows={3} />
                    </label>
                    <button className="secondary-action" disabled={createTagCommentMutation.isPending} type="submit">
                      Yorum ekle
                    </button>
                  </form>
                  <div className="admin-list">
                    {tagCommentsQuery.data?.map((comment) => (
                      <div className="admin-list-row" key={comment.id}>
                        <div>
                          <strong>{comment.author?.username ? `@${comment.author.username}` : (comment.author?.name ?? "Silinmiş kullanıcı")}</strong>
                          <span><RichText text={comment.body} /></span>
                        </div>
                        {comment.canDelete ? (
                          <button className="ghost-action" onClick={() => deleteTagCommentMutation.mutate(comment.id)} type="button">
                            Sil
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="muted">Yorumları görmek için bir tag seçin.</p>
              )}
            </section>
            <form className="admin-form" onSubmit={handleEventSubmit}>
              <h2>Etkinlik oluştur</h2>
              <label>
                Başlık
                <input name="title" placeholder="Community Breakfast" required minLength={3} />
              </label>
              <label>
                Açıklama
                <textarea name="description" required minLength={10} rows={4} />
              </label>
              <div className="form-grid">
                <label>
                  Başlangıç
                  <input name="startsAt" required type="datetime-local" />
                </label>
                <label>
                  Format
                  <select name="format" defaultValue="offline">
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </label>
                <label>
                  Katılım tipi
                  <select name="visibility" defaultValue="open">
                    <option value="open">Open</option>
                    <option value="approval_required">Approval required</option>
                    <option value="invite_only">Invite only</option>
                  </select>
                </label>
                <label>
                  Şehir
                  <input name="city" placeholder="Istanbul" />
                </label>
                <label>
                  Ülke
                  <input name="country" placeholder="Turkey" />
                </label>
              </div>
              <label>
                Kapak görseli URL'si
                <input name="coverImageUrl" placeholder="https://images.unsplash.com/..." type="url" />
              </label>
              <fieldset className="tag-fieldset">
                <legend>Tag'ler</legend>
                {tags.map((tag) => (
                  <label key={tag.id}>
                    <input defaultChecked={interestTagIds.includes(tag.id)} name="tagIds" type="checkbox" value={tag.id} />
                    {tag.name}
                  </label>
                ))}
              </fieldset>
              <button className="secondary-action" disabled={eventMutation.isPending} type="submit">
                <Plus size={18} />
                Etkinlik yayınla
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

const notificationTopicLabels: Record<NotificationPreference["topic"], string> = {
  tag_request: "Profilime tag ekleme talebi",
  private_message: "Yeni özel mesaj",
  mention: "Gönderi veya yorumda bahsedilme",
  comment: "İçeriğime yeni yorum",
  password_changed: "Şifre değişikliği",
  email_changed: "E-posta değişikliği",
  phone_changed: "Telefon değişikliği",
  login: "Yeni giriş",
  admin_message: "Konnektora yönetim mesajı",
  event_invite: "Etkinlik daveti",
  event_manager: "Etkinlik yöneticisi atanma",
  place_invite: "Mekân daveti",
  place_manager: "Mekân yöneticisi atanma",
};

function MemberList({ members, onToggle, title }: { members: MemberCard[]; onToggle: (member: MemberCard) => void; title: string }) {
  return (
    <section className="admin-form">
      <div className="section-header compact">
        <h2>{title}</h2>
        <span>{members.length}</span>
      </div>
      {members.length ? (
        <div className="admin-list">
          {members.map((member) => (
            <div className="admin-list-row" key={member.id}>
              <div>
                <strong>{member.username ? `@${member.username}` : member.name}</strong>
                <span>
                  {member.commonTagCount} ortak ilgi alanı · {member.followerCount} takipçi
                </span>
                <span>{[member.city, member.country].filter(Boolean).join(", ")}</span>
              </div>
              <button className="secondary-action" onClick={() => onToggle(member)} type="button">
                {member.following ? "Takibi bırak" : "Takip et"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Gösterilecek üye yok.</p>
      )}
    </section>
  );
}

function PrivacyAudienceField({ defaultValue, label, name }: { defaultValue: PrivacyAudience; label: string; name: string }) {
  return (
    <label>
      {label}
      <select defaultValue={defaultValue} name={name}>
        <option value="everybody">Herkes</option>
        <option value="following">Takip ettiklerim</option>
        <option value="network">Takip ağım</option>
      </select>
    </label>
  );
}

function ProfileMediaPanel({ media, userId }: { media: ProfileMedia[]; userId: string }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["profile-media", userId] });
  const uploadMutation = useMutation({
    mutationFn: uploadProfileMedia,
    onSuccess: () => {
      setNotice({ tone: "success", message: "Medya albüme eklendi." });
      refresh();
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: "Medya yüklenemedi. Dosya türü ve 10 MB sınırını kontrol et.",
      }),
  });
  const profilePictureMutation = useMutation({
    mutationFn: makeProfilePicture,
    onSuccess: refresh,
    onError: () =>
      setNotice({
        tone: "error",
        message: "Bu medya profil resmi yapılamadı.",
      }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteProfileMedia,
    onSuccess: refresh,
    onError: () => setNotice({ tone: "error", message: "Son profil fotoğrafı silinemez." }),
  });
  const reorderMutation = useMutation({
    mutationFn: reorderProfileMedia,
    onSuccess: refresh,
    onError: () => setNotice({ tone: "error", message: "Albüm sırası değiştirilemedi." }),
  });
  const isPending = uploadMutation.isPending || profilePictureMutation.isPending || deleteMutation.isPending || reorderMutation.isPending;

  function moveMedia(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 1 || targetIndex >= media.length) return;
    const ids = media.map((item) => item.id);
    [ids[index], ids[targetIndex]] = [ids[targetIndex]!, ids[index]!];
    reorderMutation.mutate(ids);
  }

  return (
    <section className="admin-form">
      <div className="section-header compact">
        <h2>Profil fotoğrafları</h2>
        <span>{media.length} / 50 medya</span>
      </div>
      <form
        className="guest-invite-form"
        onSubmit={(event) => {
          event.preventDefault();
          const input = event.currentTarget.elements.namedItem("profileMedia") as HTMLInputElement;
          const files = Array.from(input.files ?? []).slice(0, Math.max(0, 50 - media.length));
          files.forEach((file) => uploadMutation.mutate(file));
          event.currentTarget.reset();
        }}
      >
        <label>
          Yeni fotoğraf veya video
          <input accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple name="profileMedia" required type="file" />
        </label>
        <button className="secondary-action" disabled={isPending || media.length >= 50} type="submit">
          <Image size={16} />
          {uploadMutation.isPending ? "Yükleniyor…" : "Albümüne yükle"}
        </button>
      </form>
      {media.length === 0 ? <p className="form-help">Profilini tamamlamak için ilk olarak bir fotoğraf yükle.</p> : null}
      {notice ? <p className={notice.tone === "success" ? "form-success" : "form-error"}>{notice.message}</p> : null}
      <div className="profile-media-grid">
        {media.map((item, index) => (
          <article className="profile-media-item" key={item.id}>
            {item.type === "image" ? <img alt={`Profil albümü ${index + 1}`} src={resolveMediaUrl(item.url)} /> : <video controls preload="metadata" src={resolveMediaUrl(item.url)} />}
            <strong>{item.isProfilePicture ? "Profil resmi" : `${index + 1}. medya`}</strong>
            <div className="row-actions">
              {!item.isProfilePicture && item.type === "image" ? (
                <button className="secondary-action" disabled={isPending} onClick={() => profilePictureMutation.mutate(item.id)} type="button">
                  Profil resmi yap
                </button>
              ) : null}
              {!item.isProfilePicture ? (
                <>
                  <button className="ghost-action" disabled={isPending || index <= 1} onClick={() => moveMedia(index, -1)} type="button">
                    ←
                  </button>
                  <button className="ghost-action" disabled={isPending || index >= media.length - 1} onClick={() => moveMedia(index, 1)} type="button">
                    →
                  </button>
                </>
              ) : null}
              <button className="danger-action" disabled={isPending} onClick={() => deleteMutation.mutate(item.id)} type="button">
                <Trash2 size={16} /> Sil
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function normalizeWebsite(value?: string) {
  if (!value) return undefined;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function MyEventsPanel({ events, isLoading, tags, userId }: { events: Event[]; isLoading: boolean; tags: Tag[]; userId: string }) {
  const queryClient = useQueryClient();
  const [guestListEventId, setGuestListEventId] = useState<string | null>(null);
  const updateMutation = useMutation({
    mutationFn: (input: { id: string; data: Partial<AdminEventInput> }) => updateMyEvent(input.id, input.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-events", userId] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
  const archiveMutation = useMutation({
    mutationFn: archiveMyEvent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-events", userId] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  return (
    <section className="admin-form">
      <div className="section-header compact">
        <h2>Etkinliklerim</h2>
        <span>{isLoading ? "Yükleniyor" : `${events.length} etkinlik`}</span>
      </div>
      {events.length === 0 && !isLoading ? <p className="muted">Henüz etkinlik oluşturmadın.</p> : null}
      <div className="admin-list">
        {events.map((event) => (
          <div className="admin-list-item" key={event.id}>
            <div className="admin-list-row">
              <div>
                <strong>{event.title}</strong>
                <span>
                  {event.status} ·{" "}
                  {new Intl.DateTimeFormat("tr-TR", {
                    dateStyle: "medium",
                  }).format(new Date(event.startsAt))}
                </span>
              </div>
              <span className="muted">{event.tags.map((tag) => tag.name).join(", ") || "Tag yok"}</span>
              <div className="row-actions">
                {event.status !== "published" && event.status !== "archived" ? (
                  <button
                    className="secondary-action"
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({
                        id: event.id,
                        data: { status: "published" },
                      })
                    }
                    type="button"
                  >
                    Yayınla
                  </button>
                ) : null}
                {event.status !== "draft" && event.status !== "archived" ? (
                  <button
                    className="secondary-action"
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({
                        id: event.id,
                        data: { status: "draft" },
                      })
                    }
                    type="button"
                  >
                    Taslak
                  </button>
                ) : null}
                <button className="secondary-action" onClick={() => setGuestListEventId((currentId) => (currentId === event.id ? null : event.id))} type="button">
                  <Users size={16} />
                  Guest list
                </button>
                {event.status !== "archived" ? (
                  <button className="danger-action" disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate(event.id)} type="button">
                    Arşivle
                  </button>
                ) : null}
              </div>
            </div>
            {guestListEventId === event.id ? <OrganizerGuestList eventId={event.id} /> : null}
          </div>
        ))}
      </div>
      {tags.length === 0 ? <p className="form-help">Etkinlik oluşturmak için önce bir tag ekleyebilirsin.</p> : null}
    </section>
  );
}

function OrganizerGuestList({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const participantsQuery = useQuery({
    queryKey: ["event-participants", eventId, "organizer"],
    queryFn: () => listEventParticipants(eventId, "user"),
  });
  const inviteMutation = useMutation({
    mutationFn: (input: { email: string; name?: string; role?: string }) => inviteEventParticipant(eventId, input, "user"),
    onSuccess: () => {
      setNotice({ tone: "success", message: "Davet guest list'e eklendi." });
      void queryClient.invalidateQueries({
        queryKey: ["event-participants", eventId, "organizer"],
      });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: "Davet eklenemedi. Email adresini kontrol et.",
      }),
  });
  const statusMutation = useMutation({
    mutationFn: (input: { userId: string; status: string }) => updateEventParticipantStatus(eventId, input.userId, input.status, "user"),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["event-participants", eventId, "organizer"],
      });
    },
  });
  const checkInMutation = useMutation({
    mutationFn: (userId: string) => checkInEventParticipant(eventId, userId, "user"),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["event-participants", eventId, "organizer"],
      });
    },
  });
  const ticketScanMutation = useMutation({
    mutationFn: (token: string) => scanEventTicket(eventId, token),
    onSuccess: () => {
      setNotice({
        tone: "success",
        message: "QR bilet doğrulandı; katılımcı giriş yaptı.",
      });
      void queryClient.invalidateQueries({
        queryKey: ["event-participants", eventId, "organizer"],
      });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: "QR bilet geçersiz, uygun değil veya daha önce kullanılmış.",
      }),
  });
  const participants = participantsQuery.data ?? [];

  function handleInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    inviteMutation.mutate({
      email: String(form.get("email")),
      name: String(form.get("name") || "") || undefined,
      role: String(form.get("role") || "attendee"),
    });
    event.currentTarget.reset();
  }

  function handleTicketScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const rawValue = String(new FormData(formElement).get("ticket") || "").trim();
    let token = rawValue;
    try {
      token = new URL(rawValue).searchParams.get("token") ?? rawValue;
    } catch {
      // Fiziksel tarayıcı yalnız token döndürüyorsa değer doğrudan kullanılabilir.
    }
    ticketScanMutation.mutate(token, { onSuccess: () => formElement.reset() });
  }

  return (
    <div className="guest-list-panel">
      <div className="guest-list-header">
        <strong>Guest list</strong>
        <span>{participantsQuery.isLoading ? "Yükleniyor" : `${participants.length} kişi`}</span>
      </div>
      <form className="guest-invite-form" onSubmit={handleInviteSubmit}>
        <label>
          Email
          <input name="email" placeholder="member@example.com" required type="email" />
        </label>
        <label>
          Ad
          <input name="name" placeholder="Opsiyonel" />
        </label>
        <label>
          Rol
          <select name="role" defaultValue="attendee">
            <option value="attendee">Attendee</option>
            <option value="manager">Manager</option>
          </select>
        </label>
        <button className="secondary-action" disabled={inviteMutation.isPending} type="submit">
          <Plus size={16} />
          Davet et
        </button>
      </form>
      <form className="guest-invite-form" onSubmit={handleTicketScan}>
        <label>
          QR bilet verisi
          <input name="ticket" placeholder="QR kodunu tara veya içeriğini yapıştır" required />
        </label>
        <button className="secondary-action" disabled={ticketScanMutation.isPending} type="submit">
          <ClipboardCheck size={16} />
          {ticketScanMutation.isPending ? "Doğrulanıyor" : "QR ile giriş"}
        </button>
      </form>
      {notice ? <p className={notice.tone === "success" ? "form-success" : "form-error"}>{notice.message}</p> : null}
      <div className="guest-list">
        {participants.map((participant) => (
          <OrganizerGuestListRow isPending={statusMutation.isPending || checkInMutation.isPending} key={participant.id} onCheckIn={() => checkInMutation.mutate(participant.userId)} onStatusChange={(status) => statusMutation.mutate({ userId: participant.userId, status })} participant={participant} />
        ))}
      </div>
    </div>
  );
}

function OrganizerGuestListRow({ isPending, onCheckIn, onStatusChange, participant }: { isPending: boolean; onCheckIn: () => void; onStatusChange: (status: string) => void; participant: EventParticipant }) {
  return (
    <div className="guest-list-row">
      <div>
        <strong>{participant.user?.name ?? "Community member"}</strong>
        <span>{participant.user?.email ?? participant.userId}</span>
      </div>
      <span className={`status-pill status-${participant.status}`}>{participant.status}</span>
      <span className="muted">{participant.role}</span>
      <div className="row-actions">
        {participant.status === "requested" ? (
          <>
            <button className="secondary-action" disabled={isPending} onClick={() => onStatusChange("accepted")} type="button">
              <Check size={16} />
              Kabul
            </button>
            <button className="danger-action" disabled={isPending} onClick={() => onStatusChange("declined")} type="button">
              <X size={16} />
              Ret
            </button>
          </>
        ) : null}
        {(participant.status === "accepted" || participant.status === "invited") && !participant.checkedInAt ? (
          <button className="secondary-action" disabled={isPending} onClick={onCheckIn} type="button">
            <ClipboardCheck size={16} />
            Check-in
          </button>
        ) : null}
        {participant.status !== "banned" && participant.status !== "attended" ? (
          <button className="ghost-action" disabled={isPending} onClick={() => onStatusChange("banned")} type="button">
            Ban
          </button>
        ) : null}
      </div>
    </div>
  );
}
