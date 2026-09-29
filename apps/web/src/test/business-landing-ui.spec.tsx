import { render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "../lib/i18n";
import { BusinessLandingPage } from "../pages/BusinessLandingPage";

describe("business landing page", () => {
  it("shows all eight requested business capabilities", () => {
    render(
      <LanguageProvider>
        <MemoryRouter>
          <BusinessLandingPage />
        </MemoryRouter>
      </LanguageProvider>,
    );

    const benefits = document.querySelector(".business-value-grid");
    expect(benefits).not.toBeNull();
    const cards = within(benefits as HTMLElement).getAllByRole("article");
    expect(cards).toHaveLength(8);

    const expected = [
      ["Topluluk Yönetimi", "Sınırsız ilgi alanlarında topluluğunuza uygun kitleleri gelişmiş filtreler ile kolaylıkla keşfedin."],
      ["Misafir listeleri", "Üyeler arasından basın, sanatçı, VIP gibi hayal gücünüze ve işinize uygun misafir listeleri oluşturun ve onları check-in sırasında fark edin."],
      ["Hızlı giriş", "QR ve NFC ile temassız, hızlı giriş sağlayın."],
      ["Çeşitli davet et seçenekleri", "Google bağlantılarınızı, rehberinizi ve geçmiş etkinliklerinizdeki kişileri davet ederek etkinlik ve mekânlarınıza katılımcıları hızla taşıyın."],
      ["Gelir, performans ve AI içgörüleri", "Bakiye, ödeme ve iade bilgilerini tek panelde izle. AI içgörüleri ve istatistiklerle işinizi büyütün."],
      ["Sosyal Line-up", "Üyelerin line-up'ınızdaki sanatçı ve performanslar hakkında yazılı ve görsel bilgi almaları ve tartışabilecekleri sosyal bir mecra kurduk."],
      ["Güvenli işletme", "Kurumsal doğrulama, yetki yönetimi ve raporlama araçlarını kullan."],
      ["Daha görünür ol", "Yerel keşif, ilgi alanı ve takip akışlarında doğru kitleye ulaş."],
    ] as const;

    expected.forEach(([title, body], index) => {
      expect(within(cards[index]!).getByRole("heading", { name: title })).toBeVisible();
      expect(within(cards[index]!).getByText(body)).toBeVisible();
    });
  });
});
