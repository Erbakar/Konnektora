import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  GripVertical,
  LogOut,
  Plus,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type {
  AccountType,
  Event,
  EventParticipant,
  MemberCard,
  NotificationPreference,
  PrivacyAudience,
  ProfileMedia,
  Tag,
  TagAffinity,
  TagSentiment,
  SocialProvider,
} from "@konnektora/shared";
import {
  EmailInput,
  PhoneInput,
  VerificationCodeInput,
} from "../components/FormInputs";
import { ServiceFeedback } from "../components/ServiceFeedback";
import { SocialAuthButtons } from "../components/SocialAuthButtons";
import { ProfileVerificationPanel } from "../components/ProfileVerificationPanel";
import { PushNotificationControl } from "../components/PushNotificationControl";
import { RichText } from "../components/RichText";
import { LocationPicker } from "../components/LocationPicker";
import { CountryCityFields } from "../components/CountryCityFields";
import { TagPicker } from "../components/TagPicker";
import { userProfilePath } from "../components/UserIdentityLink";
import { getSocialCredential } from "../lib/socialProviders";
import { normalizeEmail, normalizePhone } from "../lib/formats";
import { getServiceErrorMessage } from "../lib/serviceErrors";
import { useLanguage } from "../lib/i18n";
import {
  type AdminEventInput,
  type RegistrationInput,
  archiveMyEvent,
  checkAvailability,
  changeEmail,
  changePassword,
  connectSocialAccount,
  confirmPhoneVerification,
  clearUserSession,
  createUserEvent,
  createUserTag,
  createTagComment,
  deactivateAccount,
  deleteProfileMedia,
  deleteTagComment,
  getProfileAffinities,
  getMyProfile,
  getNotificationPreferences,
  getPrivacySettings,
  getUserSession,
  getUserToken,
  followUser,
  inviteEventParticipant,
  isMockApiMode,
  listMyNotifications,
  listBlocks,
  listFollowing,
  listMemberSuggestions,
  listEventParticipants,
  listMyEvents,
  listMyPlaces,
  listProfileMedia,
  listSocialAccounts,
  listTags,
  listTagComments,
  markMyNotificationRead,
  makeProfilePicture,
  registerUser,
  reactivateAccount,
  removeBlock,
  removeSocialAccount,
  requestEmailVerification,
  requestPhoneVerification,
  requestPasswordReset,
  reorderProfileMedia,
  resolveMediaUrl,
  setUserSession,
  updateEventParticipantStatus,
  updateMyEvent,
  updateProfileAffinities,
  unfollowUser,
  updateMyProfile,
  updateNotificationPreferences,
  updatePrivacySettings,
  uploadContentMedia,
  uploadProfileMedia,
  userLogin,
  socialLogin,
} from "../lib/api";

const timezoneOptions = [
  { value: "Pacific/Honolulu", label: "GMT-10 Honolulu" },
  { value: "America/Los_Angeles", label: "GMT-08 Los Angeles" },
  { value: "America/Denver", label: "GMT-07 Denver" },
  { value: "America/Chicago", label: "GMT-06 Chicago" },
  { value: "America/New_York", label: "GMT-05 New York" },
  { value: "America/Sao_Paulo", label: "GMT-03 São Paulo" },
  { value: "Europe/London", label: "GMT+00 London" },
  { value: "Europe/Paris", label: "GMT+01 Paris / Berlin" },
  { value: "Europe/Athens", label: "GMT+02 Athens" },
  { value: "Europe/Istanbul", label: "GMT+03 Istanbul" },
  { value: "Asia/Dubai", label: "GMT+04 Dubai" },
  { value: "Asia/Karachi", label: "GMT+05 Karachi" },
  { value: "Asia/Kolkata", label: "GMT+05:30 New Delhi" },
  { value: "Asia/Dhaka", label: "GMT+06 Dhaka" },
  { value: "Asia/Bangkok", label: "GMT+07 Bangkok" },
  { value: "Asia/Singapore", label: "GMT+08 Singapore" },
  { value: "Asia/Tokyo", label: "GMT+09 Tokyo" },
  { value: "Australia/Sydney", label: "GMT+10 Sydney" },
  { value: "Pacific/Auckland", label: "GMT+12 Auckland" },
  { value: "UTC", label: "GMT+00 UTC" },
] as const;
function profileTimezone(city?: string | null, country?: string | null) {
  const location = `${city ?? ""} ${country ?? ""}`.toLocaleLowerCase("tr-TR");
  if (/istanbul|ankara|izmir|antalya|türkiye|turkey/.test(location))
    return "Europe/Istanbul";
  if (/london|united kingdom|ingiltere/.test(location)) return "Europe/London";
  if (/berlin|germany|almanya|paris|france|fransa/.test(location))
    return "Europe/Paris";
  if (/new york|boston|washington/.test(location)) return "America/New_York";
  if (/los angeles|san francisco/.test(location)) return "America/Los_Angeles";
  if (/dubai|united arab emirates|bae/.test(location)) return "Asia/Dubai";
  if (/singapore|singapur/.test(location)) return "Asia/Singapore";
  if (/tokyo|japan|japonya/.test(location)) return "Asia/Tokyo";
  if (/sydney|australia|avustralya/.test(location)) return "Australia/Sydney";
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezoneOptions.some((item) => item.value === local) ? local : "UTC";
}

function toDateTimeLocal(value: string | Date) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function AccountPage({ initialMode = "register", eventCreator = false }: { initialMode?: "login" | "register"; eventCreator?: boolean }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => (language === "tr" ? tr : en);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(() => getUserSession());
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [registrationAccountType, setRegistrationAccountType] =
    useState<AccountType>("individual");
  const [passwordResetPath, setPasswordResetPath] = useState("");
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetChannel, setResetChannel] = useState<"email" | "phone">("email");
  const [showFrozenConfirmation, setShowFrozenConfirmation] = useState(
    () => window.sessionStorage.getItem("konnektora_account_frozen") === "1",
  );
  const [frozenCredentials, setFrozenCredentials] = useState<{ email: string; password: string } | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [developmentPhoneCode, setDevelopmentPhoneCode] = useState<
    string | null
  >(null);
  const [commentTagId, setCommentTagId] = useState("");
  const [eventFormat, setEventFormat] = useState("offline");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventStep, setEventStep] = useState(1);
  const [eventTicketCount, setEventTicketCount] = useState(1);
  const [ticketSalesPlatforms, setTicketSalesPlatforms] = useState<Array<"door" | "konnektora" | "external">>(["door"]);
  const [restrictedTicketPlatformIndex, setRestrictedTicketPlatformIndex] = useState<number | null>(null);
  const [lineupRows, setLineupRows] = useState<
    Array<{ id: string; type: "heading" | "subheading" | "session" }>
  >(() => [{ id: crypto.randomUUID(), type: "session" }]);
  const [draggedLineupId, setDraggedLineupId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => listTags(),
  });
  const myEventsQuery = useQuery({
    queryKey: ["my-events", user?.id],
    queryFn: listMyEvents,
    enabled: Boolean(user),
  });
  const editingEventId = eventCreator ? searchParams.get("edit") : null;
  const editingEvent = myEventsQuery.data?.find((item) => item.id === editingEventId);
  useEffect(() => {
    if (!editingEvent) return;
    setEventFormat(editingEvent.format);
    setEventStartsAt(toDateTimeLocal(editingEvent.startsAt));
    setLineupRows((editingEvent.lineup?.length ? editingEvent.lineup : [{ type: "session" as const }]).map((item) => ({ id: crypto.randomUUID(), type: item.type === "heading" || item.type === "subheading" ? item.type : "session" })));
    setEventTicketCount(Math.max(1, editingEvent.ticketTypes?.length ?? 0));
    setTicketSalesPlatforms(editingEvent.ticketTypes?.map((ticket) => ticket.salesPlatform ?? "door") ?? ["door"]);
  }, [editingEvent]);
  const myPlacesQuery = useQuery({ queryKey: ["my-places", user?.id], queryFn: listMyPlaces, enabled: Boolean(user) });
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
  const interestTagIds =
    interestsQuery.data?.map((affinity) => affinity.tag.id) ?? [];
  const interestSentiments = new Map(
    interestsQuery.data?.map((affinity) => [
      affinity.tag.id,
      affinity.sentiment,
    ]) ?? [],
  );
  const interestTags = tags.filter((tag) => interestTagIds.includes(tag.id));

  const authMutation = useMutation({
    mutationFn: (input: RegistrationInput) =>
      mode === "register"
        ? registerUser(input)
        : userLogin(input.email, input.password),
    onSuccess: (response) => {
      setUserSession(response);
      setUser(response.user);
      void queryClient.invalidateQueries({
        queryKey: ["profile-interests", response.user.id],
      });
      setNotice({
        tone: "success",
        message:
          response.user.status === "pending"
            ? response.verificationEmailSent === false
              ? t(
                  "Hesap oluşturuldu. E-posta teslim edilemediyse onboarding ekranındaki demo telefon koduyla devam edebilirsin.",
                  "Account created. If the email cannot be delivered, continue with the demo phone code on the onboarding screen.",
                )
              : t(
                  "Hesap oluşturuldu. E-posta doğrulama bağlantısını kontrol et.",
                  "Account created. Check your email verification link.",
                )
            : t(
                "Giriş yapıldı. Artık etkinlik oluşturabilirsin.",
                "You are signed in and can now create an event.",
              ),
      });
      const onboardingRequired = response.user.role === "user" && response.user.onboardingCompleted === false;
      navigate(mode === "login" && !onboardingRequired ? "/feed" : "/onboarding");
    },
    onError: (error, input) => {
      const rawMessage =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "";
      const message = getServiceErrorMessage(
        error,
        t(
          "İşlem tamamlanamadı. Bilgilerini kontrol edip yeniden dene.",
          "The action could not be completed. Check your details and try again.",
        ),
      );
      if (mode === "login" && /dondurulmuş hesap|frozen account/i.test(rawMessage)) {
        setFrozenCredentials({ email: input.email, password: input.password });
        return;
      }
      setNotice({ tone: "error", message });
    },
  });
  const socialAccountMutation = useMutation({
    mutationFn: async ({
      provider,
      remove = false,
    }: {
      provider: SocialProvider;
      remove?: boolean;
    }) =>
      remove
        ? removeSocialAccount(provider)
        : connectSocialAccount(provider, await getSocialCredential(provider)),
    onSuccess: (accounts) => {
      queryClient.setQueryData(["social-accounts", user?.id], accounts);
      setNotice({ tone: "success", message: t("Bağlı hesaplar güncellendi.", "Connected accounts were updated.") });
    },
    onError: (error) =>
      setNotice({
        tone: "error",
        message: getServiceErrorMessage(
          error,
          t("Bağlı hesap işlemi tamamlanamadı. Yeniden deneyebilirsin.", "The connected account action could not be completed. Try again."),
        ),
      }),
  });
  const forgotPasswordMutation = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: (response) => {
      setPasswordResetPath(response.token ? `/reset-password?token=${encodeURIComponent(response.token)}` : "");
      setForgotPasswordOpen(false);
      setNotice({
        tone: "success",
        message:
          resetChannel === "phone"
            ? t(
                "Şifre sıfırlama bağlantısı GSM numaranıza gönderildi.",
                "The password reset link was sent to your mobile number.",
              )
            : t(
                "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.",
                "The password reset link was sent to your email address.",
              ),
      });
    },
    onError: (error) =>
      setNotice({
        tone: "error",
        message: getServiceErrorMessage(
          error,
          t(
            "Şifre sıfırlama isteği gönderilemedi. Birkaç dakika sonra yeniden dene.",
            "The password reset request could not be sent. Try again in a few minutes.",
          ),
        ),
      }),
  });
  const reactivateMutation = useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      reactivateAccount(input.email, input.password),
    onSuccess: (response) => {
      setUserSession(response);
      setUser(response.user);
      setNotice({
        tone: "success",
        message: t(
          "Hesabınız yeniden aktifleştirildi.",
          "Your account has been reactivated.",
        ),
      });
      setFrozenCredentials(null);
      navigate("/");
    },
    onError: (error) =>
      setNotice({
        tone: "error",
        message: getServiceErrorMessage(
          error,
          t(
            "Dondurulmuş hesap bulunamadı veya şifre doğru değil.",
            "The frozen account could not be found or the password is incorrect.",
          ),
        ),
      }),
  });
  const resendVerificationMutation = useMutation({
    mutationFn: requestEmailVerification,
    onSuccess: (response) =>
      setNotice({
        tone: response.sent === false ? "error" : "success",
        message: response.sent === false
          ? t(
              "E-posta servisi şu an teslimatı kabul etmedi. Demo telefon koduyla devam edebilirsin.",
              "The email service did not accept delivery. You can continue with the demo phone code.",
            )
          : t(
              "Doğrulama e-postası tekrar gönderildi.",
              "The verification email was sent again.",
            ),
      }),
    onError: (error) =>
      setNotice({
        tone: "error",
        message: getServiceErrorMessage(
          error,
          t(
            "Doğrulama e-postası gönderilemedi. Birkaç dakika sonra yeniden dene.",
            "The verification email could not be sent. Try again in a few minutes.",
          ),
        ),
      }),
  });

  const eventMutation = useMutation({
    mutationFn: async (
      input: AdminEventInput & {
        managerUsernames?: string[];
        mediaFiles?: File[];
      },
    ) => {
      const { managerUsernames = [], mediaFiles = [], ...eventInput } = input;
      const created = editingEvent ? await updateMyEvent(editingEvent.id, eventInput) : await createUserEvent(eventInput);
      await Promise.allSettled([
        ...managerUsernames.map((username) =>
          inviteEventParticipant(
            created.id,
            { username, role: "manager" },
            "user",
          ),
        ),
        ...mediaFiles.map((file) =>
          uploadContentMedia("event", created.id, file),
        ),
      ]);
      return created;
    },
    onSuccess: (created) => {
      setNotice({
        tone: "success",
        message: editingEvent
          ? t("Etkinlik güncellendi.", "Event updated.")
          : t(
              "Etkinlik yayınlandı ve herkese açık listede görünür.",
              "Event published and visible in the public listing.",
            ),
      });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["my-events", user?.id] });
      navigate(`/events/${created.slug}`);
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: t(
          "Etkinlik oluşturulamadı. Zorunlu alanları kontrol et.",
          "The event could not be created. Check the required fields.",
        ),
      }),
  });
  const tagMutation = useMutation({
    mutationFn: createUserTag,
    onSuccess: (tag) => {
      setNotice({ tone: "success", message: t(`${tag.name} ilgi alanı hazır.`, `${tag.name} is ready.`) });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      void queryClient.invalidateQueries({ queryKey: ["tags", "home"] });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: t("İlgi alanı oluşturulamadı. Aynı isimde bir ilgi alanı olabilir.", "The interest could not be created. An interest with the same name may already exist."),
      }),
  });
  const interestsMutation = useMutation({
    mutationFn: updateProfileAffinities,
    onSuccess: (affinities) => {
      queryClient.setQueryData<TagAffinity[]>(
        ["profile-interests", user?.id],
        affinities,
      );
      void queryClient.invalidateQueries({
        queryKey: ["member-suggestions", user?.id],
      });
      setNotice({ tone: "success", message: t("İlgi alanların kaydedildi.", "Your interests were saved.") });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: t("İlgi alanları kaydedilemedi. Lütfen tekrar dene.", "Your interests could not be saved. Please try again."),
      }),
  });
  const createTagCommentMutation = useMutation({
    mutationFn: (body: string) => createTagComment(commentTagId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["tag-comments", commentTagId],
      });
      setNotice({ tone: "success", message: t("İlgi alanı yorumunuz eklendi.", "Your interest comment was added.") });
    },
    onError: () =>
      setNotice({ tone: "error", message: t("İlgi alanı yorumu eklenemedi.", "The interest comment could not be added.") }),
  });
  const deleteTagCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      deleteTagComment(commentTagId, commentId),
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
      setNotice({ tone: "success", message: t("Profil bilgileri kaydedildi.", "Profile details were saved.") });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: t("Profil kaydedilemedi. Kullanıcı adı ve zorunlu alanları kontrol et.", "The profile could not be saved. Check the username and required fields."),
      }),
  });
  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () =>
      setNotice({ tone: "success", message: t("Şifreniz değiştirildi.", "Your password was changed.") }),
    onError: () =>
      setNotice({
        tone: "error",
        message: t("Şifre değiştirilemedi. Mevcut şifrenizi kontrol edin.", "The password could not be changed. Check your current password."),
      }),
  });
  const changeEmailMutation = useMutation({
    mutationFn: changeEmail,
    onSuccess: (response) => {
      if (user) {
        const updatedUser = { ...user, email: response.email, emailVerified: false };
        setUserSession({ accessToken: getUserToken() ?? "", user: updatedUser });
        setUser(updatedUser);
      }
      void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      setNotice({ tone: "success", message: response.sent ? t("E-posta adresi değiştirildi. Yeni adresine gönderilen doğrulama bağlantısını aç.", "Your email was changed. Open the verification link sent to your new address.") : t("E-posta adresi değiştirildi ancak doğrulama iletisi gönderilemedi.", "Your email was changed, but the verification message could not be delivered.") });
    },
    onError: () => setNotice({ tone: "error", message: t("E-posta değiştirilemedi. Adresin kullanılmadığını ve mevcut şifreni kontrol et.", "The email could not be changed. Check that the address is available and verify your current password.") }),
  });
  const deactivateMutation = useMutation({
    mutationFn: deactivateAccount,
    onSuccess: () => {
      clearUserSession();
      window.sessionStorage.setItem("konnektora_account_frozen", "1");
      window.location.assign("/login");
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: t("Hesap dondurulamadı. Mevcut şifrenizi kontrol edin.", "The account could not be frozen. Check your current password."),
      }),
  });
  const requestPhoneMutation = useMutation({
    mutationFn: requestPhoneVerification,
    onSuccess: (response, phone) => {
      setPendingPhone(phone);
      setDevelopmentPhoneCode(response.demoCode ?? response.developmentCode ?? null);
      setNotice({
        tone: "success",
        message: response.demoCode
          ? t("Demo doğrulama kodu oluşturuldu. Kodu aşağıdaki alana girin.", "A demo verification code was generated. Enter it below.")
          : t("Doğrulama kodu gönderildi. Kod 2 dakika geçerlidir.", "The verification code was sent and is valid for 2 minutes."),
      });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: t("Kod gönderilemedi. Numarayı +905551112233 biçiminde kontrol edin.", "The code could not be sent. Check the number in +905551112233 format."),
      }),
  });
  const confirmPhoneMutation = useMutation({
    mutationFn: (input: { phone: string; code: string }) =>
      confirmPhoneVerification(input.phone, input.code),
    onSuccess: () => {
      setPendingPhone(null);
      setDevelopmentPhoneCode(null);
      void queryClient.invalidateQueries({
        queryKey: ["my-profile", user?.id],
      });
      setNotice({ tone: "success", message: t("Telefon numaranız doğrulandı.", "Your phone number was verified.") });
    },
    onError: () =>
      setNotice({ tone: "error", message: t("Kod hatalı veya süresi dolmuş.", "The code is incorrect or has expired.") }),
  });
  const privacyMutation = useMutation({
    mutationFn: updatePrivacySettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(["privacy-settings", user?.id], settings);
      setNotice({ tone: "success", message: t("Gizlilik ayarları kaydedildi.", "Privacy settings were saved.") });
    },
    onError: () =>
      setNotice({ tone: "error", message: t("Gizlilik ayarları kaydedilemedi.", "Privacy settings could not be saved.") }),
  });
  const notificationPreferencesMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (preferences) => {
      queryClient.setQueryData(
        ["notification-preferences", user?.id],
        preferences,
      );
      setNotice({
        tone: "success",
        message: t("Bildirim tercihleri kaydedildi.", "Notification preferences were saved."),
      });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: t("Bildirim tercihleri kaydedilemedi.", "Notification preferences could not be saved."),
      }),
  });
  const removeBlockMutation = useMutation({
    mutationFn: (input: {
      targetType: "user" | "tag" | "event" | "place";
      targetId: string;
    }) => removeBlock(input.targetType, input.targetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blocks", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      setNotice({ tone: "success", message: t("Engel kaldırıldı.", "The block was removed.") });
    },
  });
  const followMutation = useMutation({
    mutationFn: (input: { userId: string; following: boolean }) =>
      input.following ? unfollowUser(input.userId) : followUser(input.userId),
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
      accountType: String(
        form.get("accountType") || "individual",
      ) as AccountType,
      companyName: String(form.get("companyName") || "") || undefined,
      tradeName: String(form.get("tradeName") || "") || undefined,
      companyType: String(form.get("companyType") || "") || undefined,
      businessCategory: String(form.get("businessCategory") || "") || undefined,
    });
  }

  function handleEventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalidControl = Array.from(event.currentTarget.elements).find(
      (
        element,
      ): element is
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement
          ? !element.checkValidity()
          : false,
    );
    if (invalidControl) {
      const invalidStep = Number(
        invalidControl.closest<HTMLElement>("[data-event-step]")?.dataset
          .eventStep || 1,
      );
      setEventStep(invalidStep);
      setNotice({
        tone: "error",
        message: t(
          `Lütfen ${invalidStep}. adımdaki zorunlu alanları kontrol edin.`,
          `Check the required fields in step ${invalidStep}.`,
        ),
      });
      window.setTimeout(() => invalidControl.reportValidity(), 0);
      return;
    }
    const form = new FormData(event.currentTarget);
    const startsAt = String(form.get("startsAt"));
    const endsAt = String(form.get("endsAt") || "");
    const eventTagIds = form.getAll("tagIds").map(String);
    if (eventTagIds.length > 10) {
      setNotice({
        tone: "error",
        message: t(
          "Bir etkinliğe en fazla 10 etiket ekleyebilirsiniz.",
          "You can add up to 10 tags to an event.",
        ),
      });
      return;
    }
    if (
      !startsAt ||
      Number.isNaN(new Date(startsAt).getTime()) ||
      (!editingEvent && new Date(startsAt).getTime() < Date.now()) ||
      (endsAt && new Date(endsAt) <= new Date(startsAt))
    ) {
      setNotice({
        tone: "error",
        message: t(
          "Başlangıç gelecekte olmalı; bitiş zamanı başlangıçtan sonra olmalıdır.",
          "The start must be in the future and the end must be after the start.",
        ),
      });
      return;
    }
    const address = String(form.get("locationAddress") || "").trim();
    const coordinateMatch = address.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    const parsedLatitude = coordinateMatch ? Number(coordinateMatch[1]) : undefined;
    const parsedLongitude = coordinateMatch ? Number(coordinateMatch[2]) : undefined;
    const input: AdminEventInput & {
      managerUsernames?: string[];
      mediaFiles?: File[];
    } = {
      title: String(form.get("title")),
      description: String(form.get("description")),
      startsAt: new Date(startsAt).toISOString(),
      timezone: String(form.get("timezone") || "Europe/Istanbul"),
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      format: String(form.get("format") || "online"),
      visibility: String(form.get("visibility") || "open"),
      placeId: String(form.get("placeId") || "") || undefined,
      status: "published",
      city: String(form.get("city") || ""),
      country: String(form.get("country") || ""),
      latitude: form.get("latitude") ? Number(form.get("latitude")) : parsedLatitude,
      longitude: form.get("longitude")
        ? Number(form.get("longitude"))
        : parsedLongitude,
      locationName: String(form.get("locationName") || "") || undefined,
      locationAddress: address || undefined,
      organizerName: user?.name ?? "Konnektora User",
      tagIds: eventTagIds,
      liveUrl: String(form.get("liveUrl") || "") || undefined,
      lineup: form
        .getAll("lineupTitle")
        .map((title, index) => {
          const type = String(form.getAll("lineupType")[index] || "session") as
            "heading" | "subheading" | "session";
          const startsAt = String(form.getAll("lineupStartsAt")[index] || "");
          return {
            type,
            title: String(title).trim(),
            startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
          };
        })
        .filter((item) => item.title),
      ticketTypes: form
        .getAll("ticketName")
        .map((name, index) => {
          const value = (field: string) =>
            String(form.getAll(field)[index] || "");
          return {
            name: String(name).trim(),
            description: value("ticketDescription") || undefined,
            price: Number(value("ticketPrice") || 0),
            currency: value("ticketCurrency") || "TRY",
            salesPlatform: (value("ticketSalesPlatform") || "door") as "door" | "konnektora" | "external",
            externalSalesUrl: value("ticketExternalSalesUrl") || undefined,
            capacity: Number(value("ticketCapacity") || 0) || undefined,
            perUserLimit: Number(value("ticketPerUserLimit") || 0) || undefined,
            saleStartsAt: value("ticketSaleStartsAt")
              ? new Date(value("ticketSaleStartsAt")).toISOString()
              : undefined,
            saleEndsAt: value("ticketSaleEndsAt")
              ? new Date(value("ticketSaleEndsAt")).toISOString()
              : undefined,
            gateOpensAt: value("ticketGateOpensAt")
              ? new Date(value("ticketGateOpensAt")).toISOString()
              : undefined,
            gateClosesAt: value("ticketGateClosesAt")
              ? new Date(value("ticketGateClosesAt")).toISOString()
              : undefined,
            status: value("ticketStatus") || "active",
          };
        })
        .filter((item) => item.name),
      managerUsernames: String(form.get("managerUsernames") || "")
        .split(",")
        .map((item) => item.trim().replace(/^@/, ""))
        .filter(Boolean),
      mediaFiles: form
        .getAll("eventMedia")
        .filter((item): item is File => item instanceof File && item.size > 0)
        .slice(0, 20),
    };

    const primaryTicket = input.ticketTypes?.[0];
    if (primaryTicket) {
      input.price = primaryTicket.price;
      input.currency = primaryTicket.currency;
      input.capacity = primaryTicket.capacity;
    }

    eventMutation.mutate(input);
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
        sentiment: String(
          form.get(`sentiment:${tagId}`) || "like",
        ) as TagSentiment,
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
    const value = (name: string) =>
      String(form.get(name) || "").trim() || undefined;
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
      birthDate: birthDate
        ? new Date(`${birthDate}T00:00:00.000Z`).toISOString()
        : undefined,
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

  function handleChangeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    changeEmailMutation.mutate({
      email: normalizeEmail(String(form.get("email") || "")),
      currentPassword: String(form.get("currentPassword") || ""),
    });
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
    requestPhoneMutation.mutate(
      normalizePhone(
        String(new FormData(event.currentTarget).get("phone") || ""),
      ),
    );
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
    const audience = (name: string) =>
      String(form.get(name)) as PrivacyAudience;
    privacyMutation.mutate({
      messageAudience: audience("messageAudience"),
      directoryDiscoverable: form.get("directoryDiscoverable") === "true",
      eventAudience: audience("eventAudience"),
      eventInviteAudience: audience("eventInviteAudience"),
      placeAudience: audience("placeAudience"),
      placeInviteAudience: audience("placeInviteAudience"),
      profileNameAudience: audience("profileNameAudience"),
      demographicsAudience: audience("demographicsAudience"),
      locationAudience: audience("locationAudience"),
      websiteAudience: audience("websiteAudience"),
      businessAudience: privacyQuery.data?.businessAudience ?? "everybody",
      addressAudience: form.has("addressAudience") ? audience("addressAudience") : privacyQuery.data?.addressAudience ?? "everybody",
      tradeNameAudience: form.has("tradeNameAudience") ? audience("tradeNameAudience") : privacyQuery.data?.tradeNameAudience ?? "everybody",
    });
  }

  function handleNotificationPreferencesSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const preferences = (notificationPreferencesQuery.data ?? []).map(
      (preference) => ({
        topic: preference.topic,
        channel: String(
          form.get(preference.topic),
        ) as NotificationPreference["channel"],
      }),
    );
    notificationPreferencesMutation.mutate(preferences);
  }

  return (
    <section className={`page account-page${eventCreator ? " event-create-only" : ""}${eventCreator && !user ? " event-create-unauthenticated" : ""}`}>
      {!eventCreator || !user ? <div className="section-header">
        <div>
          <p className="eyebrow">Konnektora</p>
          <h1>
            {eventCreator
              ? user
                ? editingEvent
                  ? t("Etkinliği düzenle", "Edit event")
                  : t("Etkinlik oluştur", "Create event")
                : t(
                    "Etkinlik oluşturmak için giriş yap",
                    "Sign in to create an event",
                  )
              : t("Üye alanı", "Member area")}
          </h1>
        </div>
        {user ? (
          <button
            className="secondary-action"
            onClick={handleLogout}
            type="button"
          >
            <LogOut size={18} />
            {t("Çıkış", "Log out")}
          </button>
        ) : null}
      </div> : null}

      {notice ? (
        <ServiceFeedback
          compact
          message={notice.message}
          tone={notice.tone}
        />
      ) : null}
      {passwordResetPath ? <Link className="primary-action" to={passwordResetPath}>{t("Demo şifre sıfırlama bağlantısını aç", "Open demo password reset link")}</Link> : null}
      {showFrozenConfirmation ? (
        <div
          className="emotion-modal"
          role="dialog"
          aria-modal="true"
          aria-label={t("Hesap donduruldu", "Account frozen")}
        >
          <div>
            <button
              aria-label={t("Kapat", "Close")}
              onClick={() => {
                window.sessionStorage.removeItem("konnektora_account_frozen");
                setShowFrozenConfirmation(false);
              }}
              type="button"
            >
              ×
            </button>
            <h2>{t("Hesap donduruldu", "Account frozen")}</h2>
            <p>
              {t(
                "Oturumun güvenli biçimde kapatıldı. Dilediğin zaman giriş bilgilerinle hesabını yeniden aktifleştirebilirsin.",
                "Your session was closed securely. You can reactivate your account with your sign-in details at any time.",
              )}
            </p>
          </div>
        </div>
      ) : null}
      {frozenCredentials ? <div className="emotion-modal" role="dialog" aria-modal="true" aria-label={t("Hesabı yeniden aktifleştir", "Reactivate account")}><div><h2>{t("Tekrar hoş geldin!", "Welcome back!")}</h2><p>{t("Dondurduğun hesabı yeniden aktifleştirmek istiyor musun?", "Would you like to reactivate your frozen account?")}</p><div className="row-actions"><button className="ghost-action" onClick={() => setFrozenCredentials(null)} type="button">{t("İptal", "Cancel")}</button><button className="primary-action" disabled={reactivateMutation.isPending} onClick={() => reactivateMutation.mutate(frozenCredentials)} type="button">{t("Hesabı aktifleştir", "Reactivate account")}</button></div>{reactivateMutation.isError ? <ServiceFeedback compact error={reactivateMutation.error} fallback={t("Hesap yeniden aktifleştirilemedi.", "The account could not be reactivated.")}/> : null}</div></div> : null}
      {user?.status === "pending" ? (
        <button
          className="secondary-action"
          disabled={resendVerificationMutation.isPending}
          onClick={() => resendVerificationMutation.mutate(user.email)}
          type="button"
        >
          {t("Doğrulama e-postasını tekrar gönder", "Resend verification email")}
        </button>
      ) : null}

      {!user ? (
        <div className="account-grid">
          <div>
            <p className="lead">
              {t(
                "Üye hesabı oluştur, giriş yap ve Konnektora topluluğunda kendi etkinliğini yayınla.",
                "Create a member account, sign in and publish your own event in the Konnektora community.",
              )}
            </p>
            {isMockApiMode ? (
              <p className="form-help">
                {t(
                  "Demo modunda üyelik ve etkinlikler bu tarayıcıya kaydedilir.",
                  "In demo mode, memberships and events are stored in this browser.",
                )}
              </p>
            ) : null}
          </div>
          <form className="admin-form compact-form" onSubmit={handleAuthSubmit}>
            <div className="segmented-control" aria-label={t("Hesap modu", "Account mode")}>
              <button
                className={mode === "register" ? "active" : ""}
                onClick={() => setMode("register")}
                type="button"
              >
                {t("Üye ol", "Sign up")}
              </button>
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => setMode("login")}
                type="button"
              >
                {t("Giriş yap", "Sign in")}
              </button>
            </div>
            {mode === "register" ? (
              <>
                <label>
                  {t("Hesap türü", "Account type")}
                  <select
                    name="accountType"
                    onChange={(event) =>
                      setRegistrationAccountType(
                        event.target.value as AccountType,
                      )
                    }
                    value={registrationAccountType}
                  >
                    <option value="individual">{t("Bireysel", "Individual")}</option>
                    <option value="corporate">{t("Kurumsal", "Corporate")}</option>
                  </select>
                </label>
                <label>
                  {registrationAccountType === "corporate"
                    ? t("Yetkili kişi adı soyadı", "Authorised representative's full name")
                    : t("Ad Soyad", "Full name")}
                  <input
                    autoComplete="name"
                    name="name"
                    placeholder="Kadir Erbakar"
                    required
                    minLength={2}
                  />
                </label>
                {registrationAccountType === "corporate" ? (
                  <>
                    <label>
                      {t("İşletme adı", "Business name")}
                      <input
                        name="companyName"
                        placeholder="Konnektora"
                        required
                        minLength={2}
                        maxLength={160}
                      />
                    </label>
                    <label>
                      {t("Ticari unvan", "Registered business name")}
                      <input
                        name="tradeName"
                        placeholder="Konnektora Teknoloji Ltd."
                        required
                        minLength={2}
                        maxLength={160}
                      />
                    </label>
                    <label>
                      {t("Şirket türü", "Company type")}
                      <select name="companyType" required defaultValue="">
                        <option disabled value="">
                          {t("Seçiniz", "Select")}
                        </option>
                        <option value="sole_proprietorship">
                          {t("Şahıs firması", "Sole proprietorship")}
                        </option>
                        <option value="limited_or_corporation">
                          {t("Limited / Anonim", "Limited company / corporation")}
                        </option>
                        <option value="association">{t("Dernek", "Association")}</option>
                        <option value="foundation">{t("Vakıf", "Foundation")}</option>
                        <option value="public_body">{t("Kamu kurumu", "Public body")}</option>
                        <option value="other">{t("Diğer", "Other")}</option>
                      </select>
                    </label>
                    <label>
                      {t("İşletme kategorisi", "Business category")}
                      <select name="businessCategory" required defaultValue="">
                        <option disabled value="">
                          {t("Seçiniz", "Select")}
                        </option>
                        <option value="event_organizer">
                          {t("Etkinlik organizatörü", "Event organiser")}
                        </option>
                        <option value="restaurant_bar_cafe">
                          {t("Restoran / Bar / Kafe", "Restaurant / Bar / Café")}
                        </option>
                        <option value="night_club">{t("Gece kulübü", "Nightclub")}</option>
                        <option value="university_club">
                          {t("Üniversite kulübü", "University club")}
                        </option>
                        <option value="ngo">{t("STK", "NGO")}</option>
                        <option value="brand">{t("Marka", "Brand")}</option>
                        <option value="tourism_company">{t("Turizm şirketi", "Tourism company")}</option>
                        <option value="sports_club">{t("Spor kulübü", "Sports club")}</option>
                        <option value="other">{t("Diğer", "Other")}</option>
                      </select>
                    </label>
                  </>
                ) : null}
              </>
            ) : null}
            <label>
              {t("E-posta", "Email")}
              <EmailInput name="email" required />
              <span className="form-help">{t("Örnek: ada@ornek.com", "Example: ada@example.com")}</span>
            </label>
            {mode === "register" ? (
              <label>
                {t("GSM numarası", "Mobile number")}
                <PhoneInput name="phone" required />
                <span className="form-help">
                  {t(
                    "Hesabın açıldıktan sonra bu numarayı doğrulaman gerekir.",
                    "You will need to verify this number after creating your account.",
                  )}
                </span>
              </label>
            ) : null}
            <label>
              {t("Şifre", "Password")}
              <input
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                maxLength={128}
                minLength={8}
                name="password"
                pattern={
                  mode === "register"
                    ? "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,128}"
                    : undefined
                }
                required
                title={
                  mode === "register"
                    ? t(
                        "En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam kullanın.",
                        "Use at least 8 characters with an uppercase letter, a lowercase letter and a number.",
                      )
                    : undefined
                }
                type="password"
              />
              {mode === "register" ? (
                <span className="form-help">
                  {t(
                    "En az 8 karakter; bir büyük harf, bir küçük harf ve bir rakam içermeli.",
                    "At least 8 characters, including an uppercase letter, a lowercase letter and a number.",
                  )}
                </span>
              ) : null}
            </label>
            {mode === "register" ? (
              <label className="check-row">
                <input required type="checkbox" />
                <span>
                  <Link to="/terms">{t("Kullanım Koşullarını", "Terms of Use")}</Link>{" "}
                  {t("ve", "and")}{" "}
                  <Link to="/privacy">{t("Gizlilik Politikasını", "Privacy Policy")}</Link>{" "}
                  {t("kabul ediyorum.", "I accept.")}
                </span>
              </label>
            ) : null}
            <button
              className="primary-action"
              disabled={authMutation.isPending}
              type="submit"
            >
              <UserRound size={18} />
              {mode === "register" ? t("Üye ol", "Sign up") : t("Giriş yap", "Sign in")}
            </button>
            {mode === "login" ? (
              <>
                <button
                  className="ghost-action"
                  disabled={forgotPasswordMutation.isPending}
                  onClick={() => setForgotPasswordOpen(true)}
                  type="button"
                >
                  {t("Şifremi unuttum", "Forgot password")}
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
                  message: t(
                    "Sosyal hesapla giriş yapıldı.",
                    "Signed in with your social account.",
                  ),
                });
                navigate(response.user.status === "pending" ? "/onboarding" : "/feed");
              }}
            />
          </form>
          {forgotPasswordOpen ? <div className="dialog-backdrop" role="presentation" onMouseDown={() => setForgotPasswordOpen(false)}><form aria-modal="true" className="content-dialog password-reset-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            if (resetChannel === "phone") forgotPasswordMutation.mutate({ channel: "phone", phone: normalizePhone(String(form.get("resetPhone") || "")) });
            else forgotPasswordMutation.mutate({ channel: "email", email: normalizeEmail(String(form.get("resetEmail") || "")) });
          }} role="dialog"><div className="section-header"><div><p className="eyebrow">{t("Hesap kurtarma", "Account recovery")}</p><h2>{t("Şifrenizi nasıl sıfırlayalım?", "How would you like to reset your password?")}</h2></div><button onClick={() => setForgotPasswordOpen(false)} type="button">{t("Kapat", "Close")}</button></div><div className="reset-channel-options"><label><input checked={resetChannel === "email"} name="resetChannel" onChange={() => setResetChannel("email")} type="radio"/> {t("E-posta", "Email")}</label><label><input checked={resetChannel === "phone"} name="resetChannel" onChange={() => setResetChannel("phone")} type="radio"/> {t("GSM", "Mobile")}</label></div>{resetChannel === "email" ? <label>{t("E-posta adresi", "Email address")}<EmailInput autoComplete="email" name="resetEmail" required/></label> : <label>{t("GSM numarası", "Mobile number")}<PhoneInput autoComplete="tel" name="resetPhone" required/></label>}<button className="primary-action" disabled={forgotPasswordMutation.isPending}>{forgotPasswordMutation.isPending ? t("Gönderiliyor…", "Sending…") : t("Sıfırlama bağlantısı gönder", "Send reset link")}</button>{forgotPasswordMutation.isError ? <ServiceFeedback error={forgotPasswordMutation.error} fallback={t("Şifre sıfırlama isteği gönderilemedi.", "The password reset request could not be sent.")}/> : null}</form></div> : null}
        </div>
      ) : (
        <div className="account-grid">
          <aside className="account-summary">
            {profileMediaQuery.data?.find((media) => media.isProfilePicture) ? (
              <img
                alt={t(`${user.name} profil resmi`, `${user.name} profile picture`)}
                className="profile-avatar-image"
                src={resolveMediaUrl(
                  profileMediaQuery.data.find(
                    (media) => media.isProfilePicture,
                  )!.url,
                )}
              />
            ) : (
              <UserRound size={28} />
            )}
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <span>{t("Rol", "Role")}: {translateParticipationRole(user.role, language)}</span>
            <span>
              {t("Hesap", "Account")}:{" "}
              {user.accountType === "corporate" ? t("Kurumsal", "Corporate") : t("Bireysel", "Individual")}
            </span>
            {interestTags.length > 0 ? (
              <div className="profile-tag-row">
                {interestTags.map((tag) => (
                  <span key={tag.id}>{tag.name}</span>
                ))}
              </div>
            ) : (
              <span>{t("İlgi alanı seçilmedi", "No interests selected")}</span>
            )}
          </aside>
          <div className="account-stack">
            <ProfileVerificationPanel userId={user.id} />
            <section className="admin-form">
              <h2>{t("Bağlı hesaplar", "Connected accounts")}</h2>
              <p className="form-help">
                {t("Google veya Facebook hesabını bağlayarak tek dokunuşla giriş yapabilirsin.", "Connect your Google or Facebook account for one-tap sign-in.")}
              </p>
              <div className="connected-account-list">
                {(["google", "facebook"] as SocialProvider[]).map(
                  (provider) => {
                    const account = socialAccountsQuery.data?.find(
                      (item) => item.provider === provider,
                    );
                    return (
                      <div key={provider}>
                        <span className="provider-letter">
                          {provider === "google" ? "G" : "f"}
                        </span>
                        <div>
                          <strong>
                            {provider === "google" ? "Google" : "Facebook"}
                          </strong>
                          <small>
                            {account
                              ? (account.email ??
                                account.displayName ??
                                t("Bağlı", "Connected"))
                              : t("Bağlı değil", "Not connected")}
                          </small>
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
                          {account ? t("Bağlantıyı kaldır", "Disconnect") : t("Hesabı bağla", "Connect account")}
                        </button>
                      </div>
                    );
                  },
                )}
              </div>
              <Link className="ghost-action" to="/contacts">
                {t("Rehberden arkadaş bul ve davet et", "Find and invite friends from contacts")}
              </Link>
            </section>
            <ProfileMediaPanel
              media={profileMediaQuery.data ?? []}
              userId={user.id}
            />
            <MemberList
              members={followingQuery.data ?? []}
              title={t("Takip ettiklerim", "Following")}
              onToggle={(member) =>
                followMutation.mutate({ userId: member.id, following: true })
              }
            />
            <MemberList
              members={suggestionsQuery.data ?? []}
              title={t("Sana benzer üyeler", "Members like you")}
              onToggle={(member) =>
                followMutation.mutate({ userId: member.id, following: false })
              }
            />
            {profileQuery.data ? (
              <form
                className="admin-form"
                id="profile"
                key={String(profileQuery.data.updatedAt)}
                onSubmit={handleProfileSubmit}
              >
                <h2>{t("Profili düzenle", "Edit profile")}</h2>
                <div className="form-grid">
                  <label>
                    {profileQuery.data.accountType === "corporate"
                      ? t("Yetkili kişi / görünen ad", "Authorised representative / display name")
                      : t("Ad Soyad", "Full name")}
                    <input
                      defaultValue={profileQuery.data.name}
                      name="name"
                      required
                      minLength={2}
                      maxLength={160}
                    />
                  </label>
                  <label>
                    {t("Kullanıcı adı", "Username")}
                    <input
                      defaultValue={profileQuery.data.username ?? ""}
                      name="username"
                      minLength={2}
                      maxLength={80}
                      pattern="[A-Za-zÀ-ž0-9 .-]+"
                      onChange={(event) => {
                        const value = event.target.value.trim();
                        if (value.length < 2) return;
                        void checkAvailability({ username: value }).then(
                          (result) =>
                            setNotice({
                              tone:
                                result.usernameAvailable ||
                                value === profileQuery.data?.username
                                  ? "success"
                                  : "error",
                              message:
                                result.usernameAvailable ||
                                value === profileQuery.data?.username
                                  ? t("Kullanıcı adı uygun.", "Username is available.")
                                  : t("Kullanıcı adı kullanımda.", "Username is already in use."),
                            }),
                        );
                      }}
                    />
                  </label>
                  <label>
                    {t("Web sitesi", "Website")}
                    <input
                      defaultValue={profileQuery.data.website ?? ""}
                      name="website"
                      placeholder={t("ornek.com (isteğe bağlı)", "example.com (optional)")}
                    />
                  </label>
                  <CountryCityFields defaultCity={profileQuery.data.city} defaultCountry={profileQuery.data.country}/>
                  {profileQuery.data.accountType === "individual" ? (
                    <>
                      <label>
                        {t("Doğum tarihi", "Date of birth")}
                        <input
                          defaultValue={
                            profileQuery.data.birthDate
                              ? new Date(profileQuery.data.birthDate)
                                  .toISOString()
                                  .slice(0, 10)
                              : ""
                          }
                          name="birthDate"
                          type="date"
                        />
                      </label>
                      <label>
                        {t("Cinsiyet", "Gender")}
                        <select
                          defaultValue={profileQuery.data.gender ?? ""}
                          name="gender"
                        >
                          <option value="">{t("Belirtmek istemiyorum", "Prefer not to say")}</option>
                          <option value="female">{t("Kadın", "Female")}</option>
                          <option value="male">{t("Erkek", "Male")}</option>
                        </select>
                      </label>
                    </>
                  ) : (
                    <>
                      <label>
                        {t("İşletme adı", "Business name")}
                        <input
                          defaultValue={profileQuery.data.companyName ?? ""}
                          name="companyName"
                          required
                        />
                      </label>
                      <label>
                        {t("Ticari unvan", "Trading name")}
                        <input
                          defaultValue={profileQuery.data.tradeName ?? ""}
                          name="tradeName"
                          required
                        />
                      </label>
                      <label>
                        {t("Şirket türü", "Company type")}
                        <input
                          defaultValue={profileQuery.data.companyType ?? ""}
                          name="companyType"
                        />
                      </label>
                      <label>
                        {t("İşletme kategorisi", "Business category")}
                        <input
                          defaultValue={
                            profileQuery.data.businessCategory ?? ""
                          }
                          name="businessCategory"
                        />
                      </label>
                      <label>
                        {t("İlçe", "District")}
                        <input
                          defaultValue={profileQuery.data.district ?? ""}
                          name="district"
                        />
                      </label>
                      <label>
                        {t("Adres", "Address")}
                        <input
                          defaultValue={profileQuery.data.address ?? ""}
                          name="address"
                        />
                      </label>
                    </>
                  )}
                </div>
                <button
                  className="secondary-action"
                  disabled={profileMutation.isPending}
                  type="submit"
                >
                  {profileMutation.isPending
                    ? t("Kaydediliyor", "Saving")
                    : t("Profili kaydet", "Save profile")}
                </button>
              </form>
            ) : null}
            <form className="admin-form" id="account-email" onSubmit={handleChangeEmail}>
              <h2>{t("Hesap e-postası", "Account email")}</h2>
              <p className="form-help">{t("Mevcut e-posta adresin", "Your current email address")}: <strong>{user.email}</strong></p>
              <div className="form-grid">
                <label>
                  {t("Yeni e-posta adresi", "New email address")}
                  <EmailInput autoComplete="email" name="email" required />
                </label>
                <label>
                  {t("Mevcut şifre", "Current password")}
                  <input autoComplete="current-password" minLength={8} name="currentPassword" required type="password" />
                </label>
              </div>
              <button className="secondary-action" disabled={changeEmailMutation.isPending} type="submit">{changeEmailMutation.isPending ? t("Değiştiriliyor", "Changing") : t("E-postayı değiştir", "Change email")}</button>
            </form>
            <form
              className="admin-form phone-verification-form"
              id="account-settings"
              onSubmit={
                pendingPhone ? handlePhoneConfirmation : handlePhoneRequest
              }
            >
              <h2>{t("Telefon doğrulama", "Phone verification")}</h2>
              {!pendingPhone ? (
                <label>
                  {t("Yeni telefon numarası", "New phone number")}
                  <PhoneInput
                    name="phone"
                    pattern="\+?[0-9 ]{10,19}"
                    required
                  />
                  <span className="form-help">{t("Örnek: +90 555 111 22 33", "Example: +44 7700 900123")}</span>
                </label>
              ) : (
                <>
                  <p className="form-help">
                    {t(`${pendingPhone} numarasına gönderilen 6 haneli kodu girin.`, `Enter the 6-digit code sent to ${pendingPhone}.`)}
                  </p>
                  {developmentPhoneCode ? (
                    <div className="demo-verification-code" role="status">
                      <span>{t("Demo doğrulama kodun", "Your demo verification code")}</span>
                      <strong>{developmentPhoneCode}</strong>
                      <p>{t("Kodu aşağıdaki alana kendin gir.", "Enter the code in the field below.")}</p>
                    </div>
                  ) : null}
                  <label>
                    {t("Doğrulama kodu", "Verification code")}
                    <VerificationCodeInput
                      name="code"
                      required
                    />
                  </label>
                </>
              )}
              <button
                className="secondary-action"
                disabled={
                  requestPhoneMutation.isPending ||
                  confirmPhoneMutation.isPending
                }
                type="submit"
              >
                {pendingPhone ? t("Numarayı doğrula", "Verify number") : t("Kod gönder", "Send code")}
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
                  {t("İptal", "Cancel")}
                </button>
              ) : null}
            </form>
            {privacyQuery.data ? (
              <form
                className="admin-form"
                id="privacy"
                key={String(privacyQuery.data.updatedAt ?? "privacy-defaults")}
                onSubmit={handlePrivacySubmit}
              >
                <h2>{t("Gizlilik ayarları", "Privacy settings")}</h2>
                <p className="form-help">
                  {t("Ağ: takip ettikleriniz ve onların takip ettiği kişiler.", "Network: people you follow and the people they follow.")}
                </p>
                <PrivacyAudienceField
                  defaultValue={privacyQuery.data.messageAudience}
                  label={t("Kimler özel mesaj gönderebilir?", "Who can send me private messages?")}
                  name="messageAudience"
                  allowNobody={false}
                />
                <label>
                  {t("Arkadaşlarım beni aramada bulabilsin", "Allow my friends to find me in search")}
                  <select
                    defaultValue={String(
                      privacyQuery.data.directoryDiscoverable,
                    )}
                    name="directoryDiscoverable"
                  >
                    <option value="true">{t("Evet", "Yes")}</option>
                    <option value="false">{t("Hayır", "No")}</option>
                  </select>
                </label>
                <PrivacyAudienceField
                  defaultValue={privacyQuery.data.eventAudience}
                  label={t("Etkinliklerimi kimler görebilir?", "Who can see my events?")}
                  name="eventAudience"
                />
                <PrivacyAudienceField
                  defaultValue={privacyQuery.data.eventInviteAudience}
                  label={t("Kimler etkinliğe davet edebilir?", "Who can invite me to events?")}
                  name="eventInviteAudience"
                  allowNobody={false}
                />
                <PrivacyAudienceField
                  defaultValue={privacyQuery.data.placeAudience}
                  label={t("Mekânlarımı kimler görebilir?", "Who can see my places?")}
                  name="placeAudience"
                />
                <PrivacyAudienceField
                  defaultValue={privacyQuery.data.placeInviteAudience}
                  label={t("Kimler mekâna davet edebilir?", "Who can invite me to places?")}
                  name="placeInviteAudience"
                  allowNobody={false}
                />
                <h3>{t("Profil bilgileri", "Profile information")}</h3>
                <PrivacyAudienceField defaultValue={privacyQuery.data.profileNameAudience} label={t("Adımı kimler görebilir?", "Who can see my name?")} name="profileNameAudience" />
                <PrivacyAudienceField defaultValue={privacyQuery.data.demographicsAudience} label={t("Yaş ve cinsiyetimi kimler görebilir?", "Who can see my age and gender?")} name="demographicsAudience" />
                <PrivacyAudienceField defaultValue={privacyQuery.data.locationAudience} label={profileQuery.data?.accountType === "corporate" ? t("Profilimde kayıtlı şehri kimler görebilir?", "Who can see the city saved on my profile?") : t("Profilimde kayıtlı şehri kimler görebilir?", "Who can see the city saved on my profile?")} name="locationAudience" />
                <PrivacyAudienceField defaultValue={privacyQuery.data.websiteAudience} label={t("Web adresimi kimler görebilir?", "Who can see my website?")} name="websiteAudience" />
                {profileQuery.data?.accountType === "corporate" ? <>
                  <PrivacyAudienceField defaultValue={privacyQuery.data.addressAudience} label={t("Profilimde kayıtlı adresimi kimler görebilir?", "Who can see the address saved on my profile?")} name="addressAudience" />
                  <PrivacyAudienceField defaultValue={privacyQuery.data.tradeNameAudience} label={t("Ticari unvanımı kimler görebilir?", "Who can see my registered business name?")} name="tradeNameAudience" />
                </> : null}
                <button
                  className="secondary-action"
                  disabled={privacyMutation.isPending}
                  type="submit"
                >
                  {privacyMutation.isPending
                    ? t("Kaydediliyor", "Saving")
                    : t("Gizlilik ayarlarını kaydet", "Save privacy settings")}
                </button>
              </form>
            ) : null}
            <section className="admin-form">
              <h2>{t("Engellenenler", "Blocked")}</h2>
              {blocksQuery.data?.length ? (
                <div className="admin-list">
                  {blocksQuery.data.map((block) => (
                    <div
                      className="admin-list-row"
                      key={`${block.targetType}:${block.targetId}`}
                    >
                      <div>
                        <strong>{block.label}</strong>
                        <span>
                          {block.targetType}
                          {block.subtitle ? ` · ${block.subtitle}` : ""}
                        </span>
                      </div>
                      <button
                        className="ghost-action"
                        disabled={removeBlockMutation.isPending}
                        onClick={() => removeBlockMutation.mutate(block)}
                        type="button"
                      >
                        {t("Engeli kaldır", "Unblock")}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">{t("Engellenen kullanıcı veya içerik yok.", "There are no blocked members or content.")}</p>
              )}
            </section>
            {notificationPreferencesQuery.data ? (
              <form
                className="admin-form"
                id="notifications"
                onSubmit={handleNotificationPreferencesSubmit}
              >
                <h2>{t("Bildirim tercihleri", "Notification preferences")}</h2>
                <PushNotificationControl />
                <div className="form-grid">
                  {notificationPreferencesQuery.data.map((preference) => (
                    <label key={preference.topic}>
                      {notificationTopicLabel(preference.topic, language)}
                      <select
                        defaultValue={preference.channel}
                        name={preference.topic}
                      >
                        <option value="none">{t("Kapalı", "Off")}</option>
                        <option value="both">{t("E-posta ve push", "Email and push")}</option>
                        <option value="email">{t("Yalnız e-posta", "Email only")}</option>
                        <option value="push">{t("Yalnız push", "Push only")}</option>
                      </select>
                    </label>
                  ))}
                </div>
                <button
                  className="secondary-action"
                  disabled={notificationPreferencesMutation.isPending}
                  type="submit"
                >
                  {notificationPreferencesMutation.isPending
                    ? t("Kaydediliyor", "Saving")
                    : t("Bildirim tercihlerini kaydet", "Save notification preferences")}
                </button>
              </form>
            ) : null}
            <form className="admin-form" onSubmit={handleChangePassword}>
              <h2>{t("Şifre değiştir", "Change password")}</h2>
              <label>
                {t("Mevcut şifre", "Current password")}
                <input
                  autoComplete="current-password"
                  minLength={8}
                  name="currentPassword"
                  required
                  type="password"
                />
              </label>
              <div className="form-grid">
                <label>
                  {t("Yeni şifre", "New password")}
                  <input
                    autoComplete="new-password"
                    maxLength={128}
                    minLength={8}
                    name="newPassword"
                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}"
                    required
                    type="password"
                  />
                  <span className="form-help">
                    {t("En az 8 karakter; bir büyük harf, bir küçük harf ve bir rakam içermeli.", "Use at least 8 characters with an uppercase letter, a lowercase letter and a number.")}
                  </span>
                </label>
                <label>
                  {t("Yeni şifre tekrar", "Confirm new password")}
                  <input
                    autoComplete="new-password"
                    maxLength={128}
                    minLength={8}
                    name="newPasswordAgain"
                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}"
                    required
                    type="password"
                  />
                  <span className="form-help">
                    {t("Yukarıdaki güçlü şifreyle aynı olmalı.", "It must match the strong password above.")}
                  </span>
                </label>
              </div>
              <button
                className="secondary-action"
                disabled={changePasswordMutation.isPending}
                type="submit"
              >
                {changePasswordMutation.isPending
                  ? t("Değiştiriliyor", "Changing")
                  : t("Şifreyi değiştir", "Change password")}
              </button>
            </form>
            <form className="admin-form" onSubmit={handleDeactivate}>
              <h2>{t("Hesabı dondur", "Freeze account")}</h2>
              <p className="form-help">
                {t("Profiliniz ve tek yöneticisi olduğunuz içerikler yayından kaldırılır. Giriş bilgilerinizle hesabı yeniden açabilirsiniz.", "Your profile and content for which you are the sole manager will be unpublished. You can reactivate the account with your sign-in details.")}
              </p>
              <label>
                {t("Mevcut şifre", "Current password")}
                <input
                  autoComplete="current-password"
                  minLength={8}
                  name="currentPassword"
                  required
                  type="password"
                />
              </label>
              <label>
                {t("Ayrılma nedeni", "Reason for leaving")}
                <textarea
                  maxLength={1000}
                  minLength={3}
                  name="reason"
                  required
                  rows={3}
                />
              </label>
              <button
                className="secondary-action"
                disabled={deactivateMutation.isPending}
                type="submit"
              >
                {t("Hesabı dondur", "Freeze account")}
              </button>
            </form>
            <section className="admin-form">
              <div className="section-header compact">
                <h2>{t("Bildirimler", "Notifications")}</h2>
                <span>
                  {notificationsQuery.data?.filter((item) => !item.readAt)
                    .length ?? 0}{" "}
                  {t("okunmamış", "unread")}
                </span>
              </div>
              {notificationsQuery.data?.length ? (
                <div className="admin-list">
                  {notificationsQuery.data.map((notification) => (
                    <div className="admin-list-row" key={notification.id}>
                      <div>
                        <strong>{notification.title}</strong>
                        <span>
                          <RichText text={notification.body} />
                        </span>
                        <span>
                          {notification.createdAt
                            ? new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(new Date(notification.createdAt))
                            : ""}
                        </span>
                      </div>
                      <span
                        className={`status-pill status-${notification.readAt ? "resolved" : "open"}`}
                      >
                        {notification.readAt ? t("Okundu", "Read") : t("Yeni", "New")}
                      </span>
                      {!notification.readAt ? (
                        <button
                          className="secondary-action"
                          disabled={readNotificationMutation.isPending}
                          onClick={() =>
                            readNotificationMutation.mutate(notification.id)
                          }
                          type="button"
                        >
                          {t("Okundu yap", "Mark as read")}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">{t("Henüz bildirim yok.", "There are no notifications yet.")}</p>
              )}
            </section>
            <form className="admin-form" onSubmit={handleTagSubmit}>
              <h2>{t("İlgi alanı oluştur", "Create an interest")}</h2>
              <p className="form-help">
                {t("Önce mevcut ilgi alanlarını arayıp öneriyoruz; ihtiyaç varsa doğrudan yeni bir ilgi alanı oluşturabilirsin.", "We suggest existing interests first; if needed, you can create a new active interest directly.")}
              </p>
              <div className="form-grid">
                <label>
                  {t("İlgi alanı adı", "Interest name")}
                  <input
                    name="name"
                    placeholder="AI Builders"
                    required
                    minLength={2}
                    maxLength={80}
                  />
                </label>
              </div>
              <button
                className="secondary-action"
                disabled={tagMutation.isPending}
                type="submit"
              >
                <Plus size={18} />
                {tagMutation.isPending ? t("Oluşturuluyor", "Creating") : t("İlgi alanı oluştur", "Create interest")}
              </button>
            </form>
            <MyEventsPanel
              events={myEventsQuery.data ?? []}
              isLoading={myEventsQuery.isLoading}
              tags={tags}
              userId={user.id}
            />
            <form className="admin-form" id="interests" onSubmit={handleInterestSubmit}>
              <h2>{t("İlgi alanları", "Interests")}</h2>
              <p className="form-help">
                {t("Seçtiğin ilgi alanları profilinde görünür ve etkinlik oluştururken varsayılan seçili gelir.", "Your selected interests appear on your profile and are selected by default when creating an event.")}
              </p>
              <fieldset className="tag-fieldset">
                <legend>{t("İlgi alanları", "Interests")}</legend>
                {tags.map((tag) => (
                  <label key={tag.id}>
                    <input
                      defaultChecked={interestTagIds.includes(tag.id)}
                      name="interestTagIds"
                      type="checkbox"
                      value={tag.id}
                    />
                    {tag.name}
                    <select
                      defaultValue={interestSentiments.get(tag.id) ?? "like"}
                      name={`sentiment:${tag.id}`}
                    >
                      <option value="like">{t("Beğeniyorum", "Like")}</option>
                      <option value="ok">{t("Fikrim yok", "Neutral")}</option>
                      <option value="dislike">{t("İlgilenmiyorum", "Not interested")}</option>
                    </select>
                  </label>
                ))}
              </fieldset>
              <button className="secondary-action" type="submit">
                {interestsMutation.isPending
                  ? t("Kaydediliyor", "Saving")
                  : t("İlgi alanlarını kaydet", "Save interests")}
              </button>
            </form>
            <section className="admin-form">
              <h2>{t("İlgi alanı yorumları", "Interest comments")}</h2>
              <label>
                {t("İlgi alanı", "Interest")}
                <select
                  onChange={(event) => setCommentTagId(event.target.value)}
                  value={commentTagId}
                >
                  <option value="">{t("İlgi alanı seçin", "Choose an interest")}</option>
                  {interestTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </label>
              {commentTagId ? (
                <>
                  <form
                    className="compact-form"
                    onSubmit={handleTagCommentSubmit}
                  >
                    <label>
                      {t("Yorumunuz", "Your comment")}
                      <textarea
                        maxLength={1000}
                        minLength={1}
                        name="body"
                        required
                        rows={3}
                      />
                    </label>
                    <button
                      className="secondary-action"
                      disabled={createTagCommentMutation.isPending}
                      type="submit"
                    >
                      {t("Yorum ekle", "Add comment")}
                    </button>
                  </form>
                  <div className="admin-list">
                    {tagCommentsQuery.data?.map((comment) => (
                      <div className="admin-list-row" key={comment.id}>
                        <div>
                          <strong>
                            {comment.author?.username
                              ? `@${comment.author.username}`
                              : (comment.author?.name ?? t("Silinmiş kullanıcı", "Deleted member"))}
                          </strong>
                          <span>
                            <RichText text={comment.body} />
                          </span>
                        </div>
                        {comment.canDelete ? (
                          <button
                            className="ghost-action"
                            onClick={() =>
                              deleteTagCommentMutation.mutate(comment.id)
                            }
                            type="button"
                          >
                            {t("Sil", "Delete")}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="muted">{t("Yorumları görmek için bir ilgi alanı seçin.", "Choose an interest to view its comments.")}</p>
              )}
            </section>
            <form
              className="admin-form event-create-form"
              key={editingEvent?.id ?? "new-event"}
              noValidate
              onSubmit={handleEventSubmit}
            >
              {eventCreator ? (
                <h1>
                  {editingEvent
                    ? t("Etkinliği düzenle", "Edit event")
                    : t("Etkinlik oluştur", "Create event")}
                </h1>
              ) : (
                <h2>
                  {editingEvent
                    ? t("Etkinliği düzenle", "Edit event")
                    : t("Etkinlik oluştur", "Create event")}
                </h2>
              )}
              <div
                className="event-stepper"
                aria-label={t("Etkinlik oluşturma adımları", "Event creation steps")}
              >
                {[1, 2, 3, 4, 5, 6].map((step) => (
                  <button
                    className={eventStep === step ? "active" : ""}
                    key={step}
                    onClick={() => setEventStep(step)}
                    type="button"
                    aria-label={t(`Adım ${step}`, `Step ${step}`)}
                  >
                    {step}
                  </button>
                ))}
              </div>
              <div data-event-step="1" hidden={eventStep !== 1}>
                <h3>{t("Adım 1: Temel bilgiler", "Step 1: Basic information")}</h3>
                <label>
                  {t("Başlık", "Title")}
                  <input
                    defaultValue={editingEvent?.title}
                    name="title"
                    placeholder="Community Breakfast"
                    required
                    minLength={3}
                  />
                </label>
                <label>
                  {t("Açıklama", "Description")}
                  <textarea
                    defaultValue={editingEvent?.description}
                    name="description"
                    required
                    minLength={10}
                    rows={4}
                  />
                </label>
                <div className="form-grid">
                  <label className="event-timezone-field">
                    {t("Saat dilimi", "Time zone")}
                    <select
                      key={`${profileQuery.data?.city}-${profileQuery.data?.country}`}
                      name="timezone"
                      defaultValue={profileTimezone(
                        profileQuery.data?.city,
                        profileQuery.data?.country,
                      )}
                    >
                      {timezoneOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <span className="form-help">
                      {t(
                        "Profilindeki şehir varsayılan olarak seçildi.",
                        "The city in your profile is selected by default.",
                      )}
                    </span>
                  </label>
                  <label className="event-start-field">
                    {t("Başlangıç", "Start")}
                    <input
                      min={editingEvent ? undefined : new Date().toISOString().slice(0, 16)}
                      name="startsAt"
                      required
                      type="datetime-local"
                      value={eventStartsAt}
                      onChange={(event) => {
                        setEventStartsAt(event.currentTarget.value);
                        const form = event.currentTarget.form;
                        form
                          ?.querySelectorAll<HTMLInputElement>(
                            'input[name="ticketGateOpensAt"]',
                          )
                          .forEach((input) => {
                            if (
                              !input.value ||
                              input.dataset.synced === "true"
                            ) {
                              input.value = event.currentTarget.value;
                              input.dataset.synced = "true";
                            }
                          });
                      }}
                    />
                  </label>
                  <label>
                    {t("Bitiş", "End")}
                    <input
                      defaultValue={editingEvent?.endsAt ? toDateTimeLocal(editingEvent.endsAt) : ""}
                      min={eventStartsAt || new Date().toISOString().slice(0, 16)}
                      name="endsAt"
                      onFocus={(event) => { if (!event.currentTarget.value && eventStartsAt) event.currentTarget.value = eventStartsAt; }}
                      type="datetime-local"
                    />
                    <span className="form-help">
                      {t(
                        "İsteğe bağlıdır; başlangıçtan önce olamaz.",
                        "Optional; it cannot be before the start.",
                      )}
                    </span>
                  </label>
                  <label>
                    Format
                    <select
                      name="format"
                      value={eventFormat}
                      onChange={(event) => setEventFormat(event.target.value)}
                    >
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </label>
                  <label>
                    {t("Katılım tipi", "Participation type")}
                    <select name="visibility" defaultValue={editingEvent?.visibility ?? "open"}>
                      <option value="open">{t("Herkese açık", "Open to everyone")}</option>
                      <option value="approval_required">
                        {t("Onay gerekli", "Approval required")}
                      </option>
                      <option value="invite_only">{t("Sadece davetli", "Invite only")}</option>
                    </select>
                  </label>
                </div>
                <TagPicker initialIds={editingEvent?.tags.map((tag) => tag.id)} label={t("Etkinlik etiketleri", "Event tags")} recommendedIds={interestTagIds} tags={tags}/>
                <div className="event-step-actions">
                  <button
                    className="primary-action"
                    onClick={() => setEventStep(2)}
                    type="button"
                  >
                    {t("Sonraki", "Next")}
                  </button>
                </div>
              </div>
              <div data-event-step="2" hidden={eventStep !== 2}>
                <h3>{t("Adım 2: Etkinlik yeri bilgileri", "Step 2: Event location")}</h3>
                {eventFormat !== "online" ? (
                  <div className="form-grid">
                    <label>
                      {t("Mekân adı", "Place name")}
                      <input defaultValue={editingEvent?.locationName ?? ""} name="locationName" />
                    </label>
                    <label>{t("Var olan mekânlarımdan seç", "Choose from my existing places")}<select name="placeId" defaultValue=""><option value="">{t("Mekân seçilmedi", "No place selected")}</option>{myPlacesQuery.data?.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
                    <div className="location-fields-group"><CountryCityFields defaultCity={editingEvent?.city ?? profileQuery.data?.city} defaultCountry={editingEvent?.country ?? profileQuery.data?.country}/><LocationPicker addressName="locationAddress" defaultAddress={editingEvent?.locationAddress ?? ""} defaultLatitude={editingEvent?.latitude} defaultLongitude={editingEvent?.longitude}/></div>
                  </div>
                ) : null}
                {eventFormat !== "offline" ? (
                  <label>
                    {t("Canlı yayın URL'si", "Live stream URL")}
                    <input
                      defaultValue={editingEvent?.liveUrl ?? ""}
                      name="liveUrl"
                      required
                      type="url"
                      placeholder="https://..."
                    />
                    <span className="form-help">
                      {t(
                        "Katılımcılar etkinlik saatinde bu bağlantıyı kullanır.",
                        "Attendees use this link when the event starts.",
                      )}
                    </span>
                  </label>
                ) : null}
                <div className="event-step-actions">
                  <button onClick={() => setEventStep(1)} type="button">
                    {t("Geri", "Back")}
                  </button>
                  <button
                    className="primary-action"
                    onClick={() => setEventStep(3)}
                    type="button"
                  >
                    {t("Sonraki", "Next")}
                  </button>
                </div>
              </div>
              <div data-event-step="3" hidden={eventStep !== 3}>
                <label>
                  {t("Etkinlik fotoğraf ve videoları", "Event photos and videos")}
                  <input
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                    multiple
                    name="eventMedia"
                    type="file"
                  />
                  <span className="form-help">
                    {t("En fazla 20 dosya seçebilirsin.", "You can select up to 20 files.")}
                  </span>
                </label>
                <h3>{t("Adım 3: Etkinlik medyası", "Step 3: Event media")}</h3>
                <div className="event-step-actions">
                  <button onClick={() => setEventStep(2)} type="button">
                    {t("Geri", "Back")}
                  </button>
                  <button
                    className="primary-action"
                    onClick={() => setEventStep(4)}
                    type="button"
                  >
                    {t("Sonraki", "Next")}
                  </button>
                </div>
              </div>
              <div data-event-step="4" hidden={eventStep !== 4}>
                <h3>{t("Adım 4: Etkinlik yöneticileri", "Step 4: Event managers")}</h3>
                <label>
                  {t("Yönetici kullanıcı adları", "Manager usernames")}
                  <input list="event-manager-suggestions" name="managerUsernames" placeholder="@ayse, @mehmet" />
                  <datalist id="event-manager-suggestions">{(suggestionsQuery.data ?? []).map((member) => <option key={member.id} value={member.username ? `@${member.username}` : member.name}/>)}</datalist>
                  <span className="form-help">
                    {t(
                      "Birden fazla kullanıcı adını virgülle ayır.",
                      "Separate multiple usernames with commas.",
                    )}
                  </span>
                </label>
                <div className="event-step-actions">
                  <button onClick={() => setEventStep(3)} type="button">
                    {t("Geri", "Back")}
                  </button>
                  <button
                    className="primary-action"
                    onClick={() => setEventStep(5)}
                    type="button"
                  >
                    {t("Sonraki", "Next")}
                  </button>
                </div>
              </div>
              <div data-event-step="5" hidden={eventStep !== 5}>
                <h3>{t("Adım 5: Etkinlik programı / Line up", "Step 5: Event programme / Line-up")}</h3>
                <div className="lineup-editor">
                  {lineupRows.map((row, index) => (
                    <fieldset
                      className={`lineup-row lineup-${row.type}`}
                      draggable
                      key={row.id}
                      onDragStart={() => setDraggedLineupId(row.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (!draggedLineupId || draggedLineupId === row.id)
                          return;
                        setLineupRows((rows) => {
                          const next = rows.filter(
                            (item) => item.id !== draggedLineupId,
                          );
                          const target = next.findIndex(
                            (item) => item.id === row.id,
                          );
                          const dragged = rows.find(
                            (item) => item.id === draggedLineupId,
                          );
                          if (dragged) next.splice(target, 0, dragged);
                          return next;
                        });
                        setDraggedLineupId(null);
                      }}
                    >
                      <legend>
                        <GripVertical size={17} /> {index + 1}.{" "}
                        {row.type === "heading"
                          ? t("ana başlık", "main heading")
                          : row.type === "subheading"
                            ? t("alt başlık", "subheading")
                            : t("program maddesi", "programme item")}
                      </legend>
                      <input name="lineupType" type="hidden" value={row.type} />
                      <div className="form-grid">
                        <label>
                          {t("Başlık", "Title")}
                          <input
                            defaultValue={editingEvent?.lineup?.[index]?.title ?? ""}
                            name="lineupTitle"
                            placeholder={
                              row.type === "heading"
                                ? t("Örn: 1. Gün", "E.g. Day 1")
                                : row.type === "subheading"
                                  ? t("Örn: Ana Sahne", "E.g. Main Stage")
                                  : t("Sanatçı / performans adı", "Artist / performance name")
                            }
                          />
                        </label>
                        {row.type === "session" ? (
                          <label>
                            {t("Başlangıç", "Start")}
                            <input
                              name="lineupStartsAt"
                              defaultValue={editingEvent?.lineup?.[index]?.startsAt ? toDateTimeLocal(editingEvent.lineup[index]!.startsAt!) : ""}
                              type="datetime-local"
                            />
                          </label>
                        ) : (
                          <input name="lineupStartsAt" type="hidden" value="" />
                        )}
                      </div>
                      <div className="lineup-row-actions"><button disabled={index === 0} onClick={() => setLineupRows((rows) => { const next = [...rows]; [next[index - 1], next[index]] = [next[index]!, next[index - 1]!]; return next; })} type="button">{t("Yukarı", "Move up")}</button><button disabled={index === lineupRows.length - 1} onClick={() => setLineupRows((rows) => { const next = [...rows]; [next[index], next[index + 1]] = [next[index + 1]!, next[index]!]; return next; })} type="button">{t("Aşağı", "Move down")}</button><button
                        className="ghost-action lineup-remove"
                        disabled={lineupRows.length === 1}
                        onClick={() =>
                          setLineupRows((rows) =>
                            rows.filter((item) => item.id !== row.id),
                          )
                        }
                        type="button"
                      >
                        <Trash2 size={16} />
                        {t("Satırı kaldır", "Remove row")}
                      </button></div>
                    </fieldset>
                  ))}
                </div>
                <div className="lineup-add-actions">
                  <button
                    className="create-inline-link"
                    onClick={() =>
                      setLineupRows((rows) => [
                        ...rows,
                        { id: crypto.randomUUID(), type: "heading" },
                      ])
                    }
                    type="button"
                  >
                    <Plus size={16} />
                    {t("Ana Başlık Ekle (Örn: Gün bilgisi)", "Add main heading (e.g. day)")}
                  </button>
                  <button
                    className="create-inline-link"
                    onClick={() =>
                      setLineupRows((rows) => [
                        ...rows,
                        { id: crypto.randomUUID(), type: "subheading" },
                      ])
                    }
                    type="button"
                  >
                    <Plus size={16} />
                    {t("Alt Başlık Ekle (Örn: Sahne bilgisi)", "Add subheading (e.g. stage)")}
                  </button>
                  <button
                    className="create-inline-link"
                    onClick={() =>
                      setLineupRows((rows) => [
                        ...rows,
                        { id: crypto.randomUUID(), type: "session" },
                      ])
                    }
                    type="button"
                  >
                    <Plus size={16} />
                    {t("Madde ekle (Sanatçı & Performans adı)", "Add item (artist & performance name)")}
                  </button>
                </div>
                <div className="event-step-actions">
                  <button onClick={() => setEventStep(4)} type="button">
                    {t("Geri", "Back")}
                  </button>
                  <button
                    className="primary-action"
                    onClick={() => setEventStep(6)}
                    type="button"
                  >
                    {t("Sonraki", "Next")}
                  </button>
                </div>
              </div>
              <div data-event-step="6" hidden={eventStep !== 6}>
                <h3>{t("Adım 6: Etkinlik biletleri", "Step 6: Event tickets")}</h3>
                {Array.from({ length: eventTicketCount }, (_, index) => (
                  <fieldset
                    className="ticket-definition"
                    key={`ticket-${index}`}
                  >
                    <legend>{t("Bilet", "Ticket")} {index + 1}</legend>
                    <div className="form-grid">
                      <label>
                        {t("Bilet adı", "Ticket name")}
                        <input defaultValue={editingEvent?.ticketTypes?.[index]?.name ?? ""} name="ticketName" />
                      </label>
                      <label>
                        {t("Açıklama", "Description")}
                        <input defaultValue={editingEvent?.ticketTypes?.[index]?.description ?? ""} name="ticketDescription" />
                      </label>
                      <label>
                        {t("Fiyat", "Price")}
                        <input
                          defaultValue={editingEvent?.ticketTypes?.[index]?.price ?? ""}
                          min="0"
                          name="ticketPrice"
                          step="0.01"
                          type="number"
                        />
                      </label>
                      <label>
                        {t("Para birimi", "Currency")}
                        <select defaultValue={editingEvent?.ticketTypes?.[index]?.currency ?? "TRY"} name="ticketCurrency">
                          {[
                            "TRY",
                            "USD",
                            "EUR",
                            "GBP",
                            "CAD",
                            "SGD",
                            "AED",
                            "HKD",
                            "INR",
                            "BRL",
                            "KRW",
                            "SAR",
                            "NZD",
                            "ZAR",
                            "CHF",
                            "JPY",
                            "ARS",
                            "AUD",
                          ].map((currency) => (
                            <option key={currency}>{currency}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {t("Satış platformu", "Sales platform")}
                        <select name="ticketSalesPlatform" value={ticketSalesPlatforms[index] ?? "door"} onChange={(event) => { const next = event.currentTarget.value as "door" | "konnektora" | "external"; if (next === "konnektora" && user?.accountType !== "corporate" && !["admin", "super_admin"].includes(user?.role ?? "user")) { setRestrictedTicketPlatformIndex(index); return; } setRestrictedTicketPlatformIndex(null); setTicketSalesPlatforms((items) => { const copy = [...items]; copy[index] = next; return copy; }); }}>
                          <option value="door">{t("Kapıda ödeme", "Pay at the door")}</option>
                          <option value="konnektora">{t("Konnektora online satış", "Konnektora online sales")}</option>
                          <option value="external">{t("Diğer platform", "Other platform")}</option>
                        </select>
                      </label>
                      {restrictedTicketPlatformIndex === index ? <p className="form-error" role="alert">{t('Sadece kurumsal üyeler "Konnektora online satış" ayarını tercih edebilir.', 'Only corporate members can select "Konnektora online sales".')}</p> : null}
                      {ticketSalesPlatforms[index] === "external" ? <label>
                        {t("Dış satış URL'si", "External sales URL")}
                        <input defaultValue={editingEvent?.ticketTypes?.[index]?.externalSalesUrl ?? ""} name="ticketExternalSalesUrl" placeholder="https://" required type="url" />
                      </label> : <input name="ticketExternalSalesUrl" type="hidden" value=""/>}
                      <label>
                        {t("Kontenjan", "Capacity")}
                        <input defaultValue={editingEvent?.ticketTypes?.[index]?.capacity ?? ""} min="1" name="ticketCapacity" type="number" />
                      </label>
                      <label>
                        {t("Kişi başına maksimum bilet", "Maximum tickets per person")}
                        <input defaultValue={editingEvent?.ticketTypes?.[index]?.perUserLimit ?? ""} max="20" min="1" name="ticketPerUserLimit" type="number" />
                      </label>
                      {editingEvent ? <label>{t("Bilet durumu", "Ticket status")}<select defaultValue={editingEvent.ticketTypes?.[index]?.status ?? "active"} name="ticketStatus" onChange={(event) => { const previous = editingEvent.ticketTypes?.[index]?.status ?? "active"; if (event.currentTarget.value !== previous && !window.confirm(event.currentTarget.value === "inactive" ? t("Bu bilet pasif yapılsın mı? Yeni satışlarda listelenmeyecek, mevcut biletler iptal edilmeyecek.", "Make this ticket inactive? It will disappear from new sales without cancelling existing tickets.") : t("Bu bilet yeniden aktif yapılsın mı? Satış koşulları uygunsa tekrar listelenecek.", "Reactivate this ticket? It will be listed again when its sales conditions are met."))) event.currentTarget.value = previous; }}><option value="active">{t("Aktif", "Active")}</option><option value="inactive">{t("Pasif", "Inactive")}</option></select></label> : <input name="ticketStatus" type="hidden" value="active"/>}
                      <label>
                        {t("Satış başlangıcı", "Sales start")}
                        <input
                          name="ticketSaleStartsAt"
                          type="datetime-local"
                        />
                      </label>
                      <label>
                        {t("Satış bitişi", "Sales end")}
                        <input name="ticketSaleEndsAt" type="datetime-local" />
                      </label>
                      <label>
                        {t("Gate açılışı", "Gate opens")}
                        <input name="ticketGateOpensAt" type="datetime-local" />
                      </label>
                      <label>
                        {t("Gate kapanışı", "Gate closes")}
                        <input
                          name="ticketGateClosesAt"
                          type="datetime-local"
                        />
                      </label>
                    </div>
                  </fieldset>
                ))}
                <button
                  className="create-inline-link"
                  onClick={(event) => {
                    const form = event.currentTarget.form;
                    setEventTicketCount((count) => count + 1);
                    window.setTimeout(() => {
                      const inputs = form?.querySelectorAll<HTMLInputElement>(
                        'input[name="ticketGateOpensAt"]',
                      );
                      const input = inputs?.[inputs.length - 1];
                      if (input && !input.value) input.value = eventStartsAt;
                    });
                  }}
                  type="button"
                >
                  <Plus size={16} /> {t("Yeni bir bilet tanımla", "Add another ticket")}
                </button>
                <button
                  className="secondary-action"
                  disabled={eventMutation.isPending}
                  type="submit"
                >
                  <Plus size={18} />
                  {editingEvent
                    ? t("Değişiklikleri kaydet", "Save changes")
                    : t("Etkinlik yayınla", "Publish event")}
                </button>
                <div className="event-step-actions">
                  <button onClick={() => setEventStep(5)} type="button">
                    {t("Geri", "Back")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

const notificationTopicLabels: Record<NotificationPreference["topic"], [string, string]> =
  {
    tag_request: ["Profilime ilgi alanı ekleme talebi", "Interest addition request"],
    private_message: ["Yeni özel mesaj", "New private message"],
    mention: ["Gönderi veya yorumda bahsedilme", "Mention in a post or comment"],
    comment: ["İçeriğime yeni yorum", "New comment on my content"],
    password_changed: ["Şifre değişikliği", "Password change"],
    email_changed: ["E-posta değişikliği", "Email change"],
    phone_changed: ["Telefon değişikliği", "Phone change"],
    login: ["Yeni giriş", "New sign-in"],
    admin_message: ["Konnektora yönetim mesajı", "Konnektora administration message"],
    event_invite: ["Etkinlik daveti", "Event invitation"],
    event_manager: ["Etkinlik yöneticisi atanma", "Event manager assignment"],
    place_invite: ["Mekân daveti", "Place invitation"],
    place_manager: ["Mekân yöneticisi atanma", "Place manager assignment"],
  };

function notificationTopicLabel(topic: NotificationPreference["topic"], language: "tr" | "en") {
  return notificationTopicLabels[topic][language === "tr" ? 0 : 1];
}

function MemberList({
  members,
  onToggle,
  title,
}: {
  members: MemberCard[];
  onToggle: (member: MemberCard) => void;
  title: string;
}) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  return (
    <section className="admin-form" id="profile-pictures">
      <div className="section-header compact">
        <h2>{title}</h2>
        <span>{members.length}</span>
      </div>
      {members.length ? (
        <div className="admin-list">
          {members.map((member) => (
            <div className="admin-list-row" key={member.id}>
              <div>
                <strong>
                  <Link to={userProfilePath(member)}>
                    {member.username ? `@${member.username}` : member.name}
                  </Link>
                </strong>
                <span>
                  {member.commonTagCount} {t("ortak ilgi alanı", "shared interests")} ·{" "}
                  {member.followerCount} {t("takipçi", "followers")}
                </span>
                <span>
                  {[member.city, member.country].filter(Boolean).join(", ")}
                </span>
              </div>
              <button
                className="secondary-action"
                onClick={() => onToggle(member)}
                type="button"
              >
                {member.following ? t("Takibi bırak", "Unfollow") : t("Takip et", "Follow")}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">{t("Gösterilecek üye yok.", "There are no members to show.")}</p>
      )}
    </section>
  );
}

function PrivacyAudienceField({
  defaultValue,
  label,
  name,
  allowNobody = true,
}: {
  defaultValue: PrivacyAudience;
  label: string;
  name: string;
  allowNobody?: boolean;
}) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  return (
    <label>
      {label}
      <select defaultValue={defaultValue} name={name}>
        <option value="everybody">{t("Herkes", "Everybody")}</option>
        <option value="following">{t("Takip ettiklerim", "People I follow")}</option>
        <option value="network">{t("Takip ağım", "My network")}</option>
        {allowNobody ? <option value="nobody">{t("Hiç kimse", "Nobody")}</option> : null}
      </select>
    </label>
  );
}

function ProfileMediaPanel({
  media,
  userId,
}: {
  media: ProfileMedia[];
  userId: string;
}) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ["profile-media", userId] });
  const uploadMutation = useMutation({
    mutationFn: uploadProfileMedia,
    onSuccess: () => {
      setNotice({ tone: "success", message: t("Medya albüme eklendi.", "Media was added to the album.") });
      refresh();
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: t("Medya yüklenemedi. Dosya türü ve 10 MB sınırını kontrol et.", "Media could not be uploaded. Check the file type and 10 MB limit."),
      }),
  });
  const profilePictureMutation = useMutation({
    mutationFn: makeProfilePicture,
    onSuccess: refresh,
    onError: () =>
      setNotice({
        tone: "error",
        message: t("Bu medya profil resmi yapılamadı.", "This media could not be set as the profile picture."),
      }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteProfileMedia,
    onSuccess: refresh,
    onError: () =>
      setNotice({ tone: "error", message: t("Son profil fotoğrafı silinemez.", "The last profile picture cannot be deleted.") }),
  });
  const reorderMutation = useMutation({
    mutationFn: reorderProfileMedia,
    onSuccess: refresh,
    onError: () =>
      setNotice({ tone: "error", message: t("Albüm sırası değiştirilemedi.", "The album order could not be changed.") }),
  });
  const isPending =
    uploadMutation.isPending ||
    profilePictureMutation.isPending ||
    deleteMutation.isPending ||
    reorderMutation.isPending;

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
        <h2>{t("Profil fotoğrafları", "Profile media")}</h2>
        <span>{media.length} / 50 {t("medya", "media")}</span>
      </div>
      <div className="guest-invite-form">
        <label>
          {t("Yeni fotoğraf veya video", "New photo or video")}
          <input
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            disabled={isPending || media.length >= 50}
            multiple
            name="profileMedia"
            type="file"
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? []).slice(
                0,
                Math.max(0, 50 - media.length),
              );
              files.forEach((file) => uploadMutation.mutate(file));
              event.currentTarget.value = "";
            }}
          />
        </label>
        {uploadMutation.isPending ? (
          <span className="form-help">{t("Yükleniyor…", "Uploading…")}</span>
        ) : null}
      </div>
      {media.length === 0 ? (
        <p className="form-help">
          {t("Profilini tamamlamak için ilk olarak bir fotoğraf yükle.", "Upload a photo first to complete your profile.")}
        </p>
      ) : null}
      {notice ? (
        <ServiceFeedback compact message={notice.message} tone={notice.tone} />
      ) : null}
      <div className="profile-media-grid">
        {media.map((item, index) => (
          <article className="profile-media-item" key={item.id}>
            {item.type === "image" ? (
              <img
                alt={t(`Profil albümü ${index + 1}`, `Profile album ${index + 1}`)}
                src={resolveMediaUrl(item.url)}
              />
            ) : (
              <video
                controls
                preload="metadata"
                src={resolveMediaUrl(item.url)}
              />
            )}
            <strong>
              {item.isProfilePicture ? t("Profil resmi", "Profile picture") : t(`${index + 1}. medya`, `Media ${index + 1}`)}
            </strong>
            <div className="row-actions">
              {!item.isProfilePicture && item.type === "image" ? (
                <button
                  className="secondary-action"
                  disabled={isPending}
                  onClick={() => profilePictureMutation.mutate(item.id)}
                  type="button"
                >
                  {t("Profil resmi yap", "Set as profile picture")}
                </button>
              ) : null}
              {!item.isProfilePicture ? (
                <>
                  <button
                    className="ghost-action"
                    disabled={isPending || index <= 1}
                    onClick={() => moveMedia(index, -1)}
                    type="button"
                  >
                    ←
                  </button>
                  <button
                    className="ghost-action"
                    disabled={isPending || index >= media.length - 1}
                    onClick={() => moveMedia(index, 1)}
                    type="button"
                  >
                    →
                  </button>
                </>
              ) : null}
              <button
                className="danger-action"
                disabled={isPending}
                onClick={() => deleteMutation.mutate(item.id)}
                type="button"
              >
                <Trash2 size={16} /> {t("Sil", "Delete")}
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

function MyEventsPanel({
  events,
  isLoading,
  tags,
  userId,
}: {
  events: Event[];
  isLoading: boolean;
  tags: Tag[];
  userId: string;
}) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const queryClient = useQueryClient();
  const [guestListEventId, setGuestListEventId] = useState<string | null>(null);
  const updateMutation = useMutation({
    mutationFn: (input: { id: string; data: Partial<AdminEventInput> }) =>
      updateMyEvent(input.id, input.data),
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
        <h2>{t("Etkinliklerim", "My events")}</h2>
        <span>{isLoading ? t("Yükleniyor", "Loading") : t(`${events.length} etkinlik`, `${events.length} events`)}</span>
      </div>
      {events.length === 0 && !isLoading ? (
        <p className="muted">{t("Henüz etkinlik oluşturmadın.", "You have not created an event yet.")}</p>
      ) : null}
      <div className="admin-list">
        {events.map((event) => (
          <div className="admin-list-item" key={event.id}>
            <div className="admin-list-row">
              <div>
                <strong>{event.title}</strong>
                <span>
                  {event.status} ·{" "}
                  {new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", {
                    dateStyle: "medium",
                  }).format(new Date(event.startsAt))}
                </span>
              </div>
              <span className="muted">
                {event.tags.map((tag) => tag.name).join(", ") || t("İlgi alanı yok", "No interests")}
              </span>
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
                    {t("Yayınla", "Publish")}
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
                    {t("Taslak", "Draft")}
                  </button>
                ) : null}
                <button
                  className="secondary-action"
                  onClick={() =>
                    setGuestListEventId((currentId) =>
                      currentId === event.id ? null : event.id,
                    )
                  }
                  type="button"
                >
                  <Users size={16} />
                  {t("Misafir listesi", "Guest list")}
                </button>
                {event.status !== "archived" ? (
                  <button
                    className="danger-action"
                    disabled={archiveMutation.isPending}
                    onClick={() => archiveMutation.mutate(event.id)}
                    type="button"
                  >
                    {t("Arşivle", "Archive")}
                  </button>
                ) : null}
              </div>
            </div>
            {guestListEventId === event.id ? (
              <OrganizerGuestList eventId={event.id} eventSlug={event.slug} />
            ) : null}
          </div>
        ))}
      </div>
      {tags.length === 0 ? (
        <p className="form-help">
          {t("Etkinlik oluşturmak için önce bir ilgi alanı ekleyebilirsin.", "You can add an interest before creating an event.")}
        </p>
      ) : null}
    </section>
  );
}

function OrganizerGuestList({ eventId, eventSlug }: { eventId: string; eventSlug: string }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
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
    mutationFn: (input: { email: string; name?: string; role?: string }) =>
      inviteEventParticipant(eventId, input, "user"),
    onSuccess: () => {
      setNotice({ tone: "success", message: t("Davet misafir listesine eklendi.", "The invitation was added to the guest list.") });
      void queryClient.invalidateQueries({
        queryKey: ["event-participants", eventId, "organizer"],
      });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message: t("Davet eklenemedi. E-posta adresini kontrol et.", "The invitation could not be added. Check the email address."),
      }),
  });
  const statusMutation = useMutation({
    mutationFn: (input: { userId: string; status: string }) =>
      updateEventParticipantStatus(eventId, input.userId, input.status, "user"),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["event-participants", eventId, "organizer"],
      });
    },
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

  return (
    <div className="guest-list-panel">
      <div className="guest-list-header">
        <strong>{t("Misafir listesi", "Guest list")}</strong>
        <span>
          {participantsQuery.isLoading
            ? t("Yükleniyor", "Loading")
            : t(`${participants.length} kişi`, `${participants.length} people`)}
        </span>
      </div>
      <form className="guest-invite-form" onSubmit={handleInviteSubmit}>
        <label>
          {t("E-posta", "Email")}
          <input
            name="email"
            placeholder="member@example.com"
            required
            type="email"
          />
        </label>
        <label>
          {t("Ad", "Name")}
          <input name="name" placeholder={t("İsteğe bağlı", "Optional")} />
        </label>
        <label>
          {t("Rol", "Role")}
          <select name="role" defaultValue="attendee">
            <option value="attendee">{t("Katılımcı", "Attendee")}</option>
            <option value="manager">{t("Sahip", "Owner")}</option>
          </select>
        </label>
        <button
          className="secondary-action"
          disabled={inviteMutation.isPending}
          type="submit"
        >
          <Plus size={16} />
          {t("Davet et", "Invite")}
        </button>
      </form>
      <div className="guest-invite-form">
        <p className="form-help">
          {t("Giriş işlemleri kamera veya NFC taramasıyla açılan Pasaport Kontrol ekranından yapılır.", "Entry decisions are completed in Passport Check after scanning with the camera or NFC.")}
        </p>
        <Link className="secondary-action" to={`/events/${eventSlug}/invites#check-in`}>
          {t("Check-in kontrolünü aç", "Open check-in control")}
        </Link>
      </div>
      {notice ? (
        <ServiceFeedback compact message={notice.message} tone={notice.tone} />
      ) : null}
      <div className="guest-list">
        {participants.map((participant) => (
          <OrganizerGuestListRow
            isPending={statusMutation.isPending}
            key={participant.id}
            onStatusChange={(status) =>
              statusMutation.mutate({ userId: participant.userId, status })
            }
            participant={participant}
            language={language}
          />
        ))}
      </div>
    </div>
  );
}

function OrganizerGuestListRow({
  isPending,
  onStatusChange,
  participant,
  language,
}: {
  isPending: boolean;
  onStatusChange: (status: string) => void;
  participant: EventParticipant;
  language: "tr" | "en";
}) {
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  return (
    <div className="guest-list-row">
      <div>
        <strong>{participant.user?.name ?? t("Topluluk üyesi", "Community member")}</strong>
        <span>{participant.user?.email ?? participant.userId}</span>
      </div>
      <span className={`status-pill status-${participant.status}`}>
        {translateParticipationStatus(participant.status, language)}
      </span>
      <span className="muted">{translateParticipationRole(participant.role, language)}</span>
      <div className="row-actions">
        {participant.status === "requested" ? (
          <>
            <button
              className="secondary-action"
              disabled={isPending}
              onClick={() => onStatusChange("accepted")}
              type="button"
            >
              <Check size={16} />
              {t("Kabul", "Accept")}
            </button>
            <button
              className="danger-action"
              disabled={isPending}
              onClick={() => onStatusChange("declined")}
              type="button"
            >
              <X size={16} />
              {t("Ret", "Decline")}
            </button>
          </>
        ) : null}
        {participant.status !== "banned" &&
        participant.status !== "attended" ? (
          <button
            className="ghost-action"
            disabled={isPending}
            onClick={() => onStatusChange("banned")}
            type="button"
          >
            {t("Yasakla", "Ban")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function translateParticipationStatus(status: string, language: "tr" | "en") {
  const labels: Record<string, [string, string]> = {
    requested: ["Bekliyor", "Pending"], invited: ["Davetli", "Invited"], accepted: ["Kabul edildi", "Accepted"],
    declined: ["Reddedildi", "Declined"], attended: ["Katıldı", "Attended"], banned: ["Yasaklandı", "Banned"],
  };
  return labels[status]?.[language === "tr" ? 0 : 1] ?? status;
}

function translateParticipationRole(role: string, language: "tr" | "en") {
  const labels: Record<string, [string, string]> = {
    attendee: ["Katılımcı", "Attendee"], member: ["Üye", "Member"], manager: ["Sahip", "Owner"],
    organizer: ["Organizatör", "Organiser"], owner: ["Sahip", "Owner"],
  };
  return labels[role]?.[language === "tr" ? 0 : 1] ?? role;
}
