import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Ban,
  CalendarDays,
  Flag,
  Globe2,
  Heart,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  MoreVertical,
  Settings,
  Share2,
  ThumbsDown,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DiscoveryCard } from "../components/DiscoveryCard";
import { NotificationDialog, ShareDialog } from "../components/ContentDialogs";
import { ReportDialog } from "../components/ReportDialog";
import {
  createBlock,
  createUserTag,
  createProfileTagSuggestion,
  decideProfileTagSuggestion,
  createGuestList,
  followUser,
  getPublicProfile,
  getPublicProfileById,
  recordContentAction,
  recordContentView,
  getContentNotification,
  getUserSession,
  addGuestListMember,
  listGuestLists,
  listProfileTagSuggestions,
  removeBlock,
  setContentNotification,
  unfollowUser,
  resolveMediaUrl,
  getProfileAffinities,
  listTags,
  updateProfileAffinities,
} from "../lib/api";
import { useLanguage } from "../lib/i18n";
import { useGuestListEntitlement } from "../lib/useGuestListEntitlement";

function ageFrom(value: string | Date) {
  const birth = new Date(value);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  )
    age -= 1;
  return Math.max(0, age);
}

function publicUsername(username: string | null | undefined) {
  return username &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      username,
    )
    ? username
    : null;
}

function SentimentIcon({ sentiment }: { sentiment: "like" | "ok" | "dislike" }) {
  const Icon = sentiment === "like" ? Heart : sentiment === "dislike" ? ThumbsDown : Minus;
  return <Icon aria-hidden="true" data-sentiment-icon={sentiment} size={17} />;
}

export function PublicProfilePage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const { username = "", userId = "" } = useParams();
  const user = getUserSession();
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [tagName, setTagName] = useState("");
  const [addedTagCount, setAddedTagCount] = useState(0);
  const [addedTagNames, setAddedTagNames] = useState<string[]>([]);
  const [selectedSentiment, setSelectedSentiment] = useState<
    "like" | "ok" | "dislike"
  >("like");
  const [profileEventTab, setProfileEventTab] = useState<
    "future" | "past" | "organizer"
  >("future");
  const [profilePlaceTab, setProfilePlaceTab] = useState<"all" | "organizer">(
    "all",
  );
  const profileQuery = useQuery({
    queryKey: ["public-profile", username || userId, user?.id],
    queryFn: () =>
      userId ? getPublicProfileById(userId) : getPublicProfile(username),
    enabled: Boolean(username || userId),
  });
  const profile = profileQuery.data;
  useEffect(() => {
    if (profile?.id) void recordContentView("user", profile.id);
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.id && (profile.city || profile.country || profile.address || profile.district)) void recordContentAction("user", profile.id, "location_view");
  }, [profile?.address, profile?.city, profile?.country, profile?.district, profile?.id]);
  const notification = useQuery({
    queryKey: ["content-notification", "user", profile?.id],
    queryFn: () => getContentNotification("user", profile!.id),
    enabled: Boolean(user && profile && !profile.relationship.isSelf),
  });
  const { canUseGuestLists } = useGuestListEntitlement();
  const namedGuestLists = useQuery({
    queryKey: ["guest-lists", user?.id],
    queryFn: listGuestLists,
    enabled: Boolean(user && guestOpen),
  });
  const allTags = useQuery({
    queryKey: ["tags", "profile-dialog"],
    queryFn: () => listTags(),
    enabled: tagDialogOpen,
  });
  const ownAffinities = useQuery({
    queryKey: ["profile-affinities", user?.id, "profile-dialog"],
    queryFn: getProfileAffinities,
    enabled: Boolean(user && profile?.relationship.isSelf && tagDialogOpen),
  });
  const tagSuggestions = useQuery({
    queryKey: ["profile-tag-suggestions", user?.id],
    queryFn: listProfileTagSuggestions,
    enabled: Boolean(user),
  });
  const notificationMutation = useMutation({
    mutationFn: () =>
      setContentNotification("user", profile!.id, !notification.data?.enabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["content-notification", "user", profile?.id],
      });
      setNotificationOpen(false);
    },
  });
  const namedGuestMutation = useMutation({
    mutationFn: (listId: string) => addGuestListMember(listId, profile!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["guest-lists", user?.id],
      });
      setGuestOpen(false);
    },
  });
  const createNamedGuestList = useMutation({
    mutationFn: (name: string) => createGuestList(name),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["guest-lists", user?.id] }),
  });
  const addTagMutation = useMutation({
    mutationFn: async () => {
      let tagId = selectedTagId;
      if (!tagId) {
        const existing = allTags.data?.find(
          (tag) =>
            tag.name.toLocaleLowerCase("tr-TR") ===
            tagName.trim().toLocaleLowerCase("tr-TR"),
        );
        tagId =
          existing?.id ?? (await createUserTag({ name: tagName.trim() })).id;
      }
      if (profile!.relationship.isSelf)
        return updateProfileAffinities([
          ...(ownAffinities.data ?? [])
            .filter((item) => item.tag.id !== tagId)
            .map((item) => ({ tagId: item.tag.id, sentiment: item.sentiment })),
          { tagId, sentiment: selectedSentiment },
        ]);
      return createProfileTagSuggestion(profile!.id, {
        tagId,
        sentiment: selectedSentiment,
      });
    },
    onSuccess: async () => {
      const addedName = tagName.trim();
      setSelectedTagId("");
      setTagName("");
      setAddedTagCount((count) => count + 1);
      if (addedName) setAddedTagNames((names) => [...new Set([...names, addedName])]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["public-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-affinities"] }),
        queryClient.invalidateQueries({
          queryKey: ["profile-tag-suggestions"],
        }),
        queryClient.invalidateQueries({ queryKey: ["tags"] }),
      ]);
    },
  });
  const decideTagMutation = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "accept" | "decline" | "cancel";
    }) => decideProfileTagSuggestion(id, action),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["profile-tag-suggestions"],
        }),
        queryClient.invalidateQueries({ queryKey: ["public-profile"] }),
      ]);
    },
  });
  const followMutation = useMutation({
    mutationFn: () =>
      profile?.relationship.following
        ? unfollowUser(profile.id)
        : followUser(profile!.id),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["public-profile", username],
      }),
  });
  const blockMutation = useMutation({
    mutationFn: () => profile!.relationship.blockedByViewer
      ? removeBlock("user", profile!.id)
      : createBlock("user", profile!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["public-profile"] });
    },
  });
  if (profileQuery.isLoading)
    return (
      <section className="page route-loading" role="status">
        {t("Profil yükleniyor…", "Loading profile…")}
      </section>
    );
  if (!profile)
    return (
      <section className="page empty-state">
        <h1>{t("Profil bulunamadı", "Profile not found")}</h1>
        <p>{t("Bu kullanıcı mevcut değil, aktif değil veya görüntülenemiyor.", "This user does not exist, is inactive or cannot be viewed.")}</p>
        <Link className="primary-action" to="/search">
          {t("Aramaya dön", "Back to search")}
        </Link>
      </section>
    );
  const profilePhoto =
    profile.media.find(
      (item) => item.isProfilePicture && item.type === "image",
    ) ?? profile.media.find((item) => item.type === "image");
  const addedTagNameSet = new Set(addedTagNames.map((name) => name.toLocaleLowerCase("tr-TR")));
  const relevantCategoryIds = new Set([
    ...profile.interests.map((interest) => interest.tag.categoryId),
    ...(allTags.data ?? [])
      .filter((tag) => addedTagNameSet.has(tag.name.toLocaleLowerCase("tr-TR")))
      .map((tag) => tag.categoryId),
  ].filter(Boolean));
  const smartTagSuggestions = (allTags.data ?? [])
    .filter((tag) => !profile.interests.some((interest) => interest.tag.id === tag.id))
    .filter((tag) => !addedTagNameSet.has(tag.name.toLocaleLowerCase("tr-TR")))
    .filter((tag) => !(tagSuggestions.data ?? []).some((suggestion) => suggestion.targetUserId === profile.id && suggestion.tagId === tag.id))
    .sort((a, b) => {
      const categoryDifference = Number(relevantCategoryIds.has(b.categoryId)) - Number(relevantCategoryIds.has(a.categoryId));
      return categoryDifference || b.usageCount - a.usageCount || a.name.localeCompare(b.name, language);
    })
    .slice(0, 12);

  return (
    <section className="page public-profile-page">
      <header className="public-profile-hero">
        <button
          aria-label={t("Medya galerisini aç", "Open media gallery")}
          className="public-profile-avatar"
          onClick={() => setGalleryIndex(0)}
          type="button"
        >
          {profilePhoto ? (
            <img
              alt={t(`${profile.name} profil fotoğrafı`, `${profile.name} profile picture`)}
              src={resolveMediaUrl(profilePhoto.url)}
            />
          ) : (
            profile.name.slice(0, 1).toUpperCase()
          )}
        </button>
        {profile.media.length > 1 ? (
          <div className="profile-media-thumbnails">
            {profile.media
              .filter((item) => item.id !== profilePhoto?.id)
              .slice(0, 3)
              .map((media, index, shown) => (
                <button
                  key={media.id}
                  onClick={() =>
                    setGalleryIndex(
                      profile.media.findIndex((item) => item.id === media.id),
                    )
                  }
                  type="button"
                >
                  {media.type === "video" ? (
                    <video muted src={resolveMediaUrl(media.url)} />
                  ) : (
                    <img alt="" src={resolveMediaUrl(media.url)} />
                  )}{" "}
                  {index === shown.length - 1 &&
                  profile.media.length - 1 > shown.length ? (
                    <span>+{profile.media.length - 1 - shown.length}</span>
                  ) : null}
                </button>
              ))}
          </div>
        ) : null}
        <div className="public-profile-heading">
          <span className="eyebrow">
            {profile.accountType === "corporate"
              ? t("Kurumsal üye", "Business member")
              : t("Konnektora üyesi", "Konnektora member")}
          </span>
          <h1>
            {profile.name}
            {profile.verified ? (
              <BadgeCheck
                aria-label={t("Doğrulanmış profil", "Verified profile")}
                className="verified-badge"
                size={25}
              />
            ) : null}
          </h1>
          {publicUsername(profile.username) ? (
            <strong>@{publicUsername(profile.username)}</strong>
          ) : (
            <strong>{profile.name}</strong>
          )}
          <div className="profile-metrics">
            <button
              aria-expanded={privacyNotice}
              className={privacyNotice ? "tooltip-open" : undefined}
              data-tooltip={t("Kimin kimi takip ettiğini kimse göremez.", "Nobody can see who follows whom.")}
              onBlur={() => setPrivacyNotice(false)}
              onClick={() => setPrivacyNotice((open) => !open)}
              title={t("Kimin kimi takip ettiğini kimse göremez.", "Nobody can see who follows whom.")}
              type="button"
            >
              <b>{profile.followerCount}</b> {t("takipçi", "followers")}
            </button>
            {profile.relationship.isSelf ? (
              <Link to="/community?scope=following">
                <b>{profile.followingCount}</b> {t("takip", "following")}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="public-profile-actions">
          {profile.relationship.isSelf ? (
            <Link className="primary-action" to="/settings">
              {t("Profili düzenle", "Edit profile")}
            </Link>
          ) : user ? (
            <>
              {!profile.relationship.blockedByViewer ? <button
                className={
                  profile.relationship.following
                    ? "secondary-action"
                    : "primary-action"
                }
                disabled={followMutation.isPending}
                onClick={() => followMutation.mutate()}
                type="button"
              >
                {profile.relationship.following ? (
                  <UserCheck size={18} />
                ) : (
                  <UserPlus size={18} />
                )}
                {profile.relationship.following ? t("Takipte", "Following") : t("Takip et", "Follow")}
              </button> : null}
              {profile.relationship.canMessage ? (
                <Link
                  className="secondary-action"
                  to={`/messages?peer=${profile.id}`}
                >
                  <Mail size={18} /> {t("Mesaj", "Message")}
                </Link>
              ) : null}
              <details className="action-menu profile-actions-menu">
                <summary aria-label={t("Profil aksiyonları", "Profile actions")} role="button">
                  <MoreVertical size={20} />
                </summary>
                <div>
                  {profile.relationship.canMessage ? (
                    <Link to={`/messages?peer=${profile.id}`}>
                      <Mail size={18} /> {t("Mesaj gönder", "Send message")}
                    </Link>
                  ) : null}
                  {!profile.relationship.blockedByViewer ? <button onClick={() => setNotificationOpen(true)} type="button">
                    {notification.data?.enabled
                      ? t("Bildirimleri kapat", "Turn off notifications")
                      : t("Bildirim ayarla", "Set a notification")}
                  </button> : null}
                  {canUseGuestLists && !profile.relationship.blockedByViewer ? <button onClick={() => setGuestOpen(true)} type="button">
                    <UserPlus size={18} /> {t("Misafir listesine ekle", "Add to guest list")}
                  </button> : null}
                  <Link to={`/stats/user/${profile.id}`}>
                    {t("Etkileşim istatistikleri", "Interaction statistics")}
                  </Link>
                  <button onClick={() => setShareOpen(true)} type="button">
                    <Share2 size={18} /> {t("Paylaş", "Share")}
                  </button>
                  <button
                    onClick={() => setReportOpen((open) => !open)}
                    type="button"
                  >
                    <Flag size={18} /> {t("Kullanıcıyı raporla", "Report user")}
                  </button>
                  <button
                    className="danger"
                    disabled={blockMutation.isPending}
                    onClick={() => blockMutation.mutate()}
                    type="button"
                  >
                    <Ban size={18} /> {profile.relationship.blockedByViewer
                      ? t("Engeli kaldır", "Unblock user")
                      : t("Kullanıcıyı engelle", "Block user")}
                  </button>
                </div>
              </details>
            </>
          ) : (
            <Link className="primary-action" to="/login">
              {t("Takip etmek için giriş yap", "Log in to follow")}
            </Link>
          )}
          {profile.relationship.isSelf ? (
            <details className="action-menu profile-actions-menu">
              <summary aria-label={t("Profil ayarları", "Profile settings")} role="button">
                <MoreVertical size={20} />
              </summary>
              <div>
                <Link to={`/stats/user/${profile.id}`}>
                  {t("Etkileşim istatistikleri", "Interaction statistics")}
                </Link>
                <Link to="/settings">
                  <Settings size={18} /> {t("Ayarlar", "Settings")}
                </Link>
                <button onClick={() => setShareOpen(true)} type="button">
                  <Share2 size={18} /> {t("Paylaş", "Share")}
                </button>
              </div>
            </details>
          ) : null}
        </div>
        <div className="profile-sidebar-facts" aria-label={t("Profil bilgileri", "Profile information")}>
          {profile.accountType === "individual" && profile.birthDate ? (
            <span>{t(`${ageFrom(profile.birthDate)} yaşında`, `${ageFrom(profile.birthDate)} years old`)}</span>
          ) : null}
          {profile.city || profile.country ? (
            <span>
              <MapPin size={15} />{" "}
              {[profile.city, profile.country].filter(Boolean).join(", ")}
            </span>
          ) : null}
          {profile.accountType === "corporate" ? (
            <>
              {profile.companyName ? (
                <span>
                  <strong>{t("İşletme:", "Business:")}</strong> {profile.companyName}
                </span>
              ) : null}
              {profile.tradeName ? (
                <span>
                  <strong>{t("Ticari unvan:", "Registered name:")}</strong> {profile.tradeName}
                </span>
              ) : null}
              {profile.companyType ? (
                <span>
                  <strong>{t("Şirket türü:", "Company type:")}</strong> {profile.companyType}
                </span>
              ) : null}
              {profile.businessCategory ? (
                <span>
                  <strong>{t("Kategori:", "Category:")}</strong> {profile.businessCategory}
                </span>
              ) : null}
              {profile.address || profile.district ? (
                <span>
                  <strong>{t("Adres:", "Address:")}</strong>{" "}
                  {[
                    profile.address,
                    profile.district,
                    profile.city,
                    profile.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              ) : null}
            </>
          ) : null}
          {profile.website ? (
            <a href={profile.website} onClick={() => void recordContentAction("user", profile.id, "website_click")} rel="noreferrer" target="_blank">
              <Globe2 size={16} /> {profile.website}
            </a>
          ) : null}
        </div>
      </header>
      <NotificationDialog
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        enabled={Boolean(notification.data?.enabled)}
        pending={notificationMutation.isPending}
        onConfirm={() => notificationMutation.mutate()}
        title={profile.name}
      />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        targetId={profile.id}
        targetType="user"
        title={profile.name}
        url={window.location.href}
      />
      {galleryIndex != null && profile.media[galleryIndex] ? (
        <div
          className="dialog-backdrop profile-gallery-dialog"
          role="presentation"
          onMouseDown={() => setGalleryIndex(null)}
        >
          <section
            aria-modal="true"
            className="content-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="section-header">
              <strong>
                {galleryIndex + 1} / {profile.media.length}
              </strong>
              <button onClick={() => setGalleryIndex(null)} type="button">
                {t("Kapat", "Close")}
              </button>
            </div>
            {profile.media[galleryIndex].type === "video" ? (
              <video
                autoPlay
                controls
                src={resolveMediaUrl(profile.media[galleryIndex].url)}
              />
            ) : (
              <img
                alt={t(`${profile.name} profil medyası`, `${profile.name} profile media`)}
                src={resolveMediaUrl(profile.media[galleryIndex].url)}
              />
            )}
            <div className="gallery-navigation">
              <button
                disabled={galleryIndex === 0}
                onClick={() =>
                  setGalleryIndex((value) => Math.max(0, (value ?? 0) - 1))
                }
                type="button"
              >
                {t("Önceki", "Previous")}
              </button>
              <button
                disabled={galleryIndex === profile.media.length - 1}
                onClick={() =>
                  setGalleryIndex((value) =>
                    Math.min(profile.media.length - 1, (value ?? 0) + 1),
                  )
                }
                type="button"
              >
                {t("Sonraki", "Next")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {guestOpen ? (
        <div
          className="emotion-modal"
          role="dialog"
          aria-modal="true"
          aria-label={t("Misafir listesine ekle", "Add to guest list")}
        >
          <div>
            <button aria-label={t("Kapat", "Close")} onClick={() => setGuestOpen(false)}>
              ×
            </button>
            <h2>{profile.name}</h2>
            <p>
              {t("Kullanıcıyı isimlendirilmiş bir Guest List'e ekle.", "Add the user to a named Guest List.")}
            </p>
            <form
              className="inline-create-guest-list"
              onSubmit={(event) => {
                event.preventDefault();
                const input = event.currentTarget.elements.namedItem(
                  "listName",
                ) as HTMLInputElement;
                if (input.value.trim()) {
                  createNamedGuestList.mutate(input.value.trim());
                  input.value = "";
                }
              }}
            >
              <input name="listName" placeholder={t("Yeni liste adı", "New list name")} />
              <button
                className="secondary-action"
                disabled={createNamedGuestList.isPending}
              >
                {t("Liste oluştur", "Create list")}
              </button>
            </form>
            <h3>{t("Misafir listeleri", "Guest lists")}</h3>
            <div className="admin-list">
              {namedGuestLists.data?.map((list) => (
                <button
                  className="admin-list-row"
                  disabled={
                    namedGuestMutation.isPending ||
                    list.members.some((member) => member.userId === profile.id)
                  }
                  key={list.id}
                  onClick={() => namedGuestMutation.mutate(list.id)}
                >
                  <strong>{list.name}</strong>
                  <span>
                    {list.members.length} {t("kişi", "people")}
                    {list.members.some((member) => member.userId === profile.id)
                      ? t(" · Zaten listede", " · Already added")
                      : ""}
                  </span>
                </button>
              ))}
            </div>
            {namedGuestMutation.isError ? (
              <p className="form-error">
                {t("Kullanıcı misafir listesine eklenemedi.", "The user could not be added to the guest list.")}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {!profile.relationship.isSelf && (profile.mutualism?.total ?? profile.commonInterestCount) > 0 ? (
        <Link
          className="mutualism-bar"
          to={userId ? `/users/id/${profile.id}/mutualism` : `/users/${profile.username}/mutualism`}
        >
          <strong>{t(`${profile.mutualism?.total ?? profile.commonInterestCount} ortak noktanız var`, `You have ${profile.mutualism?.total ?? profile.commonInterestCount} things in common`)}</strong>
          <span>{t("Mutualizm analizini gör →", "View mutualism analysis →")}</span>
        </Link>
      ) : null}
      <ReportDialog onClose={() => setReportOpen(false)} open={reportOpen} targetId={profile.id} targetType="user"/>
      <section className="identity-panel" id="interests">
        <div className="section-header compact">
          <h2>{t("İlgi alanları", "Interests")}</h2>
          {user && !profile.relationship.blockedByViewer ? (
            <button
              className="text-action"
              onClick={() => setTagDialogOpen(true)}
              type="button"
            >
              +{" "}
              {profile.relationship.isSelf
                ? t("Kendine etiket ekle", "Add a tag to yourself")
                : profile.gender === "female"
                  ? t("Ona etiket ekle", "Add a tag to her")
                  : profile.gender === "male"
                    ? t("Ona etiket ekle", "Add a tag to him")
                    : t("Ona etiket ekle", "Add a tag to them")}
            </button>
          ) : (
            <span>{profile.interests.length} {t("etiket", "tags")}</span>
          )}
        </div>
        <div className="profile-interest-list">
          {(tagSuggestions.data ?? [])
            .filter((item) => item.targetUserId === profile.id)
            .map((item) => (
              <article
                className="profile-interest profile-interest-pending"
                key={item.id}
              >
                <span>
                  <b
                    className={`interest-sentiment interest-sentiment-${item.sentiment}`}
                  >
                    <SentimentIcon sentiment={item.sentiment} />
                  </b>{" "}
                  <Link to={`/tags/${item.tag.slug}`}>{item.tag.name}</Link>
                </span>
                <small>
                  <Link to={`/users/id/${item.suggestedBy.id}`}>
                    @{item.suggestedBy.username ?? item.suggestedBy.name}
                  </Link>{" "}
                  {t("ekledi · Onay bekliyor", "added · Pending approval")}
                </small>
                {profile.relationship.isSelf &&
                item.targetUserId === profile.id ? (
                  <div className="row-actions">
                    <button
                      disabled={decideTagMutation.isPending}
                      onClick={() =>
                        decideTagMutation.mutate({
                          id: item.id,
                          action: "accept",
                        })
                      }
                    >
                      {t("Onayla", "Approve")}
                    </button>
                    <button
                      disabled={decideTagMutation.isPending}
                      onClick={() =>
                        decideTagMutation.mutate({
                          id: item.id,
                          action: "decline",
                        })
                      }
                    >
                      {t("Reddet", "Decline")}
                    </button>
                  </div>
                ) : item.suggestedById === user?.id ? (
                  <button
                    disabled={decideTagMutation.isPending}
                    onClick={() =>
                      decideTagMutation.mutate({
                        id: item.id,
                        action: "cancel",
                      })
                    }
                  >
                    {t("Vazgeç", "Cancel")}
                  </button>
                ) : null}
              </article>
            ))}
          {profile.interests.map((interest) => (
            <Link
              className="profile-interest"
              key={interest.tag.id}
              to={`/tags/${interest.tag.slug}?authorId=${profile.id}`}
            >
              <span>
                <b
                  className={`interest-sentiment interest-sentiment-${interest.sentiment}`}
                >
                  <SentimentIcon sentiment={interest.sentiment} />
                </b>{" "}
                {interest.tag.name}
              </span>
              <small>
                {interest.sentiment === "like"
                  ? t("Beğeniyor", "Likes")
                  : interest.sentiment === "dislike"
                    ? t("Beğenmiyor", "Dislikes")
                    : t("Nötr", "Neutral")}
                {interest.commentCount ? (
                  <>
                    {" "}
                    · <MessageCircle size={13} /> {interest.commentCount}{" "}
                    {t("gönderi", "posts")}
                  </>
                ) : null}
              </small>
            </Link>
          ))}
          {!profile.interests.length ? (
            <p className="form-help">{t("Henüz herkese açık ilgi alanı yok.", "There are no public interests yet.")}</p>
          ) : null}
        </div>
      </section>
      {tagDialogOpen ? (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={() => setTagDialogOpen(false)}
        >
          <form
            aria-modal="true"
            className="content-dialog add-profile-tag-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              if (selectedTagId || tagName.trim()) addTagMutation.mutate();
            }}
            role="dialog"
          >
            <div className="section-header">
              <div>
                <p className="eyebrow">{t("Profile etiket ekle", "Add a Tag to Profile")}</p>
                <h2>{t("Adım 1: Bir etiket seç veya yaz", "Step 1: Select or write a tag")}</h2>
              </div>
              <button onClick={() => setTagDialogOpen(false)} type="button">
                {t("Kapat", "Close")}
              </button>
            </div>
            <p>
              {addedTagCount === 0
                ? t("Sevdiğiniz kahve, müzik grubu, film; hatta sevmediğiniz alerjinize kadar her şey birer etiket olabilir.", "A coffee, band or film you love—even an allergy you dislike—can become a tag.")
                : addedTagCount === 1
                  ? t("Sevdiğimiz bir kitap, şarkı adı, özlü söz, unutamadığınız bir tarih… Hadi ama yaratıcı olun.", "Try a favourite book, song, quote or an unforgettable date. Be creative.")
                  : addedTagCount === 2
                    ? t("Herkes sevdiklerinden söz edebilir. Size tamamen uzak, eleştirel, hatta karanlık bir taraf?", "Everyone can talk about what they love. What about something distant, critical or even dark?")
                    : t("Profil için yeni etiket kategorileri ve yaratıcı öneriler keşfedin.", "Discover new tag categories and creative ideas for the profile.")}
            </p>
            {addedTagCount >= 3 ? (
              <section
                aria-label={t("Akıllı etiket önerileri", "Smart tag suggestions")}
                className="profile-tag-smart-suggestions"
              >
                <strong>
                  {t("Profil sinyallerine göre önerilen kategoriler", "Categories suggested from profile signals")}
                </strong>
                <div className="profile-tag-row">
                  {smartTagSuggestions.map((tag) => (
                      <button
                        className="ghost-action"
                        key={tag.id}
                        onClick={() => {
                          setSelectedTagId(tag.id);
                          setTagName(tag.name);
                        }}
                        type="button"
                      >
                        {tag.name}
                      </button>
                    ))}
                </div>
              </section>
            ) : null}
            <label>
              {t("Etiket", "Tag")}
              <input
                aria-label={t("Etiket", "Tag")}
                list="profile-tag-options"
                onChange={(event) => {
                  const value = event.target.value;
                  setTagName(value);
                  setSelectedTagId(
                    allTags.data?.find(
                      (tag) =>
                        tag.name.toLocaleLowerCase("tr-TR") ===
                        value.trim().toLocaleLowerCase("tr-TR"),
                    )?.id ?? "",
                  );
                }}
                placeholder={t("Mevcut veya yeni bir etiket gir…", "Enter an existing or new tag…")}
                required
                value={tagName}
              />
              <datalist id="profile-tag-options">
                {allTags.data?.map((tag) => (
                  <option key={tag.id} value={tag.name} />
                ))}
              </datalist>
            </label>
            {selectedTagId || tagName.trim() ? (
              <fieldset>
                <legend>{t("Adım 2: Bu etiket için hissedilen duyguyu seç", "Step 2: Choose a felt emotion for this tag")}</legend>
                {(
                  [
                    ["like", t("Beğeniyorum", "Like")],
                    ["ok", t("Nötr", "Neutral")],
                    ["dislike", t("Beğenmiyorum", "Dislike")],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value}>
                    <input
                      checked={selectedSentiment === value}
                      onChange={() => setSelectedSentiment(value)}
                      type="radio"
                    />{" "}
                    {label}
                  </label>
                ))}
              </fieldset>
            ) : null}
            <button
              className="primary-action"
              disabled={
                !(selectedTagId || tagName.trim()) || addTagMutation.isPending
              }
            >
              {t("Profile ekle", "Add to profile")}
            </button>
            {!profile.relationship.isSelf ? (
              <p className="form-help">
                {t("Kullanıcının onayı için bildirimler sayfasında sunulacaktır.", "It will be presented to the user for approval on their notification page.")}
              </p>
            ) : null}
            {addTagMutation.isSuccess ? (
              <p className="form-success">
                {profile.relationship.isSelf
                  ? t("Etiket eklendi.", "Tag added.")
                  : t("Etiket onaya gönderildi.", "Tag sent for approval.")}{" "}
                {t("Başka bir etiket seçebilirsiniz.", "You can choose another tag.")}
              </p>
            ) : null}
            {addTagMutation.isError ? (
              <p className="form-error">{t("Etiket profile eklenemedi.", "The tag could not be added to the profile.")}</p>
            ) : null}
          </form>
        </div>
      ) : null}
      <section className="profile-content-section">
        <div className="section-header">
          <h2>
            <CalendarDays size={22} /> {t("Etkinlikler", "Events")}
          </h2>
          <span>{profile.events.length}</span>
        </div>
        <nav
          className="discovery-tabs compact-tabs"
          aria-label={t("Profil etkinlikleri", "Profile events")}
        >
          <button
            className={profileEventTab === "future" ? "active" : ""}
            onClick={() => setProfileEventTab("future")}
            type="button"
          >
            {t("Gelecek", "Future")}
          </button>
          <button
            className={profileEventTab === "past" ? "active" : ""}
            onClick={() => setProfileEventTab("past")}
            type="button"
          >
            {t("Geçmiş", "Past")}
          </button>
          <button
            className={profileEventTab === "organizer" ? "active" : ""}
            onClick={() => setProfileEventTab("organizer")}
            type="button"
          >
            {t("Organizatör", "Organiser")}
          </button>
        </nav>
        <div className="discovery-results">
          {profile.events
            .filter((item) => {
              if (profileEventTab === "organizer") return item.organizer;
              const date = item.meta?.split(" · ").at(-1);
              if (!date) return true;
              return profileEventTab === "future"
                ? new Date(date) >= new Date()
                : new Date(date) < new Date();
            })
            .map((item) => (
              <DiscoveryCard hideSubtitle item={item} key={item.id} />
            ))}
        </div>
        {!profile.events.length ? (
          <p className="form-help">{t("Görüntülenebilir etkinlik yok.", "There are no visible events.")}</p>
        ) : null}
      </section>
      <section className="profile-content-section">
        <div className="section-header">
          <h2>
            <MapPin size={22} /> {t("Mekânlar", "Places")}
          </h2>
          <span>{profile.places.length}</span>
        </div>
        <nav
          className="discovery-tabs compact-tabs"
          aria-label={t("Profil mekânları", "Profile places")}
        >
          <button
            className={profilePlaceTab === "all" ? "active" : ""}
            onClick={() => setProfilePlaceTab("all")}
            type="button"
          >
            {t("Tümü", "All")}
          </button>
          <button
            className={profilePlaceTab === "organizer" ? "active" : ""}
            onClick={() => setProfilePlaceTab("organizer")}
            type="button"
          >
            {t("Organizatör", "Organiser")}
          </button>
        </nav>
        <div className="discovery-results">
          {profile.places
            .filter((item) => profilePlaceTab === "all" || item.organizer)
            .map((item) => (
              <DiscoveryCard hideSubtitle item={item} key={item.id} />
            ))}
        </div>
        {!profile.places.length ? (
          <p className="form-help">{t("Görüntülenebilir mekân yok.", "There are no visible places.")}</p>
        ) : null}
      </section>
    </section>
  );
}
