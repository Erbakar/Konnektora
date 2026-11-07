import { analyticsReference, uniqueAnalyticsReferences } from "./references";
import { PlacesService } from "../places/places.service";
import { ForbiddenException } from "@nestjs/common";
describe("Analytics identity links", () => {
  it("preserves Turkish names while matching the stored metric key", () => {
    expect(analyticsReference("organizerEvents", "@Çağrı", "/users/id/u1", "user")).toEqual({ metricKey: "organizerEvents_cagr", name: "@Çağrı", to: "/users/id/u1", kind: "user" });
  });
  it("does not point a merged label at an arbitrary same-name record", () => {
    const rows = [analyticsReference("fullEvent", "Akşam", "/events/a", "event"), analyticsReference("fullEvent", "Aksam", "/events/b", "event")];
    expect(uniqueAnalyticsReferences(rows)).toEqual([]);
  });
  it("deduplicates repeated references to the same record", () => {
    const row = analyticsReference("topVisitor", "@Deniz", "/users/id/deniz", "user");
    expect(uniqueAnalyticsReferences([row, row])).toEqual([row]);
  });
  it("checks analytics access before loading names", async () => {
    const prisma = { event: { findMany: jest.fn() } };
    const service = new PlacesService(prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    jest.spyOn(service as unknown as { ensureCanManage: () => Promise<void> }, "ensureCanManage").mockImplementation(async () => undefined);
    await expect(service.getAnalyticsReferences("p1", { id: "u1", role: "user", accountType: "individual", memberPlan: "free" } as never)).rejects.toThrow(ForbiddenException);
    expect(prisma.event.findMany).not.toHaveBeenCalled();
  });
  it("resolves events beyond the first 50 and real organizer and visitor IDs", async () => {
    const prisma = { place: { findUnique: jest.fn().mockResolvedValue({ id: "p1" }) }, event: { findMany: jest.fn().mockResolvedValue(Array.from({ length: 60 }, (_, index) => ({ title: `Event ${index}`, slug: `event-${index}`, createdBy: { id: "owner", username: "Ada", name: "Ada" }, participants: [{ userId: "guest", user: { username: "Deniz", name: "Deniz" } }] }))) }, placeMember: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new PlacesService(prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    const refs = await service.getAnalyticsReferences("p1", { id: "u1", role: "admin" } as never);
    expect(refs).toContainEqual(expect.objectContaining({ metricKey: "fullEvent_event_59", to: "/events/event-59" }));
    expect(refs).toContainEqual(expect.objectContaining({ metricKey: "organizerEvents_ada", to: "/users/id/owner" }));
    expect(refs).toContainEqual(expect.objectContaining({ metricKey: "topVisitor_deniz", to: "/users/id/guest" }));
  });
});
