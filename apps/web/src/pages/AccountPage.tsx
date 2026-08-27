import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ClipboardCheck,
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
import {
  type AdminEventInput,
  type RegistrationInput,
  archiveMyEvent,
  checkAvailability,
  checkInEventParticipant,
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
  scanEventTicket,
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
  { value: "Europe/London", label: "GMT+00 Londra" },
  { value: "Europe/Paris", label: "GMT+01 Paris / Berlin" },
  { value: "Europe/Athens", label: "GMT+02 Atina" },
  { value: "Europe/Istanbul", label: "GMT+03 İstanbul" },
  { value: "Asia/Dubai", label: "GMT+04 Dubai" },
  { value: "Asia/Karachi", label: "GMT+05 Karaçi" },
  { value: "Asia/Kolkata", label: "GMT+05:30 Yeni Delhi" },
  { value: "Asia/Dhaka", label: "GMT+06 Dakka" },
  { value: "Asia/Bangkok", label: "GMT+07 Bangkok" },
  { value: "Asia/Singapore", label: "GMT+08 Singapur" },
  { value: "Asia/Tokyo", label: "GMT+09 Tokyo" },
  { value: "Australia/Sydney", label: "GMT+10 Sidney" },
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
              ? "Hesap oluşturuldu. E-posta teslim edilemediyse onboarding ekranındaki demo telefon koduyla devam edebilirsin."
              : "Hesap oluşturuldu. E-posta doğrulama bağlantısını kontrol et."
            : "Giriş yapıldı. Artık etkinlik oluşturabilirsin.",
      });
      navigate(mode === "login" ? "/feed" : "/onboarding");
    },
    onError: (error, input) => {
      const message = getServiceErrorMessage(error, "İşlem tamamlanamadı. Bilgilerini kontrol edip yeniden dene.");
      if (mode === "login" && message.includes("Dondurulmuş hesap")) {
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
      setNotice({ tone: "success", message: "Bağlı hesaplar güncellendi." });
    },
    onError: (error) =>
      setNotice({
        tone: "error",
        message: getServiceErrorMessage(
          error,
          "Bağlı hesap işlemi tamamlanamadı. Yeniden deneyebilirsin.",
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
        message: resetChannel === "phone" ? "Şifre sıfırlama bağlantısı GSM numaranıza gönderildi." : "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.",
      });
    },
    onError: (error) =>
      setNotice({
        tone: "error",
        message: getServiceErrorMessage(
          error,
          "Şifre sıfırlama isteği gönderilemedi. Birkaç dakika sonra yeniden dene.",
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
        message: "Hesabınız yeniden aktifleştirildi.",
      });
      setFrozenCredentials(null);
      navigate("/");
    },
    onError: (error) =>
      setNotice({
        tone: "error",
        message: getServiceErrorMessage(
          error,
          "Dondurulmuş hesap bulunamadı veya şifre doğru değil.",
        ),
      }),
  });
  const resendVerificationMutation = useMutation({
    mutationFn: requestEmailVerification,
    onSuccess: (response) =>
      setNotice({
        tone: response.sent === false ? "error" : "success",
        message: response.sent === false
          ? "E-posta servisi şu an teslimatı kabul etmedi. Demo telefon koduyla devam edebilirsin."
          : "Doğrulama e-postası tekrar gönderildi.",
      }),
    onError: (error) =>
      setNotice({
        tone: "error",
        message: getServiceErrorMessage(
          error,
          "Doğrulama e-postası gönderilemedi. Birkaç dakika sonra yeniden dene.",
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
        message: editingEvent ? "Etkinlik güncellendi." : "Etkinlik yayınlandı ve public listede görünür.",
      });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["my-events", user?.id] });
      navigate(`/events/${created.slug}`);
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
      queryClient.setQueryData<TagAffinity[]>(
        ["profile-interests", user?.id],
        affinities,
      );
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
    onError: () =>
      setNotice({ tone: "error", message: "Tag yorumu eklenemedi." }),
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
      setNotice({ tone: "success", message: "Profil bilgileri kaydedildi." });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message:
          "Profil kaydedilemedi. Kullanıcı adı ve zorunlu alanları kontrol et.",
      }),
  });
  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () =>
      setNotice({ tone: "success", message: "Şifreniz değiştirildi." }),
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
      window.location.assign("/login");
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
      setDevelopmentPhoneCode(response.demoCode ?? response.developmentCode ?? null);
      setNotice({
        tone: "success",
        message: response.demoCode
          ? "Demo doğrulama kodu oluşturuldu. Kodu aşağıdaki alana girin."
          : "Doğrulama kodu gönderildi. Kod 2 dakika geçerlidir.",
      });
    },
    onError: () =>
      setNotice({
        tone: "error",
        message:
          "Kod gönderilemedi. Numarayı +905551112233 biçiminde kontrol edin.",
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
      setNotice({ tone: "success", message: "Telefon numaranız doğrulandı." });
    },
    onError: () =>
      setNotice({ tone: "error", message: "Kod hatalı veya süresi dolmuş." }),
  });
  const privacyMutation = useMutation({
    mutationFn: updatePrivacySettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(["privacy-settings", user?.id], settings);
      setNotice({ tone: "success", message: "Gizlilik ayarları kaydedildi." });
    },
    onError: () =>
      setNotice({ tone: "error", message: "Gizlilik ayarları kaydedilemedi." }),
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
    mutationFn: (input: {
      targetType: "user" | "tag" | "event" | "place";
      targetId: string;
    }) => removeBlock(input.targetType, input.targetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blocks", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      setNotice({ tone: "success", message: "Engel kaldırıldı." });
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
        message: `Lütfen ${invalidStep}. adımdaki zorunlu alanları kontrol edin.`,
      });
      window.setTimeout(() => invalidControl.reportValidity(), 0);
      return;
    }
    const form = new FormData(event.currentTarget);
    const startsAt = String(form.get("startsAt"));
    const endsAt = String(form.get("endsAt") || "");
    const eventTagIds = form.getAll("tagIds").map(String);
    if (eventTagIds.length > 10) {
      setNotice({ tone: "error", message: "Bir etkinliğe en fazla 10 etiket ekleyebilirsiniz." });
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
        message:
          "Başlangıç gelecekte olmalı; bitiş zamanı başlangıçtan sonra olmalıdır.",
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
      businessAudience: audience("businessAudience"),
      addressAudience: privacyQuery.data?.addressAudience ?? "everybody",
      tradeNameAudience: privacyQuery.data?.tradeNameAudience ?? "everybody",
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
    <section className={`page account-page${eventCreator ? " event-create-only" : ""}`}>
      <div className="section-header">
        <div>
          <p className="eyebrow">Community</p>
          <h1>Üye alanı</h1>
        </div>
        {user ? (
          <button
            className="secondary-action"
            onClick={handleLogout}
            type="button"
          >
            <LogOut size={18} />
            Çıkış
          </button>
        ) : null}
      </div>

      {notice ? (
        <ServiceFeedback
          compact
          message={notice.message}
          tone={notice.tone}
        />
      ) : null}
      {passwordResetPath ? <Link className="primary-action" to={passwordResetPath}>Demo şifre sıfırlama bağlantısını aç</Link> : null}
      {showFrozenConfirmation ? (
        <div
          className="emotion-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Hesap donduruldu"
        >
          <div>
            <button
              aria-label="Kapat"
              onClick={() => {
                window.sessionStorage.removeItem("konnektora_account_frozen");
                setShowFrozenConfirmation(false);
              }}
              type="button"
            >
              ×
            </button>
            <h2>Hesap donduruldu</h2>
            <p>
              Oturumun güvenli biçimde kapatıldı. Dilediğin zaman giriş
              bilgilerinle hesabını yeniden aktifleştirebilirsin.
            </p>
          </div>
        </div>
      ) : null}
      {frozenCredentials ? <div className="emotion-modal" role="dialog" aria-modal="true" aria-label="Hesabı yeniden aktifleştir"><div><h2>Tekrar hoşgeldin!</h2><p>Dondurduğun hesabı yeniden aktifleştirmek istiyor musun?</p><div className="row-actions"><button className="ghost-action" onClick={() => setFrozenCredentials(null)} type="button">İptal</button><button className="primary-action" disabled={reactivateMutation.isPending} onClick={() => reactivateMutation.mutate(frozenCredentials)} type="button">Hesabı aktifleştir</button></div>{reactivateMutation.isError ? <ServiceFeedback compact error={reactivateMutation.error} fallback="Hesap yeniden aktifleştirilemedi."/> : null}</div></div> : null}
      {user?.status === "pending" ? (
        <button
          className="secondary-action"
          disabled={resendVerificationMutation.isPending}
          onClick={() => resendVerificationMutation.mutate(user.email)}
          type="button"
        >
          Doğrulama emailini tekrar gönder
        </button>
      ) : null}

      {!user ? (
        <div className="account-grid">
          <div>
            <p className="lead">
              Üye hesabı oluştur, giriş yap ve Konnektora community içinde kendi
              etkinliğini yayınla.
            </p>
            {isMockApiMode ? (
              <p className="form-help">
                Demo modunda üyelik ve etkinlikler bu tarayıcıya kaydedilir.
              </p>
            ) : null}
          </div>
          <form className="admin-form compact-form" onSubmit={handleAuthSubmit}>
            <div className="segmented-control" aria-label="Hesap modu">
              <button
                className={mode === "register" ? "active" : ""}
                onClick={() => setMode("register")}
                type="button"
              >
                Üye ol
              </button>
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => setMode("login")}
                type="button"
              >
                Giriş yap
              </button>
            </div>
            {mode === "register" ? (
              <>
                <label>
                  Hesap türü
                  <select
                    name="accountType"
                    onChange={(event) =>
                      setRegistrationAccountType(
                        event.target.value as AccountType,
                      )
                    }
                    value={registrationAccountType}
                  >
                    <option value="individual">Bireysel</option>
                    <option value="corporate">Kurumsal</option>
                  </select>
                </label>
                <label>
                  {registrationAccountType === "corporate"
                    ? "Yetkili kişi adı soyadı"
                    : "Ad Soyad"}
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
                      İşletme adı
                      <input
                        name="companyName"
                        placeholder="Konnektora"
                        required
                        minLength={2}
                        maxLength={160}
                      />
                    </label>
                    <label>
                      Ticari unvan
                      <input
                        name="tradeName"
                        placeholder="Konnektora Teknoloji Ltd."
                        required
                        minLength={2}
                        maxLength={160}
                      />
                    </label>
                    <label>
                      Şirket türü
                      <select name="companyType" required defaultValue="">
                        <option disabled value="">
                          Seçiniz
                        </option>
                        <option value="sole_proprietorship">
                          Şahıs firması
                        </option>
                        <option value="limited_or_corporation">
                          Limited / Anonim
                        </option>
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
                        <option value="event_organizer">
                          Etkinlik organizatörü
                        </option>
                        <option value="restaurant_bar_cafe">
                          Restoran / Bar / Kafe
                        </option>
                        <option value="night_club">Gece kulübü</option>
                        <option value="university_club">
                          Üniversite kulübü
                        </option>
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
                <span className="form-help">
                  Hesabın açıldıktan sonra bu numarayı doğrulaman gerekir.
                </span>
              </label>
            ) : null}
            <label>
              Şifre
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
                    ? "En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam kullanın."
                    : undefined
                }
                type="password"
              />
              {mode === "register" ? (
                <span className="form-help">
                  En az 8 karakter; bir büyük harf, bir küçük harf ve bir rakam
                  içermeli.
                </span>
              ) : null}
            </label>
            {mode === "register" ? (
              <label className="check-row">
                <input required type="checkbox" />
                <span>
                  <Link to="/terms">Kullanım Koşullarını</Link> ve{" "}
                  <Link to="/privacy">Gizlilik Politikasını</Link> kabul
                  ediyorum.
                </span>
              </label>
            ) : null}
            <button
              className="primary-action"
              disabled={authMutation.isPending}
              type="submit"
            >
              <UserRound size={18} />
              {mode === "register" ? "Üye ol" : "Giriş yap"}
            </button>
            {mode === "login" ? (
              <>
                <button
                  className="ghost-action"
                  disabled={forgotPasswordMutation.isPending}
                  onClick={() => setForgotPasswordOpen(true)}
                  type="button"
                >
                  Şifremi unuttum
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
                navigate(response.user.status === "pending" ? "/onboarding" : "/feed");
              }}
            />
          </form>
          {forgotPasswordOpen ? <div className="dialog-backdrop" role="presentation" onMouseDown={() => setForgotPasswordOpen(false)}><form aria-modal="true" className="content-dialog password-reset-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            if (resetChannel === "phone") forgotPasswordMutation.mutate({ channel: "phone", phone: normalizePhone(String(form.get("resetPhone") || "")) });
            else forgotPasswordMutation.mutate({ channel: "email", email: normalizeEmail(String(form.get("resetEmail") || "")) });
          }} role="dialog"><div className="section-header"><div><p className="eyebrow">Hesap kurtarma</p><h2>Şifrenizi nasıl sıfırlayalım?</h2></div><button onClick={() => setForgotPasswordOpen(false)} type="button">Kapat</button></div><div className="reset-channel-options"><label><input checked={resetChannel === "email"} name="resetChannel" onChange={() => setResetChannel("email")} type="radio"/> E-posta</label><label><input checked={resetChannel === "phone"} name="resetChannel" onChange={() => setResetChannel("phone")} type="radio"/> GSM</label></div>{resetChannel === "email" ? <label>E-posta adresi<EmailInput autoComplete="email" name="resetEmail" required/></label> : <label>GSM numarası<PhoneInput autoComplete="tel" name="resetPhone" required/></label>}<button className="primary-action" disabled={forgotPasswordMutation.isPending}>{forgotPasswordMutation.isPending ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}</button>{forgotPasswordMutation.isError ? <ServiceFeedback error={forgotPasswordMutation.error} fallback="Şifre sıfırlama isteği gönderilemedi."/> : null}</form></div> : null}
        </div>
      ) : (
        <div className="account-grid">
          <aside className="account-summary">
            {profileMediaQuery.data?.find((media) => media.isProfilePicture) ? (
              <img
                alt={`${user.name} profil resmi`}
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
            <span>Rol: {user.role}</span>
            <span>
              Hesap:{" "}
              {user.accountType === "corporate" ? "Kurumsal" : "Bireysel"}
            </span>
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
              <p className="form-help">
                Google veya Facebook hesabını bağlayarak tek dokunuşla giriş
                yapabilirsin.
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
                                "Bağlı")
                              : "Bağlı değil"}
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
                          {account ? "Bağlantıyı kaldır" : "Hesabı bağla"}
                        </button>
                      </div>
                    );
                  },
                )}
              </div>
              <Link className="ghost-action" to="/contacts">
                Rehberden arkadaş bul ve davet et
              </Link>
            </section>
            <ProfileMediaPanel
              media={profileMediaQuery.data ?? []}
              userId={user.id}
            />
            <MemberList
              members={followingQuery.data ?? []}
              title="Takip ettiklerim"
              onToggle={(member) =>
                followMutation.mutate({ userId: member.id, following: true })
              }
            />
            <MemberList
              members={suggestionsQuery.data ?? []}
              title="Sana benzer üyeler"
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
                <h2>Profili düzenle</h2>
                <div className="form-grid">
                  <label>
                    {profileQuery.data.accountType === "corporate"
                      ? "Yetkili kişi / görünen ad"
                      : "Ad Soyad"}
                    <input
                      defaultValue={profileQuery.data.name}
                      name="name"
                      required
                      minLength={2}
                      maxLength={160}
                    />
                  </label>
                  <label>
                    Kullanıcı adı
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
                                  ? "Kullanıcı adı uygun."
                                  : "Kullanıcı adı kullanımda.",
                            }),
                        );
                      }}
                    />
                  </label>
                  <label>
                    Telefon
                    <input
                      defaultValue={profileQuery.data.phone ?? ""}
                      name="phone"
                      readOnly
                      type="tel"
                    />
                    <span className="form-help">
                      {profileQuery.data.phoneVerified
                        ? "Doğrulandı"
                        : "Doğrulanmadı"}
                    </span>
                  </label>
                  <label>
                    Web sitesi
                    <input
                      defaultValue={profileQuery.data.website ?? ""}
                      name="website"
                      placeholder="ornek.com (isteğe bağlı)"
                    />
                  </label>
                  <CountryCityFields defaultCity={profileQuery.data.city} defaultCountry={profileQuery.data.country}/>
                  {profileQuery.data.accountType === "individual" ? (
                    <>
                      <label>
                        Doğum tarihi
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
                        Cinsiyet
                        <select
                          defaultValue={profileQuery.data.gender ?? ""}
                          name="gender"
                        >
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
                        <input
                          defaultValue={profileQuery.data.companyName ?? ""}
                          name="companyName"
                          required
                        />
                      </label>
                      <label>
                        Ticari unvan
                        <input
                          defaultValue={profileQuery.data.tradeName ?? ""}
                          name="tradeName"
                          required
                        />
                      </label>
                      <label>
                        Şirket türü
                        <input
                          defaultValue={profileQuery.data.companyType ?? ""}
                          name="companyType"
                        />
                      </label>
                      <label>
                        İşletme kategorisi
                        <input
                          defaultValue={
                            profileQuery.data.businessCategory ?? ""
                          }
                          name="businessCategory"
                        />
                      </label>
                      <label>
                        İlçe
                        <input
                          defaultValue={profileQuery.data.district ?? ""}
                          name="district"
                        />
                      </label>
                      <label>
                        Adres
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
                    ? "Kaydediliyor"
                    : "Profili kaydet"}
                </button>
              </form>
            ) : null}
            <form
              className="admin-form phone-verification-form"
              id="account-settings"
              onSubmit={
                pendingPhone ? handlePhoneConfirmation : handlePhoneRequest
              }
            >
              <h2>Telefon doğrulama</h2>
              {!pendingPhone ? (
                <label>
                  Yeni telefon numarası
                  <PhoneInput
                    name="phone"
                    pattern="\+?[0-9 ]{10,19}"
                    required
                  />
                  <span className="form-help">Örnek: +90 555 111 22 33</span>
                </label>
              ) : (
                <>
                  <p className="form-help">
                    {pendingPhone} numarasına gönderilen 6 haneli kodu girin.
                  </p>
                  {developmentPhoneCode ? (
                    <div className="demo-verification-code" role="status">
                      <span>Demo doğrulama kodun</span>
                      <strong>{developmentPhoneCode}</strong>
                      <p>Kodu aşağıdaki alana kendin gir.</p>
                    </div>
                  ) : null}
                  <label>
                    Doğrulama kodu
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
              <form
                className="admin-form"
                id="privacy"
                key={String(privacyQuery.data.updatedAt ?? "privacy-defaults")}
                onSubmit={handlePrivacySubmit}
              >
                <h2>Gizlilik ayarları</h2>
                <p className="form-help">
                  Network: takip ettikleriniz ve onların takip ettiği kişiler.
                </p>
                <PrivacyAudienceField
                  defaultValue={privacyQuery.data.messageAudience}
                  label="Kimler özel mesaj gönderebilir?"
                  name="messageAudience"
                />
                <label>
                  Rehberinde kayıtlı olduğum üyeler beni bulabilsin
                  <select
                    defaultValue={String(
                      privacyQuery.data.directoryDiscoverable,
                    )}
                    name="directoryDiscoverable"
                  >
                    <option value="true">Evet</option>
                    <option value="false">Hayır</option>
                  </select>
                </label>
                <PrivacyAudienceField
                  defaultValue={privacyQuery.data.eventAudience}
                  label="Etkinliklerimi kimler görebilir?"
                  name="eventAudience"
                />
                <PrivacyAudienceField
                  defaultValue={privacyQuery.data.eventInviteAudience}
                  label="Kimler etkinliğe davet edebilir?"
                  name="eventInviteAudience"
                />
                <PrivacyAudienceField
                  defaultValue={privacyQuery.data.placeAudience}
                  label="Mekânlarımı kimler görebilir?"
                  name="placeAudience"
                />
                <PrivacyAudienceField
                  defaultValue={privacyQuery.data.placeInviteAudience}
                  label="Kimler mekâna davet edebilir?"
                  name="placeInviteAudience"
                />
                <h3>Profil bilgileri</h3>
                <PrivacyAudienceField defaultValue={privacyQuery.data.profileNameAudience} label="Adımı kimler görebilir?" name="profileNameAudience" />
                <PrivacyAudienceField defaultValue={privacyQuery.data.demographicsAudience} label="Yaş ve cinsiyetimi kimler görebilir?" name="demographicsAudience" />
                <PrivacyAudienceField defaultValue={privacyQuery.data.locationAudience} label="Konumumu kimler görebilir?" name="locationAudience" />
                <PrivacyAudienceField defaultValue={privacyQuery.data.websiteAudience} label="Web adresimi kimler görebilir?" name="websiteAudience" />
                <PrivacyAudienceField defaultValue={privacyQuery.data.businessAudience} label="Kurumsal bilgilerimi kimler görebilir?" name="businessAudience" />
                <button
                  className="secondary-action"
                  disabled={privacyMutation.isPending}
                  type="submit"
                >
                  {privacyMutation.isPending
                    ? "Kaydediliyor"
                    : "Gizlilik ayarlarını kaydet"}
                </button>
              </form>
            ) : null}
            <section className="admin-form">
              <h2>Engellenenler</h2>
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
              <form
                className="admin-form"
                id="notifications"
                onSubmit={handleNotificationPreferencesSubmit}
              >
                <h2>Bildirim tercihleri</h2>
                <PushNotificationControl />
                <div className="form-grid">
                  {notificationPreferencesQuery.data.map((preference) => (
                    <label key={preference.topic}>
                      {notificationTopicLabels[preference.topic]}
                      <select
                        defaultValue={preference.channel}
                        name={preference.topic}
                      >
                        <option value="none">Kapalı</option>
                        <option value="both">E-posta ve push</option>
                        <option value="email">Yalnız e-posta</option>
                        <option value="push">Yalnız push</option>
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
                    ? "Kaydediliyor"
                    : "Bildirim tercihlerini kaydet"}
                </button>
              </form>
            ) : null}
            <form className="admin-form" onSubmit={handleChangePassword}>
              <h2>Şifre değiştir</h2>
              <label>
                Mevcut şifre
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
                  Yeni şifre
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
                    En az 8 karakter; bir büyük harf, bir küçük harf ve bir
                    rakam içermeli.
                  </span>
                </label>
                <label>
                  Yeni şifre tekrar
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
                    Yukarıdaki güçlü şifreyle aynı olmalı.
                  </span>
                </label>
              </div>
              <button
                className="secondary-action"
                disabled={changePasswordMutation.isPending}
                type="submit"
              >
                {changePasswordMutation.isPending
                  ? "Değiştiriliyor"
                  : "Şifreyi değiştir"}
              </button>
            </form>
            <form className="admin-form" onSubmit={handleDeactivate}>
              <h2>Hesabı dondur</h2>
              <p className="form-help">
                Profiliniz ve tek yöneticisi olduğunuz içerikler yayından
                kaldırılır. Giriş bilgilerinizle hesabı yeniden açabilirsiniz.
              </p>
              <label>
                Mevcut şifre
                <input
                  autoComplete="current-password"
                  minLength={8}
                  name="currentPassword"
                  required
                  type="password"
                />
              </label>
              <label>
                Ayrılma nedeni
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
                Hesabı dondur
              </button>
            </form>
            <section className="admin-form">
              <div className="section-header compact">
                <h2>Bildirimler</h2>
                <span>
                  {notificationsQuery.data?.filter((item) => !item.readAt)
                    .length ?? 0}{" "}
                  okunmamış
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
                            ? new Intl.DateTimeFormat("tr-TR", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(new Date(notification.createdAt))
                            : ""}
                        </span>
                      </div>
                      <span
                        className={`status-pill status-${notification.readAt ? "resolved" : "open"}`}
                      >
                        {notification.readAt ? "Okundu" : "Yeni"}
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
              <p className="form-help">
                Var olan tag'leri önce arayıp öneriyoruz; yeni ihtiyaç varsa
                kullanıcılar direkt aktif tag oluşturabilir.
              </p>
              <div className="form-grid">
                <label>
                  Tag adı
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
                {tagMutation.isPending ? "Oluşturuluyor" : "Tag oluştur"}
              </button>
            </form>
            <MyEventsPanel
              events={myEventsQuery.data ?? []}
              isLoading={myEventsQuery.isLoading}
              tags={tags}
              userId={user.id}
            />
            <form className="admin-form" id="interests" onSubmit={handleInterestSubmit}>
              <h2>İlgi alanları</h2>
              <p className="form-help">
                Seçtiğin tag'ler profilinde görünür ve etkinlik oluştururken
                varsayılan seçili gelir.
              </p>
              <fieldset className="tag-fieldset">
                <legend>Tag'ler</legend>
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
                      <option value="like">Like</option>
                      <option value="ok">OK, no problem</option>
                      <option value="dislike">Dislike</option>
                    </select>
                  </label>
                ))}
              </fieldset>
              <button className="secondary-action" type="submit">
                {interestsMutation.isPending
                  ? "Kaydediliyor"
                  : "İlgi alanlarını kaydet"}
              </button>
            </form>
            <section className="admin-form">
              <h2>Tag yorumları</h2>
              <label>
                İlgi alanı
                <select
                  onChange={(event) => setCommentTagId(event.target.value)}
                  value={commentTagId}
                >
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
                  <form
                    className="compact-form"
                    onSubmit={handleTagCommentSubmit}
                  >
                    <label>
                      Yorumunuz
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
                      Yorum ekle
                    </button>
                  </form>
                  <div className="admin-list">
                    {tagCommentsQuery.data?.map((comment) => (
                      <div className="admin-list-row" key={comment.id}>
                        <div>
                          <strong>
                            {comment.author?.username
                              ? `@${comment.author.username}`
                              : (comment.author?.name ?? "Silinmiş kullanıcı")}
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
            <form
              className="admin-form event-create-form"
              key={editingEvent?.id ?? "new-event"}
              noValidate
              onSubmit={handleEventSubmit}
            >
              <h2>{editingEvent ? "Etkinliği düzenle" : "Etkinlik oluştur"}</h2>
              <div
                className="event-stepper"
                aria-label="Etkinlik oluşturma adımları"
              >
                {[1, 2, 3, 4, 5, 6].map((step) => (
                  <button
                    className={eventStep === step ? "active" : ""}
                    key={step}
                    onClick={() => setEventStep(step)}
                    type="button"
                    aria-label={`Adım ${step}`}
                  >
                    {step}
                  </button>
                ))}
              </div>
              <div data-event-step="1" hidden={eventStep !== 1}>
                <h3>Adım 1: Temel bilgiler</h3>
                <label>
                  Başlık
                  <input
                    defaultValue={editingEvent?.title}
                    name="title"
                    placeholder="Community Breakfast"
                    required
                    minLength={3}
                  />
                </label>
                <label>
                  Açıklama
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
                    Saat dilimi
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
                      Profilindeki şehir varsayılan olarak seçildi.
                    </span>
                  </label>
                  <label className="event-start-field">
                    Başlangıç
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
                    Bitiş
                    <input
                      defaultValue={editingEvent?.endsAt ? toDateTimeLocal(editingEvent.endsAt) : ""}
                      min={eventStartsAt || new Date().toISOString().slice(0, 16)}
                      name="endsAt"
                      onFocus={(event) => { if (!event.currentTarget.value && eventStartsAt) event.currentTarget.value = eventStartsAt; }}
                      type="datetime-local"
                    />
                    <span className="form-help">
                      İsteğe bağlıdır; başlangıçtan önce olamaz.
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
                    Katılım tipi
                    <select name="visibility" defaultValue={editingEvent?.visibility ?? "open"}>
                      <option value="open">Herkese açık</option>
                      <option value="approval_required">
                        Onay gerekli
                      </option>
                      <option value="invite_only">Sadece davetli</option>
                    </select>
                  </label>
                </div>
                <TagPicker initialIds={editingEvent?.tags.map((tag) => tag.id)} label="Etkinlik etiketleri" recommendedIds={interestTagIds} tags={tags}/>
                <div className="event-step-actions">
                  <button
                    className="primary-action"
                    onClick={() => setEventStep(2)}
                    type="button"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
              <div data-event-step="2" hidden={eventStep !== 2}>
                <h3>Adım 2: Etkinlik yeri bilgileri</h3>
                {eventFormat !== "online" ? (
                  <div className="form-grid">
                    <label>
                      Mekân adı
                      <input defaultValue={editingEvent?.locationName ?? ""} name="locationName" />
                    </label>
                    <label>Var olan mekânlarımdan seç<select name="placeId" defaultValue=""><option value="">Mekân seçilmedi</option>{myPlacesQuery.data?.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
                    <div className="location-fields-group"><CountryCityFields defaultCity={editingEvent?.city ?? profileQuery.data?.city} defaultCountry={editingEvent?.country ?? profileQuery.data?.country}/><LocationPicker addressName="locationAddress" defaultAddress={editingEvent?.locationAddress ?? ""} defaultLatitude={editingEvent?.latitude} defaultLongitude={editingEvent?.longitude}/></div>
                  </div>
                ) : null}
                {eventFormat !== "offline" ? (
                  <label>
                    Canlı yayın URL'si
                    <input
                      defaultValue={editingEvent?.liveUrl ?? ""}
                      name="liveUrl"
                      required
                      type="url"
                      placeholder="https://..."
                    />
                    <span className="form-help">
                      Katılımcılar etkinlik saatinde bu bağlantıyı kullanır.
                    </span>
                  </label>
                ) : null}
                <div className="event-step-actions">
                  <button onClick={() => setEventStep(1)} type="button">
                    Geri
                  </button>
                  <button
                    className="primary-action"
                    onClick={() => setEventStep(3)}
                    type="button"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
              <div data-event-step="3" hidden={eventStep !== 3}>
                <label>
                  Etkinlik fotoğraf ve videoları
                  <input
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                    multiple
                    name="eventMedia"
                    type="file"
                  />
                  <span className="form-help">
                    En fazla 20 dosya seçebilirsin.
                  </span>
                </label>
                <h3>Adım 3: Etkinlik medyası</h3>
                <div className="event-step-actions">
                  <button onClick={() => setEventStep(2)} type="button">
                    Geri
                  </button>
                  <button
                    className="primary-action"
                    onClick={() => setEventStep(4)}
                    type="button"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
              <div data-event-step="4" hidden={eventStep !== 4}>
                <h3>Adım 4: Etkinlik yöneticileri</h3>
                <label>
                  Yönetici kullanıcı adları
                  <input list="event-manager-suggestions" name="managerUsernames" placeholder="@ayse, @mehmet" />
                  <datalist id="event-manager-suggestions">{(suggestionsQuery.data ?? []).map((member) => <option key={member.id} value={member.username ? `@${member.username}` : member.name}/>)}</datalist>
                  <span className="form-help">
                    Birden fazla kullanıcı adını virgülle ayır.
                  </span>
                </label>
                <div className="event-step-actions">
                  <button onClick={() => setEventStep(3)} type="button">
                    Geri
                  </button>
                  <button
                    className="primary-action"
                    onClick={() => setEventStep(5)}
                    type="button"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
              <div data-event-step="5" hidden={eventStep !== 5}>
                <h3>Adım 5: Etkinlik programı / Line up</h3>
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
                          ? "ana başlık"
                          : row.type === "subheading"
                            ? "alt başlık"
                            : "program maddesi"}
                      </legend>
                      <input name="lineupType" type="hidden" value={row.type} />
                      <div className="form-grid">
                        <label>
                          Başlık
                          <input
                            defaultValue={editingEvent?.lineup?.[index]?.title ?? ""}
                            name="lineupTitle"
                            placeholder={
                              row.type === "heading"
                                ? "Örn: 1. Gün"
                                : row.type === "subheading"
                                  ? "Örn: Ana Sahne"
                                  : "Sanatçı / performans adı"
                            }
                          />
                        </label>
                        {row.type === "session" ? (
                          <label>
                            Başlangıç
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
                      <div className="lineup-row-actions"><button disabled={index === 0} onClick={() => setLineupRows((rows) => { const next = [...rows]; [next[index - 1], next[index]] = [next[index]!, next[index - 1]!]; return next; })} type="button">Yukarı</button><button disabled={index === lineupRows.length - 1} onClick={() => setLineupRows((rows) => { const next = [...rows]; [next[index], next[index + 1]] = [next[index + 1]!, next[index]!]; return next; })} type="button">Aşağı</button><button
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
                        Satırı kaldır
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
                    Ana Başlık Ekle (Örn: Gün bilgisi)
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
                    Alt Başlık Ekle (Örn: Sahne bilgisi)
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
                    Madde ekle (Sanatçı &amp; Performans adı)
                  </button>
                </div>
                <div className="event-step-actions">
                  <button onClick={() => setEventStep(4)} type="button">
                    Geri
                  </button>
                  <button
                    className="primary-action"
                    onClick={() => setEventStep(6)}
                    type="button"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
              <div data-event-step="6" hidden={eventStep !== 6}>
                <h3>Adım 6: Etkinlik biletleri</h3>
                {Array.from({ length: eventTicketCount }, (_, index) => (
                  <fieldset
                    className="ticket-definition"
                    key={`ticket-${index}`}
                  >
                    <legend>Bilet {index + 1}</legend>
                    <div className="form-grid">
                      <label>
                        Bilet adı
                        <input defaultValue={editingEvent?.ticketTypes?.[index]?.name ?? ""} name="ticketName" />
                      </label>
                      <label>
                        Açıklama
                        <input defaultValue={editingEvent?.ticketTypes?.[index]?.description ?? ""} name="ticketDescription" />
                      </label>
                      <label>
                        Fiyat
                        <input
                          defaultValue={editingEvent?.ticketTypes?.[index]?.price ?? ""}
                          min="0"
                          name="ticketPrice"
                          step="0.01"
                          type="number"
                        />
                      </label>
                      <label>
                        Para birimi
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
                        Satış platformu
                        <select name="ticketSalesPlatform" value={ticketSalesPlatforms[index] ?? "door"} onChange={(event) => { const next = event.currentTarget.value as "door" | "konnektora" | "external"; if (next === "konnektora" && user?.accountType !== "corporate" && !["admin", "super_admin"].includes(user?.role ?? "user")) { window.alert('Sadece kurumsal üyeler "Konnektora online satış" ayarını tercih edebilir.'); return; } setTicketSalesPlatforms((items) => { const copy = [...items]; copy[index] = next; return copy; }); }}>
                          <option value="door">Kapıda ödeme</option>
                          <option value="konnektora">Konnektora online satış</option>
                          <option value="external">Diğer platform</option>
                        </select>
                      </label>
                      {ticketSalesPlatforms[index] === "external" ? <label>
                        Dış satış URL'si
                        <input defaultValue={editingEvent?.ticketTypes?.[index]?.externalSalesUrl ?? ""} name="ticketExternalSalesUrl" placeholder="https://" required type="url" />
                      </label> : <input name="ticketExternalSalesUrl" type="hidden" value=""/>}
                      <label>
                        Kontenjan
                        <input defaultValue={editingEvent?.ticketTypes?.[index]?.capacity ?? ""} min="1" name="ticketCapacity" type="number" />
                      </label>
                      <label>
                        Kişi başına maksimum bilet
                        <input defaultValue={editingEvent?.ticketTypes?.[index]?.perUserLimit ?? ""} max="20" min="1" name="ticketPerUserLimit" type="number" />
                      </label>
                      {editingEvent ? <label>Bilet durumu<select defaultValue={editingEvent.ticketTypes?.[index]?.status ?? "active"} name="ticketStatus" onChange={(event) => { const previous = editingEvent.ticketTypes?.[index]?.status ?? "active"; if (event.currentTarget.value !== previous && !window.confirm(event.currentTarget.value === "inactive" ? "Bu bilet pasif yapılsın mı? Yeni satışlarda listelenmeyecek, mevcut biletler iptal edilmeyecek." : "Bu bilet yeniden aktif yapılsın mı? Satış koşulları uygunsa tekrar listelenecek.")) event.currentTarget.value = previous; }}><option value="active">Aktif</option><option value="inactive">Pasif</option></select></label> : <input name="ticketStatus" type="hidden" value="active"/>}
                      <label>
                        Satış başlangıcı
                        <input
                          name="ticketSaleStartsAt"
                          type="datetime-local"
                        />
                      </label>
                      <label>
                        Satış bitişi
                        <input name="ticketSaleEndsAt" type="datetime-local" />
                      </label>
                      <label>
                        Gate açılışı
                        <input name="ticketGateOpensAt" type="datetime-local" />
                      </label>
                      <label>
                        Gate kapanışı
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
                  <Plus size={16} /> Yeni bir bilet tanımla
                </button>
                <button
                  className="secondary-action"
                  disabled={eventMutation.isPending}
                  type="submit"
                >
                  <Plus size={18} />
                  {editingEvent ? "Değişiklikleri kaydet" : "Etkinlik yayınla"}
                </button>
                <div className="event-step-actions">
                  <button onClick={() => setEventStep(5)} type="button">
                    Geri
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

const notificationTopicLabels: Record<NotificationPreference["topic"], string> =
  {
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

function MemberList({
  members,
  onToggle,
  title,
}: {
  members: MemberCard[];
  onToggle: (member: MemberCard) => void;
  title: string;
}) {
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
                  {member.commonTagCount} ortak ilgi alanı ·{" "}
                  {member.followerCount} takipçi
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

function PrivacyAudienceField({
  defaultValue,
  label,
  name,
}: {
  defaultValue: PrivacyAudience;
  label: string;
  name: string;
}) {
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

function ProfileMediaPanel({
  media,
  userId,
}: {
  media: ProfileMedia[];
  userId: string;
}) {
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
    onError: () =>
      setNotice({ tone: "error", message: "Son profil fotoğrafı silinemez." }),
  });
  const reorderMutation = useMutation({
    mutationFn: reorderProfileMedia,
    onSuccess: refresh,
    onError: () =>
      setNotice({ tone: "error", message: "Albüm sırası değiştirilemedi." }),
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
        <h2>Profil fotoğrafları</h2>
        <span>{media.length} / 50 medya</span>
      </div>
      <div className="guest-invite-form">
        <label>
          Yeni fotoğraf veya video
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
          <span className="form-help">Yükleniyor…</span>
        ) : null}
      </div>
      {media.length === 0 ? (
        <p className="form-help">
          Profilini tamamlamak için ilk olarak bir fotoğraf yükle.
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
                alt={`Profil albümü ${index + 1}`}
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
              {item.isProfilePicture ? "Profil resmi" : `${index + 1}. medya`}
            </strong>
            <div className="row-actions">
              {!item.isProfilePicture && item.type === "image" ? (
                <button
                  className="secondary-action"
                  disabled={isPending}
                  onClick={() => profilePictureMutation.mutate(item.id)}
                  type="button"
                >
                  Profil resmi yap
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
        <h2>Etkinliklerim</h2>
        <span>{isLoading ? "Yükleniyor" : `${events.length} etkinlik`}</span>
      </div>
      {events.length === 0 && !isLoading ? (
        <p className="muted">Henüz etkinlik oluşturmadın.</p>
      ) : null}
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
              <span className="muted">
                {event.tags.map((tag) => tag.name).join(", ") || "Tag yok"}
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
                  Guest list
                </button>
                {event.status !== "archived" ? (
                  <button
                    className="danger-action"
                    disabled={archiveMutation.isPending}
                    onClick={() => archiveMutation.mutate(event.id)}
                    type="button"
                  >
                    Arşivle
                  </button>
                ) : null}
              </div>
            </div>
            {guestListEventId === event.id ? (
              <OrganizerGuestList eventId={event.id} />
            ) : null}
          </div>
        ))}
      </div>
      {tags.length === 0 ? (
        <p className="form-help">
          Etkinlik oluşturmak için önce bir tag ekleyebilirsin.
        </p>
      ) : null}
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
    mutationFn: (input: { email: string; name?: string; role?: string }) =>
      inviteEventParticipant(eventId, input, "user"),
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
    mutationFn: (input: { userId: string; status: string }) =>
      updateEventParticipantStatus(eventId, input.userId, input.status, "user"),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["event-participants", eventId, "organizer"],
      });
    },
  });
  const checkInMutation = useMutation({
    mutationFn: (userId: string) =>
      checkInEventParticipant(eventId, userId, "user"),
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
    const rawValue = String(
      new FormData(formElement).get("ticket") || "",
    ).trim();
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
        <span>
          {participantsQuery.isLoading
            ? "Yükleniyor"
            : `${participants.length} kişi`}
        </span>
      </div>
      <form className="guest-invite-form" onSubmit={handleInviteSubmit}>
        <label>
          Email
          <input
            name="email"
            placeholder="member@example.com"
            required
            type="email"
          />
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
        <button
          className="secondary-action"
          disabled={inviteMutation.isPending}
          type="submit"
        >
          <Plus size={16} />
          Davet et
        </button>
      </form>
      <form className="guest-invite-form" onSubmit={handleTicketScan}>
        <label>
          QR bilet verisi
          <input
            name="ticket"
            placeholder="QR kodunu tara veya içeriğini yapıştır"
            required
          />
        </label>
        <button
          className="secondary-action"
          disabled={ticketScanMutation.isPending}
          type="submit"
        >
          <ClipboardCheck size={16} />
          {ticketScanMutation.isPending ? "Doğrulanıyor" : "QR ile giriş"}
        </button>
      </form>
      {notice ? (
        <ServiceFeedback compact message={notice.message} tone={notice.tone} />
      ) : null}
      <div className="guest-list">
        {participants.map((participant) => (
          <OrganizerGuestListRow
            isPending={statusMutation.isPending || checkInMutation.isPending}
            key={participant.id}
            onCheckIn={() => checkInMutation.mutate(participant.userId)}
            onStatusChange={(status) =>
              statusMutation.mutate({ userId: participant.userId, status })
            }
            participant={participant}
          />
        ))}
      </div>
    </div>
  );
}

function OrganizerGuestListRow({
  isPending,
  onCheckIn,
  onStatusChange,
  participant,
}: {
  isPending: boolean;
  onCheckIn: () => void;
  onStatusChange: (status: string) => void;
  participant: EventParticipant;
}) {
  return (
    <div className="guest-list-row">
      <div>
        <strong>{participant.user?.name ?? "Community member"}</strong>
        <span>{participant.user?.email ?? participant.userId}</span>
      </div>
      <span className={`status-pill status-${participant.status}`}>
        {participant.status}
      </span>
      <span className="muted">{participant.role}</span>
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
              Kabul
            </button>
            <button
              className="danger-action"
              disabled={isPending}
              onClick={() => onStatusChange("declined")}
              type="button"
            >
              <X size={16} />
              Ret
            </button>
          </>
        ) : null}
        {(participant.status === "accepted" ||
          participant.status === "invited") &&
        !participant.checkedInAt ? (
          <button
            className="secondary-action"
            disabled={isPending}
            onClick={onCheckIn}
            type="button"
          >
            <ClipboardCheck size={16} />
            Check-in
          </button>
        ) : null}
        {participant.status !== "banned" &&
        participant.status !== "attended" ? (
          <button
            className="ghost-action"
            disabled={isPending}
            onClick={() => onStatusChange("banned")}
            type="button"
          >
            Ban
          </button>
        ) : null}
      </div>
    </div>
  );
}
