import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CheckCircle2,
  Grid2X2,
  List,
  Mail,
  MapPin,
  MoreVertical,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { UserIdentityLink } from "../components/UserIdentityLink";
import {
  addGuestListMember,
  createGuestList,
  getEvent,
  getPlace,
  listEventRelatedUsers,
  listPlaceRelatedUsers,
  listTagRelatedUsers,
  listTags,
  followUser,
  listGuestLists,
  listFollowing,
  unfollowUser,
  updatePlaceMember,
  updateEventParticipant,
} from "../lib/api";
import { getUserSession } from "../lib/api";
import { useLanguage } from "../lib/i18n";
import { useGuestListEntitlement } from "../lib/useGuestListEntitlement";

export function RelatedUsersPage({
  kind,
}: {
  kind: "event" | "place" | "tag";
}) {
  const { slug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const session = getUserSession();
  const client = useQueryClient();
  const [query, setQuery] = useState("");
  const requestedFilter = searchParams.get("filter");
  const [filter, setFilter] = useState<
    | "all"
    | "attendees"
    | "pending"
    | "invited"
    | "following"
    | "organizers"
    | "checked-in"
    | "declined"
    | "banned"
  >(() => {
    const allowed = new Set(["all", "attendees", "pending", "invited", "following", "organizers", "checked-in", "declined", "banned"]);
    return allowed.has(requestedFilter ?? "") ? requestedFilter as "all" | "attendees" | "pending" | "invited" | "following" | "organizers" | "checked-in" | "declined" | "banned" : kind === "place" ? "attendees" : "all";
  });
  const [view, setView] = useState<"cards" | "list">("cards");
  const [gender, setGender] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [guestTarget, setGuestTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const target = useQuery({
    queryKey: [kind, slug],
    queryFn: async () => {
      if (kind === "event") {
        const event = await getEvent(slug);
        return {
          id: event.id,
          title: event.title,
          isCreator: event.createdById === session?.id,
          canManage: Boolean(
            session &&
            (event.createdById === session.id ||
              (event.viewerParticipation?.status === "accepted" &&
                ["manager", "organizer"].includes(
                  event.viewerParticipation.role,
                )) ||
              ["admin", "super_admin", "curator"].includes(session.role)),
          ),
        };
      }
      if (kind === "tag") {
        const tag = (await listTags()).find((item) => item.slug === slug);
        if (!tag) throw new Error("Etiket bulunamadı.");
        return { id: tag.id, title: `#${tag.name}`, canManage: false };
      }
      const place = await getPlace(slug);
      return {
        id: place.id,
        title: place.name,
        isCreator: place.createdById === session?.id,
        canManage: Boolean(
          session &&
          (place.createdById === session.id ||
            (place.viewerMembership?.status === "accepted" &&
              ["manager", "organizer"].includes(place.viewerMembership.role)) ||
            ["admin", "super_admin", "curator"].includes(session.role)),
        ),
      };
    },
    enabled: Boolean(slug),
  });
  const users = useQuery({
    queryKey: [kind, target.data?.id, "related-users"],
    queryFn: () =>
      kind === "event"
        ? listEventRelatedUsers(target.data!.id)
        : kind === "place"
          ? listPlaceRelatedUsers(target.data!.id)
          : listTagRelatedUsers(target.data!.id),
    enabled: Boolean(target.data),
  });
  const title = target.data?.title;
  const back = `/${kind === "event" ? "events" : kind === "place" ? "places" : "tags"}/${slug}`;
  const following = useQuery({
    queryKey: ["following", session?.id],
    queryFn: listFollowing,
    enabled: Boolean(session),
  });
  const { canUseGuestLists } = useGuestListEntitlement(Boolean(kind !== "tag" && target.data?.canManage));
  const guestLists = useQuery({
    queryKey: ["guest-lists", session?.id],
    queryFn: listGuestLists,
    enabled: Boolean(session && guestTarget),
  });
  const followingIds = useMemo(
    () => new Set((following.data ?? []).map((item) => item.id)),
    [following.data],
  );
  const visibleUsers = useMemo(
    () =>
      (users.data ?? []).filter((user) => {
        const term = query.trim().toLocaleLowerCase("tr-TR");
        const matchesQuery =
          !term ||
          `${user.name} ${user.username ?? ""} ${user.city ?? ""} ${user.country ?? ""}`
            .toLocaleLowerCase("tr-TR")
            .includes(term);
        const relation = user.relation.toLocaleLowerCase("tr-TR");
        const age = user.birthDate ? ageFrom(user.birthDate) : null;
        const matchesFilter =
          filter === "all" ||
          (filter === "attendees" &&
            ["accepted", "attended"].includes(user.status ?? "accepted")) ||
          (filter === "pending" &&
            user.status === (kind === "place" ? "pending" : "requested")) ||
          (filter === "invited" && user.status === "invited") ||
          (filter === "following" && followingIds.has(user.id)) ||
          (filter === "checked-in" && user.checkedIn) ||
          (filter === "organizers" &&
            /creator|owner|organizer|manager|sahip|yönetici/.test(relation)) ||
          (filter === "declined" && user.status === "declined") ||
          (filter === "banned" && user.status === "banned");
        const matchesGender = !gender || user.gender === gender;
        const matchesSentiment = !sentiment || user.sentiment === sentiment;
        const [minimumAge, maximumAge] = ageRange
          ? ageRange.split("-").map(Number)
          : [];
        const matchesAge =
          !ageRange ||
          (age != null &&
            age >= minimumAge! &&
            (Number.isNaN(maximumAge) || age <= maximumAge!));
        return (
          matchesQuery &&
          matchesFilter &&
          matchesGender &&
          matchesSentiment &&
          matchesAge
        );
      }),
    [ageRange, filter, followingIds, gender, query, sentiment, users.data],
  );
  const toggleFollow = useMutation({
    mutationFn: (id: string) =>
      followingIds.has(id) ? unfollowUser(id) : followUser(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["following"] }),
  });
  const addGuest = useMutation({
    mutationFn: (guestListId: string) => addGuestListMember(guestListId, guestTarget!.id),
    onSuccess: () => {
      setGuestTarget(null);
      void client.invalidateQueries({ queryKey: ["guest-lists"] });
    },
  });
  const addGuestList = useMutation({
    mutationFn: createGuestList,
    onSuccess: () => void client.invalidateQueries({ queryKey: ["guest-lists"] }),
  });
  const placeMemberAction = useMutation({
    mutationFn: ({
      userId,
      changes,
    }: {
      userId: string;
      changes: { role?: string; status?: string };
    }) => updatePlaceMember(target.data!.id, userId, changes),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: [kind, target.data?.id, "related-users"],
      }),
  });
  const eventParticipantAction = useMutation({
    mutationFn: ({
      userId,
      changes,
    }: {
      userId: string;
      changes: { role?: string; status?: string };
    }) => updateEventParticipant(target.data!.id, userId, changes, "user"),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: [kind, target.data?.id, "related-users"],
      }),
  });

  return (
    <div className="page related-users-page">
      <Link className="back-link" to={back}>
        ← {t("Detaya dön", "Back to details")}
      </Link>
      <header className="section-header">
        <div>
          <p className="eyebrow">
            {kind === "event"
              ? t("Etkinlikle", "Event")
              : kind === "place"
                ? t("Mekânla", "Place")
                : t("Etiketle", "Tag")}{" "}
            {t("ilgili kullanıcılar", "related people")}
          </p>
          <h1>{title ?? t("Yükleniyor…", "Loading…")}</h1>
          <p>
            {kind === "tag"
              ? t("Kimlerin bu etiketi profiline yapıştırdığını keşfet.", "Discover who added this tag to their profile.")
              : kind === "place"
                ? t("Bu mekânı takip eden topluluk üyelerini keşfet.", "Discover the community members following this place.")
                : t("Katılımcıları, davetlileri ve etkinlik ekibini keşfet.", "Discover attendees, guests and the event team.")}
          </p>
        </div>
        <span>
          <Users size={18} />
          {users.data?.length ?? 0} {t("kişi", "people")}
        </span>
      </header>
      <section
        className="related-users-tools"
        aria-label={t("Kullanıcı filtreleri", "People filters")}
      >
        <label className="search-box">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Kullanıcı, şehir veya ülke ara", "Search username, city or country")}
          />
        </label>
        <details className="related-user-filter-disclosure">
          <summary>{t("Filtrele", "Filter")}</summary>
          <div className="related-user-advanced-filters">
            <label>
              {t("Cinsiyet", "Gender")}
              <select
                value={gender}
                onChange={(event) => setGender(event.target.value)}
              >
                <option value="">{t("Tümü", "All")}</option>
                <option value="female">{t("Kadın", "Woman")}</option>
                <option value="male">{t("Erkek", "Man")}</option>
                <option value="unknown">{t("Belirtilmemiş", "Not specified")}</option>
              </select>
            </label>
            <label>
              {t("Yaş aralığı", "Age range")}
              <select
                value={ageRange}
                onChange={(event) => setAgeRange(event.target.value)}
              >
                <option value="">{t("Tüm yaşlar", "All ages")}</option>
                <option value="18-24">18–24</option>
                <option value="25-34">25–34</option>
                <option value="35-44">35–44</option>
                <option value="45-54">45–54</option>
                <option value="55-64">55–64</option>
                <option value="65-Infinity">65+</option>
              </select>
            </label>
            {kind === "tag" ? (
              <label>
                {t("Duygu", "Sentiment")}
                <select
                  value={sentiment}
                  onChange={(event) => setSentiment(event.target.value)}
                >
                  <option value="">{t("Tümü", "All")}</option>
                  <option value="like">{t("Beğeniyor", "Likes")}</option>
                  <option value="ok">{t("Nötr", "Neutral")}</option>
                  <option value="dislike">{t("Beğenmiyor", "Dislikes")}</option>
                </select>
              </label>
            ) : null}
            <button
              onClick={() => {
                setQuery("");
                setGender("");
                setSentiment("");
                setAgeRange("");
                setFilter("all");
              }}
              type="button"
            >
              {t("Filtreyi sıfırla", "Reset filters")}
            </button>
          </div>
        </details>
        <div className="feed-tabs" role="tablist">
          {kind !== "place" ? (
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              {t("Tümü", "All")} ({users.data?.length ?? 0})
            </button>
          ) : null}
          {kind === "event" ? (
            <button
              className={filter === "attendees" ? "active" : ""}
              onClick={() => setFilter("attendees")}
            >
              {t("Katılımcılar", "Attendees")} (
              {
                (users.data ?? []).filter((item) =>
                  ["accepted", "attended"].includes(item.status ?? "accepted"),
                ).length
              }
              )
            </button>
          ) : null}
          {kind === "event" && target.data?.canManage ? (
            <button
              className={filter === "pending" ? "active" : ""}
              onClick={() => setFilter("pending")}
            >
              {t("Bekleyenler", "Pending")} (
              {
                (users.data ?? []).filter((item) => item.status === "requested")
                  .length
              }
              )
            </button>
          ) : null}
          {kind === "place" ? (
            <button
              className={filter === "attendees" ? "active" : ""}
              onClick={() => setFilter("attendees")}
            >
              {t("Üyeler", "Members")} (
              {
                (users.data ?? []).filter((item) => item.status === "accepted")
                  .length
              }
              )
            </button>
          ) : null}
          {kind === "place" && target.data?.canManage ? (
            <button
              className={filter === "pending" ? "active" : ""}
              onClick={() => setFilter("pending")}
            >
              {t("Bekleyenler", "Pending")} (
              {
                (users.data ?? []).filter((item) => item.status === "pending")
                  .length
              }
              )
            </button>
          ) : null}
          {kind === "event" || kind === "place" ? (
            <button
              className={filter === "invited" ? "active" : ""}
              onClick={() => setFilter("invited")}
            >
              {t("Davetliler", "Invited")} (
              {
                (users.data ?? []).filter((item) => item.status === "invited").length
              }
              )
            </button>
          ) : null}
          <button
            className={filter === "following" ? "active" : ""}
            onClick={() => setFilter("following")}
          >
            {t("Takip ettiklerim", "Following")} (
            {
              (users.data ?? []).filter((item) => followingIds.has(item.id))
                .length
            }
            )
          </button>
          {kind !== "tag" ? (
            <button
              className={filter === "organizers" ? "active" : ""}
              onClick={() => setFilter("organizers")}
            >
              {t("Yöneticiler", "Organisers")}
            </button>
          ) : null}
          {kind === "event" ? (
            <button
              className={filter === "checked-in" ? "active" : ""}
              onClick={() => setFilter("checked-in")}
            >
              Check-in
            </button>
          ) : null}
          {kind !== "tag" && target.data?.canManage ? (
            <button
              className={filter === "declined" ? "active" : ""}
              onClick={() => setFilter("declined")}
            >
              {t("Reddedilenler", "Declined")}
            </button>
          ) : null}
          {kind !== "tag" && target.data?.canManage ? (
            <button
              className={filter === "banned" ? "active" : ""}
              onClick={() => setFilter("banned")}
            >
              {t("Yasaklananlar", "Banned")}
            </button>
          ) : null}
        </div>
        <button
          className="secondary-action"
          aria-label={view === "cards" ? t("Liste görünümü", "List view") : t("Kart görünümü", "Card view")}
          onClick={() =>
            setView((value) => (value === "cards" ? "list" : "cards"))
          }
        >
          {view === "cards" ? <List size={17} /> : <Grid2X2 size={17} />}
        </button>
      </section>
      <section
        className={
          view === "cards"
            ? "related-user-grid"
            : "management-list related-user-list"
        }
      >
        {visibleUsers.map((user) => (
          <article className="related-user-card" key={user.id}>
            <UserIdentityLink
              avatarClassName="post-avatar"
              showName={false}
              user={user}
            />
            <div>
              <strong>
                <Link to={user.username ? `/users/${encodeURIComponent(user.username)}` : `/users/id/${encodeURIComponent(user.id)}`}>
                  {user.username ? `@${user.username}` : user.name}
                </Link>
                {user.profileVerifiedAt ? (
                  <BadgeCheck aria-label={t("Doğrulanmış profil", "Verified profile")} size={16} />
                ) : null}
              </strong>
              <span>
                {kind === "tag"
                  ? user.sentiment
                    ? `${user.sentiment === "like" ? t("Beğeniyorum", "Likes it") : user.sentiment === "dislike" ? t("Beğenmiyorum", "Dislikes it") : t("Nötrüm", "Feels neutral")} ${t("dedi", "")}${/paylaşım|post|yorum/i.test(user.relation) ? t(" · paylaşım yaptı", " · posted") : ""}`
                    : t("Paylaşım yaptı", "Posted")
                  : localizeRelation(user.relation, language)}
              </span>
              {user.birthDate ? (
                <small>{ageFrom(user.birthDate)} {t("yaşında", "years old")}</small>
              ) : null}
              {session?.id !== user.id && user.commonTagCount != null ? (
                <small>{user.commonTagCount} {t("ortak ilgi alanı", "shared interests")}</small>
              ) : null}
              {user.city || user.country ? (
                <small>
                  <MapPin size={13} />
                  {[user.city, user.country].filter(Boolean).join(", ")}
                </small>
              ) : null}
              {user.checkedIn ? (
                <small>
                  <CheckCircle2 size={13} />
                  {t("Check-in yaptı", "Checked in")}
                </small>
              ) : null}
            </div>
            <div className="row-actions">
              {session && session.id !== user.id ? (
                <button
                  disabled={toggleFollow.isPending}
                  onClick={() => toggleFollow.mutate(user.id)}
                >
                  {followingIds.has(user.id) ? t("Takipte", "Following") : t("Takip et", "Follow")}
                </button>
              ) : null}
              {session && session.id !== user.id && canUseGuestLists ? (
                <button
                  onClick={() =>
                    setGuestTarget({ id: user.id, name: user.name })
                  }
                >
                  <UserPlus size={15} /> {t("Misafir listesi", "Guest List")}
                </button>
              ) : null}
              {session && session.id !== user.id ? (
                <details className="action-menu">
                  <summary aria-label={t("Kullanıcı aksiyonları", "User actions")}>
                    <MoreVertical size={17} />
                  </summary>
                  <div>
                    <Link to={`/messages?peer=${user.id}`}>
                      <Mail size={15} /> {t("Mesaj gönder", "Send message")}
                    </Link>
                    {kind === "event" && target.data?.canManage ? (
                      <>
                        {target.data.isCreator ? (
                          <button
                            disabled={eventParticipantAction.isPending}
                            onClick={() =>
                              eventParticipantAction.mutate({
                                userId: user.id,
                                changes: {
                                  role:
                                    user.relation === "manager"
                                      ? "attendee"
                                      : "manager",
                                },
                              })
                            }
                            type="button"
                          >
                            {user.relation === "manager"
                              ? t("Etkinlik sahipliğinden çıkar", "Remove event ownership")
                              : t("Etkinlik sahibi yap", "Make event owner")}
                          </button>
                        ) : null}
                        <button
                          disabled={eventParticipantAction.isPending}
                          onClick={() =>
                            eventParticipantAction.mutate({
                              userId: user.id,
                              changes: {
                                role:
                                  user.relation === "organizer"
                                    ? "attendee"
                                    : "organizer",
                              },
                            })
                          }
                          type="button"
                        >
                          {user.relation === "organizer"
                            ? t("Organizatörlükten çıkar", "Remove organiser role")
                            : t("Organizatör yap", "Make organiser")}
                        </button>
                        <button
                          disabled={eventParticipantAction.isPending}
                          onClick={() =>
                            eventParticipantAction.mutate({
                              userId: user.id,
                              changes: {
                                status:
                                  user.status === "banned"
                                    ? "accepted"
                                    : "banned",
                              },
                            })
                          }
                          type="button"
                        >
                          {user.status === "banned"
                            ? t("Etkinliğe affet", "Unban from event")
                            : t("Etkinliğe yasakla", "Ban from event")}
                        </button>
                      </>
                    ) : null}
                    {kind === "place" && target.data?.canManage ? (
                      <>
                        {target.data.isCreator ? (
                          <button
                            disabled={placeMemberAction.isPending}
                            onClick={() =>
                              placeMemberAction.mutate({
                                userId: user.id,
                                changes: {
                                  role:
                                    user.relation === "manager"
                                      ? "member"
                                      : "manager",
                                },
                              })
                            }
                            type="button"
                          >
                            {user.relation === "manager"
                              ? t("Mekân sahipliğinden çıkar", "Remove place ownership")
                              : t("Mekân sahibi yap", "Make place owner")}
                          </button>
                        ) : null}
                        <button
                          disabled={placeMemberAction.isPending}
                          onClick={() =>
                            placeMemberAction.mutate({
                              userId: user.id,
                              changes: {
                                role: /organizer/.test(user.relation)
                                  ? "member"
                                  : "organizer",
                              },
                            })
                          }
                          type="button"
                        >
                          {/organizer/.test(user.relation)
                            ? t("Organizatörlükten çıkar", "Remove organiser role")
                            : t("Organizatör yap", "Make organiser")}
                        </button>
                        <button
                          disabled={placeMemberAction.isPending}
                          onClick={() =>
                            placeMemberAction.mutate({
                              userId: user.id,
                              changes: {
                                status:
                                  user.status === "banned"
                                    ? "accepted"
                                    : "banned",
                              },
                            })
                          }
                          type="button"
                        >
                          {user.status === "banned"
                            ? t("Mekâna affet", "Unban from place")
                            : t("Mekâna yasakla", "Ban from place")}
                        </button>
                      </>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </div>
          </article>
        ))}
      </section>
      {!users.isLoading && !visibleUsers.length ? (
        <section className="empty-state">
          <Users size={38} />
          <h2>{t("Henüz ilgili kullanıcı yok", "No related people yet")}</h2>
          <p>{t("Onaylanan katılımcılar ve üyeler burada görünecek.", "Approved attendees and members will appear here.")}</p>
        </section>
      ) : null}
      {users.isError ? (
        <p className="form-error">{t("Kullanıcılar yüklenemedi.", "People could not be loaded.")}</p>
      ) : null}
      {guestTarget ? (
        <div
          className="emotion-modal"
          role="dialog"
          aria-modal="true"
          aria-label={t("Guest List'e ekle", "Add to Guest List")}
        >
          <div>
            <button aria-label={t("Kapat", "Close")} onClick={() => setGuestTarget(null)}>
              ×
            </button>
            <h2>{guestTarget.name}</h2>
            <p>{t("Eklenecek misafir listesini seç.", "Choose the Guest List to add this member to.")}</p>
            <div className="admin-list">
              {guestLists.data?.map((list) => (
                <button
                  className="admin-list-row"
                  disabled={addGuest.isPending}
                  key={list.id}
                  onClick={() => addGuest.mutate(list.id)}
                >
                  <strong>{list.name}</strong>
                  <span>{list.members.length} {t("üye", "members")}</span>
                </button>
              ))}
            </div>
            {!guestLists.isLoading && !guestLists.data?.length ? (
              <p className="form-help">{t("Henüz bir misafir listen yok.", "You do not have a Guest List yet.")}</p>
            ) : null}
            <button className="secondary-action" disabled={addGuestList.isPending} onClick={() => {
              const name = window.prompt(t("Yeni misafir listesinin adı:", "New Guest List name:"));
              if (name?.trim()) addGuestList.mutate(name.trim());
            }} type="button"><UserPlus size={15}/> {t("Yeni liste oluştur", "Create new list")}</button>
            {addGuest.isError ? (
              <p className="form-error">{t("Misafir listesi işlemi tamamlanamadı.", "The Guest List action could not be completed.")}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ageFrom(value: string) {
  const birth = new Date(value);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  )
    age -= 1;
  return Math.max(0, age);
}

function localizeRelation(relation: string, language: "tr" | "en") {
  const labelsTr: Record<string, string> = {
    member: "Üye",
    organizer: "Organizatör",
    manager: "Sahip",
    owner: "Sahip",
    creator: "Kurucu",
    attendee: "Katılımcı",
    invited: "Davetli",
    follower: "Takipçi",
  };
  const labelsEn: Record<string, string> = {
    member: "Member", organizer: "Organiser", manager: "Owner", owner: "Owner", creator: "Creator", attendee: "Attendee", invited: "Invited", follower: "Follower",
  };
  const labels = language === "tr" ? labelsTr : labelsEn;
  return labels[relation.trim().toLocaleLowerCase("en-US")] ?? relation;
}
