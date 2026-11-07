import { FollowStar } from "../components/MemberSignals";
import { InviteAssessmentProvider } from "../components/InviteAssessment";
import { InviteUserCards } from "./InviteManagementPage";
import { useGuestListEntitlement } from "../lib/useGuestListEntitlement";
import type { Contact } from "@konnektora/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookUser, MailPlus, Search, Smartphone, UserPlus } from "lucide-react";
import { Fragment, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ServiceFeedback } from "../components/ServiceFeedback";
import { UserIdentityLink, userProfilePath } from "../components/UserIdentityLink";
import {
  listGuestLists,
  addGuestListMember,
  followUser,
  getUserSession,
  importContacts,
  inviteEventParticipant,
  invitePlaceMember,
  inviteContacts,
  listSentEventInvitations,
  listSentPlaceInvitations,
  searchContacts,
} from "../lib/api";
import { getServiceErrorMessage } from "../lib/serviceErrors";
import { pickGoogleContacts, pickPhoneContacts } from "../lib/socialProviders";
import { useLanguage } from "../lib/i18n";

export function ContactsPage({ inviteTarget }: { inviteTarget?: { type: "event" | "place"; id: string; source: "phone" | "google" } } = {}) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const user = getUserSession();
  const Heading = inviteTarget ? "h3" : "h1";
  const {canUseGuestLists}=useGuestListEntitlement();
  const guestLists=useQuery({queryKey:["guest-lists",user?.id],queryFn:listGuestLists,enabled:Boolean(user&&canUseGuestLists)});
  const [searchParams] = useSearchParams();
  const sourceParam = inviteTarget?.source ?? searchParams.get("source");
  const targetType = inviteTarget?.type ?? searchParams.get("targetType") as "event" | "place" | null;
  const targetId = inviteTarget?.id ?? searchParams.get("targetId");
  const [candidates, setCandidates] = useState<Contact[] | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [pickedSource, setPickedSource] = useState<"phone" | "google">("phone");
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"error" | "success">("success");
  const [manualType, setManualType] = useState<"username" | "name" | "email" | "phone">(targetType ? "username" : "name");
  const [manualQuery, setManualQuery] = useState("");
  const [selectedInvitees, setSelectedInvitees] = useState<Set<number>>(new Set());
  const sentInvitations = useQuery({
    queryKey: ["sent-target-invitations", targetType, targetId, user?.id],
    queryFn: () => targetType === "event"
      ? listSentEventInvitations(targetId!)
      : targetType === "place"
        ? listSentPlaceInvitations(targetId!)
        : Promise.resolve([]),
    enabled: Boolean(user && targetType && targetId),
  });
  const alreadyInvitedIds = new Set((sentInvitations.data ?? []).map((item) => item.id));
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
    onSuccess: (data) => setSelectedInvitees(new Set(data.invitees.map((_, index) => index))),
    onError: (error) =>
      showError(error, t("Kişiler şu anda eşleştirilemedi. Lütfen yeniden dene.", "Contacts could not be matched. Please try again.")),
  });
  const inviteMutation = useMutation({
    mutationFn: inviteContacts,
    onSuccess: (data) => {
      setNoticeTone("success");
      setNotice(language === "tr" ? `${data.invitedCount} davet gönderildi.` : `${data.invitedCount} invitations sent.`);
    },
    onError: (error) =>
      showError(error, t("Davetler şu anda gönderilemedi. Lütfen yeniden dene.", "Invitations could not be sent. Please try again.")),
  });
  const searchMutation = useMutation({
    mutationFn: () => searchContacts(manualQuery.trim(), manualType),
    onError: (error) =>
      showError(error, t("Arama şu anda tamamlanamadı. Lütfen yeniden dene.", "The search could not be completed. Please try again.")),
  });
  const matchedInviteMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (targetType === "event") await inviteEventParticipant(targetId!, { userId: memberId, role: "attendee" }, "user");
      else await invitePlaceMember(targetId!, { userId: memberId, role: "member" });
    },
    onSuccess: () => { void sentInvitations.refetch(); setNoticeTone("success"); setNotice(t("Kullanıcı hedefe davet edildi.", "The member was invited.")); },
    onError: (error) => showError(error, t("Kullanıcı hedefe davet edilemedi.", "The member could not be invited.")),
  });
  const targetContactsMutation = useMutation({
    mutationFn: (contacts: Contact[]) => Promise.allSettled(contacts.map((contact) => targetType === "event"
      ? inviteEventParticipant(targetId!, { name: contact.name, email: contact.email, phone: contact.phone, role: "attendee" }, "user")
      : invitePlaceMember(targetId!, { name: contact.name, email: contact.email, phone: contact.phone, role: "member" }))),
    onSuccess: async (data, contacts) => {
      await sentInvitations.refetch();
      const failed = contacts.filter((_, index) => data[index]?.status !== "fulfilled");
      const invitedCount = data.length - failed.length;
      if (!failed.length) { setSelectedInvitees(new Set()); setNoticeTone("success"); setNotice(t(`${invitedCount} davet gönderildi.`, `${invitedCount} invitations sent.`)); return; }
      setSelectedInvitees(new Set((importMutation.data?.invitees ?? []).flatMap((contact, index) => failed.includes(contact) ? [index] : [])));
      setNoticeTone("error");
      setNotice(t(`${invitedCount} davet gönderildi, ${failed.length} davet gönderilemedi. Yalnız başarısız olan kişiler seçili; yeniden deneyebilirsiniz.`, `${invitedCount} invitations sent, ${failed.length} failed. Only unsuccessful contacts remain selected; you can retry.`));
    },
    onError: (error) => showError(error, t("Seçilen kişiler hedefe davet edilemedi.", "The selected people could not be invited.")),
  });
  if (!user)
    return (
      <section className="page empty-state">
        <BookUser size={42} />
        <h1>{t("Arkadaşlarını bul", "Find your friends")}</h1>
        <p>{t("Rehber eşleştirmesi için giriş yapmalısın.", "Log in to match your contacts.")}</p>
        <Link className="primary-action" to="/login">
          {t("Giriş yap", "Log in")}
        </Link>
      </section>
    );

  async function select(source: "phone" | "google") {
    setNotice("");
    setScanning(true); setPickedSource(source);
    try {
      const contacts = source === "phone" ? await pickPhoneContacts() : await pickGoogleContacts();
      const unique = contacts.filter((contact, index, all) => all.findIndex(other => Boolean(contact.email && other.email?.trim().toLowerCase() === contact.email.trim().toLowerCase()) || Boolean(contact.phone && other.phone?.replace(/[^+0-9]/g, "") === contact.phone.replace(/[^+0-9]/g, ""))) === index);
      setCandidates(unique); setSelectedContacts(new Set());
    } finally { setScanning(false); }
  }

  const result = importMutation.data;
  const manualMembers = [...(searchMutation.data ?? [])].sort((left, right) => Number(alreadyInvitedIds.has(left.id)) - Number(alreadyInvitedIds.has(right.id)));
  const manualAlreadyStartsAt = manualMembers.findIndex((member) => alreadyInvitedIds.has(member.id));
  const importedMatches = [...(result?.matches ?? [])].sort((left, right) => Number(alreadyInvitedIds.has(left.member.id)) - Number(alreadyInvitedIds.has(right.member.id)));
  const importedAlreadyStartsAt = importedMatches.findIndex((item) => alreadyInvitedIds.has(item.member.id));
  return (
    <section className="page contacts-page">
      <header className="section-header">
        <div>
          <span className="eyebrow">{t("Gizlilik odaklı eşleştirme", "Privacy-first matching")}</span>
          <Heading>{targetType === "event" ? t("Etkinliğe davet et", "Invite to event") : targetType === "place" ? t("Mekâna davet et", "Invite to place") : t("Arkadaşlarını bul & davet et", "Find & invite your friends")}</Heading>
          <p>
            {t("Yalnızca seçtiğin kişiler eşleştirilir; rehberin Konnektora’da saklanmaz.", "Only contacts you select are matched; your address book is not stored by Konnektora.")}
          </p>
        </div>
        <BookUser size={42} />
      </header>
      {notice ? (
        <ServiceFeedback compact message={notice} tone={noticeTone} />
      ) : null}

      {!targetType ? <form className="admin-form contact-manual-search" onSubmit={(event) => { event.preventDefault(); setNotice(""); if (manualQuery.trim().length >= 2) searchMutation.mutate(); }}>
        <h2>{t("Manuel arama", "Manual search")}</h2>
        <p className="form-help">{t("Yalnızca “arkadaşlarım beni bulabilir” seçeneği açık üyeler sonuçlarda gösterilir.", "Only members who allow friends to find them appear in results.")}</p>
        <div className="form-grid"><label>{t("Arama türü", "Search type")}<select value={manualType} onChange={(event) => setManualType(event.target.value as typeof manualType)}>{targetType ? <option value="username">{t("Kullanıcı adı", "Username")}</option> : <option value="name">{t("Kullanıcı adı veya Ad Soyad", "Username or full name")}</option>}<option value="email">{t("E-posta adresi", "Email address")}</option><option value="phone">{t("Telefon numarası", "Phone number")}</option></select></label><label>{manualType === "username" ? t("Kullanıcı adı", "Username") : manualType === "name" ? t("Kullanıcı adı veya Ad Soyad", "Username or full name") : manualType === "email" ? t("E-posta", "Email") : t("Telefon", "Phone")}<input inputMode={manualType === "phone" ? "tel" : "text"} minLength={2} onChange={(event) => setManualQuery(event.target.value)} placeholder={manualType === "username" ? "@kullanici" : manualType === "name" ? t("@kullanici veya Ad Soyad", "@username or Full name") : manualType === "email" ? "member@example.com" : "+905551234567"} required type={manualType === "email" ? "email" : "text"} value={manualQuery}/>{manualType === "phone" ? <span className="form-help">{t("Numarayı + ve ülke koduyla yazın (ör. +90 555 123 45 67).", "Enter the number with + and country code (e.g. +44 7700 900123).")}</span> : null}</label></div>
        <button className="primary-action" disabled={searchMutation.isPending}><Search size={17}/>{searchMutation.isPending ? t("Aranıyor…", "Searching…") : t("Ara", "Search")}</button>
        {manualMembers.length ? <div className="onboarding-people">{manualMembers.map((member, index) => <Fragment key={member.id}>{index === manualAlreadyStartsAt ? <h3>{t("Zaten davet ettikleriniz", "Already invited")}</h3> : null}<article><UserIdentityLink user={member} avatarClassName="conversation-avatar" showName={false}/><div><strong className="member-name-line"><FollowStar id={member.id}/><Link to={userProfilePath(member)}>{member.username ? `@${member.username}` : member.name}</Link></strong><small>{member.commonTagCount} {t("ortak ilgi alanı", "shared interests")} · {member.followerCount} {t("takipçi", "followers")}</small></div>{targetType && targetId ? <button className="secondary-action" disabled={matchedInviteMutation.isPending || alreadyInvitedIds.has(member.id)} onClick={() => matchedInviteMutation.mutate(member.id)} type="button"><MailPlus size={17}/>{alreadyInvitedIds.has(member.id) ? t("Davet edildi", "Invited") : targetType === "event" ? t("Etkinliğe davet et", "Invite to event") : t("Mekâna davet et", "Invite to place")}</button> : <button className="secondary-action" onClick={() => void followUser(member.id)} type="button"><UserPlus size={17}/>{t("Takip et", "Follow")}</button>}</article></Fragment>)}</div> : null}
        {searchMutation.isSuccess && !searchMutation.data.length ? <div className="empty-state compact"><strong>{t("Bulunabilir bir üye eşleşmedi.", "No discoverable member matched.")}</strong><p>{t("Üye olmayan veya bulunmak istemeyen kişiye ücretsiz Konnektora daveti gönderebilirsin.", "You can send a free Konnektora invitation to a non-member.")}</p>{manualType !== "name" ? <button className="secondary-action" disabled={inviteMutation.isPending} onClick={() => inviteMutation.mutate([{ name: manualQuery.trim(), ...(manualType === "email" ? { email: manualQuery.trim() } : { phone: manualQuery.trim() }) }])} type="button"><MailPlus size={17}/>{t("Üyeliğe davet et", "Invite to join")}</button> : null}</div> : null}
      </form> : null}
      {!result && !candidates ? <div className="contact-source-grid">
        <button
          hidden={Boolean(targetType && sourceParam === "google")}
          className="social-provider-button"
          disabled={importMutation.isPending || scanning}
          onClick={() =>
            void select("phone").catch((error) =>
              showError(error, t("Telefon rehberi açılamadı. İzinleri kontrol edip yeniden dene.", "Phone contacts could not be opened. Check permissions and try again.")),
            )
          }
          type="button"
        >
          <Smartphone /> {t("Telefon rehberi", "Phone contacts")}
          <span>{t("Tarayıcının kişi seçicisini aç", "Open your browser's contact picker")}</span>
        </button>
        <button
          hidden={Boolean(targetType && sourceParam === "phone")}
          className="social-provider-button"
          disabled={importMutation.isPending || scanning}
          onClick={() =>
            void select("google").catch((error) =>
              showError(error, t("Google kişileri açılamadı. Lütfen yeniden dene.", "Google Contacts could not be opened. Please try again.")),
            )
          }
          type="button"
        >
          <span className="provider-letter">G</span> Google Contacts
          <span>{t("Salt okunur izinle kişileri seç", "Select contacts with read-only access")}</span>
        </button>
      </div> : null}
      {candidates ? <section className="admin-form contact-selection"><h2>{t("Davet etmek istediğin kişileri seç", "Choose contacts to invite")}</h2><p>{t("Henüz kimseye davet gönderilmedi.", "No invitations have been sent yet.")}</p>
        <label className="contact-select-all"><input type="checkbox" checked={candidates.length > 0 && selectedContacts.size === candidates.length} onChange={event => setSelectedContacts(event.target.checked ? new Set(candidates.map((_, i) => i)) : new Set())}/>{t("Tümünü seç", "Select all")} ({candidates.length})</label>
        <div className="contact-invite-list">{candidates.map((contact, index) => <label key={index}><input type="checkbox" checked={selectedContacts.has(index)} onChange={event => setSelectedContacts(current => { const next = new Set(current); if (event.target.checked) next.add(index); else next.delete(index); return next; })}/><span><strong>{contact.name}</strong><small>{contact.email ?? contact.phone}</small></span></label>)}</div>
        {selectedContacts.size > 500 ? <p role="alert">{t("Tek seferde en fazla 500 kişi eşleştirebilirsin.", "You can match up to 500 contacts at once.")}</p> : null}<button className="secondary-action" disabled={!selectedContacts.size || selectedContacts.size > 500 || importMutation.isPending} onClick={() => importMutation.mutate({source:pickedSource,contacts:candidates.filter((_,i)=>selectedContacts.has(i))}, {onSuccess:()=>setCandidates(null)})}>{t("Seçilen kişileri eşleştir", "Match selected contacts")}</button>
      </section> : null}
      {result ? (
        <>
          <section className="admin-form">
            <h2>{language === "tr" ? `Bulunan ${result.matches.length} üye` : `${result.matches.length} members found`}</h2>
            {result.matches.length && targetType && targetId ? <InviteAssessmentProvider kind={targetType} id={targetId}><InviteUserCards users={result.matches.map(row=>row.member)} invitedUserIds={alreadyInvitedIds} pending={matchedInviteMutation.isPending} guestLists={canUseGuestLists?(guestLists.data??[]):[]} onInvite={id=>matchedInviteMutation.mutate(id)} onInviteAll={async ids=>{for(const id of ids)await matchedInviteMutation.mutateAsync(id);}} onAddToGuestList={(listId,userId)=>{void addGuestListMember(listId,userId);}}/></InviteAssessmentProvider> : result.matches.length ? (
              <div className="onboarding-people">
                {importedMatches.map(({ contactName, member }, index) => (
                  <Fragment key={member.id}>
                    {index === importedAlreadyStartsAt ? <h3>{t("Zaten davet ettikleriniz", "Already invited")}</h3> : null}
                  <article>
                    <UserIdentityLink user={member} avatarClassName="conversation-avatar" showName={false}/>
                    <div>
                      <strong className="member-name-line"><FollowStar id={member.id}/><Link to={userProfilePath(member)}>{member.username ? `@${member.username}` : member.name}</Link></strong>
                      <small>
                        {contactName} · {member.followerCount} {t("takipçi", "followers")}
                      </small>
                    </div>
                    {targetType && targetId ? <button className="secondary-action" disabled={matchedInviteMutation.isPending || alreadyInvitedIds.has(member.id)} onClick={() => matchedInviteMutation.mutate(member.id)} type="button"><MailPlus size={17}/>{alreadyInvitedIds.has(member.id) ? t("Davet edildi", "Invited") : targetType === "event" ? t("Etkinliğe davet et", "Invite to event") : t("Mekâna davet et", "Invite to place")}</button> : <button className="secondary-action" onClick={() => void followUser(member.id)} type="button"><UserPlus size={17} /> {t("Takip et", "Follow")}</button>}
                  </article>
                  </Fragment>
                ))}
              </div>
            ) : (
              <p className="muted">{t("Bulunabilir üye eşleşmedi.", "No discoverable members matched.")}</p>
            )}
          </section>
          <section className="admin-form">
            <h2>{language === "tr" ? `Davet edilebilecek ${result.invitees.length} kişi` : `${result.invitees.length} people can be invited`}</h2>
            {result.invitees.length ? (
              <>
                <button
                  className="create-inline-link invite-all-link"
                  disabled={inviteMutation.isPending || targetContactsMutation.isPending || !selectedInvitees.size}
                  onClick={() => { const selected = result.invitees.filter((_, index) => selectedInvitees.has(index)); if (targetType && targetId) targetContactsMutation.mutate(selected); else inviteMutation.mutate(selected); }}
                  type="button"
                >
                  <MailPlus size={17} /> {t("Seçilenleri davet et", "Invite selected")} ({selectedInvitees.size})
                </button>
                <div className="contact-invite-list">
                  {result.invitees.map((contact, index) => (
                    <label key={`${contact.email ?? contact.phone}-${index}`}>
                      <input
                        checked={selectedInvitees.has(index)}
                        name="invitee"
                        onChange={(event) => setSelectedInvitees((current) => { const next = new Set(current); if (event.target.checked) next.add(index); else next.delete(index); return next; })}
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

              </>
            ) : (
              <p className="muted">{t("Davet edilecek kişi yok.", "There is no one to invite.")}</p>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
