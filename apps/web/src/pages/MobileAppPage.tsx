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
    title: "Find members like you",
    body: "Discover people around shared tags, comments and events without wasting time.",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Create events and communities",
    body: "Publish events, manage participants and check people in with QR or NFC.",
    image: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Swap profiles quickly",
    body: "Share your QR, scan another member and keep the conversation moving.",
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80"
  }
];

const tutorialSlides = [
  {
    Icon: Tag,
    title: "Tags",
    body: "Add tags to your profile, choose an emotion and write comments to express yourself."
  },
  {
    Icon: CalendarDays,
    title: "Events",
    body: "Find relevant events, create your own and manage guest lists with QR check-in."
  },
  {
    Icon: UserPlus,
    title: "Find friends",
    body: "Follow members privately, invite contacts and filter content by the people you follow."
  }
];

const recommendedMembers = [
  { name: "Maya Collins", meta: "She is 29 y.o. · Based in Dublin.", followers: "2.4k", tags: ["AI", "Design"] },
  { name: "Jonas Berg", meta: "They are 34 y.o. · Based in Berlin.", followers: "910", tags: ["Startup", "Music"] },
  { name: "Elif Kaya", meta: "She is 27 y.o. · Based in Istanbul.", followers: "1.7k", tags: ["Product", "Events"] }
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
  { label: "Notifications", Icon: Bell },
  { label: "Share your QR", Icon: QrCode },
  { label: "Scan QR", Icon: Camera },
  { label: "Users & Following & Guest lists", Icon: Users },
  { label: "Find my friends & Invite", Icon: UserPlus },
  { label: "Settings center", Icon: Settings },
  { label: "FAQ", Icon: Shield },
  { label: "Write us", Icon: Mail }
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
      return "Sign up";
    }

    if (signupStep === 1) {
      return signupKind === "individual" ? "Account info" : "Company account";
    }

    if (signupStep === 2) {
      return "GSM activation";
    }

    if (signupStep === 3) {
      return signupKind === "individual" ? "Personal info" : "Company info";
    }

    if (signupStep === 4) {
      return "Profile photo";
    }

    return "Tags";
  }, [signupKind, signupStep]);

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
            <button aria-label="Back" onClick={goBack} type="button">
              <ChevronLeft size={20} />
            </button>
            <strong>{mode === "app" ? "Konnektora" : mode === "signup" ? signupTitle : mode}</strong>
            <button aria-label="Menu" onClick={() => setMenuOpen(true)} type="button">
              <Menu size={20} />
            </button>
          </header>
        ) : null}

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
          Sign up
        </button>
        <button className="mobile-secondary-btn" onClick={onLogin} type="button">
          Already a member? Login
        </button>
        <button className="mobile-text-btn" onClick={onNext} type="button">
          Next intro
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
            Account type
            <select value={signupKind} onChange={(event) => setSignupKind(event.target.value as SignupKind)}>
              <option value="individual">Bireysel</option>
              <option value="corporate">Kurumsal</option>
            </select>
          </label>
          <div className="mobile-social-grid">
            <button type="button">Phone and email</button>
            <button type="button">Facebook</button>
            <button type="button">Google</button>
          </div>
        </>
      ) : null}

      {signupStep === 1 ? (
        <div className="mobile-form-stack">
          {signupKind === "corporate" ? (
            <>
              <label>Brand name<input placeholder="Konnektora Events" /></label>
              <label>Legal title<input placeholder="Konnektora Ltd." /></label>
              <label>Company type<select><option>Limited / Anonim</option><option>Dernek</option><option>Diğer</option></select></label>
              <label>Business category<select><option>Etkinlik organizatörü</option><option>Restoran / Bar / Kafe</option><option>Marka</option></select></label>
            </>
          ) : (
            <label>Full Name<input placeholder="Maya Collins" /></label>
          )}
          <label>Phone number<input placeholder="+90 555 000 00 00" /></label>
          <label>Email<input placeholder="maya@example.com" type="email" /></label>
          <label>New password<input placeholder="At least 8 characters" type="password" /></label>
          <label>New password again<input type="password" /></label>
          <label className="mobile-checkbox"><input type="checkbox" /> I agree to Terms & Privacy Policy</label>
        </div>
      ) : null}

      {signupStep === 2 ? <CodeScreen body="We have sent a 6-digit code to your phone." /> : null}

      {signupStep === 3 ? (
        <div className="mobile-form-stack">
          <label>Username<input placeholder={signupKind === "corporate" ? "konnektora_events" : "maya.collins"} /></label>
          <label>Country<input placeholder="Türkiye" /></label>
          <label>City<input placeholder="Istanbul" /></label>
          {signupKind === "corporate" ? <label>Address<input placeholder="Optional address" /></label> : <label>Date of birth<input type="date" /></label>}
          <label>Website<input placeholder="https://..." /></label>
        </div>
      ) : null}

      {signupStep === 4 ? (
        <div className="mobile-upload-card">
          <Camera size={34} />
          <strong>Upload a profile photo</strong>
          <p>Drag, crop, zoom, rotate or replace the image before continuing.</p>
        </div>
      ) : null}

      {signupStep >= 5 ? (
        <div className="mobile-tag-picker">
          <p>Choose an emotion that these tags evoke in you.</p>
          {tags.slice(0, 8).map((tagName) => (
            <button key={tagName} type="button">
              {tagName}
              <span>Like</span>
            </button>
          ))}
        </div>
      ) : null}

      <button className="mobile-primary-btn" onClick={onNext} type="button">
        {signupStep >= 5 ? "Save" : "Next"}
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
        <button className="mobile-primary-btn" onClick={() => setLoginMethod("phone")} type="button">Sign in with phone number</button>
        <button className="mobile-secondary-btn" onClick={() => setLoginMethod("email")} type="button">Sign in with email</button>
        <button className="mobile-oauth-btn" type="button">Sign in with Facebook</button>
        <button className="mobile-oauth-btn" type="button">Sign in with Google</button>
        <button className="mobile-text-btn" onClick={onSignup} type="button">New here? Sign Up</button>
      </section>
    );
  }

  return (
    <section className="mobile-screen-body mobile-flow">
      <label>{loginMethod === "email" ? "Email address" : "Phone number"}<input placeholder={loginMethod === "email" ? "maya@example.com" : "+90 555 000 00 00"} /></label>
      <label>Password<input type="password" /></label>
      <button className="mobile-text-btn align-left" onClick={onForgot} type="button">Forget password?</button>
      <button className="mobile-primary-btn" onClick={onLogin} type="button">Log in</button>
    </section>
  );
}

function ForgotPasswordScreen({ onDone }: { onDone: () => void }) {
  return (
    <section className="mobile-screen-body mobile-flow">
      <h1>Forgot Your Password?</h1>
      <p>Reset your password with your email or phone number.</p>
      <label>Email or phone<input placeholder="maya@example.com" /></label>
      <CodeScreen body="Enter the 6-digit code we sent you." />
      <label>New password<input type="password" /></label>
      <label>New password again<input type="password" /></label>
      <button className="mobile-primary-btn" onClick={onDone} type="button">Save</button>
    </section>
  );
}

function CodeScreen({ body }: { body: string }) {
  return (
    <div className="mobile-code-card">
      <p>{body}</p>
      <div className="mobile-code-grid">
        {Array.from({ length: 6 }).map((_, index) => <input aria-label={`Code ${index + 1}`} key={index} maxLength={1} />)}
      </div>
      <span>Didn't receive the code? 118 seconds later resend.</span>
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
      <h1>{activeTutorial.title}</h1>
      <p>{activeTutorial.body}</p>
      <div className="mobile-permission-card">
        {tutorialIndex === 0 ? <Bell size={18} /> : tutorialIndex === 1 ? <MapPin size={18} /> : <Camera size={18} />}
        <span>{tutorialIndex === 0 ? "Allow notifications" : tutorialIndex === 1 ? "Allow location" : "Allow camera and contacts"}</span>
      </div>
      <button className="mobile-primary-btn" onClick={onNext} type="button">{tutorialIndex === tutorialSlides.length - 1 ? "Find & Invite" : "Next"}</button>
      <button className="mobile-text-btn" onClick={onSkip} type="button">Skip</button>
    </section>
  );
}

function InviteScreen({ onDone }: { onDone: () => void }) {
  return (
    <section className="mobile-screen-body mobile-flow">
      <div className="mobile-section-title">
        <h1>Found 3 member</h1>
        <button onClick={onDone} type="button">Next</button>
      </div>
      {recommendedMembers.map((member) => <MemberCard key={member.name} member={member} />)}
      <div className="mobile-section-title">
        <h1>Invite</h1>
        <button type="button">Invite all</button>
      </div>
      {["Ada Lovelace · ada@example.com", "Mert Demir · +90 555 010 20 30"].map((contact) => (
        <div className="mobile-invite-row" key={contact}>
          <span>{contact}</span>
          <button type="button">Invite</button>
        </div>
      ))}
      <button className="mobile-secondary-btn" onClick={onDone} type="button">Skip</button>
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
          <input placeholder="Search anything" />
          <span>Clean</span>
        </div>

        {appTab === "home" ? (
          <>
            <section className="mobile-feed-hero">
              <div>
                <span>Popular near you</span>
                <h1>Meet people through tags and events.</h1>
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
          <MobileSection title="Tags">
            <div className="mobile-tag-cloud">{tags.map((tagName) => <button key={tagName} type="button">{tagName}</button>)}</div>
          </MobileSection>
        ) : null}

        {appTab === "events" ? (
          <MobileSection title="Events">
            {events.map((event) => <EventPreviewCard event={event} key={event.title} />)}
          </MobileSection>
        ) : null}

        {appTab === "places" ? (
          <MobileSection title="Places">
            {["Kreuzberg Hub · Berlin", "Temple Bar Studio · Dublin", "Bomonti Hall · Istanbul"].map((place) => (
              <div className="mobile-place-row" key={place}><MapPin size={18} /><span>{place}</span><button type="button">Follow</button></div>
            ))}
          </MobileSection>
        ) : null}

        {appTab === "messages" ? (
          <MobileSection title="Messages">
            {["Maya Collins", "Konnektora Admin", "AI Product Night"].map((name, index) => (
              <div className="mobile-message-row" key={name}>
                <Avatar name={name} />
                <div><strong>{name}</strong><span>{index === 0 ? "New private message" : "No unread message"}</span></div>
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
        <span>{member.followers} followers</span>
        <p>{member.meta}</p>
        <div>{member.tags.map((tagName) => <small key={tagName}>{tagName}</small>)}</div>
      </div>
      <button type="button">Follow</button>
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
    { id: "home", label: "Home", Icon: Home },
    { id: "tags", label: "Tags", Icon: Tag },
    { id: "events", label: "Events", Icon: CalendarDays },
    { id: "places", label: "Places", Icon: Compass },
    { id: "messages", label: "Messages", Icon: MessageCircle }
  ];

  return (
    <nav className="mobile-tabbar" aria-label="Bottom navigation">
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
            <span>3 notifications.</span>
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
