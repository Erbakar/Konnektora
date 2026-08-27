import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type Language = "tr" | "en";

const STORAGE_KEY = "konnektora_language";

const ui = {
  tr: {
    feed: "Akış", events: "Etkinlikler", tags: "İlgi alanları", places: "Mekânlar",
    messages: "Mesajlar", memberId: "Üye kartı", finance: "Finans", search: "Ara",
    create: "Profil oluştur", login: "Giriş yap", explore: "Etkinlikleri keşfet",
    admin: "Yönetim", menuOpen: "Menüyü aç", menuClose: "Menüyü kapat",
    navigation: "Ana navigasyon", mobileNavigation: "Mobil navigasyon",
    discover: "Keşfet", community: "Topluluk", founders: "Kurucular", investment: "Yatırım",
    organizerTools: "Organizatör araçları", adminLogin: "Yönetici girişi", contact: "İletişim",
    help: "Destek merkezi", about: "Hakkımızda", privacy: "Gizlilik", terms: "Koşullar",
    cookies: "Çerezler", networking: "Networking", closedBeta: "Kapalı beta · AB MVP",
    footerCopy: "Global etkinlikler, güvenilir davetli listeleri ve anlamlı bağlantılar için seçkin topluluk platformu."
  },
  en: {
    feed: "Feed", events: "Events", tags: "Tags", places: "Places", messages: "Messages",
    memberId: "Member ID", finance: "Finance", search: "Search", create: "Create",
    login: "Log in", explore: "Explore events", admin: "Admin", menuOpen: "Open menu",
    menuClose: "Close menu", navigation: "Main navigation", mobileNavigation: "Mobile navigation",
    discover: "Discover", community: "Community", founders: "Founders", investment: "Investment",
    organizerTools: "Organizer tools", adminLogin: "Admin login", contact: "Contact",
    help: "Help center", about: "About", privacy: "Privacy", terms: "Terms", cookies: "Cookies",
    networking: "Networking", closedBeta: "Closed beta · EU MVP",
    footerCopy: "The curated community platform for global events, trusted guest lists and meaningful connections."
  }
} as const;

type TranslationKey = keyof typeof ui.tr;
type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "en" ? "en" : "tr";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const localizeValidation = (event: Event) => {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) return;
      field.setCustomValidity("");
      if (language !== "tr" || field.validity.valid) return;
      if (field.validity.valueMissing) field.setCustomValidity("Lütfen bu alanı doldurun.");
      else if (field.validity.typeMismatch) field.setCustomValidity("Lütfen geçerli bir değer girin.");
      else if (field.validity.tooShort && !(field instanceof HTMLSelectElement)) field.setCustomValidity(`Lütfen en az ${field.minLength} karakter girin.`);
      else if (field.validity.tooLong && !(field instanceof HTMLSelectElement)) field.setCustomValidity(`Lütfen en fazla ${field.maxLength} karakter girin.`);
      else if (field.validity.patternMismatch) field.setCustomValidity("Lütfen istenen biçime uygun bir değer girin.");
    };
    const clearValidation = (event: Event) => {
      const field = event.target;
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) field.setCustomValidity("");
    };
    document.addEventListener("invalid", localizeValidation, true);
    document.addEventListener("input", clearValidation, true);
    return () => {
      document.removeEventListener("invalid", localizeValidation, true);
      document.removeEventListener("input", clearValidation, true);
    };
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, t: (key: TranslationKey) => ui[language][key] }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
