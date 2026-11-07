import PdfPrinter from "pdfmake";
import vfsFonts from "pdfmake/build/vfs_fonts";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

const fontFiles = vfsFonts as unknown as Record<string, string>;
const fonts = {
  Roboto: {
    normal: Buffer.from(fontFiles["Roboto-Regular.ttf"]!, "base64"),
    bold: Buffer.from(fontFiles["Roboto-Medium.ttf"]!, "base64"),
    italics: Buffer.from(fontFiles["Roboto-Italic.ttf"]!, "base64"),
    bolditalics: Buffer.from(fontFiles["Roboto-MediumItalic.ttf"]!, "base64"),
  },
};

type TransferPdfInput = {
  recipientName: string;
  event: { title: string; slug: string; startsAt: Date; endsAt: Date | null; timezone: string; city: string | null; country: string | null; locationName?: string | null; locationAddress?: string | null; place?: { name: string; address: string | null; city: string | null; country: string | null } | null };
  tickets: Array<{ id: string; qrToken: string; ticketType: { name: string; description: string | null; gateOpensAt: Date | null; gateClosesAt: Date | null } }>;
};

export function createTransferPdf(input: TransferPdfInput, appUrl: string): Promise<Buffer> {
  const date = (value: Date) => new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short", timeZone: input.event.timezone }).format(value);
  const place = input.event.place;
  const address = [place?.name ?? input.event.locationName, place?.address ?? input.event.locationAddress, place?.city ?? input.event.city, place?.country ?? input.event.country].filter(Boolean).join(", ");
  const content: Content[] = input.tickets.map((ticket, index) => ({
    pageBreak: index ? "before" : undefined,
    stack: [
      { text: "Konnektora", fontSize: 24, bold: true, color: "#1d6346", margin: [0, 0, 0, 24] },
      { text: input.event.title, link: `${appUrl}/events/${encodeURIComponent(input.event.slug)}`, fontSize: 21, bold: true, margin: [0, 0, 0, 16] },
      { text: `${date(input.event.startsAt)}${input.event.endsAt ? ` - ${date(input.event.endsAt)}` : ""} (${input.event.timezone})`, margin: [0, 0, 0, 12] },
      { text: address || "Konum bilgisi için etkinlik sayfasını inceleyin.", margin: [0, 0, 0, 20] },
      { text: ticket.ticketType.name, fontSize: 16, bold: true },
      { text: ticket.ticketType.description || "", margin: [0, 8, 0, 16] },
      { text: `Bilet sahibi: ${input.recipientName}`, bold: true, margin: [0, 0, 0, 16] },
      ...(ticket.ticketType.gateOpensAt ? [{ text: `Giriş başlangıcı: ${date(ticket.ticketType.gateOpensAt)}`, margin: [0, 0, 0, 8] } as Content] : []),
      ...(ticket.ticketType.gateClosesAt ? [{ text: `${date(ticket.ticketType.gateClosesAt)} öncesinde giriş yapmalısınız.`, margin: [0, 0, 0, 16] } as Content] : []),
      { qr: `konnektora-ticket:${ticket.id}:${ticket.qrToken}`, fit: 170, margin: [0, 12, 0, 16] },
      { text: `Bilet no: ${ticket.id}`, fontSize: 9, color: "#526358" },
      { text: "QR kodunuzu paylaşmayın. Girişte bu belgeyi gösterin. Bilet yeniden devredilirse bu QR kodu geçersiz olur.", fontSize: 10, margin: [0, 16, 0, 0] },
    ],
  }));
  const definition: TDocumentDefinitions = { pageSize: "A4", pageMargins: [40, 40, 40, 40], defaultStyle: { font: "Roboto", fontSize: 11, lineHeight: 1.3 }, content };
  return new Promise((resolve, reject) => {
    const document = new PdfPrinter(fonts).createPdfKitDocument(definition);
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
    document.end();
  });
}
