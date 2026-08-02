import { useMutation } from "@tanstack/react-query";
import { type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { EmailInput, PhoneInput } from "../components/FormInputs";
import { createUserMessage, type UserMessageInput } from "../lib/api";
import { normalizePhone } from "../lib/formats";

export function ContactPage() {
  const mutation = useMutation({
    mutationFn: createUserMessage
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const input: UserMessageInput = {
      type: "write_to_us",
      name: String(form.get("name")),
      email: String(form.get("email")),
      phone: normalizePhone(String(form.get("phone") || "")) || undefined,
      body: String(form.get("body")),
      appVersion: "web",
      systemInfo: window.navigator.userAgent
    };

    mutation.mutate(input, {
      onSuccess: () => formElement.reset()
    });
  }

  return (
    <section className="page contact-page">
      <Link className="back-link" to="/help"><ArrowLeft size={16} /> Yardım merkezine dön</Link>
      <div className="section-header">
        <div>
          <p className="eyebrow">Destek</p>
          <h1>Bize mesaj gönder</h1>
          <p className="lead">Mesajını ilet; sistem doğru destek ekibine otomatik yönlendirsin.</p>
        </div>
      </div>
      <form className="admin-form compact-form" onSubmit={handleSubmit}>
        <label>
          Ad soyad
          <input name="name" required minLength={2} placeholder="Adın Soyadın" />
        </label>
        <label>
          Email
          <EmailInput name="email" required />
          <span className="form-help">Örnek: ada@ornek.com</span>
        </label>
        <label>
          Telefon
          <PhoneInput name="phone" />
          <span className="form-help">Örnek: +90 555 111 22 33</span>
        </label>
        <label>
          Mesaj
          <textarea name="body" required minLength={3} rows={6} placeholder="Mesajını yaz" />
        </label>
        <button className="primary-action" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Gönderiliyor" : "Mesaj gönder"}
        </button>
        {mutation.data ? <div className="support-success" role="status"><strong>Mesajınız gönderildi.</strong><span>En kısa sürede size yanıt vereceğiz.</span></div> : null}
        {mutation.isError ? <p className="form-error">Mesaj gönderilemedi. Lütfen tekrar dene.</p> : null}
      </form>
    </section>
  );
}
