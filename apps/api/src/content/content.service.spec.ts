import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ReportTargetType } from "@prisma/client";
import { ContentService } from "./content.service";

describe("ContentService profile media", () => {
  const mediaFile = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn()
  };
  const prisma = {
    mediaFile,
    event: { findUnique: jest.fn(), update: jest.fn() },
    eventParticipant: { findFirst: jest.fn() },
    place: { findUnique: jest.fn(), update: jest.fn() },
    placeMember: { findFirst: jest.fn() },
    contentView: { create: jest.fn() },
    contentShare: { create: jest.fn() },
    contentAction: { create: jest.fn() },
    contentReaction: { findUnique: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(async (operation: unknown) => {
      if (typeof operation === "function") return operation({ mediaFile });
      return Promise.all(operation as Promise<unknown>[]);
    })
  };
  const service = new ContentService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it("creates the first image as the profile picture", async () => {
    mediaFile.findMany.mockResolvedValue([]);
    mediaFile.create.mockResolvedValue({ id: "media-1" });

    await service.createProfileMedia("user-1", "/uploads/photo.webp", "image");

    expect(mediaFile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contentType: ReportTargetType.user,
        contentId: "user-1",
        uploadedById: "user-1",
        sortOrder: 0,
        isProfilePicture: true
      })
    });
  });

  it("rejects a video when the album has no photo", async () => {
    mediaFile.findMany.mockResolvedValue([]);
    await expect(service.createProfileMedia("user-1", "/uploads/video.mp4", "video")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("protects the final profile photo from deletion", async () => {
    const photo = {
      id: "media-1",
      type: "image",
      status: "active",
      contentType: ReportTargetType.user,
      contentId: "user-1",
      uploadedById: "user-1",
      isProfilePicture: true,
      sortOrder: 0
    };
    mediaFile.findUnique.mockResolvedValue(photo);
    mediaFile.findMany.mockResolvedValue([photo]);

    await expect(service.deleteProfileMedia("user-1", "media-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(mediaFile.update).not.toHaveBeenCalled();
  });

  it("does not expose another user's media as owned profile media", async () => {
    mediaFile.findUnique.mockResolvedValue({
      id: "media-2",
      type: "image",
      status: "active",
      contentType: ReportTargetType.user,
      contentId: "user-2",
      uploadedById: "user-2"
    });
    await expect(service.makeProfilePicture("user-1", "media-2")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("allows an accepted event organiser to upload album media", async () => {
    prisma.event.findUnique.mockResolvedValue({ createdById: "owner-1" });
    prisma.eventParticipant.findFirst.mockResolvedValue({ id: "participant-1" });
    mediaFile.count.mockResolvedValue(1);
    mediaFile.create.mockResolvedValue({ id: "media-2" });

    await service.createContentMedia(ReportTargetType.event, "event-1", { id: "organiser-1", role: "user" } as never, "/uploads/photo.webp", "image");

    expect(mediaFile.create).toHaveBeenCalledWith({ data: expect.objectContaining({ contentType: ReportTargetType.event, contentId: "event-1", sortOrder: 1 }) });
  });

  it("reorders event media and promotes the first photo to cover", async () => {
    prisma.event.findUnique.mockResolvedValue({ createdById: "owner-1" });
    const album = [
      { id: "11111111-1111-4111-8111-111111111111", type: "image", url: "/uploads/a.webp" },
      { id: "22222222-2222-4222-8222-222222222222", type: "image", url: "/uploads/b.webp" },
    ];
    mediaFile.findMany.mockResolvedValue(album);

    await service.reorderContentMedia(ReportTargetType.event, "event-1", [album[1]!.id, album[0]!.id], { id: "owner-1", role: "user" } as never);

    expect(prisma.event.update).toHaveBeenCalledWith({ where: { id: "event-1" }, data: { coverImageUrl: "/uploads/b.webp" } });
    expect(mediaFile.update).toHaveBeenCalledWith({ where: { id: album[1]!.id }, data: { sortOrder: 0 } });
  });

  it("records an authenticated view with source and referrer", async () => {
    prisma.contentView.create.mockResolvedValue({ id: "view-1" });
    await service.createView(ReportTargetType.event, "event-1", { id: "user-1" } as never, "homepage", "https://konnektora.com/", "detail");
    expect(prisma.contentView.create).toHaveBeenCalledWith({ data: {
      targetType: ReportTargetType.event,
      targetId: "event-1",
      kind: "detail",
      source: "homepage",
      referrer: "https://konnektora.com/",
      user: { connect: { id: "user-1" } },
    } });
  });

  it("normalizes share channels before persisting them", async () => {
    prisma.contentShare.create.mockResolvedValue({ id: "share-1" });
    await service.createShare(ReportTargetType.place, "place-1", "Instagram Story / DM");
    expect(prisma.contentShare.create).toHaveBeenCalledWith({ data: {
      targetType: ReportTargetType.place,
      targetId: "place-1",
      channel: "instagram_story_dm",
      user: undefined,
    } });
  });

  it("records normalized content actions", async () => {
    prisma.contentAction.create.mockResolvedValue({ id: "action-1" });
    await service.createAction(ReportTargetType.user, "user-2", "Website Click", { id: "user-1" } as never);
    expect(prisma.contentAction.create).toHaveBeenCalledWith({ data: {
      targetType: ReportTargetType.user,
      targetId: "user-2",
      action: "website_click",
      user: { connect: { id: "user-1" } },
    } });
  });

  it("replaces an earlier event rating so each member has one current score", async () => {
    prisma.event.findUnique.mockResolvedValue({ id: "event-1" });
    prisma.contentReaction.deleteMany.mockResolvedValue({ count: 1 });
    prisma.contentReaction.create.mockResolvedValue({ id: "rating-1" });
    await expect(service.createReaction({ targetType: ReportTargetType.event, targetId: "event-1", reaction: "rating_5" }, { id: "user-1" } as never)).resolves.toEqual({ targetType: "event", targetId: "event-1", reaction: "rating_5" });
    expect(prisma.contentReaction.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "user-1", reaction: { startsWith: "rating_" } }) }));
    expect(prisma.contentReaction.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reaction: "rating_5" }) }));
  });

  it("rejects ratings outside the supported range", async () => {
    await expect(service.createReaction({ targetType: ReportTargetType.place, targetId: "place-1", reaction: "rating_7" }, { id: "user-1" } as never)).rejects.toBeInstanceOf(BadRequestException);
  });
});
