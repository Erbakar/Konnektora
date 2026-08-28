import { useMutation, useQuery } from "@tanstack/react-query";
import { type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { EmailInput, PhoneInput } from "../components/FormInputs";
import { ServiceFeedback } from "../components/ServiceFeedback";
import {
  createUserMessage,
  listPublicSupportCategories,
  type UserMessageInput,
} from "../lib/api";
import { normalizePhone } from "../lib/formats";
import { useLanguage } from "../lib/i18n";

export function ContactPage() {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const messageType = searchParams.get("type") === "faq" ? "faq" : "write_to_us";
  const categories = useQuery({
    queryKey: ["public-support-categories", messageType],
    queryFn: () => listPublicSupportCategories(messageType),
  });
  const mutation = useMutation({
    mutationFn: createUserMessage
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const input: UserMessageInput = {
      type: messageType,
      category: String(form.get("category")),
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
      <Link className="back-link" to="/help"><ArrowLeft size={16} /> {language === "tr" ? "Yardım merkezine dön" : "Back to Help Centre"}</Link>
      <div className="section-header">
        <div>
          <p className="eyebrow">{language === "tr" ? "Destek" : "Support"}</p>
          <h1>{messageType === "faq" ? language === "tr" ? "Destek ekibine yaz" : "Contact support" : language === "tr" ? "Bize mesaj gönder" : "Write to us"}</h1>
          <p className="lead">{language === "tr" ? "Mesajını ilet; sistem doğru destek ekibine otomatik yönlendirsin." : "Send your message and it will be routed to the right support team."}</p>
        </div>
      </div>
      <form className="admin-form compact-form" onSubmit={handleSubmit}>
        <label>
          {language === "tr" ? "Ad soyad" : "Full name"}
          <input name="name" required minLength={2} placeholder={language === "tr" ? "Adın Soyadın" : "Your full name"} />
        </label>
        <label>
          {language === "tr" ? "E-posta" : "Email"}
          <EmailInput name="email" required />
          <span className="form-help">{language === "tr" ? "Örnek: ada@ornek.com" : "Example: ada@example.com"}</span>
        </label>
        <label>
          {language === "tr" ? "Telefon" : "Phone"}
          <PhoneInput name="phone" />
          <span className="form-help">{language === "tr" ? "Örnek: +90 555 111 22 33" : "Example: +44 20 1234 5678"}</span>
        </label>
        <label>
          {language === "tr" ? "Konu" : "Subject"}
          <select disabled={categories.isLoading} name="category" required>
            <option value="">{categories.isLoading ? language === "tr" ? "Konular yükleniyor…" : "Loading subjects…" : language === "tr" ? "Konu seçin" : "Select a subject"}</option>
            {categories.data?.map((category) => <option key={category.id} value={category.name}>{supportCategoryLabel(category.name, language)}</option>)}
          </select>
        </label>
        <label>
          {language === "tr" ? "Mesaj" : "Message"}
          <textarea name="body" required minLength={3} rows={6} placeholder={language === "tr" ? "Mesajını yaz" : "Write your message"} />
        </label>
        <button className="primary-action" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? language === "tr" ? "Gönderiliyor" : "Sending" : language === "tr" ? "Mesaj gönder" : "Send message"}
        </button>
        {mutation.data ? <div className="support-success" role="status"><strong>{language === "tr" ? "Mesajınız gönderildi." : "Your message was sent."}</strong><span>{language === "tr" ? "En kısa sürede size yanıt vereceğiz." : "We will get back to you as soon as possible."}</span></div> : null}
        {categories.isError ? <p className="form-error">{language === "tr" ? "Konu seçenekleri yüklenemedi." : "Subject options could not be loaded."}</p> : null}
        {mutation.isError ? (
          <ServiceFeedback
            compact
            error={mutation.error}
            fallback={language === "tr" ? "Mesajın gönderilemedi. Bilgilerini kaybetmeden yeniden deneyebilirsin." : "Your message could not be sent. Please try again without losing your entries."}
          />
        ) : null}
      </form>
    </section>
  );
}

function supportCategoryLabel(value: string, language: "tr" | "en") {
  if (language === "tr") return value;
  const normalized = value.toLocaleLowerCase("tr-TR");
  return ({
    "genel geri bildirim": "General feedback",
    "iş birliği": "Partnership",
    "is birligi": "Partnership",
    "teknik sorun": "Technical issue",
    "hata": "Bug report",
    "öneriler": "Suggestions",
    "oneriler": "Suggestions",
    "şikayet": "Complaint",
    "sikayet": "Complaint",
    "reklam": "Advertising",
    "diğer": "Other",
    "diger": "Other",
  } as Record<string, string>)[normalized] ?? value;
}
