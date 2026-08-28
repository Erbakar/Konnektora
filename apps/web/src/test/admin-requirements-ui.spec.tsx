import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  AdminActivityLog,
  AdminPrivateMessage,
  CmsCategory,
  Faq,
  ReportRule,
} from "@konnektora/shared";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ActivityLogAdminPanel,
  CmsAdminPanel,
  PrivateMessageAdminPanel,
  ReportRuleAdminPanel,
  RoleGroupAdminPanel,
} from "../pages/AdminDashboardPage";

const apiMocks = vi.hoisted(() => ({
  listAdminActivityLogs: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

const ids = {
  ada: "10000000-0000-4000-8000-000000000001",
  deniz: "10000000-0000-4000-8000-000000000002",
  categoryFaq: "20000000-0000-4000-8000-000000000001",
  categoryWrite: "20000000-0000-4000-8000-000000000002",
  faq: "30000000-0000-4000-8000-000000000001",
  ruleA: "40000000-0000-4000-8000-000000000001",
  ruleZ: "40000000-0000-4000-8000-000000000002",
  message1: "50000000-0000-4000-8000-000000000001",
  message2: "50000000-0000-4000-8000-000000000002",
  message3: "50000000-0000-4000-8000-000000000003",
  log: "60000000-0000-4000-8000-000000000001",
};

function queryProviders(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  apiMocks.listAdminActivityLogs.mockResolvedValue({
    items: [], total: 0, page: 1, pageSize: 50, hasNextPage: false,
  });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: vi.fn().mockReturnValue(true),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("admin gereksinimleri 125–137", () => {
  it("SSS ve Write to us kategorilerini aynı CMS ekranında ekler, filtreler ve kaldırır", async () => {
    const categories: CmsCategory[] = [
      { id: ids.categoryFaq, name: "Hesap", slug: "hesap", description: "Hesap soruları", type: "faq", status: "active", _count: { faqs: 1 } },
      { id: ids.categoryWrite, name: "İş birliği", slug: "is-birligi", description: "Ortaklık talepleri", type: "write_to_us", status: "active", _count: { faqs: 0 } },
    ];
    const faqs: Faq[] = [{
      id: ids.faq, categoryId: ids.categoryFaq, title: "Şifremi nasıl değiştiririm?", body: "Ayarlar bölümünü kullanın.", status: "active", category: categories[0],
    }];
    const onCreateCategory = vi.fn();
    const onDeleteCategory = vi.fn();
    const onCreateFaq = vi.fn();
    const onDeleteFaq = vi.fn();
    render(<CmsAdminPanel
      announcements={[]}
      categories={categories}
      faqs={faqs}
      isPending={false}
      onCreateAnnouncement={vi.fn()}
      onCreateCategory={onCreateCategory}
      onCreateFaq={onCreateFaq}
      onDeleteCategory={onDeleteCategory}
      onDeleteFaq={onDeleteFaq}
      onSavePolicy={vi.fn()}
      onUpdateAnnouncement={vi.fn()}
      onUpdateCategory={vi.fn()}
      onUpdateFaq={vi.fn()}
      policies={[]}
    />);

    const categoriesSection = screen.getByRole("heading", { name: "İçerik Kategorileri" }).closest(".admin-subsection") as HTMLElement;
    await userEvent.selectOptions(within(categoriesSection).getByRole("combobox", { name: "Kategori türü" }), "write_to_us");
    await userEvent.type(within(categoriesSection).getByRole("textbox", { name: "Kategori adı" }), "Reklam");
    await userEvent.type(within(categoriesSection).getByRole("textbox", { name: "Açıklama" }), "Reklam talepleri");
    await userEvent.click(within(categoriesSection).getByRole("button", { name: "Kategori ekle" }));
    expect(onCreateCategory).toHaveBeenCalledWith({ name: "Reklam", description: "Reklam talepleri", type: "write_to_us" });
    expect(screen.getByRole("heading", { name: "Write to us Kategorileri" })).toBeVisible();
    expect(screen.getAllByText("İş birliği").length).toBeGreaterThan(0);

    await userEvent.type(within(categoriesSection).getByRole("textbox", { name: "Kategori arama" }), "hesap");
    expect(within(categoriesSection).getByText("Hesap")).toBeVisible();
    expect(within(categoriesSection).queryByText("İş birliği")).not.toBeInTheDocument();
    await userEvent.click(within(within(categoriesSection).getByText("Hesap").closest(".admin-list-row") as HTMLElement).getByRole("button", { name: "Kaldır" }));
    expect(onDeleteCategory).toHaveBeenCalledWith(ids.categoryFaq);

    const faqSection = screen.getByRole("heading", { name: "Sık Sorulan Sorular" }).closest(".admin-subsection") as HTMLElement;
    await userEvent.selectOptions(within(faqSection).getByRole("combobox", { name: "Kategori" }), ids.categoryFaq);
    await userEvent.type(within(faqSection).getByRole("textbox", { name: "Soru başlığı" }), "Etkinliğe nasıl katılırım?");
    await userEvent.type(within(faqSection).getByRole("textbox", { name: "Cevap" }), "Katıl düğmesini kullanın.");
    await userEvent.click(within(faqSection).getByRole("button", { name: "SSS ekle" }));
    expect(onCreateFaq).toHaveBeenCalledWith({ categoryId: ids.categoryFaq, title: "Etkinliğe nasıl katılırım?", body: "Katıl düğmesini kullanın." });
    await userEvent.click(within(within(faqSection).getByText("Şifremi nasıl değiştiririm?").closest(".admin-list-item") as HTMLElement).getByRole("button", { name: "Kaldır" }));
    expect(onDeleteFaq).toHaveBeenCalledWith(ids.faq);
  });

  it("rol gruplarında özel mesaj, aktivite, post ve finans yetkilerini ayrı ayrı sunar", async () => {
    const onCreate = vi.fn();
    render(<RoleGroupAdminPanel isPending={false} onCreate={onCreate} onUpdate={vi.fn()} roleGroups={[]} />);

    for (const label of ["Özel Mesaj Yönetimi", "User activity log", "Post Yönetimi", "Muhasebe & Finans"]) {
      expect(screen.getByRole("checkbox", { name: label })).toBeVisible();
    }
    await userEvent.type(screen.getByRole("textbox", { name: "Rol grubu adı" }), "İçerik Ekibi");
    await userEvent.click(screen.getByRole("checkbox", { name: "Post Yönetimi" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Özel Mesaj Yönetimi" }));
    await userEvent.click(screen.getByRole("button", { name: "Rol grubu ekle" }));
    expect(onCreate).toHaveBeenCalledWith({
      name: "İçerik Ekibi",
      description: undefined,
      permissions: ["private_messages.manage", "posts.manage"],
    });
  });

  it("özel mesajları iki kullanıcıya göre konuşma halinde, silinenler dahil arar ve eşleşmeler arasında gezer", async () => {
    const userAda = { id: ids.ada, name: "Ada", email: "ada@example.com", username: "ada", role: "user" as const };
    const userDeniz = { id: ids.deniz, name: "Deniz", email: "deniz@example.com", username: "deniz", role: "user" as const };
    const messages: AdminPrivateMessage[] = [
      { id: ids.message1, senderId: ids.ada, recipientId: ids.deniz, sender: userAda, recipient: userDeniz, body: "Konser için buluşalım", status: "active", reportCount: 0, createdAt: "2026-08-27T10:00:00.000Z", updatedAt: "2026-08-27T10:00:00.000Z" },
      { id: ids.message2, senderId: ids.deniz, recipientId: ids.ada, sender: userDeniz, recipient: userAda, body: "Konser bileti bende", status: "deleted", reportCount: 1, createdAt: "2026-08-27T10:02:00.000Z", updatedAt: "2026-08-27T10:02:00.000Z" },
      { id: ids.message3, senderId: ids.ada, recipientId: ids.deniz, sender: userAda, recipient: userDeniz, body: "Harika", status: "active", reportCount: 0, createdAt: "2026-08-27T10:03:00.000Z", updatedAt: "2026-08-27T10:03:00.000Z" },
    ];
    render(<PrivateMessageAdminPanel isPending={false} items={messages} onStatusChange={vi.fn()} />);

    await userEvent.type(screen.getByRole("textbox", { name: "Kullanıcı adı" }), "deniz");
    const thread = screen.getByRole("button", { name: /@ada – @deniz/ });
    expect(thread).toHaveTextContent("3 mesaj");
    await userEvent.click(thread);
    expect(screen.getByText("Konser bileti bende").closest("article")).toHaveTextContent("deleted");
    await userEvent.type(screen.getByRole("textbox", { name: "İçerik" }), "konser");
    expect(screen.getByText("1/2")).toBeVisible();
    expect(screen.getAllByText("Konser", { selector: "mark" })).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Sonraki" }));
    expect(screen.getByText("2/2")).toBeVisible();
  });

  it("şikayet kuralı başlığını serbest metinle oluşturur ve kuralları kategori içinde A-Z sıralar", async () => {
    const rules: ReportRule[] = [
      { id: ids.ruleZ, targetType: "event", title: "Zarar verme", description: "Güvenlik", violationScore: 30, status: "passive" },
      { id: ids.ruleA, targetType: "event", title: "Ayrımcılık", description: "Topluluk", violationScore: 40, status: "active" },
    ];
    const onCreate = vi.fn();
    render(<ReportRuleAdminPanel isPending={false} onCreate={onCreate} onUpdate={vi.fn()} rules={rules} />);

    const title = screen.getByRole("textbox", { name: "Kural başlığı" });
    expect(title.tagName).toBe("INPUT");
    await userEvent.type(title, "Yanıltıcı içerik");
    await userEvent.click(screen.getByRole("button", { name: "Kural ekle" }));
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ targetType: "event", title: "Yanıltıcı içerik", violationScore: 1 }));
    const group = screen.getByRole("heading", { name: "Etkinlik" }).closest("section") as HTMLElement;
    expect(within(group).getAllByRole("textbox", { name: "Başlık" }).map((input) => (input as HTMLInputElement).value)).toEqual(["Ayrımcılık", "Zarar verme"]);
    expect(within(group).getAllByRole("combobox", { name: "Durum" }).map((input) => (input as HTMLSelectElement).value)).toEqual(["active", "passive"]);
  });

  it("aktivite kayıtlarını tarih/kategori/işlem ile filtreler ve ortam bilgisini gösterir", async () => {
    const activity: AdminActivityLog = {
      id: ids.log,
      actorId: ids.ada,
      actor: { id: ids.ada, name: "Ada", email: "ada@example.com", username: "ada", role: "user" },
      action: "view",
      targetType: "finance",
      targetId: "dashboard",
      metadata: { method: "GET", statusCode: 200, ip: "203.0.113.8", durationMs: 18, userAgent: "Mobile Safari" },
      createdAt: "2026-08-28T08:00:00.000Z",
    };
    apiMocks.listAdminActivityLogs.mockResolvedValue({ items: [activity], total: 1, page: 1, pageSize: 50, hasNextPage: false });
    render(queryProviders(<ActivityLogAdminPanel />));

    expect(await screen.findByText("GET · HTTP 200")).toBeVisible();
    expect(screen.getByText("203.0.113.8 · 18 ms")).toBeVisible();
    expect(screen.getByText("Mobile Safari")).toBeVisible();
    await userEvent.type(screen.getByRole("textbox", { name: "Arama" }), "ada");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Kategori" }), "finance");
    await userEvent.type(screen.getByRole("textbox", { name: "İşlem" }), "view");
    await userEvent.type(screen.getByLabelText("Başlangıç"), "2026-08-01T09:00");
    await userEvent.type(screen.getByLabelText("Bitiş"), "2026-08-31T18:00");
    await userEvent.click(screen.getByRole("button", { name: "Filtrele" }));
    await waitFor(() => expect(apiMocks.listAdminActivityLogs).toHaveBeenLastCalledWith(expect.any(URLSearchParams)));
    const params = apiMocks.listAdminActivityLogs.mock.calls.at(-1)?.[0] as URLSearchParams;
    expect(Object.fromEntries(params.entries())).toEqual({
      q: "ada", category: "finance", action: "view", from: "2026-08-01T09:00", to: "2026-08-31T18:00", page: "1", pageSize: "50",
    });
  });
});
