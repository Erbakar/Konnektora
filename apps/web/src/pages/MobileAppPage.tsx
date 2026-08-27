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
  const [mode, setMode] = useState<MobileMode>("intro");
  const [introIndex, setIntroIndex] = useState(0);
  const [signupKind, setSignupKind] = useState<SignupKind>("individual");
  const [signupStep, setSignupStep] = useState(0);
  const [loginMethod, setLoginMethod] = useState<"choice" | "email" | "phone">("choice");
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [appTab, setAppTab] = useState<AppTab>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const activeIntro = introSlides[introIndex] ?? introSlides[0]!;
  const activeTutorial = tutorialSlides[tutorialIndex] ?? tutorialSlides[0]!;

  const signupTitle = useMemo(() => {
    if (signupStep === 0) {
      return "Kayıt ol";
    }

    if (signupStep === 1) {
      return signupKind === "individual" ? "Hesap bilgileri" : "Şirket hesabı";
    }

    if (signupStep === 2) {
      return "Telefon doğrulama";
    }

    if (signupStep === 3) {
      return signupKind === "individual" ? "Kişisel bilgiler" : "Şirket bilgileri";
    }

    if (signupStep === 4) {
      return "Profil fotoğrafı";
    }

    return "İlgi alanları";
  }, [signupKind, signupStep]);
  const headerTitle = mode === "signup"
    ? signupTitle
    : mode === "login"
      ? "Giriş yap"
      : mode === "forgot"
        ? "Parolayı sıfırla"
        : mode === "tutorials"
          ? "Konnektora'yı keşfet"
          : mode === "invite"
            ? "Arkadaşlarını davet et"
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
            <button aria-label="Geri" onClick={goBack} type="button">
              <ChevronLeft size={20} />
            </button>
            {mode === "app" ? <strong>{headerTitle}</strong> : <h1>{headerTitle}</h1>}
            <button aria-label="Menü" onClick={() => setMenuOpen(true)} type="button">
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
          Kayıt ol
        </button>
        <button className="mobile-secondary-btn" onClick={onLogin} type="button">
          Zaten üye misin? Giriş yap
        </button>
        <button className="mobile-text-btn" onClick={onNext} type="button">
          Sonraki tanıtım
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
  return (
    <section className="mobile-screen-body mobile-flow">
      {signupStep === 0 ? (
        <>
          <img alt="Konnektora" className="mobile-form-logo" src="/brand/konnektora-logo.svg" />
          <label>
            Hesap türü
            <select value={signupKind} onChange={(event) => setSignupKind(event.target.value as SignupKind)}>
              <option value="individual">Bireysel</option>
              <option value="corporate">Kurumsal</option>
            </select>
          </label>
          <div className="mobile-social-grid">
            <button type="button">Telefon ve e-posta</button>
            <button type="button">Facebook</button>
            <button type="button">Google</button>
          </div>
        </>
      ) : null}

      {signupStep === 1 ? (
        <div className="mobile-form-stack">
          {signupKind === "corporate" ? (
            <>
              <label>Marka adı<input placeholder="Konnektora Events" /></label>
              <label>Yasal unvan<input placeholder="Konnektora Ltd." /></label>
              <label>Şirket türü<select><option>Limited / Anonim</option><option>Dernek</option><option>Diğer</option></select></label>
              <label>İşletme kategorisi<select><option>Etkinlik organizatörü</option><option>Restoran / Bar / Kafe</option><option>Marka</option></select></label>
            </>
          ) : (
            <label>Ad Soyad<input placeholder="Maya Collins" /></label>
          )}
          <label>Telefon numarası<input placeholder="+90 555 000 00 00" /></label>
          <label>E-posta<input placeholder="maya@example.com" type="email" /></label>
          <label>Yeni parola<input placeholder="En az 8 karakter" type="password" /></label>
          <label>Yeni parola tekrar<input type="password" /></label>
          <label className="mobile-checkbox"><input type="checkbox" /> Kullanım Koşulları ve Gizlilik Politikası'nı kabul ediyorum</label>
        </div>
      ) : null}

      {signupStep === 2 ? <CodeScreen body="Telefonuna 6 haneli bir kod gönderdik." /> : null}

      {signupStep === 3 ? (
        <div className="mobile-form-stack">
          <label>Kullanıcı adı<input placeholder={signupKind === "corporate" ? "konnektora_events" : "maya.collins"} /></label>
          <label>Ülke<input placeholder="Türkiye" /></label>
          <label>Şehir<input placeholder="İstanbul" /></label>
          {signupKind === "corporate" ? <label>Adres<input placeholder="İsteğe bağlı adres" /></label> : <label>Doğum tarihi<input type="date" /></label>}
          <label>İnternet sitesi<input placeholder="https://..." /></label>
        </div>
      ) : null}

      {signupStep === 4 ? (
        <div className="mobile-upload-card">
          <Camera size={34} />
          <strong>Profil fotoğrafı yükle</strong>
          <p>Devam etmeden önce görseli sürükleyebilir, kırpabilir, yakınlaştırabilir veya değiştirebilirsin.</p>
        </div>
      ) : null}

      {signupStep >= 5 ? (
        <div className="mobile-tag-picker">
          <p>Bu ilgi alanlarının sende uyandırdığı duyguyu seç.</p>
          {tags.slice(0, 8).map((tagName) => (
            <button key={tagName} type="button">
              {tagName}
              <span>Beğeniyorum</span>
            </button>
          ))}
        </div>
      ) : null}

      <button className="mobile-primary-btn" onClick={onNext} type="button">
        {signupStep >= 5 ? "Kaydet" : "İleri"}
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
  if (loginMethod === "choice") {
    return (
      <section className="mobile-screen-body mobile-flow">
        <img alt="Konnektora" className="mobile-form-logo" src="/brand/konnektora-logo.svg" />
        <button className="mobile-primary-btn" onClick={() => setLoginMethod("phone")} type="button">Telefon numarasıyla giriş yap</button>
        <button className="mobile-secondary-btn" onClick={() => setLoginMethod("email")} type="button">E-postayla giriş yap</button>
        <button className="mobile-oauth-btn" type="button">Facebook ile giriş yap</button>
        <button className="mobile-oauth-btn" type="button">Google ile giriş yap</button>
        <button className="mobile-text-btn" onClick={onSignup} type="button">Yeni misin? Kayıt ol</button>
      </section>
    );
  }

  return (
    <section className="mobile-screen-body mobile-flow">
      <label>{loginMethod === "email" ? "E-posta adresi" : "Telefon numarası"}<input placeholder={loginMethod === "email" ? "maya@example.com" : "+90 555 000 00 00"} /></label>
      <label>Parola<input type="password" /></label>
      <button className="mobile-text-btn align-left" onClick={onForgot} type="button">Parolanı mı unuttun?</button>
      <button className="mobile-primary-btn" onClick={onLogin} type="button">Giriş yap</button>
    </section>
  );
}

function ForgotPasswordScreen({ onDone }: { onDone: () => void }) {
  return (
    <section className="mobile-screen-body mobile-flow">
      <h2>Parolanı mı unuttun?</h2>
      <p>Parolanı e-posta adresin veya telefon numaranla yenile.</p>
      <label>E-posta veya telefon<input placeholder="maya@example.com" /></label>
      <CodeScreen body="Gönderdiğimiz 6 haneli kodu gir." />
      <label>Yeni parola<input type="password" /></label>
      <label>Yeni parola tekrar<input type="password" /></label>
      <button className="mobile-primary-btn" onClick={onDone} type="button">Kaydet</button>
    </section>
  );
}

function CodeScreen({ body }: { body: string }) {
  return (
    <div className="mobile-code-card">
      <p>{body}</p>
      <div className="mobile-code-grid">
        {Array.from({ length: 6 }).map((_, index) => <input aria-label={`Kod ${index + 1}`} key={index} maxLength={1} />)}
      </div>
      <span>Kodu almadın mı? 118 saniye sonra yeniden gönderebilirsin.</span>
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
  const Icon = activeTutorial.Icon;

  return (
    <section className="mobile-screen-body mobile-tutorial">
      <div className="mobile-tutorial-icon"><Icon size={44} /></div>
      <h2>{activeTutorial.title}</h2>
      <p>{activeTutorial.body}</p>
      <div className="mobile-permission-card">
        {tutorialIndex === 0 ? <Bell size={18} /> : tutorialIndex === 1 ? <MapPin size={18} /> : <Camera size={18} />}
        <span>{tutorialIndex === 0 ? "Bildirimlere izin ver" : tutorialIndex === 1 ? "Konuma izin ver" : "Kamera ve kişilere izin ver"}</span>
      </div>
      <button className="mobile-primary-btn" onClick={onNext} type="button">{tutorialIndex === tutorialSlides.length - 1 ? "Bul ve davet et" : "İleri"}</button>
      <button className="mobile-text-btn" onClick={onSkip} type="button">Atla</button>
    </section>
  );
}

function InviteScreen({ onDone }: { onDone: () => void }) {
  return (
    <section className="mobile-screen-body mobile-flow">
      <div className="mobile-section-title">
        <h2>3 üye bulundu</h2>
        <button onClick={onDone} type="button">İleri</button>
      </div>
      {recommendedMembers.map((member) => <MemberCard key={member.name} member={member} />)}
      <div className="mobile-section-title">
        <h2>Davet et</h2>
        <button type="button">Tümünü davet et</button>
      </div>
      {["Ada Lovelace · ada@example.com", "Mert Demir · +90 555 010 20 30"].map((contact) => (
        <div className="mobile-invite-row" key={contact}>
          <span>{contact}</span>
          <button type="button">Davet et</button>
        </div>
      ))}
      <button className="mobile-secondary-btn" onClick={onDone} type="button">Atla</button>
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
  return (
    <>
      <main className="mobile-app-content">
        <div className="mobile-search">
          <Search size={18} />
          <input placeholder="Her şeyi ara" />
          <span>Temizle</span>
        </div>

        {appTab === "home" ? (
          <>
            <section className="mobile-feed-hero">
              <div>
                <span>Yakınındaki popüler içerikler</span>
                <h1>İlgi alanları ve etkinliklerle insanlarla tanış.</h1>
              </div>
              <QrCode size={42} />
            </section>
            <MobileSection title="Popüler Hesaplar Widget">
              {recommendedMembers.map((member) => <MemberCard key={member.name} member={member} />)}
            </MobileSection>
            <MobileSection title="Bölgendeki Popüler Etkinlikler">
              {events.map((event) => <EventPreviewCard event={event} key={event.title} />)}
            </MobileSection>
          </>
        ) : null}

        {appTab === "tags" ? (
          <MobileSection title="İlgi alanları">
            <div className="mobile-tag-cloud">{tags.map((tagName) => <button key={tagName} type="button">{tagName}</button>)}</div>
          </MobileSection>
        ) : null}

        {appTab === "events" ? (
          <MobileSection title="Etkinlikler">
            {events.map((event) => <EventPreviewCard event={event} key={event.title} />)}
          </MobileSection>
        ) : null}

        {appTab === "places" ? (
          <MobileSection title="Mekânlar">
            {["Kreuzberg Hub · Berlin", "Temple Bar Studio · Dublin", "Bomonti Hall · Istanbul"].map((place) => (
              <div className="mobile-place-row" key={place}><MapPin size={18} /><span>{place}</span><button type="button">Takip et</button></div>
            ))}
          </MobileSection>
        ) : null}

        {appTab === "messages" ? (
          <MobileSection title="Mesajlar">
            {["Maya Collins", "Konnektora Admin", "AI Product Night"].map((name, index) => (
              <div className="mobile-message-row" key={name}>
                <Avatar name={name} />
                <div><strong>{name}</strong><span>{index === 0 ? "Yeni özel mesaj" : "Okunmamış mesaj yok"}</span></div>
              </div>
            ))}
          </MobileSection>
        ) : null}
      </main>
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
  return (
    <article className="mobile-member-card">
      <Avatar name={member.name} />
      <div>
        <strong>{member.name}</strong>
        <span>{member.followers} takipçi</span>
        <p>{member.meta}</p>
        <div>{member.tags.map((tagName) => <small key={tagName}>{tagName}</small>)}</div>
      </div>
      <button type="button">Takip et</button>
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
  const tabs: Array<{ id: AppTab; label: string; Icon: ElementType }> = [
    { id: "home", label: "Ana sayfa", Icon: Home },
    { id: "tags", label: "İlgi alanları", Icon: Tag },
    { id: "events", label: "Etkinlikler", Icon: CalendarDays },
    { id: "places", label: "Mekânlar", Icon: Compass },
    { id: "messages", label: "Mesajlar", Icon: MessageCircle }
  ];

  return (
    <nav className="mobile-tabbar" aria-label="Alt navigasyon">
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
  return (
    <aside className={`mobile-drawer${open ? " open" : ""}`} aria-hidden={!open}>
      <button className="mobile-drawer-backdrop" onClick={onClose} type="button" />
      <div className="mobile-drawer-panel">
        <button className="mobile-drawer-close" onClick={onClose} type="button"><X size={20} /></button>
        <div className="mobile-profile-mini">
          <Avatar name="Maya Collins" />
          <div>
            <strong>@maya.collins</strong>
            <span>3 bildirim</span>
          </div>
        </div>
        {mobileDrawerLinks.map(({ Icon: DrawerIcon, label }) => {
          return (
            <button className="mobile-drawer-link" key={label} type="button">
              <DrawerIcon size={18} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
