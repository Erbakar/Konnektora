import { describe, expect, it, vi } from "vitest";
import { addCalendarEvent, calendarEventLink } from "../components/ContentDialogs";
describe("23/10 #13 and #14 calendar details", () => {
 const event = {title:"Konser & parti", startsAt:"2026-11-13T20:00:00+03:00", endsAt:"2026-11-13T23:00:00+03:00",location:"Salon, İstanbul",description:"Notlar",url:"https://konnektora.com/events/konser"};
 it("preserves absolute times, venue and the event link for Google", () => {
  const url=new URL(calendarEventLink(event,"google"));
  expect(url.searchParams.get("dates")).toBe("20261113T170000Z/20261113T200000Z");
  expect(url.searchParams.get("text")).toBe(event.title);
  expect(url.searchParams.get("location")).toBe(event.location);
  expect(url.searchParams.get("details")).toContain(event.url);
 });
 it("preserves the same details for Outlook", () => {
  const url=new URL(calendarEventLink(event,"outlook"));
  expect(url.searchParams.get("startdt")).toBe("2026-11-13T17:00:00.000Z");
  expect(url.searchParams.get("enddt")).toBe("2026-11-13T20:00:00.000Z");
  expect(url.searchParams.get("body")).toContain(event.url);
 });
});

it("23/10 #14 includes the event URL in downloaded iCal notes",async()=>{
 const blobs:Blob[]=[];
 const create=vi.spyOn(URL,"createObjectURL").mockImplementation(blob=>{blobs.push(blob as Blob);return "blob:calendar";});
 const revoke=vi.spyOn(URL,"revokeObjectURL").mockImplementation(()=>{});
 const click=vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(()=>{});
 try {
 await addCalendarEvent({title:"Etkinlik",startsAt:"2026-11-13T20:00:00+03:00",url:"https://konnektora.com/events/test"},"file");
 const text=await blobs[0]!.text();
 expect(text).toContain("URL:https://konnektora.com/events/test");
 expect(text).toContain("DESCRIPTION:https://konnektora.com/events/test");
 expect(text).toContain("DTSTART:20261113T170000Z");
 } finally {create.mockRestore();revoke.mockRestore();click.mockRestore();}
});
