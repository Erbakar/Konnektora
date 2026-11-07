import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { LanguageProvider } from "../lib/i18n";
import { DataDeletionPage } from "../pages/DataDeletionPage";
import { createUserMessage } from "../lib/api";

vi.mock("../lib/api", () => ({ createUserMessage: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("preserves a guest deletion request on failure and confirms receipt only after support accepts it", async () => {
  vi.mocked(createUserMessage).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ id: "request-1", createdAt: "2026-10-05T09:00:00Z" } as Awaited<ReturnType<typeof createUserMessage>>);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><LanguageProvider><MemoryRouter><DataDeletionPage /></MemoryRouter></LanguageProvider></QueryClientProvider>);
  await userEvent.type(screen.getByRole("textbox", { name: "Ad soyad" }), "Ada Test");
  await userEvent.type(screen.getByRole("textbox", { name: "Hesaba bağlı e-posta" }), "ada@example.com");
  await userEvent.selectOptions(screen.getByRole("combobox"), "facebook");
  await userEvent.type(screen.getByRole("textbox", { name: "Ek açıklama (isteğe bağlı)" }), "Facebook verilerimi silin.");
  await userEvent.click(screen.getByRole("button", { name: "Silme talebi gönder" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("textbox", { name: "Hesaba bağlı e-posta" })).toHaveValue("ada@example.com");
  expect(screen.queryByText("Silme talebiniz kaydedildi.")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Silme talebi gönder" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("silme işleminin tamamlandığı anlamına gelmez"));
  expect(screen.getByRole("status")).toHaveTextContent("Takip numarası: request-1");
  expect(screen.getByRole("status")).toHaveTextContent("Yanıt son tarihi: 4 Kasım 2026");
  expect(createUserMessage).toHaveBeenLastCalledWith(expect.objectContaining({ type: "write_to_us", category: "Veri silme talebi", email: "ada@example.com", body: expect.stringContaining("facebook\nFacebook verilerimi silin.") }), expect.anything());
  expect(screen.queryByRole("button", { name: "Silme talebi gönder" })).not.toBeInTheDocument();
});
