import type { Contact } from "@konnektora/shared";
import { useMutation } from "@tanstack/react-query";
import { BookUser, MailPlus, Search, Smartphone, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ServiceFeedback } from "../components/ServiceFeedback";
import { UserIdentityLink, userProfilePath } from "../components/UserIdentityLink";
import {
  followUser,
  getUserSession,
  importContacts,
  inviteContacts,
  searchContacts,
} from "../lib/api";
import { getServiceErrorMessage } from "../lib/serviceErrors";
import { pickGoogleContacts, pickPhoneContacts } from "../lib/socialProviders";

export function ContactsPage() {
  const user = getUserSession();
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"error" | "success">("success");
  const [manualType, setManualType] = useState<"name" | "email" | "phone">("name");
  const [manualQuery, setManualQuery] = useState("");
  const showError = (error: unknown, fallback: string) => {
    setNoticeTone("error");
    setNotice(getServiceErrorMessage(error, fallback));
  };
  const importMutation = useMutation({
    mutationFn: ({
      source,
      contacts,
    }: {
      source: "phone" | "google";
      contacts: Contact[];
    }) => importContacts(source, contacts),
    onError: (error) =>
      showError(error, "Kişiler şu anda eşleştirilemedi. Lütfen yeniden dene."),
  });
  const inviteMutation = useMutation({
    mutationFn: inviteContacts,
    onSuccess: (data) => {
      setNoticeTone("success");
      setNotice(`${data.invitedCount} davet gönderildi.`);
    },
    onError: (error) =>
      showError(error, "Davetler şu anda gönderilemedi. Lütfen yeniden dene."),
  });
  const searchMutation = useMutation({
    mutationFn: () => searchContacts(manualQuery.trim(), manualType),
    onError: (error) =>
      showError(error, "Arama şu anda tamamlanamadı. Lütfen yeniden dene."),
  });
  if (!user)
    return (
      <section className="page empty-state">
        <BookUser size={42} />
        <h1>Arkadaşlarını bul</h1>
        <p>Rehber eşleştirmesi için giriş yapmalısın.</p>
        <Link className="primary-action" to="/login">
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
      {notice ? (
        <ServiceFeedback compact message={notice} tone={noticeTone} />
      ) : null}
      <form className="admin-form contact-manual-search" onSubmit={(event) => { event.preventDefault(); setNotice(""); if (manualQuery.trim().length >= 2) searchMutation.mutate(); }}>
        <h2>Manuel arama</h2>
        <p className="form-help">Yalnızca “arkadaşlarım beni bulabilir” seçeneği açık üyeler sonuçlarda gösterilir.</p>
        <div className="form-grid"><label>Arama türü<select value={manualType} onChange={(event) => setManualType(event.target.value as typeof manualType)}><option value="name">Ad veya kullanıcı adı</option><option value="email">E-posta adresi</option><option value="phone">Telefon numarası</option></select></label><label>{manualType === "name" ? "Ad veya kullanıcı adı" : manualType === "email" ? "E-posta" : "Telefon"}<input inputMode={manualType === "phone" ? "tel" : "text"} minLength={2} onChange={(event) => setManualQuery(event.target.value)} placeholder={manualType === "name" ? "@kullanici veya Ad Soyad" : manualType === "email" ? "uye@example.com" : "+905551234567"} required type={manualType === "email" ? "email" : "text"} value={manualQuery}/></label></div>
        <button className="primary-action" disabled={searchMutation.isPending}><Search size={17}/>{searchMutation.isPending ? "Aranıyor…" : "Ara"}</button>
        {searchMutation.data?.length ? <div className="onboarding-people">{searchMutation.data.map((member) => <article key={member.id}><UserIdentityLink user={member} avatarClassName="conversation-avatar" showName={false}/><div><strong><Link to={userProfilePath(member)}>{member.username ? `@${member.username}` : member.name}</Link></strong><small>{member.commonTagCount} ortak ilgi alanı · {member.followerCount} takipçi</small></div><button className="secondary-action" onClick={() => void followUser(member.id)} type="button"><UserPlus size={17}/>Takip et</button></article>)}</div> : null}
        {searchMutation.isSuccess && !searchMutation.data.length ? <div className="empty-state compact"><strong>Bulunabilir bir üye eşleşmedi.</strong><p>Üye olmayan veya bulunmak istemeyen kişiye ücretsiz Konnektora daveti gönderebilirsin.</p>{manualType !== "name" ? <button className="secondary-action" disabled={inviteMutation.isPending} onClick={() => inviteMutation.mutate([{ name: manualQuery.trim(), ...(manualType === "email" ? { email: manualQuery.trim() } : { phone: manualQuery.trim() }) }])} type="button"><MailPlus size={17}/>Üyeliğe davet et</button> : null}</div> : null}
      </form>
      <div className="contact-source-grid">
        <button
          className="social-provider-button"
          disabled={importMutation.isPending}
          onClick={() =>
            void select("phone").catch((error) =>
              showError(error, "Telefon rehberi açılamadı. İzinleri kontrol edip yeniden dene."),
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
            void select("google").catch((error) =>
              showError(error, "Google kişileri açılamadı. Lütfen yeniden dene."),
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
