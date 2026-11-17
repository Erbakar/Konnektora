jest.mock("../media-storage/durable-storage", () => ({ removeDurableUpload: jest.fn().mockResolvedValue(undefined) }));
import { ReportTargetType } from "@prisma/client";
import { removeDurableUpload } from "../media-storage/durable-storage";
import { ContentService } from "./content.service";

describe("17/10 #14 hidden event content", () => {
  it("returns no posts for a hidden event the viewer may not see", async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ role: "user" }) }, event: { count: jest.fn().mockResolvedValue(1) }, contentComment: { findMany: jest.fn() } };
    const service = new ContentService(prisma as never);
    await expect(service.listComments(ReportTargetType.event, "event-1", "viewer")).resolves.toEqual([]);
    expect(prisma.contentComment.findMany).not.toHaveBeenCalled();
    expect(prisma.event.count.mock.calls[0][0].where).toMatchObject({ id: "event-1", visibility: "hidden" });
    await expect(service.canViewEvent("event-1")).resolves.toBe(false);
  });

  it("lets participants (no blocking row) and admins/curators through", async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ role: "user" }) }, event: { count: jest.fn().mockResolvedValue(0) } };
    const service = new ContentService(prisma as never);
    await expect(service.canViewEvent("event-1", "participant")).resolves.toBe(true);
    prisma.event.count.mockResolvedValue(1);
    await expect(service.canViewEvent("event-1", { id: "staff", role: "curator" })).resolves.toBe(true);
    await expect(service.canViewEvent("event-1", { id: "staff", role: "admin" })).resolves.toBe(true);
  });
});

describe("17/10 #29 copied event media", () => {
  const arrange = (sharedCount: number) => {
    const media = { id: "m1", url: "/uploads/a.webp", type: "image", sortOrder: 0 };
    const prisma: any = {
      mediaFile: { findFirst: jest.fn().mockResolvedValue(media), findMany: jest.fn().mockResolvedValue([]), update: jest.fn(), count: jest.fn().mockResolvedValue(sharedCount) },
      event: { update: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    return { prisma, service: new ContentService(prisma as never) };
  };
  const admin = { id: "admin", role: "admin" };

  it("keeps the uploaded file when the source event still uses it", async () => {
    (removeDurableUpload as jest.Mock).mockClear();
    const { service, prisma } = arrange(1);
    await service.deleteContentMedia(ReportTargetType.event, "copy-1", "m1", admin as never);
    expect(prisma.mediaFile.count).toHaveBeenCalledWith({ where: { url: "/uploads/a.webp", status: "active", id: { not: "m1" } } });
    expect(removeDurableUpload).not.toHaveBeenCalled();
  });

  it("still removes a file no other album references", async () => {
    (removeDurableUpload as jest.Mock).mockClear();
    const { service } = arrange(0);
    await service.deleteContentMedia(ReportTargetType.event, "event-1", "m1", admin as never);
    expect(removeDurableUpload).toHaveBeenCalledTimes(1);
  });
});
