jest.mock("../notifications/activity-events", () => ({ notifyEntityCreated: jest.fn().mockResolvedValue(undefined), notifyEntityChanges: jest.fn().mockResolvedValue(undefined), notifyUserActivity: jest.fn().mockResolvedValue(undefined), notifyEventAvailability: jest.fn().mockResolvedValue(undefined), isUndiscoverable: jest.fn().mockResolvedValue(false), notifyRegistration: jest.fn().mockResolvedValue(undefined), notifyMembershipInvite: jest.fn().mockResolvedValue(undefined), notifyComment: jest.fn().mockResolvedValue(undefined), notifyProfileMediaAdded: jest.fn().mockResolvedValue(undefined), recordActivity: jest.fn().mockResolvedValue(undefined) }));
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
    event: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    eventParticipant: { findFirst: jest.fn() },
    place: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
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

  it("13/10 #15 persists the complete media order and refuses foreign or duplicate ids", async () => {
    mediaFile.findMany.mockResolvedValue([{id:"photo",isProfilePicture:true},{id:"a"},{id:"b"}]);
    await service.reorderProfileMedia("user-1",["photo","b","a"]);
    expect(mediaFile.update).toHaveBeenCalledWith({where:{id:"b"},data:{sortOrder:1}});
    await expect(service.reorderProfileMedia("user-1",["photo","a","a"])).rejects.toThrow();
    await expect(service.reorderProfileMedia("user-1",["photo","a","foreign"])).rejects.toThrow();
    await expect(service.reorderProfileMedia("user-1",["a","photo","b"])).rejects.toThrow();
  });

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

  it("uses the first uploaded place photo as the place avatar when the cover is empty (07/11 #40)", async () => {
    prisma.place.findUnique.mockResolvedValue({ createdById: "owner-1" });
    mediaFile.count.mockResolvedValue(0);
    mediaFile.create.mockResolvedValue({ id: "media-1" });

    await service.createContentMedia(ReportTargetType.place, "place-1", { id: "owner-1", role: "user" } as never, "/uploads/place.webp", "image");

    expect(prisma.place.updateMany).toHaveBeenCalledWith({ where: { id: "place-1", coverImageUrl: null }, data: { coverImageUrl: "/uploads/place.webp" } });
  });

  it("does not touch the place cover for video uploads", async () => {
    prisma.place.findUnique.mockResolvedValue({ createdById: "owner-1" });
    mediaFile.count.mockResolvedValue(0);
    mediaFile.create.mockResolvedValue({ id: "media-1" });

    await service.createContentMedia(ReportTargetType.place, "place-1", { id: "owner-1", role: "user" } as never, "/uploads/clip.mp4", "video");

    expect(prisma.place.updateMany).not.toHaveBeenCalled();
  });

  it("uploads event media to a user-bound pending batch and claims it after event creation", async () => {
    const actor = { id: "owner-1", role: "user" } as never;
    const batchId = "11111111-1111-4111-8111-111111111111";
    const pending = [{ id: "media-pending", type: "image", url: "/uploads/pending.webp", sortOrder: 0, createdAt: new Date() }];
    mediaFile.count.mockResolvedValueOnce(0);
    mediaFile.create.mockResolvedValue({ ...pending[0], contentId: `pending:owner-1:${batchId}` });

    await service.createPendingEventMedia(batchId, actor, "/uploads/pending.webp", "image");

    expect(mediaFile.create).toHaveBeenCalledWith({ data: expect.objectContaining({ contentType: ReportTargetType.event, contentId: `pending:owner-1:${batchId}`, uploadedById: "owner-1" }) });

    prisma.event.findUnique.mockResolvedValue({ createdById: "owner-1" });
    mediaFile.count.mockResolvedValueOnce(0);
    mediaFile.findMany.mockResolvedValueOnce(pending).mockResolvedValueOnce([]);
    await service.claimPendingEventMedia("event-1", batchId, actor);

    expect(mediaFile.update).toHaveBeenCalledWith({ where: { id: "media-pending" }, data: { contentId: "event-1", sortOrder: 0 } });
    expect(prisma.event.update).toHaveBeenCalledWith({ where: { id: "event-1" }, data: { coverImageUrl: "/uploads/pending.webp" } });
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

describe("Content comment reply boundaries", () => {
  it.each([
    null,
    { status: "deleted", targetType: "event", targetId: "event" },
    { status: "active", targetType: "event", targetId: "other" },
    { status: "active", targetType: "place", targetId: "event" },
    { status: "active", targetType: "event", targetId: "event", parentId: "root" },
  ])("rejects missing, hidden, cross-content or nested parents: %j", async parent => {
    const prisma = { contentComment: { findUnique: jest.fn().mockResolvedValue(parent), create: jest.fn() } };
    await expect(new ContentService(prisma as never).createComment({ targetType: ReportTargetType.event, targetId: "event", parentId: "parent", body: "Reply" }, { id: "viewer" } as never)).rejects.toThrow();
    expect(prisma.contentComment.create).not.toHaveBeenCalled();
  });
  it("accepts a first-level reply on the same content", async () => {
    const prisma = { contentComment: { findUnique: jest.fn().mockResolvedValue({ status: "active", targetType: "event", targetId: "event", parentId: null }), create: jest.fn().mockResolvedValue({ id: "reply" }) } };
    await expect(new ContentService(prisma as never).createComment({ targetType: ReportTargetType.event, targetId: "event", parentId: "parent", body: "Reply" }, { id: "viewer" } as never)).resolves.toEqual({ id: "reply" });
  });
});
