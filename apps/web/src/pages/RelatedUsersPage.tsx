import { FollowStar, MemberCompatibility, MemberSignalsProvider } from "../components/MemberSignals";
import { getMembership } from "../lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Ban,
  UserMinus,
  UserPlus,
  CheckCircle2,
  Mail,
  MapPin,
  MoreVertical,
  ShieldCheck,
  BriefcaseBusiness,
  Search,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { UserIdentityLink } from "../components/UserIdentityLink";
import { GuestListAction } from "../components/GuestListAction";
import {
  getEvent,
  getPlace,
  listEventRelatedUsers,
  listPlaceRelatedUsers,
  listTagRelatedUsers,
  listTags,
  followUser,
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
  const view = "cards";
  const membership = useQuery({ queryKey: ["membership", session?.id], queryFn: getMembership, enabled: Boolean(session) });
  const advancedFilters = membership.data?.capabilities?.advanced ?? false;
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [ageRange, setAgeRange] = useState("");
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
              (["accepted", "attended", "not_attending"].includes(event.viewerParticipation?.status ?? "") &&
                ["manager", "organizer"].includes(
                  event.viewerParticipation!.role,
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
        const matchesGender = !advancedFilters || !gender || user.gender === gender;
        const matchesSentiment = !sentiment || user.sentiment === sentiment;
        const [minimumAge, maximumAge] = ageRange
          ? ageRange.split("-").map(Number)
          : [];
        const matchesAge =
          !advancedFilters || !ageRange ||
          (age != null &&
            age >= minimumAge! &&
            (Number.isNaN(maximumAge) || age <= maximumAge!));
        return (
          (!country || user.country === country) &&
          (filter !== "checked-in" || target.data?.canManage) &&
          matchesQuery &&
          matchesFilter &&
          matchesGender &&
          matchesSentiment &&
          matchesAge
        );
      }),
    [advancedFilters, ageRange, country, filter, followingIds, gender, query, sentiment, users.data, target.data?.canManage],
  );
  const toggleFollow = useMutation({
    mutationFn: (id: string) =>
      followingIds.has(id) ? unfollowUser(id) : followUser(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["following"] }),
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
        {session && kind !== "tag" ? <Link className="primary-action related-invite-link" to={`${back}/invites`}><UserPlus size={18}/>{kind === "event" ? t("Etkinliğe davet et", "Invite to event") : t("Mekâna davet et", "Invite to place")}</Link> : null}
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
            <label>{t("Ülke", "Country")}<select value={country} onChange={event => setCountry(event.target.value)}><option value="">{t("Tüm ülkeler", "All countries")}</option>{[...new Set((users.data ?? []).map(user => user.country).filter((value): value is string => Boolean(value)))].sort().map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>
              {t("Yaş aralığı", "Age range")}
              <select
                disabled={!advancedFilters}
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

            <label>
              {t("Cinsiyet", "Gender")}
              <select
                disabled={!advancedFilters}
                value={gender}
                onChange={(event) => setGender(event.target.value)}
              >
                <option value="">{t("Tümü", "All")}</option>
                <option value="female">{t("Kadın", "Woman")}</option>
                <option value="male">{t("Erkek", "Man")}</option>
                <option value="unknown">{t("Belirtilmemiş", "Not specified")}</option>
              </select>
            </label>
            {!advancedFilters && <p><Link to="/store">{t("Yaş ve cinsiyet filtreleri için paketinizi yükseltin.", "Upgrade your plan for age and gender filters.")}</Link></p>}
            <button
              onClick={() => {
                setQuery("");
                setCountry("");
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
          {kind === "event" && target.data?.canManage ? (
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

      </section>
      <MemberSignalsProvider ids={visibleUsers.map(user=>user.id)}>
      <section
        className={
          view === "cards"
            ? "related-user-grid"
            : "management-list related-user-list"
        }
      >
        {visibleUsers.filter((user) => !user.isProvisional).map((user) => (
          <article className="related-user-card" key={user.id}>
            <UserIdentityLink
              avatarClassName="post-avatar"
              showName={false}
              user={user}
            />
            <div>
              <strong className="member-name-line"><FollowStar id={user.id}/>
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
                  : <>{user.relation === "creator" ? <ShieldCheck size={15}/> : user.relation === "manager" ? <BriefcaseBusiness size={15}/> : null}{localizeRelation(user.relation, language, kind)}</>}
              </span>
              {user.birthDate ? (
                <small>{ageFrom(user.birthDate)} {t("yaşında", "years old")}</small>
              ) : null}
              <MemberCompatibility id={user.id} commonTagCount={user.commonTagCount}/>
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
              {session && session.id !== user.id ? <GuestListAction canUse={canUseGuestLists} className="" context={kind === "tag" || !target.data ? undefined : { id: target.data.id, name: target.data.title, type: kind }} target={{ id: user.id, name: user.name, username: user.username, avatarUrl: user.avatarUrl, status: user.status, role: user.relation, checkedIn: user.checkedIn }}/> : null}
              {session && session.id !== user.id ? (
                <details className="action-menu">
                  <summary aria-label={t("Kullanıcı aksiyonları", "User actions")}>
                    <MoreVertical size={17} />
                  </summary>
                  <div>
                    <Link to={`/messages?peer=${user.id}`}>
                      <Mail size={15} /> {t("Mesaj gönder", "Send message")}
                    </Link>
                    {kind === "event" && target.data?.canManage && user.relation !== "creator" ? (
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
                            <ShieldCheck size={15}/>{user.relation === "manager"
                              ? t("Etkinlik yöneticiliğinden çıkar", "Remove event manager role")
                              : t("Etkinlik yöneticisi yap", "Make event manager")}
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
                          <BriefcaseBusiness size={15}/>{user.relation === "organizer"
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
                          {user.status === "banned" ? <UserMinus size={15}/> : <Ban size={15}/>} {user.status === "banned"
                            ? t("Etkinliğe affet", "Unban from event")
                            : t("Etkinliğe yasakla", "Ban from event")}
                        </button>
                      </>
                    ) : null}
                    {kind === "place" && target.data?.canManage && user.relation !== "creator" ? (
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
                            <ShieldCheck size={15}/>{user.relation === "manager"
                              ? t("Mekân yöneticiliğinden çıkar", "Remove place manager role")
                              : t("Mekân yöneticisi yap", "Make place manager")}
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
                          <BriefcaseBusiness size={15}/>{/organizer/.test(user.relation)
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
                          {user.status === "banned" ? <UserMinus size={15}/> : <Ban size={15}/>} {user.status === "banned"
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
        {visibleUsers.some((user) => user.isProvisional) ? <article className="related-user-card"><Users aria-hidden="true"/><strong>{t("Gösterilemeyen", "Hidden")} +{visibleUsers.filter((user) => user.isProvisional).length} {t("katılımcı", "participants")}</strong><p>{t("Bu kişiler henüz üyeliklerini tamamlamadı.", "These people have not completed registration yet.")}</p></article> : null}
      </section></MemberSignalsProvider>
      {!users.isLoading && !visibleUsers.length ? (
        <section className="empty-state">
          <Users size={38} />
          <h2>{t("Henüz ilgili kullanıcı yok", "No related people yet")}</h2>
          <p>{relatedUsersEmptyText(kind, filter, t)}</p>
        </section>
      ) : null}
      {users.isError ? (
        <p className="form-error">{t("Kullanıcılar yüklenemedi.", "People could not be loaded.")}</p>
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

function localizeRelation(relation: string, language: "tr" | "en", kind?: "event" | "place" | "tag") {
  const labelsTr: Record<string, string> = {
    member: "Üye",
    organizer: "Organizatör",
    manager: "Yönetici",
    owner: kind === "event" ? "Etkinlik kurucusu" : "Mekân kurucusu",
    creator: kind === "event" ? "Etkinlik kurucusu" : "Mekân kurucusu",
    attendee: "Katılımcı",
    invited: "Davetli",
    follower: "Takipçi",
  };
  const labelsEn: Record<string, string> = {
    member: "Member", organizer: "Organiser", manager: "Manager", owner: "Owner", creator: "Owner", attendee: "Attendee", invited: "Invited", follower: "Follower",
  };
  const labels = language === "tr" ? labelsTr : labelsEn;
  return labels[relation.trim().toLocaleLowerCase("en-US")] ?? relation;
}

/** Sekmeye özel boş durum metinleri (07/11 #10, #11, #26). */
function relatedUsersEmptyText(kind: "event" | "place" | "tag", filter: string, t: (tr: string, en: string) => string) {
  if (kind === "event") {
    if (filter === "pending") return t("Katılım tipi “onay gerekli” olan etkinliklerde kullanıcıların katılım başvuruları burada yöneticilerin onayına sunulur.", "For events with “approval required” access, participation requests are presented here for managers to approve.");
    if (filter === "checked-in") return t("Etkinliğe check-in olanlar burada yöneticilere gösterilir.", "People who checked in to the event are shown to managers here.");
    if (filter === "declined") return t("Etkinliğe katılım başvurusu reddedilenler burada yöneticilere gösterilir.", "People whose participation request was declined are shown to managers here.");
    if (filter === "banned") return t("Etkinliğe katılımı yasaklananlar burada yöneticilere gösterilir.", "People banned from the event are shown to managers here.");
    if (filter === "following") return t("Takip ettiğiniz kullanıcılardan etkinliğe katılanlar burada gösterilecek.", "People you follow who join the event will appear here.");
  }
  if (kind === "place") {
    if (filter === "pending") return t("Katılım tipi “onay gerekli” olan mekânlarda kullanıcıların katılım başvuruları burada yöneticilerin onayına sunulur.", "For places with “approval required” access, membership requests are presented here for managers to approve.");
    if (filter === "declined") return t("Mekâna üyelik başvurusu reddedilenler burada yöneticilere gösterilir.", "People whose membership request was declined are shown to managers here.");
    if (filter === "banned") return t("Mekâna katılımı yasaklananlar burada yöneticilere gösterilir.", "People banned from the place are shown to managers here.");
    if (filter === "following") return t("Takip ettiğiniz kullanıcılardan mekâna üye olanlar burada gösterilecek.", "People you follow who become members of the place will appear here.");
  }
  if (kind === "tag" && filter === "following") return t("Takip ettiğiniz kullanıcılardan ilgi alanını profiline ekleyenler burada gösterilecek.", "People you follow who add this interest to their profile will appear here.");
  return t("Onaylanan katılımcılar ve üyeler burada görünecek.", "Approved attendees and members will appear here.");
}
