import {
  Bell,
  CalendarDays,
  Camera,
  ChevronLeft,
  Compass,
  Home,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  QrCode,
  Search,
  Settings,
  Shield,
  Tag,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { type ElementType, type ReactNode, useMemo, useState } from "react";
import { useLanguage } from "../lib/i18n";

type MobileMode = "intro" | "signup" | "login" | "forgot" | "tutorials" | "invite" | "app";
type SignupKind = "individual" | "corporate";
type AppTab = "home" | "tags" | "events" | "places" | "messages";

const introSlides = [
  {
    title: "Sana benzeyen üyeleri bul",
    body: "Ortak ilgi alanları, yorumlar ve etkinlikler üzerinden yeni insanları keşfet.",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Etkinlikler ve topluluklar oluştur",
    body: "Etkinlik yayınla, katılımcıları yönet ve QR veya NFC ile giriş yaptır.",
    image: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Profilleri hızla paylaş",
    body: "QR kodunu paylaş, başka bir üyeyi tara ve iletişimi sürdür.",
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80"
  }
];
const introSlidesEn: typeof introSlides = [
  { title: "Find members like you", body: "Discover new people through shared interests, conversations and events.", image: introSlides[0]!.image },
  { title: "Create events and communities", body: "Publish events, manage participants and check people in with QR or NFC.", image: introSlides[1]!.image },
  { title: "Share profiles instantly", body: "Share your QR code, scan another member and stay connected.", image: introSlides[2]!.image },
];

const tutorialSlides = [
  {
    Icon: Tag,
    title: "İlgi alanları",
    body: "İlgi alanlarını profiline ekle, duygunu seç ve kendini yorumlarla ifade et."
  },
  {
    Icon: CalendarDays,
    title: "Etkinlikler",
    body: "Uygun etkinlikleri bul, kendi etkinliğini oluştur ve misafir listesini QR girişle yönet."
  },
  {
    Icon: UserPlus,
    title: "Arkadaşlarını bul",
    body: "Üyeleri takip et, kişilerini davet et ve içerikleri takip ettiklerine göre filtrele."
  }
];
const tutorialSlidesEn: typeof tutorialSlides = [
  { Icon: Tag, title: "Interests", body: "Add interests to your profile, choose your sentiment and express yourself through conversations." },
  { Icon: CalendarDays, title: "Events", body: "Find relevant events, create your own and manage the guest list with QR check-in." },
  { Icon: UserPlus, title: "Find your friends", body: "Follow members, invite your contacts and filter content by people you follow." },
];

const recommendedMembers = [
  { name: "Maya Collins", meta: "29 yaşında · Dublin'de", followers: "2.4k", tags: ["AI", "Tasarım"] },
  { name: "Jonas Berg", meta: "34 yaşında · Berlin'de", followers: "910", tags: ["Girişim", "Müzik"] },
  { name: "Elif Kaya", meta: "27 yaşında · İstanbul'da", followers: "1.7k", tags: ["Ürün", "Etkinlikler"] }
];

const events = [
  {
    title: "Founders Coffee Meetup",
    place: "Berlin, Germany",
    date: "Jul 12",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "AI Product Night",
    place: "Online",
    date: "Jul 18",
    image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=900&q=80"
  }
];

const tags = ["AI", "Startup", "Design", "Music", "Travel", "Product", "Coffee", "Berlin", "Dublin", "Istanbul"];

const mobileDrawerLinks: Array<{ label: string; Icon: ElementType }> = [
  { label: "Bildirimler", Icon: Bell },
  { label: "QR kodunu paylaş", Icon: QrCode },
  { label: "QR tara", Icon: Camera },
  { label: "Üyeler, takip ve misafir listeleri", Icon: Users },
  { label: "Arkadaşlarımı bul ve davet et", Icon: UserPlus },
  { label: "Ayarlar merkezi", Icon: Settings },
  { label: "Sık sorulan sorular", Icon: Shield },
  { label: "Bize yazın", Icon: Mail }
];

export function MobileAppPage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const [mode, setMode] = useState<MobileMode>("intro");
  const [introIndex, setIntroIndex] = useState(0);
  const [signupKind, setSignupKind] = useState<SignupKind>("individual");
  const [signupStep, setSignupStep] = useState(0);
  const [loginMethod, setLoginMethod] = useState<"choice" | "email" | "phone">("choice");
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [appTab, setAppTab] = useState<AppTab>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const activeIntro = (language === "tr" ? introSlides : introSlidesEn)[introIndex] ?? introSlides[0]!;
  const activeTutorial = (language === "tr" ? tutorialSlides : tutorialSlidesEn)[tutorialIndex] ?? tutorialSlides[0]!;

  const signupTitle = useMemo(() => {
    if (signupStep === 0) {
      return t("Kayıt ol", "Sign up");
    }

    if (signupStep === 1) {
      return signupKind === "individual" ? t("Hesap bilgileri", "Account details") : t("Şirket hesabı", "Business account");
    }

    if (signupStep === 2) {
      return t("Telefon doğrulama", "Phone verification");
    }

    if (signupStep === 3) {
      return signupKind === "individual" ? t("Kişisel bilgiler", "Personal details") : t("Şirket bilgileri", "Company details");
    }

    if (signupStep === 4) {
      return t("Profil fotoğrafı", "Profile picture");
    }

    return t("İlgi alanları", "Interests");
  }, [language, signupKind, signupStep]);
  const headerTitle = mode === "signup"
    ? signupTitle
    : mode === "login"
      ? t("Giriş yap", "Log in")
      : mode === "forgot"
        ? t("Parolayı sıfırla", "Reset password")
        : mode === "tutorials"
          ? t("Konnektora'yı keşfet", "Discover Konnektora")
          : mode === "invite"
            ? t("Arkadaşlarını davet et", "Invite your friends")
            : "Konnektora";

  function goBack() {
    if (mode === "signup" && signupStep > 0) {
      setSignupStep((step) => step - 1);
      return;
    }

    if (mode === "login" && loginMethod !== "choice") {
      setLoginMethod("choice");
      return;
    }

    setMode("intro");
  }

  return (
    <div className="mobile-app-shell">
      <div className="mobile-device">
        <div className="mobile-statusbar">
          <span>9:41</span>
          <span>5G · 100%</span>
        </div>

        {mode !== "intro" ? (
          <header className="mobile-app-header">
            <button aria-label={t("Geri", "Back")} onClick={goBack} type="button">
              <ChevronLeft size={20} />
            </button>
            <h1>{headerTitle}</h1>
            <button aria-label={t("Menü", "Menu")} onClick={() => setMenuOpen(true)} type="button">
              <Menu size={20} />
            </button>
          </header>
        ) : null}

        <main className={`mobile-app-main mobile-app-main-${mode}`}>
        {mode === "intro" ? (
          <IntroScreen
            activeIntro={activeIntro}
            introIndex={introIndex}
            onNext={() => setIntroIndex((index) => (index + 1) % introSlides.length)}
            onLogin={() => setMode("login")}
            onSignup={() => {
              setSignupStep(0);
              setMode("signup");
            }}
          />
        ) : null}

        {mode === "signup" ? (
          <SignupScreen
            signupKind={signupKind}
            signupStep={signupStep}
            setSignupKind={setSignupKind}
            onNext={() => {
              if (signupStep >= 5 || (signupKind === "corporate" && signupStep >= 5)) {
                setMode("tutorials");
                return;
              }

              setSignupStep((step) => step + 1);
            }}
          />
        ) : null}

        {mode === "login" ? (
          <LoginScreen
            loginMethod={loginMethod}
            setLoginMethod={setLoginMethod}
            onForgot={() => setMode("forgot")}
            onLogin={() => setMode("app")}
            onSignup={() => {
              setSignupStep(0);
              setMode("signup");
            }}
          />
        ) : null}

        {mode === "forgot" ? <ForgotPasswordScreen onDone={() => setMode("login")} /> : null}

        {mode === "tutorials" ? (
          <TutorialScreen
            activeTutorial={activeTutorial}
            tutorialIndex={tutorialIndex}
            onNext={() => {
              if (tutorialIndex === tutorialSlides.length - 1) {
                setMode("invite");
                return;
              }

              setTutorialIndex((index) => index + 1);
            }}
            onSkip={() => setMode("app")}
          />
        ) : null}

        {mode === "invite" ? <InviteScreen onDone={() => setMode("app")} /> : null}

        {mode === "app" ? (
          <AppHome
            appTab={appTab}
            menuOpen={menuOpen}
            setAppTab={setAppTab}
            setMenuOpen={setMenuOpen}
          />
        ) : null}
        </main>
      </div>
    </div>
  );
}

function IntroScreen({
  activeIntro,
  introIndex,
  onLogin,
  onNext,
  onSignup
}: {
  activeIntro: (typeof introSlides)[number];
  introIndex: number;
  onLogin: () => void;
  onNext: () => void;
  onSignup: () => void;
}) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  return (
    <section className="mobile-intro">
      <div className="mobile-intro-media">
        <img alt="" src={activeIntro.image} />
        <img alt="Konnektora" className="mobile-logo" src="/brand/konnektora-logo.svg" />
      </div>
      <div className="mobile-screen-body">
        <div className="mobile-dots">
          {introSlides.map((slide, index) => (
            <span className={index === introIndex ? "active" : ""} key={slide.title} />
          ))}
        </div>
        <h1>{activeIntro.title}</h1>
        <p>{activeIntro.body}</p>
        <button className="mobile-primary-btn" onClick={onSignup} type="button">
          {t("Kayıt ol", "Sign up")}
        </button>
        <button className="mobile-secondary-btn" onClick={onLogin} type="button">
          {t("Zaten üye misin? Giriş yap", "Already a member? Log in")}
        </button>
        <button className="mobile-text-btn" onClick={onNext} type="button">
          {t("Sonraki tanıtım", "Next introduction")}
        </button>
      </div>
    </section>
  );
}

function SignupScreen({
  onNext,
  setSignupKind,
  signupKind,
  signupStep
}: {
  onNext: () => void;
  setSignupKind: (kind: SignupKind) => void;
  signupKind: SignupKind;
  signupStep: number;
}) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  return (
    <section className="mobile-screen-body mobile-flow">
      {signupStep === 0 ? (
        <>
          <img alt="Konnektora" className="mobile-form-logo" src="/brand/konnektora-logo.svg" />
          <label>
            {t("Hesap türü", "Account type")}
            <select value={signupKind} onChange={(event) => setSignupKind(event.target.value as SignupKind)}>
              <option value="individual">{t("Bireysel", "Individual")}</option>
              <option value="corporate">{t("Kurumsal", "Business")}</option>
            </select>
          </label>
          <div className="mobile-social-grid">
            <button type="button">{t("Telefon ve e-posta", "Phone and email")}</button>
            <button type="button">Facebook</button>
            <button type="button">Google</button>
          </div>
        </>
      ) : null}

      {signupStep === 1 ? (
        <div className="mobile-form-stack">
          {signupKind === "corporate" ? (
            <>
              <label>{t("Marka adı", "Brand name")}<input placeholder="Konnektora Events" /></label>
              <label>{t("Yasal unvan", "Registered business name")}<input placeholder="Konnektora Ltd." /></label>
              <label>{t("Şirket türü", "Company type")}<select><option>{t("Limited / Anonim", "Limited / Corporation")}</option><option>{t("Dernek", "Association")}</option><option>{t("Diğer", "Other")}</option></select></label>
              <label>{t("İşletme kategorisi", "Business category")}<select><option>{t("Etkinlik organizatörü", "Event organiser")}</option><option>{t("Restoran / Bar / Kafe", "Restaurant / Bar / Cafe")}</option><option>{t("Marka", "Brand")}</option></select></label>
            </>
          ) : (
            <label>{t("Ad Soyad", "Full name")}<input placeholder="Maya Collins" /></label>
          )}
          <label>{t("Telefon numarası", "Phone number")}<input placeholder="+90 555 000 00 00" /></label>
          <label>{t("E-posta", "Email")}<input placeholder="maya@example.com" type="email" /></label>
          <label>{t("Yeni parola", "New password")}<input placeholder={t("En az 8 karakter", "At least 8 characters")} type="password" /></label>
          <label>{t("Yeni parola tekrar", "Confirm new password")}<input type="password" /></label>
          <label className="mobile-checkbox"><input type="checkbox" /> {t("Kullanım Koşulları ve Gizlilik Politikası'nı kabul ediyorum", "I accept the Terms of Use and Privacy Policy")}</label>
        </div>
      ) : null}

      {signupStep === 2 ? <CodeScreen body={t("Telefonuna 6 haneli bir kod gönderdik.", "We sent a 6-digit code to your phone.")} /> : null}

      {signupStep === 3 ? (
        <div className="mobile-form-stack">
          <label>{t("Kullanıcı adı", "Username")}<input placeholder={signupKind === "corporate" ? "konnektora_events" : "maya.collins"} /></label>
          <label>{t("Ülke", "Country")}<input placeholder={t("Türkiye", "Turkey")} /></label>
          <label>{t("Şehir", "City")}<input placeholder={t("İstanbul", "Istanbul")} /></label>
          {signupKind === "corporate" ? <label>{t("Adres", "Address")}<input placeholder={t("İsteğe bağlı adres", "Optional address")} /></label> : <label>{t("Doğum tarihi", "Date of birth")}<input type="date" /></label>}
          <label>{t("İnternet sitesi", "Website")}<input placeholder="https://..." /></label>
        </div>
      ) : null}

      {signupStep === 4 ? (
        <div className="mobile-upload-card">
          <Camera size={34} />
          <strong>{t("Profil fotoğrafı yükle", "Upload profile picture")}</strong>
          <p>{t("Devam etmeden önce görseli sürükleyebilir, kırpabilir, yakınlaştırabilir veya değiştirebilirsin.", "Before continuing, you can drag, crop, zoom or replace the image.")}</p>
        </div>
      ) : null}

      {signupStep >= 5 ? (
        <div className="mobile-tag-picker">
          <p>{t("Bu ilgi alanlarının sende uyandırdığı duyguyu seç.", "Choose how these interests make you feel.")}</p>
          {tags.slice(0, 8).map((tagName) => (
            <button key={tagName} type="button">
              {tagName}
              <span>{t("Beğeniyorum", "Like")}</span>
            </button>
          ))}
        </div>
      ) : null}

      <button className="mobile-primary-btn" onClick={onNext} type="button">
        {signupStep >= 5 ? t("Kaydet", "Save") : t("İleri", "Next")}
      </button>
    </section>
  );
}

function LoginScreen({
  loginMethod,
  onForgot,
  onLogin,
  onSignup,
  setLoginMethod
}: {
  loginMethod: "choice" | "email" | "phone";
  onForgot: () => void;
  onLogin: () => void;
  onSignup: () => void;
  setLoginMethod: (method: "choice" | "email" | "phone") => void;
}) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  if (loginMethod === "choice") {
    return (
      <section className="mobile-screen-body mobile-flow">
        <img alt="Konnektora" className="mobile-form-logo" src="/brand/konnektora-logo.svg" />
        <button className="mobile-primary-btn" onClick={() => setLoginMethod("phone")} type="button">{t("Telefon numarasıyla giriş yap", "Log in with phone number")}</button>
        <button className="mobile-secondary-btn" onClick={() => setLoginMethod("email")} type="button">{t("E-postayla giriş yap", "Log in with email")}</button>
        <button className="mobile-oauth-btn" type="button">{t("Facebook ile giriş yap", "Log in with Facebook")}</button>
        <button className="mobile-oauth-btn" type="button">{t("Google ile giriş yap", "Log in with Google")}</button>
        <button className="mobile-text-btn" onClick={onSignup} type="button">{t("Yeni misin? Kayıt ol", "New here? Sign up")}</button>
      </section>
    );
  }

  return (
    <section className="mobile-screen-body mobile-flow">
      <label>{loginMethod === "email" ? t("E-posta adresi", "Email address") : t("Telefon numarası", "Phone number")}<input placeholder={loginMethod === "email" ? "maya@example.com" : "+90 555 000 00 00"} /></label>
      <label>{t("Parola", "Password")}<input type="password" /></label>
      <button className="mobile-text-btn align-left" onClick={onForgot} type="button">{t("Parolanı mı unuttun?", "Forgot your password?")}</button>
      <button className="mobile-primary-btn" onClick={onLogin} type="button">{t("Giriş yap", "Log in")}</button>
    </section>
  );
}

function ForgotPasswordScreen({ onDone }: { onDone: () => void }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  return (
    <section className="mobile-screen-body mobile-flow">
      <h2>{t("Parolanı mı unuttun?", "Forgot your password?")}</h2>
      <p>{t("Parolanı e-posta adresin veya telefon numaranla yenile.", "Reset your password with your email address or phone number.")}</p>
      <label>{t("E-posta veya telefon", "Email or phone")}<input placeholder="maya@example.com" /></label>
      <CodeScreen body={t("Gönderdiğimiz 6 haneli kodu gir.", "Enter the 6-digit code we sent.")} />
      <label>{t("Yeni parola", "New password")}<input type="password" /></label>
      <label>{t("Yeni parola tekrar", "Confirm new password")}<input type="password" /></label>
      <button className="mobile-primary-btn" onClick={onDone} type="button">{t("Kaydet", "Save")}</button>
    </section>
  );
}

function CodeScreen({ body }: { body: string }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  return (
    <div className="mobile-code-card">
      <p>{body}</p>
      <div className="mobile-code-grid">
        {Array.from({ length: 6 }).map((_, index) => <input aria-label={t(`Kod ${index + 1}`, `Code ${index + 1}`)} key={index} maxLength={1} />)}
      </div>
      <span>{t("Kodu almadın mı? 118 saniye sonra yeniden gönderebilirsin.", "Didn't receive the code? You can resend it in 118 seconds.")}</span>
    </div>
  );
}

function TutorialScreen({
  activeTutorial,
  onNext,
  onSkip,
  tutorialIndex
}: {
  activeTutorial: (typeof tutorialSlides)[number];
  onNext: () => void;
  onSkip: () => void;
  tutorialIndex: number;
}) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const Icon = activeTutorial.Icon;

  return (
    <section className="mobile-screen-body mobile-tutorial">
      <div className="mobile-tutorial-icon"><Icon size={44} /></div>
      <h2>{activeTutorial.title}</h2>
      <p>{activeTutorial.body}</p>
      <div className="mobile-permission-card">
        {tutorialIndex === 0 ? <Bell size={18} /> : tutorialIndex === 1 ? <MapPin size={18} /> : <Camera size={18} />}
        <span>{tutorialIndex === 0 ? t("Bildirimlere izin ver", "Allow notifications") : tutorialIndex === 1 ? t("Konuma izin ver", "Allow location") : t("Kamera ve kişilere izin ver", "Allow camera and contacts")}</span>
      </div>
      <button className="mobile-primary-btn" onClick={onNext} type="button">{tutorialIndex === tutorialSlides.length - 1 ? t("Bul ve davet et", "Find and invite") : t("İleri", "Next")}</button>
      <button className="mobile-text-btn" onClick={onSkip} type="button">{t("Atla", "Skip")}</button>
    </section>
  );
}

function InviteScreen({ onDone }: { onDone: () => void }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  return (
    <section className="mobile-screen-body mobile-flow">
      <div className="mobile-section-title">
        <h2>{t("3 üye bulundu", "3 members found")}</h2>
        <button onClick={onDone} type="button">{t("İleri", "Next")}</button>
      </div>
      {recommendedMembers.map((member) => <MemberCard key={member.name} member={member} />)}
      <div className="mobile-section-title">
        <h2>{t("Davet et", "Invite")}</h2>
        <button type="button">{t("Tümünü davet et", "Invite all")}</button>
      </div>
      {["Ada Lovelace · ada@example.com", "Mert Demir · +90 555 010 20 30"].map((contact) => (
        <div className="mobile-invite-row" key={contact}>
          <span>{contact}</span>
          <button type="button">{t("Davet et", "Invite")}</button>
        </div>
      ))}
      <button className="mobile-secondary-btn" onClick={onDone} type="button">{t("Atla", "Skip")}</button>
    </section>
  );
}

function AppHome({
  appTab,
  menuOpen,
  setAppTab,
  setMenuOpen
}: {
  appTab: AppTab;
  menuOpen: boolean;
  setAppTab: (tab: AppTab) => void;
  setMenuOpen: (open: boolean) => void;
}) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  return (
    <>
      <div className="mobile-app-content">
        <div className="mobile-search">
          <Search size={18} />
          <input aria-label={t("Ara", "Search")} placeholder={t("Her şeyi ara", "Search everything")} />
          <span>{t("Temizle", "Clear")}</span>
        </div>

        {appTab === "home" ? (
          <>
            <section className="mobile-feed-hero">
              <div>
                <span>{t("Yakınındaki popüler içerikler", "Popular near you")}</span>
                <h2>{t("İlgi alanları ve etkinliklerle insanlarla tanış.", "Meet people through interests and events.")}</h2>
              </div>
              <QrCode size={42} />
            </section>
            <MobileSection title={t("Popüler hesaplar", "Popular accounts")}>
              {recommendedMembers.map((member) => <MemberCard key={member.name} member={member} />)}
            </MobileSection>
            <MobileSection title={t("Bölgendeki popüler etkinlikler", "Popular events in your area")}>
              {events.map((event) => <EventPreviewCard event={event} key={event.title} />)}
            </MobileSection>
          </>
        ) : null}

        {appTab === "tags" ? (
          <MobileSection title={t("İlgi alanları", "Interests")}>
            <div className="mobile-tag-cloud">{tags.map((tagName) => <button key={tagName} type="button">{tagName}</button>)}</div>
          </MobileSection>
        ) : null}

        {appTab === "events" ? (
          <MobileSection title={t("Etkinlikler", "Events")}>
            {events.map((event) => <EventPreviewCard event={event} key={event.title} />)}
          </MobileSection>
        ) : null}

        {appTab === "places" ? (
          <MobileSection title={t("Mekânlar", "Places")}>
            {["Kreuzberg Hub · Berlin", "Temple Bar Studio · Dublin", "Bomonti Hall · Istanbul"].map((place) => (
              <div className="mobile-place-row" key={place}><MapPin size={18} /><span>{place}</span><button type="button">{t("Takip et", "Follow")}</button></div>
            ))}
          </MobileSection>
        ) : null}

        {appTab === "messages" ? (
          <MobileSection title={t("Mesajlar", "Messages")}>
            {["Maya Collins", "Konnektora Admin", "AI Product Night"].map((name, index) => (
              <div className="mobile-message-row" key={name}>
                <Avatar name={name} />
                <div><strong>{name}</strong><span>{index === 0 ? t("Yeni özel mesaj", "New private message") : t("Okunmamış mesaj yok", "No unread messages")}</span></div>
              </div>
            ))}
          </MobileSection>
        ) : null}
      </div>
      <BottomTabs active={appTab} setAppTab={setAppTab} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

function MobileSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="mobile-content-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function MemberCard({ member }: { member: (typeof recommendedMembers)[number] }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  return (
    <article className="mobile-member-card">
      <Avatar name={member.name} />
      <div>
        <strong>{member.name}</strong>
        <span>{t(`${member.followers} takipçi`, `${member.followers} followers`)}</span>
        <p>{member.meta}</p>
        <div>{member.tags.map((tagName) => <small key={tagName}>{tagName}</small>)}</div>
      </div>
      <button type="button">{t("Takip et", "Follow")}</button>
    </article>
  );
}

function EventPreviewCard({ event }: { event: (typeof events)[number] }) {
  return (
    <article className="mobile-event-card">
      <img alt="" src={event.image} />
      <div>
        <span>{event.date}</span>
        <strong>{event.title}</strong>
        <p>{event.place}</p>
      </div>
    </article>
  );
}

function Avatar({ name }: { name: string }) {
  return <span className="mobile-avatar">{name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>;
}

function BottomTabs({ active, setAppTab }: { active: AppTab; setAppTab: (tab: AppTab) => void }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const tabs: Array<{ id: AppTab; label: string; Icon: ElementType }> = [
    { id: "home", label: t("Ana sayfa", "Home"), Icon: Home },
    { id: "tags", label: t("İlgi alanları", "Interests"), Icon: Tag },
    { id: "events", label: t("Etkinlikler", "Events"), Icon: CalendarDays },
    { id: "places", label: t("Mekânlar", "Places"), Icon: Compass },
    { id: "messages", label: t("Mesajlar", "Messages"), Icon: MessageCircle }
  ];

  return (
    <nav className="mobile-tabbar" aria-label={t("Alt navigasyon", "Bottom navigation")}>
      {tabs.map(({ Icon, id, label }) => (
        <button className={active === id ? "active" : ""} key={id} onClick={() => setAppTab(id)} type="button">
          <Icon size={19} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function MobileMenu({ onClose, open }: { onClose: () => void; open: boolean }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const labelsEn: Record<string, string> = {
    "Bildirimler": "Notifications",
    "QR kodunu paylaş": "Share QR code",
    "QR tara": "Scan QR",
    "Üyeler, takip ve misafir listeleri": "Members, following and guest lists",
    "Arkadaşlarımı bul ve davet et": "Find and invite friends",
    "Ayarlar merkezi": "Settings centre",
    "Sık sorulan sorular": "Frequently asked questions",
    "Bize yazın": "Contact us",
  };
  return (
    <aside className={`mobile-drawer${open ? " open" : ""}`} aria-hidden={!open}>
      <button className="mobile-drawer-backdrop" onClick={onClose} type="button" />
      <div className="mobile-drawer-panel">
        <button className="mobile-drawer-close" onClick={onClose} type="button"><X size={20} /></button>
        <div className="mobile-profile-mini">
          <Avatar name="Maya Collins" />
          <div>
            <strong>@maya.collins</strong>
            <span>{t("3 bildirim", "3 notifications")}</span>
          </div>
        </div>
        {mobileDrawerLinks.map(({ Icon: DrawerIcon, label }) => {
          return (
            <button className="mobile-drawer-link" key={label} type="button">
              <DrawerIcon size={18} />
              <span>{language === "tr" ? label : labelsEn[label]}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
