import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CheckCircle2, Grid2X2, List, Mail, MapPin, Search, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { UserIdentityLink } from "../components/UserIdentityLink";
import {
  getEvent,
  getPlace,
  listEventRelatedUsers,
  listPlaceRelatedUsers,
  listTagRelatedUsers,
  listTags,
  followUser,
  inviteEventParticipant,
  listFollowing,
  listMyEvents,
  unfollowUser,
} from "../lib/api";
import { getUserSession } from "../lib/api";

export function RelatedUsersPage({
  kind,
}: {
  kind: "event" | "place" | "tag";
}) {
  const { slug = "" } = useParams();
  const session = getUserSession();
  const client = useQueryClient();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "attendees" | "invited" | "following" | "organizers" | "checked-in">("all");
  const [view, setView] = useState<"cards" | "list">("cards");
  const [gender, setGender] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [guestTarget, setGuestTarget] = useState<{ id: string; name: string } | null>(null);
  const target = useQuery({
    queryKey: [kind, slug],
    queryFn: async () => {
      if (kind === "event") {
        const event = await getEvent(slug);
        return { id: event.id, title: event.title };
      }
      if (kind === "tag") {
        const tag = (await listTags()).find((item) => item.slug === slug);
        if (!tag) throw new Error("Etiket bulunamadı.");
        return { id: tag.id, title: `#${tag.name}` };
      }
      const place = await getPlace(slug);
      return { id: place.id, title: place.name };
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
  const following = useQuery({ queryKey: ["following", session?.id], queryFn: listFollowing, enabled: Boolean(session) });
  const managedEvents = useQuery({ queryKey: ["my-events", session?.id, "related-users-guest"], queryFn: listMyEvents, enabled: Boolean(session && guestTarget) });
  const followingIds = useMemo(() => new Set((following.data ?? []).map((item) => item.id)), [following.data]);
  const visibleUsers = useMemo(() => (users.data ?? []).filter((user) => {
    const term = query.trim().toLocaleLowerCase("tr-TR");
    const matchesQuery = !term || `${user.name} ${user.username ?? ""} ${user.city ?? ""} ${user.country ?? ""}`.toLocaleLowerCase("tr-TR").includes(term);
    const relation = user.relation.toLocaleLowerCase("tr-TR");
    const age = user.birthDate ? ageFrom(user.birthDate) : null;
    const matchesFilter = filter === "all" || filter === "attendees" && ["accepted", "attended"].includes(user.status ?? "accepted") || filter === "invited" && ["invited", "requested"].includes(user.status ?? "") || filter === "following" && followingIds.has(user.id) || filter === "checked-in" && user.checkedIn || filter === "organizers" && /creator|owner|organizer|manager|sahip|yönetici/.test(relation);
    const matchesGender = !gender || user.gender === gender;
    const matchesSentiment = !sentiment || user.sentiment === sentiment;
    const matchesAge = (!minAge || age != null && age >= Number(minAge)) && (!maxAge || age != null && age <= Number(maxAge));
    return matchesQuery && matchesFilter && matchesGender && matchesSentiment && matchesAge;
  }), [filter, followingIds, gender, maxAge, minAge, query, sentiment, users.data]);
  const toggleFollow = useMutation({
    mutationFn: (id: string) => followingIds.has(id) ? unfollowUser(id) : followUser(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["following"] }),
  });
  const addGuest = useMutation({ mutationFn: (eventId: string) => inviteEventParticipant(eventId, { userId: guestTarget!.id, role: "attendee" }, "user"), onSuccess: () => setGuestTarget(null) });

  return (
    <main className="page related-users-page">
      <Link className="back-link" to={back}>
        ← Detaya dön
      </Link>
      <header className="section-header">
        <div>
          <p className="eyebrow">
            {kind === "event"
              ? "Etkinlikle"
              : kind === "place"
                ? "Mekânla"
                : "Etiketle"}{" "}
            ilgili kullanıcılar
          </p>
          <h1>{title ?? "Yükleniyor…"}</h1>
          <p>
            Organizatörleri, yöneticileri ve onaylı topluluk üyelerini keşfet.
          </p>
        </div>
        <span>
          <Users size={18} />
          {users.data?.length ?? 0} kişi
        </span>
      </header>
      <section className="related-users-tools" aria-label="Kullanıcı filtreleri">
        <label className="search-box"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kullanıcı, şehir veya ülke ara"/></label>
        <div className="related-user-advanced-filters"><label>Cinsiyet<select value={gender} onChange={(event) => setGender(event.target.value)}><option value="">Tümü</option><option value="female">Kadın</option><option value="male">Erkek</option><option value="unknown">Belirtilmemiş</option></select></label><label>En az yaş<input min="13" onChange={(event) => setMinAge(event.target.value)} type="number" value={minAge}/></label><label>En çok yaş<input min="13" onChange={(event) => setMaxAge(event.target.value)} type="number" value={maxAge}/></label>{kind === "tag" ? <label>Duygu<select value={sentiment} onChange={(event) => setSentiment(event.target.value)}><option value="">Tümü</option><option value="like">Beğeniyor</option><option value="ok">Nötr</option><option value="dislike">Beğenmiyor</option></select></label> : null}<button onClick={() => { setQuery(""); setGender(""); setSentiment(""); setMinAge(""); setMaxAge(""); setFilter("all"); }} type="button">Filtreyi sıfırla</button></div>
        <div className="feed-tabs" role="tablist">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Tümü ({users.data?.length ?? 0})</button>
          {kind === "event" ? <button className={filter === "attendees" ? "active" : ""} onClick={() => setFilter("attendees")}>Attendees ({(users.data ?? []).filter((item) => ["accepted", "attended"].includes(item.status ?? "accepted")).length})</button> : null}
          {kind === "event" ? <button className={filter === "invited" ? "active" : ""} onClick={() => setFilter("invited")}>Invited ({(users.data ?? []).filter((item) => ["invited", "requested"].includes(item.status ?? "")).length})</button> : null}
          <button className={filter === "following" ? "active" : ""} onClick={() => setFilter("following")}>Following ({(users.data ?? []).filter((item) => followingIds.has(item.id)).length})</button>
          <button className={filter === "organizers" ? "active" : ""} onClick={() => setFilter("organizers")}>Yöneticiler</button>
          <button className={filter === "checked-in" ? "active" : ""} onClick={() => setFilter("checked-in")}>Check-in</button>
        </div>
        <button className="secondary-action" aria-label={view === "cards" ? "Liste görünümü" : "Kart görünümü"} onClick={() => setView((value) => value === "cards" ? "list" : "cards")}>{view === "cards" ? <List size={17}/> : <Grid2X2 size={17}/>}</button>
      </section>
      <section className={view === "cards" ? "related-user-grid" : "management-list related-user-list"}>
        {visibleUsers.map((user) => (
          <article className="related-user-card" key={user.id}>
            <span className="post-avatar">
              {user.name.charAt(0).toLocaleUpperCase("tr-TR")}
            </span>
            <div>
              <strong>
                <UserIdentityLink user={user} />
                {user.profileVerifiedAt ? (
                  <BadgeCheck aria-label="Doğrulanmış profil" size={16} />
                ) : null}
              </strong>
              <span>{user.relation}</span>
              {user.birthDate ? <small>{user.gender === "male" ? "He" : user.gender === "female" ? "She" : "They"} is {ageFrom(user.birthDate)} y.o.</small> : null}
              {user.commonTagCount != null ? <small>{user.commonTagCount} mutual {user.commonTagCount === 1 ? "thing" : "things"}.</small> : null}
              {user.sentiment ? <small>{user.sentiment === "like" ? "❤️ Beğeniyor" : user.sentiment === "dislike" ? "👎 Beğenmiyor" : "➖ Nötr"}</small> : null}
              {user.city || user.country ? (
                <small>
                  <MapPin size={13} />
                  {[user.city, user.country].filter(Boolean).join(", ")}
                </small>
              ) : null}
              {user.checkedIn ? (
                <small>
                  <CheckCircle2 size={13} />
                  Check-in yaptı
                </small>
              ) : null}
            </div>
            <div className="row-actions">
              {session && session.id !== user.id ? <button disabled={toggleFollow.isPending} onClick={() => toggleFollow.mutate(user.id)}>{followingIds.has(user.id) ? "Following" : "Follow"}</button> : null}
              {session && session.id !== user.id ? <button onClick={() => setGuestTarget({ id: user.id, name: user.name })}><UserPlus size={15}/> Guest list</button> : null}
              {session && session.id !== user.id ? <Link aria-label="Mesaj gönder" to={`/messages?peer=${user.id}`}><Mail size={15}/></Link> : null}
              <Link className="secondary-action" to={user.username ? `/users/${user.username}` : `/users/id/${user.id}`}>Profili gör</Link>
            </div>
          </article>
        ))}
      </section>
      {!users.isLoading && !visibleUsers.length ? (
        <section className="empty-state">
          <Users size={38} />
          <h2>Henüz ilgili kullanıcı yok</h2>
          <p>Onaylanan katılımcılar ve üyeler burada görünecek.</p>
        </section>
      ) : null}
      {users.isError ? (
        <p className="form-error">Kullanıcılar yüklenemedi.</p>
      ) : null}
      {guestTarget ? <div className="emotion-modal" role="dialog" aria-modal="true" aria-label="Guest List'e ekle"><div><button aria-label="Kapat" onClick={() => setGuestTarget(null)}>×</button><h2>{guestTarget.name}</h2><div className="admin-list">{managedEvents.data?.map((event) => <button className="admin-list-row" disabled={addGuest.isPending} key={event.id} onClick={() => addGuest.mutate(event.id)}><strong>{event.title}</strong></button>)}</div>{!managedEvents.isLoading && !managedEvents.data?.length ? <p className="form-help">Yönettiğin etkinlik bulunmuyor.</p> : null}{addGuest.isError ? <p className="form-error">Guest list işlemi tamamlanamadı.</p> : null}</div></div> : null}
    </main>
  );
}

function ageFrom(value: string) {
  const birth = new Date(value);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()) age -= 1;
  return Math.max(0, age);
}
