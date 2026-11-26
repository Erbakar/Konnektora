import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../lib/i18n";
import { PushNotificationControl } from "../components/PushNotificationControl";

const apiMocks = vi.hoisted(() => ({
  getPushPublicKey: vi.fn(),
  registerPushSubscription: vi.fn(),
  removePushSubscription: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

let subscription: unknown = null;

function installPushApis(permission: NotificationPermission) {
  Object.defineProperty(window, "Notification", { configurable: true, value: { permission, requestPermission: vi.fn() } });
  Object.defineProperty(window, "PushManager", { configurable: true, value: function PushManager() {} });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(subscription) } }) },
  });
}

function renderBanner() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LanguageProvider>
        <PushNotificationControl
          description="Diğer üyelerden mesaj geldiğinde gerçek zamanlı bildirim almayı bu cihazda etkinleştir."
          enableLabel="Bu cihazda etkinleştir"
          title="Cihaz bildirimleri"
          variant="banner"
        />
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  subscription = null;
  apiMocks.getPushPublicKey.mockResolvedValue("key");
  apiMocks.registerPushSubscription.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  delete (window as unknown as Record<string, unknown>).Notification;
  delete (window as unknown as Record<string, unknown>).PushManager;
  delete (navigator as unknown as Record<string, unknown>).serviceWorker;
});

describe("26/11 #124 Postane cihaz bildirimi banner'ı", () => {
  it("bildirimleri etkinleştirmemiş kullanıcıya başlık, açıklama ve CTA gösterir", () => {
    installPushApis("default");
    renderBanner();
    expect(screen.getByText("Cihaz bildirimleri")).toBeTruthy();
    expect(screen.getByText("Diğer üyelerden mesaj geldiğinde gerçek zamanlı bildirim almayı bu cihazda etkinleştir.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Bu cihazda etkinleştir/ })).toBeTruthy();
  });

  it("izni reddedilmiş cihazda gösterilmez", () => {
    installPushApis("denied");
    const { container } = renderBanner();
    expect(container.textContent).toBe("");
  });

  it("bu cihazda zaten abonelik varsa gösterilmez", async () => {
    subscription = { toJSON: () => ({ endpoint: "https://push.example/1", keys: { p256dh: "p", auth: "a" } }) };
    installPushApis("granted");
    const { container } = renderBanner();
    await waitFor(() => expect(apiMocks.registerPushSubscription).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("izin verilmiş ama abonelik yoksa kontrol bittikten sonra gösterilir", async () => {
    installPushApis("granted");
    renderBanner();
    expect(await screen.findByRole("button", { name: /Bu cihazda etkinleştir/ })).toBeTruthy();
  });
});
