import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Plus, UserRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  type AdminEventInput,
  clearUserSession,
  createUserTag,
  createUserEvent,
  getUserSession,
  getProfileInterests,
  isMockApiMode,
  listTags,
  registerUser,
  setUserSession,
  updateProfileInterests,
  userLogin
} from "../lib/api";

export function AccountPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(() => getUserSession());
  const [mode, setMode] = useState<"login" | "register">("register");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: listTags });
  const interestsQuery = useQuery({
    queryKey: ["profile-interests", user?.id],
    queryFn: getProfileInterests,
    enabled: Boolean(user)
  });
  const interestTagIds = interestsQuery.data?.map((tag) => tag.id) ?? [];
  const interestTags = tags.filter((tag) => interestTagIds.includes(tag.id));

  const authMutation = useMutation({
    mutationFn: (input: { name?: string; email: string; password: string }) =>
      mode === "register"
        ? registerUser({ name: input.name ?? "", email: input.email, password: input.password })
        : userLogin(input.email, input.password),
    onSuccess: (response) => {
      setUserSession(response);
      setUser(response.user);
      void queryClient.invalidateQueries({ queryKey: ["profile-interests", response.user.id] });
      setNotice({ tone: "success", message: "Giriş yapıldı. Artık etkinlik oluşturabilirsin." });
    },
    onError: () => setNotice({ tone: "error", message: "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar dene." })
  });

  const eventMutation = useMutation({
    mutationFn: createUserEvent,
    onSuccess: () => {
      setNotice({ tone: "success", message: "Etkinlik yayınlandı ve public listede görünür." });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
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
      password: String(form.get("password"))
    });
  }

  function handleEventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const startsAt = String(form.get("startsAt"));
    const coverImageUrl = String(form.get("coverImageUrl") || "");
    const capacity = Number(form.get("capacity") || 0);
    const input: AdminEventInput = {
      title: String(form.get("title")),
      summary: String(form.get("summary")),
      description: String(form.get("description")),
      startsAt: new Date(startsAt).toISOString(),
      timezone: String(form.get("timezone") || "Europe/Istanbul"),
      format: String(form.get("format") || "online"),
      visibility: String(form.get("visibility") || "open"),
      status: "published",
      city: String(form.get("city") || ""),
      country: String(form.get("country") || ""),
      language: String(form.get("language") || "en"),
      organizerName: user?.name ?? "Konnektora User",
      tagIds: form.getAll("tagIds").map(String)
    };

    if (coverImageUrl) {
      input.coverImageUrl = coverImageUrl;
    }

    if (capacity > 0) {
      input.capacity = capacity;
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
              <label>
                Ad Soyad
                <input autoComplete="name" name="name" placeholder="Kadir Erbakar" required minLength={2} />
              </label>
            ) : null}
            <label>
              Email
              <input autoComplete="email" name="email" placeholder="user@konnektora.local" required type="email" />
            </label>
            <label>
              Şifre
              <input autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} name="password" required type="password" />
            </label>
            <button className="primary-action" disabled={authMutation.isPending} type="submit">
              <UserRound size={18} />
              {mode === "register" ? "Üye ol" : "Giriş yap"}
            </button>
          </form>
        </div>
      ) : (
        <div className="account-grid">
          <aside className="account-summary">
            <UserRound size={28} />
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <span>Rol: {user.role}</span>
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
            <form className="admin-form" onSubmit={handleTagSubmit}>
              <h2>Tag oluştur</h2>
              <p className="form-help">Var olan tag'leri önce arayıp öneriyoruz; yeni ihtiyaç varsa kullanıcılar direkt aktif tag oluşturabilir.</p>
              <div className="form-grid">
                <label>
                  Tag adı
                  <input name="name" placeholder="AI Builders" required minLength={2} maxLength={80} />
                </label>
                <label>
                  Kısa açıklama
                  <input name="description" placeholder="Optional" maxLength={500} />
                </label>
              </div>
              <button className="secondary-action" disabled={tagMutation.isPending} type="submit">
                <Plus size={18} />
                {tagMutation.isPending ? "Oluşturuluyor" : "Tag oluştur"}
              </button>
            </form>
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
                Özet
                <textarea name="summary" required minLength={10} rows={2} />
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
                  Dil
                  <input name="language" defaultValue="en" />
                </label>
                <label>
                  Şehir
                  <input name="city" placeholder="Istanbul" />
                </label>
                <label>
                  Ülke
                  <input name="country" placeholder="Turkey" />
                </label>
                <label>
                  Zaman dilimi
                  <input name="timezone" defaultValue="Europe/Istanbul" />
                </label>
                <label>
                  Kapasite
                  <input min={1} name="capacity" type="number" />
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
