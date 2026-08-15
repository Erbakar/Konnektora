import { Bell, BriefcaseBusiness, CreditCard, Image, LockKeyhole, Settings, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import type { NotificationPreference, PrivacyAudience } from "@konnektora/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { changePassword, deleteProfileMedia, getMyProfile, getNotificationPreferences, getPrivacySettings, getUserSession, listProfileMedia, makeProfilePicture, resolveMediaUrl, updateMyProfile, updateNotificationPreferences, updatePrivacySettings, uploadProfileMedia } from "../lib/api";

const settings = [
  { icon: Image, title: "Profil fotoğrafları", description: "Profil görsellerini ekle, sırala veya kaldır.", href: "/settings/profile-pictures" },
  { icon: UserRound, title: "Profili düzenle", description: "Temel bilgilerini ve ilgi alanlarını güncelle.", href: "/settings/profile" },
  { icon: Settings, title: "Hesap ayarları", description: "Hesap, güvenlik ve oturum seçeneklerini yönet.", href: "/settings/account" },
  { icon: Bell, title: "Bildirim ayarları", description: "Bildirim kanallarını ve tercihlerini belirle.", href: "/settings/notifications" },
  { icon: LockKeyhole, title: "Gizlilik ayarları", description: "Kimlerin sana ulaşabileceğini ve içeriklerini görebileceğini seç.", href: "/settings/privacy" },
  { icon: BriefcaseBusiness, title: "Business ve ödeme ayarları", description: "Paket, fatura ve ödeme bilgilerini yönet.", href: "/settings/business" },
] as const;

export function SettingsCenterPage() {
  return <section className="page settings-center-page"><div className="section-header"><div><p className="eyebrow">Hesabın</p><h1>Ayarlar Merkezi</h1><p className="lead">Profil ve hesap tercihlerini tek yerden yönet.</p></div><CreditCard size={36}/></div><div className="settings-center-grid">{settings.map(({ icon: Icon, ...item }) => <Link key={item.title} to={item.href}><Icon size={24}/><span><strong>{item.title}</strong><small>{item.description}</small></span><b>→</b></Link>)}</div></section>;
}

const sections: Record<string, { title: string; description: string; target: string }> = {
  "profile-pictures": { title: "Profil fotoğrafları", description: "Profil görsellerini ekle, sırala ve profil fotoğrafını seç.", target: "/settings/profile-pictures" },
  profile: { title: "Profili düzenle", description: "Temel bilgiler, kurumsal bilgiler ve ilgi alanlarını düzenle.", target: "/settings/profile" },
  account: { title: "Hesap ayarları", description: "Telefon, parola, bağlı hesaplar ve hesap durumunu yönet.", target: "/settings/account" },
  notifications: { title: "Bildirim ayarları", description: "E-posta ve anlık bildirim tercihlerini düzenle.", target: "/settings/notifications" },
  privacy: { title: "Gizlilik ayarları", description: "Profil, mesaj, etkinlik ve mekân görünürlüğünü yönet.", target: "/settings/privacy" },
  business: { title: "Business ve ödeme ayarları", description: "Paket, fatura, banka ve ödeme ayarlarını yönet.", target: "/finance" },
};

export function SettingsSectionPage({ section }: { section: string }) {
  const item = sections[section] ?? sections.account!;
  const user = getUserSession();
  return <section className="page settings-section-page"><Link className="back-link" to="/settings">← Ayarlar Merkezi</Link><div className="section-header"><div><p className="eyebrow">Ayarlar</p><h1>{item.title}</h1><p className="lead">{item.description}</p></div></div>{!user ? <div className="identity-panel"><h2>Giriş gerekli</h2><p>Bu ayarları görüntülemek ve değiştirmek için hesabınıza giriş yapın.</p><Link className="primary-action" to="/login">Giriş yap</Link></div> : section === "profile-pictures" ? <ProfilePicturesSettings/> : section === "profile" ? <ProfileSettings/> : section === "account" ? <AccountSettings/> : section === "notifications" ? <NotificationSettings/> : section === "privacy" ? <PrivacySettings/> : <BusinessSettings/>}</section>;
}

function ProfilePicturesSettings() {
  const client = useQueryClient();
  const media = useQuery({ queryKey: ["profile-media"], queryFn: listProfileMedia });
  const refresh = () => client.invalidateQueries({ queryKey: ["profile-media"] });
  const upload = useMutation({ mutationFn: uploadProfileMedia, onSuccess: refresh });
  const primary = useMutation({ mutationFn: makeProfilePicture, onSuccess: refresh });
  const remove = useMutation({ mutationFn: deleteProfileMedia, onSuccess: refresh });
  return <div className="identity-panel"><label className="primary-action">Yeni fotoğraf/video yükle<input accept="image/*,video/mp4,video/webm" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); event.target.value = ""; }} type="file"/></label><div className="settings-media-grid">{media.data?.map((item) => <article key={item.id}>{item.type === "image" ? <img alt="Profil medyası" src={resolveMediaUrl(item.url)}/> : <video controls src={resolveMediaUrl(item.url)}/>}<div className="row-actions">{item.type === "image" && !item.isProfilePicture ? <button onClick={() => primary.mutate(item.id)}>Profil fotoğrafı yap</button> : null}{item.isProfilePicture ? <strong>Aktif profil fotoğrafı</strong> : null}<button className="danger-action" onClick={() => window.confirm("Bu medya silinsin mi?") && remove.mutate(item.id)}>Sil</button></div></article>)}</div>{upload.isError || primary.isError || remove.isError ? <p className="form-error">Medya işlemi tamamlanamadı.</p> : null}</div>;
}

function ProfileSettings() {
  const client = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: getMyProfile });
  const save = useMutation({ mutationFn: updateMyProfile, onSuccess: () => client.invalidateQueries({ queryKey: ["profile"] }) });
  if (!profile.data) return <div className="identity-panel">Profil yükleniyor…</div>;
  return <form className="identity-panel settings-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const value = (key: string) => String(form.get(key) || "").trim() || undefined; save.mutate({ name: value("name")!, username: value("username"), phone: value("phone"), city: value("city"), country: value("country"), district: value("district"), address: value("address"), website: value("website") }); }}><div className="form-grid"><label>Ad soyad<input defaultValue={profile.data.name} name="name" required/></label><label>Kullanıcı adı<input defaultValue={profile.data.username ?? ""} name="username"/></label><label>Telefon<input defaultValue={profile.data.phone ?? ""} name="phone"/></label><label>Şehir<input defaultValue={profile.data.city ?? ""} name="city"/></label><label>Ülke<input defaultValue={profile.data.country ?? ""} name="country"/></label><label>İlçe<input defaultValue={profile.data.district ?? ""} name="district"/></label><label>Adres<input defaultValue={profile.data.address ?? ""} name="address"/></label><label>Web sitesi<input defaultValue={profile.data.website ?? ""} name="website" type="url"/></label></div><button className="primary-action" disabled={save.isPending}>Kaydet</button>{save.isSuccess ? <p className="form-success">Profil kaydedildi.</p> : null}{save.isError ? <p className="form-error">Profil kaydedilemedi.</p> : null}</form>;
}

function AccountSettings() {
  const change = useMutation({ mutationFn: changePassword });
  return <form className="identity-panel settings-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const currentPassword = String(form.get("currentPassword") || ""); const newPassword = String(form.get("newPassword") || ""); const confirmation = String(form.get("confirmation") || ""); if (newPassword !== confirmation) return window.alert("Yeni şifreler eşleşmiyor."); change.mutate({ currentPassword, newPassword }); }}><h2>Şifreyi değiştir</h2><label>Mevcut şifre<input autoComplete="current-password" name="currentPassword" required type="password"/></label><label>Yeni şifre<input autoComplete="new-password" minLength={8} name="newPassword" required type="password"/></label><label>Yeni şifre tekrar<input autoComplete="new-password" minLength={8} name="confirmation" required type="password"/></label><button className="primary-action" disabled={change.isPending}>Şifreyi güncelle</button>{change.isSuccess ? <p className="form-success">Şifre güncellendi.</p> : null}{change.isError ? <p className="form-error">Şifre güncellenemedi.</p> : null}<Link to="/settings/account">Telefon, bağlı hesaplar ve hesap dondurma seçenekleri</Link></form>;
}

const notificationLabels: Record<string, string> = { tag_request: "Etiket talebi", private_message: "Özel mesaj", mention: "Bahsedilme", comment: "Yorum", password_changed: "Şifre değişikliği", email_changed: "E-posta değişikliği", phone_changed: "Telefon değişikliği", login: "Yeni giriş", admin_message: "Yönetim mesajı", event_invite: "Etkinlik daveti", event_manager: "Etkinlik yöneticiliği", place_invite: "Mekân daveti", place_manager: "Mekân yöneticiliği" };
function NotificationSettings() {
  const client = useQueryClient();
  const preferences = useQuery({ queryKey: ["notification-preferences"], queryFn: getNotificationPreferences });
  const save = useMutation({ mutationFn: updateNotificationPreferences, onSuccess: () => client.invalidateQueries({ queryKey: ["notification-preferences"] }) });
  return <form className="identity-panel settings-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); save.mutate((preferences.data ?? []).map((item) => ({ topic: item.topic, channel: String(form.get(item.topic) || item.channel) as NotificationPreference["channel"] }))); }}><div className="settings-preference-list">{preferences.data?.map((item) => <label key={item.topic}><span>{notificationLabels[item.topic] ?? item.topic}</span><select defaultValue={item.channel} name={item.topic}><option value="both">E-posta ve push</option><option value="email">Yalnız e-posta</option><option value="push">Yalnız push</option><option value="none">Kapalı</option></select></label>)}</div><button className="primary-action" disabled={save.isPending}>Tercihleri kaydet</button>{save.isSuccess ? <p className="form-success">Bildirim tercihleri kaydedildi.</p> : null}</form>;
}

const privacyFields = ["messageAudience", "eventAudience", "eventInviteAudience", "placeAudience", "placeInviteAudience", "profileNameAudience", "demographicsAudience", "locationAudience", "websiteAudience", "businessAudience"] as const;
const privacyLabels: Record<(typeof privacyFields)[number], string> = { messageAudience: "Kimler mesaj gönderebilir?", eventAudience: "Etkinliklerimi kim görebilir?", eventInviteAudience: "Kimler etkinliğe davet edebilir?", placeAudience: "Mekânlarımı kim görebilir?", placeInviteAudience: "Kimler mekâna davet edebilir?", profileNameAudience: "Ad soyad görünürlüğü", demographicsAudience: "Yaş ve cinsiyet görünürlüğü", locationAudience: "Konum görünürlüğü", websiteAudience: "Web sitesi görünürlüğü", businessAudience: "Kurumsal bilgi görünürlüğü" };
function PrivacySettings() {
  const client = useQueryClient();
  const privacy = useQuery({ queryKey: ["privacy-settings"], queryFn: getPrivacySettings });
  const save = useMutation({ mutationFn: updatePrivacySettings, onSuccess: () => client.invalidateQueries({ queryKey: ["privacy-settings"] }) });
  if (!privacy.data) return <div className="identity-panel">Gizlilik ayarları yükleniyor…</div>;
  return <form className="identity-panel settings-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const audiences = Object.fromEntries(privacyFields.map((field) => [field, String(form.get(field)) as PrivacyAudience])) as Record<(typeof privacyFields)[number], PrivacyAudience>; save.mutate({ ...audiences, directoryDiscoverable: form.get("directoryDiscoverable") === "on" }); }}><label className="checkbox-line"><input defaultChecked={privacy.data.directoryDiscoverable} name="directoryDiscoverable" type="checkbox"/>Arkadaşlarım beni aramada bulabilsin</label><div className="form-grid">{privacyFields.map((field) => <label key={field}>{privacyLabels[field]}<select defaultValue={privacy.data[field]} name={field}><option value="everybody">Herkes</option><option value="following">Takip ettiklerim</option><option value="network">Ağım</option></select></label>)}</div><button className="primary-action" disabled={save.isPending}>Gizliliği kaydet</button>{save.isSuccess ? <p className="form-success">Gizlilik ayarları kaydedildi.</p> : null}</form>;
}

function BusinessSettings() {
  return <div className="identity-panel settings-form"><h2>Business ve ödeme</h2><p>Kurumsal paketini, cüzdanını, ödeme yöntemlerini, hesap hareketlerini ve faturalarını yönet.</p><div className="row-actions"><Link className="primary-action" to="/finance">Cüzdan ve ödeme ayarları</Link><Link className="secondary-action" to="/store">Paketleri görüntüle</Link><Link className="secondary-action" to="/business">Business çözümleri</Link></div></div>;
}
