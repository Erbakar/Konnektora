import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { createUserMessage, type UserMessageInput } from "../lib/api";
import type { UserMessageType } from "@konnektora/shared";

const MESSAGE_TYPE_OPTIONS: Array<{ value: UserMessageType; label: string; categories: string[] }> = [
  {
    value: "faq",
    label: "FAQ sorusu",
    categories: ["Profile", "Account", "Rules", "Tags", "Events", "Places", "Media Files", "Comments", "Private Messages"]
  },
  {
    value: "account_freeze",
    label: "Hesap dondurma",
    categories: []
  },
  {
    value: "write_to_us",
    label: "Write to us",
    categories: ["Hata", "Oneriler", "Sikayet", "Reklam", "Is birligi", "Diger"]
  }
];

export function ContactPage() {
  const [messageType, setMessageType] = useState<UserMessageType>("write_to_us");
  const selectedType = MESSAGE_TYPE_OPTIONS.find((option) => option.value === messageType) ?? MESSAGE_TYPE_OPTIONS[2]!;
  const mutation = useMutation({
    mutationFn: createUserMessage
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: UserMessageInput = {
      type: messageType,
      category: String(form.get("category") || "") || undefined,
      name: String(form.get("name")),
      email: String(form.get("email")),
      phone: String(form.get("phone") || "") || undefined,
      body: String(form.get("body")),
      appVersion: "web",
      systemInfo: window.navigator.userAgent
    };

    mutation.mutate(input, {
      onSuccess: () => event.currentTarget.reset()
    });
  }

  return (
    <section className="page contact-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Support</p>
          <h1>Konnektora ile iletişime geç</h1>
          <p className="lead">FAQ sorusu, hesap dondurma talebi veya genel mesaj gönderebilirsin.</p>
        </div>
      </div>
      <form className="admin-form compact-form" onSubmit={handleSubmit}>
        <label>
          Mesaj tipi
          <select value={messageType} onChange={(event) => setMessageType(event.target.value as UserMessageType)}>
            {MESSAGE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {selectedType.categories.length > 0 ? (
          <label>
            Kategori
            <select name="category" required>
              {selectedType.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          Ad soyad
          <input name="name" required minLength={2} placeholder="Adın Soyadın" />
        </label>
        <label>
          Email
          <input name="email" required type="email" placeholder="email@example.com" />
        </label>
        <label>
          Telefon
          <input name="phone" placeholder="+90 5xx xxx xx xx" />
        </label>
        <label>
          Mesaj
          <textarea name="body" required minLength={3} rows={6} placeholder="Mesajını yaz" />
        </label>
        <button className="primary-action" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Gönderiliyor" : "Mesaj gönder"}
        </button>
        {mutation.data ? <p className="form-success">Mesajın alındı. Admin panelde incelenecek.</p> : null}
        {mutation.isError ? <p className="form-error">Mesaj gönderilemedi. Lütfen tekrar dene.</p> : null}
      </form>
    </section>
  );
}
