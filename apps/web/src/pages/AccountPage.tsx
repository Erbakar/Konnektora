import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardCheck, LogOut, Plus, UserRound, Users, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { AccountType, Event, EventParticipant, Tag } from "@konnektora/shared";
import {
  type AdminEventInput,
  type RegistrationInput,
  archiveMyEvent,
  checkInEventParticipant,
  changePassword,
  clearUserSession,
  createUserEvent,
  createUserTag,
  getProfileInterests,
  getMyProfile,
  getUserSession,
  getUserToken,
  inviteEventParticipant,
  isMockApiMode,
  listMyNotifications,
  listEventParticipants,
  listMyEvents,
  listTags,
  markMyNotificationRead,
  registerUser,
  requestEmailVerification,
  requestPasswordReset,
  setUserSession,
  updateEventParticipantStatus,
  updateMyEvent,
  updateProfileInterests,
  updateMyProfile,
  userLogin
} from "../lib/api";

export function AccountPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(() => getUserSession());
  const [mode, setMode] = useState<"login" | "register">("register");
  const [registrationAccountType, setRegistrationAccountType] = useState<AccountType>("individual");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: listTags });
  const myEventsQuery = useQuery({
    queryKey: ["my-events", user?.id],
    queryFn: listMyEvents,
    enabled: Boolean(user)
  });
  const interestsQuery = useQuery({
    queryKey: ["profile-interests", user?.id],
    queryFn: getProfileInterests,
    enabled: Boolean(user)
  });
  const profileQuery = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: getMyProfile,
    enabled: Boolean(user)
  });
  const notificationsQuery = useQuery({
    queryKey: ["my-notifications", user?.id],
    queryFn: listMyNotifications,
    enabled: Boolean(user)
  });
  const interestTagIds = interestsQuery.data?.map((tag) => tag.id) ?? [];
  const interestTags = tags.filter((tag) => interestTagIds.includes(tag.id));

  const authMutation = useMutation({
    mutationFn: (input: RegistrationInput) =>
      mode === "register"
        ? registerUser(input)
        : userLogin(input.email, input.password),
    onSuccess: (response) => {
      setUserSession(response);
      setUser(response.user);
      void queryClient.invalidateQueries({ queryKey: ["profile-interests", response.user.id] });
      setNotice({
        tone: "success",
        message:
          response.user.status === "pending"
            ? "Hesap oluşturuldu. Email doğrulama linkini kontrol et."
            : "Giriş yapıldı. Artık etkinlik oluşturabilirsin."
      });
    },
    onError: () => setNotice({ tone: "error", message: "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar dene." })
  });
  const forgotPasswordMutation = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: () => setNotice({ tone: "success", message: "Şifre sıfırlama linki email adresine gönderildi." }),
    onError: () => setNotice({ tone: "error", message: "Şifre sıfırlama isteği gönderilemedi." })
  });
  const resendVerificationMutation = useMutation({
    mutationFn: requestEmailVerification,
    onSuccess: () => setNotice({ tone: "success", message: "Doğrulama emaili tekrar gönderildi." }),
    onError: () => setNotice({ tone: "error", message: "Doğrulama emaili gönderilemedi." })
  });

  const eventMutation = useMutation({
    mutationFn: createUserEvent,
    onSuccess: () => {
      setNotice({ tone: "success", message: "Etkinlik yayınlandı ve public listede görünür." });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["my-events", user?.id] });
    },
    onError: () => setNotice({ tone: "error", message: "Etkinlik oluşturulamadı. Zorunlu alanları kontrol et." })
  });
  const tagMutation = useMutation({
    mutationFn: createUserTag,
    onSuccess: (tag) => {
      setNotice({ tone: "success", message: `${tag.name} tag'i hazır.` });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      void queryClient.invalidateQueries({ queryKey: ["tags", "home"] });
    },
    onError: () => setNotice({ tone: "error", message: "Tag oluşturulamadı. Aynı isimde sorunlu bir tag olabilir." })
  });
  const interestsMutation = useMutation({
    mutationFn: updateProfileInterests,
    onSuccess: (_, tagIds) => {
      queryClient.setQueryData(
        ["profile-interests", user?.id],
        tags.filter((tag) => tagIds.includes(tag.id))
      );
      setNotice({ tone: "success", message: "İlgi alanların kaydedildi." });
    },
    onError: () => setNotice({ tone: "error", message: "İlgi alanları kaydedilemedi. Lütfen tekrar dene." })
  });
  const profileMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (profile) => {
      const session = getUserSession();
      if (session) {
        const response = { accessToken: getUserToken() ?? "", user: { ...session, name: profile.name, accountType: profile.accountType } };
        setUserSession(response);
        setUser(response.user);
      }
      queryClient.setQueryData(["my-profile", profile.id], profile);
      setNotice({ tone: "success", message: "Profil bilgileri kaydedildi." });
    },
    onError: () => setNotice({ tone: "error", message: "Profil kaydedilemedi. Kullanıcı adı ve zorunlu alanları kontrol et." })
  });
  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => setNotice({ tone: "success", message: "Şifreniz değiştirildi." }),
    onError: () => setNotice({ tone: "error", message: "Şifre değiştirilemedi. Mevcut şifrenizi kontrol edin." })
  });
  const readNotificationMutation = useMutation({
    mutationFn: markMyNotificationRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["my-notifications", user?.id] })
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
      email: String(form.get("email")),
      password: String(form.get("password")),
      accountType: String(form.get("accountType") || "individual") as AccountType,
      companyName: String(form.get("companyName") || "") || undefined,
      tradeName: String(form.get("tradeName") || "") || undefined,
      companyType: String(form.get("companyType") || "") || undefined,
      businessCategory: String(form.get("businessCategory") || "") || undefined
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
      tagIds: form.getAll("tagIds").map(String)
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
      description: description || undefined
    });
    event.currentTarget.reset();
  }

  function handleInterestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedTagIds = form.getAll("interestTagIds").map(String);

    interestsMutation.mutate(selectedTagIds);
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
      website: value("website"),
      companyName: value("companyName"),
      tradeName: value("tradeName"),
      companyType: value("companyType"),
      businessCategory: value("businessCategory")
    });
  }

  function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") || "");
    const newPassword = String(form.get("newPassword") || "");
    const confirmation = String(form.get("newPasswordAgain") || "");
    if (newPassword !== confirmation) {
      setNotice({ tone: "error", message: "Yeni şifreler birbiriyle eşleşmiyor." });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
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
      {user?.status === "pending" ? (
        <button className="secondary-action" disabled={resendVerificationMutation.isPending} onClick={() => resendVerificationMutation.mutate(user.email)} type="button">
          Doğrulama emailini tekrar gönder
        </button>
      ) : null}

      {!user ? (
        <div className="account-grid">
          <div>
            <p className="lead">
              Üye hesabı oluştur, giriş yap ve Konnektora community içinde kendi etkinliğini yayınla.
            </p>
            {isMockApiMode ? (
              <p className="form-help">Demo modunda üyelik ve etkinlikler bu tarayıcıya kaydedilir.</p>
            ) : null}
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
                        <option disabled value="">Seçiniz</option>
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
                        <option disabled value="">Seçiniz</option>
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
              <input autoComplete="email" name="email" placeholder="user@konnektora.local" required type="email" />
            </label>
            <label>
              Şifre
              <input
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                maxLength={128}
                minLength={8}
                name="password"
                pattern={mode === "register" ? "(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,128}" : undefined}
                required
                title={mode === "register" ? "En az 8 karakter, bir büyük harf, bir küçük harf ve bir özel karakter kullanın." : undefined}
                type="password"
              />
            </label>
            <button className="primary-action" disabled={authMutation.isPending} type="submit">
              <UserRound size={18} />
              {mode === "register" ? "Üye ol" : "Giriş yap"}
            </button>
            {mode === "login" ? (
              <button
                className="ghost-action"
                disabled={forgotPasswordMutation.isPending}
                onClick={() => {
                  const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]');
                  if (emailInput?.value) {
                    forgotPasswordMutation.mutate(emailInput.value);
                  }
                }}
                type="button"
              >
                Şifremi unuttum
              </button>
            ) : null}
          </form>
        </div>
      ) : (
        <div className="account-grid">
          <aside className="account-summary">
            <UserRound size={28} />
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
                    <input defaultValue={profileQuery.data.username ?? ""} name="username" minLength={2} maxLength={80} pattern="[A-Za-zÀ-ž0-9 .-]+" />
                  </label>
                  <label>
                    Telefon
                    <input defaultValue={profileQuery.data.phone ?? ""} name="phone" type="tel" />
                  </label>
                  <label>
                    Web sitesi
                    <input defaultValue={profileQuery.data.website ?? ""} name="website" placeholder="https://" type="url" />
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
            <form className="admin-form" onSubmit={handleChangePassword}>
              <h2>Şifre değiştir</h2>
              <label>
                Mevcut şifre
                <input autoComplete="current-password" minLength={8} name="currentPassword" required type="password" />
              </label>
              <div className="form-grid">
                <label>
                  Yeni şifre
                  <input autoComplete="new-password" maxLength={128} minLength={8} name="newPassword" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,128}" required type="password" />
                </label>
                <label>
                  Yeni şifre tekrar
                  <input autoComplete="new-password" maxLength={128} minLength={8} name="newPasswordAgain" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,128}" required type="password" />
                </label>
              </div>
              <button className="secondary-action" disabled={changePasswordMutation.isPending} type="submit">
                {changePasswordMutation.isPending ? "Değiştiriliyor" : "Şifreyi değiştir"}
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
                        <span>{notification.body}</span>
                        <span>{notification.createdAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.createdAt)) : ""}</span>
                      </div>
                      <span className={`status-pill status-${notification.readAt ? "resolved" : "open"}`}>
                        {notification.readAt ? "Okundu" : "Yeni"}
                      </span>
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
            <MyEventsPanel
              events={myEventsQuery.data ?? []}
              isLoading={myEventsQuery.isLoading}
              tags={tags}
              userId={user.id}
            />
            <form className="admin-form" onSubmit={handleInterestSubmit}>
              <h2>İlgi alanları</h2>
              <p className="form-help">Seçtiğin tag'ler profilinde görünür ve etkinlik oluştururken varsayılan seçili gelir.</p>
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
                  </label>
                ))}
              </fieldset>
              <button className="secondary-action" type="submit">
                {interestsMutation.isPending ? "Kaydediliyor" : "İlgi alanlarını kaydet"}
              </button>
            </form>
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

function MyEventsPanel({
  events,
  isLoading,
  tags,
  userId
}: {
  events: Event[];
  isLoading: boolean;
  tags: Tag[];
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [guestListEventId, setGuestListEventId] = useState<string | null>(null);
  const updateMutation = useMutation({
    mutationFn: (input: { id: string; data: Partial<AdminEventInput> }) => updateMyEvent(input.id, input.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-events", userId] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    }
  });
  const archiveMutation = useMutation({
    mutationFn: archiveMyEvent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-events", userId] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    }
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
                  {event.status} · {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(event.startsAt))}
                </span>
              </div>
              <span className="muted">{event.tags.map((tag) => tag.name).join(", ") || "Tag yok"}</span>
              <div className="row-actions">
                {event.status !== "published" && event.status !== "archived" ? (
                  <button
                    className="secondary-action"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: event.id, data: { status: "published" } })}
                    type="button"
                  >
                    Yayınla
                  </button>
                ) : null}
                {event.status !== "draft" && event.status !== "archived" ? (
                  <button
                    className="secondary-action"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: event.id, data: { status: "draft" } })}
                    type="button"
                  >
                    Taslak
                  </button>
                ) : null}
                <button
                  className="secondary-action"
                  onClick={() => setGuestListEventId((currentId) => (currentId === event.id ? null : event.id))}
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
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const participantsQuery = useQuery({
    queryKey: ["event-participants", eventId, "organizer"],
    queryFn: () => listEventParticipants(eventId, "user")
  });
  const inviteMutation = useMutation({
    mutationFn: (input: { email: string; name?: string; role?: string }) => inviteEventParticipant(eventId, input, "user"),
    onSuccess: () => {
      setNotice({ tone: "success", message: "Davet guest list'e eklendi." });
      void queryClient.invalidateQueries({ queryKey: ["event-participants", eventId, "organizer"] });
    },
    onError: () => setNotice({ tone: "error", message: "Davet eklenemedi. Email adresini kontrol et." })
  });
  const statusMutation = useMutation({
    mutationFn: (input: { userId: string; status: string }) =>
      updateEventParticipantStatus(eventId, input.userId, input.status, "user"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["event-participants", eventId, "organizer"] });
    }
  });
  const checkInMutation = useMutation({
    mutationFn: (userId: string) => checkInEventParticipant(eventId, userId, "user"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["event-participants", eventId, "organizer"] });
    }
  });
  const participants = participantsQuery.data ?? [];

  function handleInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    inviteMutation.mutate({
      email: String(form.get("email")),
      name: String(form.get("name") || "") || undefined,
      role: String(form.get("role") || "attendee")
    });
    event.currentTarget.reset();
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
      {notice ? <p className={notice.tone === "success" ? "form-success" : "form-error"}>{notice.message}</p> : null}
      <div className="guest-list">
        {participants.map((participant) => (
          <OrganizerGuestListRow
            isPending={statusMutation.isPending || checkInMutation.isPending}
            key={participant.id}
            onCheckIn={() => checkInMutation.mutate(participant.userId)}
            onStatusChange={(status) => statusMutation.mutate({ userId: participant.userId, status })}
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
  participant
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
