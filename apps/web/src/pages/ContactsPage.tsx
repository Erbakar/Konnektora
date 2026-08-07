import type { Contact } from "@konnektora/shared";
import { useMutation } from "@tanstack/react-query";
import { BookUser, MailPlus, Smartphone, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { UserIdentityLink, userProfilePath } from "../components/UserIdentityLink";
import {
  followUser,
  getUserSession,
  importContacts,
  inviteContacts,
} from "../lib/api";
import { pickGoogleContacts, pickPhoneContacts } from "../lib/socialProviders";

export function ContactsPage() {
  const user = getUserSession();
  const [notice, setNotice] = useState("");
  const importMutation = useMutation({
    mutationFn: ({
      source,
      contacts,
    }: {
      source: "phone" | "google";
      contacts: Contact[];
    }) => importContacts(source, contacts),
    onError: (error: Error) => setNotice(error.message),
  });
  const inviteMutation = useMutation({
    mutationFn: inviteContacts,
    onSuccess: (data) => setNotice(`${data.invitedCount} davet gönderildi.`),
    onError: () => setNotice("Davetler gönderilemedi."),
  });
  if (!user)
    return (
      <section className="page empty-state">
        <BookUser size={42} />
        <h1>Arkadaşlarını bul</h1>
        <p>Rehber eşleştirmesi için giriş yapmalısın.</p>
        <Link className="primary-action" to="/account">
          Giriş yap
        </Link>
      </section>
    );

  async function select(source: "phone" | "google") {
    setNotice("");
    const contacts =
      source === "phone"
        ? await pickPhoneContacts()
        : await pickGoogleContacts();
    importMutation.mutate({ source, contacts });
  }
  const result = importMutation.data;
  return (
    <section className="page contacts-page">
      <header className="section-header">
        <div>
          <span className="eyebrow">Gizlilik odaklı eşleştirme</span>
          <h1>Arkadaşlarını bul & davet et</h1>
          <p>
            Yalnızca seçtiğin kişiler eşleştirilir; rehberin Konnektora’da
            saklanmaz.
          </p>
        </div>
        <BookUser size={42} />
      </header>
      {notice ? <p className="form-help">{notice}</p> : null}
      <div className="contact-source-grid">
        <button
          className="social-provider-button"
          disabled={importMutation.isPending}
          onClick={() =>
            void select("phone").catch((error: Error) =>
              setNotice(error.message),
            )
          }
          type="button"
        >
          <Smartphone /> Telefon rehberi
          <span>Tarayıcının kişi seçicisini aç</span>
        </button>
        <button
          className="social-provider-button"
          disabled={importMutation.isPending}
          onClick={() =>
            void select("google").catch((error: Error) =>
              setNotice(error.message),
            )
          }
          type="button"
        >
          <span className="provider-letter">G</span> Google Contacts
          <span>Salt okunur izinle kişileri seç</span>
        </button>
      </div>
      {result ? (
        <>
          <section className="admin-form">
            <h2>Bulunan {result.matches.length} üye</h2>
            {result.matches.length ? (
              <div className="onboarding-people">
                {result.matches.map(({ contactName, member }) => (
                  <article key={member.id}>
                    <UserIdentityLink user={member} avatarClassName="conversation-avatar" showName={false}/>
                    <div>
                      <strong><Link to={userProfilePath(member)}>{member.username ? `@${member.username}` : member.name}</Link></strong>
                      <small>
                        {contactName} · {member.followerCount} takipçi
                      </small>
                    </div>
                    <button
                      className="secondary-action"
                      onClick={() => void followUser(member.id)}
                      type="button"
                    >
                      <UserPlus size={17} /> Takip et
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">Bulunabilir üye eşleşmedi.</p>
            )}
          </section>
          <section className="admin-form">
            <h2>Davet edilebilecek {result.invitees.length} kişi</h2>
            {result.invitees.length ? (
              <>
                <div className="contact-invite-list">
                  {result.invitees.map((contact, index) => (
                    <label key={`${contact.email ?? contact.phone}-${index}`}>
                      <input
                        defaultChecked
                        name="invitee"
                        type="checkbox"
                        value={index}
                      />
                      <span>
                        <strong>{contact.name}</strong>
                        <small>{contact.email ?? contact.phone}</small>
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  className="primary-action"
                  disabled={inviteMutation.isPending}
                  onClick={() => inviteMutation.mutate(result.invitees)}
                  type="button"
                >
                  <MailPlus size={17} /> Tümünü davet et
                </button>
              </>
            ) : (
              <p className="muted">Davet edilecek kişi yok.</p>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
