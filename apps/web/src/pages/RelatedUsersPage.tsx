import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CheckCircle2, MapPin, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { UserIdentityLink } from "../components/UserIdentityLink";
import {
  getEvent,
  getPlace,
  listEventRelatedUsers,
  listPlaceRelatedUsers,
  listTagRelatedUsers,
  listTags,
} from "../lib/api";

export function RelatedUsersPage({
  kind,
}: {
  kind: "event" | "place" | "tag";
}) {
  const { slug = "" } = useParams();
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
      <section className="related-user-grid">
        {users.data?.map((user) => (
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
            <Link
              className="secondary-action"
              to={
                user.username
                  ? `/users/${user.username}`
                  : `/users/id/${user.id}`
              }
            >
              Profili gör
            </Link>
          </article>
        ))}
      </section>
      {!users.isLoading && !users.data?.length ? (
        <section className="empty-state">
          <Users size={38} />
          <h2>Henüz ilgili kullanıcı yok</h2>
          <p>Onaylanan katılımcılar ve üyeler burada görünecek.</p>
        </section>
      ) : null}
      {users.isError ? (
        <p className="form-error">Kullanıcılar yüklenemedi.</p>
      ) : null}
    </main>
  );
}
