jest.mock("../notifications/activity-events", () => ({ notifyEntityCreated: jest.fn().mockResolvedValue(undefined), notifyEntityChanges: jest.fn().mockResolvedValue(undefined), notifyUserActivity: jest.fn().mockResolvedValue(undefined), notifyEventAvailability: jest.fn().mockResolvedValue(undefined), isUndiscoverable: jest.fn().mockResolvedValue(false), notifyRegistration: jest.fn().mockResolvedValue(undefined), notifyMembershipInvite: jest.fn().mockResolvedValue(undefined), notifyComment: jest.fn().mockResolvedValue(undefined), recordActivity: jest.fn().mockResolvedValue(undefined) }));
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { TagsService } from "./tags.service";

describe("TagsService comments", () => {
  const createService = () => {
    const prisma = {
      tag: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
      contentNotificationSubscription: { count: jest.fn().mockResolvedValue(3) },
      userBlock: { findUnique: jest.fn(), findMany: jest.fn() },
      contentComment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      contentReaction: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      mediaFile: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
      eventTag: { count: jest.fn(), findMany: jest.fn() },
      placeTag: { count: jest.fn() },
      userInterestTag: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
      profileTagSuggestion: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
      contentView: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
      contentShare: { groupBy: jest.fn() },
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "curator-1", role: "curator", createdAt: new Date("2026-01-01") }) },
      $queryRaw: jest.fn(),
      planUsage: { findUnique: jest.fn(), count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async operation => typeof operation === "function" ? operation(prisma) : Promise.all(operation));
    return { service: new TagsService(prisma as never), prisma };
  };

  it("hides comments written by blocked users", async () => {
    const { service, prisma } = createService();
    prisma.tag.findFirst.mockResolvedValue({ id: "tag-1" });
    prisma.tag.findUnique.mockResolvedValue({ usageCount: 10 });
    prisma.tag.count.mockResolvedValue(2);
    prisma.userBlock.findUnique.mockResolvedValue(null);
    prisma.userBlock.findMany.mockResolvedValue([{ targetId: "blocked-user" }]);
    prisma.contentComment.findMany.mockResolvedValue([]);
    prisma.mediaFile.findMany.mockResolvedValue([]);
    prisma.contentReaction.findMany.mockResolvedValue([]);

    await service.listTagComments("tag-1", "viewer-1");
    expect(prisma.contentComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          authorId: { notIn: ["blocked-user"] },
        }),
      }),
    );
  });

  it("returns usage statistics to authorized roles", async () => {
    const { service, prisma } = createService();
    prisma.tag.findFirst.mockResolvedValue({ id: "tag-1" });
    prisma.eventTag.count.mockResolvedValue(4);
    prisma.placeTag.count.mockResolvedValue(2);
    prisma.userInterestTag.groupBy.mockResolvedValue([
      { sentiment: "like", _count: { _all: 5 } },
      { sentiment: "ok", _count: { _all: 3 } },
      { sentiment: "dislike", _count: { _all: 2 } },
    ]);
    prisma.contentComment.count.mockResolvedValue(5);
    prisma.contentComment.aggregate.mockResolvedValue({ _sum: { likeCount: 6 } });
    prisma.contentComment.findMany.mockResolvedValue([]);
    prisma.contentView.count.mockResolvedValue(20);
    prisma.contentView.findMany.mockResolvedValue([]);
    prisma.contentView.groupBy.mockResolvedValue([]);
    prisma.contentShare.groupBy.mockResolvedValue([]);
    prisma.userInterestTag.findMany.mockResolvedValue([]);
    prisma.eventTag.findMany.mockResolvedValue([]);
    prisma.contentReaction.findMany.mockResolvedValue([]);
    await expect(service.getPublicStats("tag-1", { id: "curator-1", role: "curator" } as never)).resolves.toEqual(expect.objectContaining({
      events: 4,
      places: 2,
      notificationSubscribers: 3,
      followers: 8,
      likes: 5,
      ok: 3,
      dislikes: 2,
      posts: 5,
      views: 20,
      reactions: 6,
      engagementRate: 55,
    }));
  });

  it("etiket istatistiklerinde zaman serisi, yapıştırılma dağılımı ve check-in ısı haritası üretir (17/11 #66, #114, #115, #117)", async () => {
    const { service, prisma } = createService();
    const recent = new Date(); // saat başından sonraki ilk dakikalarda da son saat kovasına düşsün
    const person = (id: string) => ({ id, birthDate: null, gender: null, city: null, country: null, preferredLanguage: null, interestTags: [], _count: { eventParticipations: 0, sentPrivateMessages: 0, scansMade: 0, scansReceived: 0 } });
    prisma.tag.findFirst.mockResolvedValue({ id: "tag-1" });
    prisma.tag.findUnique.mockResolvedValue({ usageCount: 3 });
    prisma.tag.count.mockResolvedValue(0);
    prisma.eventTag.count.mockResolvedValue(1);
    prisma.placeTag.count.mockResolvedValue(0);
    prisma.userInterestTag.groupBy.mockResolvedValue([{ sentiment: "like", _count: { _all: 2 } }, { sentiment: "dislike", _count: { _all: 1 } }]);
    prisma.userInterestTag.findMany.mockResolvedValue([{ sentiment: "like", createdAt: recent, user: person("u1") }, { sentiment: "like", createdAt: recent, user: person("u2") }, { sentiment: "dislike", createdAt: recent, user: person("u3") }]);
    prisma.contentComment.count.mockResolvedValue(1);
    prisma.contentComment.aggregate.mockResolvedValue({ _sum: { likeCount: 2 } });
    prisma.contentComment.findMany.mockResolvedValue([{ id: "c1", createdAt: recent }]);
    prisma.contentReaction.findMany.mockResolvedValue([{ createdAt: recent }, { createdAt: recent }]);
    prisma.contentView.count.mockResolvedValue(4);
    prisma.contentView.findMany.mockResolvedValue([{ createdAt: recent, user: null }]);
    prisma.contentView.groupBy.mockResolvedValue([]);
    prisma.contentShare.groupBy.mockResolvedValue([]);
    prisma.eventTag.findMany.mockResolvedValue([{ event: { startsAt: new Date("2026-11-13T18:00:00.000Z"), timezone: "Europe/Istanbul", currency: "TRY", participants: [{ status: "attended", checkedInAt: new Date("2026-11-13T18:30:00.000Z") }, { status: "accepted", checkedInAt: null }], ticketTypeRecords: [], payments: [], ticketRefunds: [] } }]);
    prisma.profileTagSuggestion.findMany.mockResolvedValue([{ targetUserId: "u2", status: "accepted", suggestedBy: { gender: "female" } }, { targetUserId: "u9", status: "pending", suggestedBy: { gender: "male" } }, { targetUserId: "u8", status: "declined", suggestedBy: { gender: null } }]);
    const stats = await service.getPublicStats("tag-1", { id: "curator-1", role: "curator" } as never) as Record<string, number>;
    expect(stats).toMatchObject({ stickBy_kendisi: 2, stickBy_bir_baskasi: 1, suggestGender_kadinlar: 1, suggestGender_erkekler: 1, suggestGender_belirtmek_istemiyor: 1, checkinHeat_cum_20: 1 });
    expect(stats).toMatchObject({ ts_like_24h_23: 2, ts_dislike_7d_6: 1, ts_views_30d_29: 1, ts_interest_12m_11: 3, ts_comments_24h_23: 1, ts_commentLikes_24h_23: 2 });
    expect(stats.tsNow).toBeGreaterThan(0);
    expect(Object.values(stats).every((value) => typeof value === "number" && value >= 0)).toBe(true);
  });

  it("etiketin nasıl oluşturulduğunu bildirir (17/11 #116)", async () => {
    const { service, prisma } = createService();
    prisma.tag.findFirst.mockResolvedValue({ id: "tag-1" });
    prisma.userBlock.findUnique.mockResolvedValue(null);
    prisma.tag.findUnique.mockResolvedValue({ createdAt: new Date("2026-01-01"), createdBy: { id: "u1", username: "ada", name: "Ada" } });
    prisma.userInterestTag.findUnique.mockResolvedValue({ createdAt: new Date("2026-01-01T10:00:00Z") });
    await expect(service.getStatsOrigin("tag-1", { id: "viewer" } as never)).resolves.toEqual({ mode: "self", username: "ada" });
    prisma.profileTagSuggestion.findFirst.mockResolvedValue({ createdAt: new Date("2026-01-01T09:00:00Z") });
    await expect(service.getStatsOrigin("tag-1", { id: "viewer" } as never)).resolves.toEqual({ mode: "other", username: "ada" });
    prisma.userInterestTag.findUnique.mockResolvedValue(null);
    prisma.profileTagSuggestion.findFirst.mockResolvedValue(null);
    await expect(service.getStatsOrigin("tag-1", { id: "viewer" } as never)).resolves.toEqual({ mode: "unknown", username: "ada" });
    prisma.tag.findUnique.mockResolvedValue({ createdAt: new Date("2026-01-01"), createdBy: null });
    await expect(service.getStatsOrigin("tag-1", { id: "viewer" } as never)).resolves.toEqual({ mode: "unknown", username: null });
  });

  it("toggles a post like and keeps the stored counter in sync", async () => {
    const { service, prisma } = createService();
    prisma.contentComment.findFirst.mockResolvedValue({ id: "comment-1" });
    prisma.contentReaction.findUnique.mockResolvedValue(null);
    prisma.contentReaction.create.mockResolvedValue({});
    prisma.contentComment.update.mockResolvedValue({});
    await expect(
      service.toggleCommentLike("comment-1", "user-1"),
    ).resolves.toEqual({ liked: true });
    expect(prisma.contentComment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { likeCount: { increment: 1 } } }),
    );
  });

  it("does not expose a blocked tag", async () => {
    const { service, prisma } = createService();
    prisma.tag.findFirst.mockResolvedValue({ id: "tag-1" });
    prisma.userBlock.findUnique.mockResolvedValue({ userId: "viewer-1" });

    await expect(
      service.listTagComments("tag-1", "viewer-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("creates a trimmed comment owned by the current user", async () => {
    const { service, prisma } = createService();
    const now = new Date();
    prisma.tag.findFirst.mockResolvedValue({ id: "tag-1" });
    prisma.userBlock.findUnique.mockResolvedValue(null);
    prisma.contentComment.create.mockResolvedValue({
      id: "comment-1",
      body: "Great topic",
      likeCount: 0,
      createdAt: now,
      updatedAt: now,
      author: { id: "user-1", name: "User", username: "user" },
    });

    const comment = await service.createTagComment(
      "tag-1",
      "  Great topic  ",
      "user-1",
    );
    expect(comment.canDelete).toBe(true);
    expect(prisma.contentComment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorId: "user-1",
          body: "Great topic",
        }),
      }),
    );
  });

  it("prevents another member from deleting a comment", async () => {
    const { service, prisma } = createService();
    prisma.contentComment.findFirst.mockResolvedValue({
      id: "comment-1",
      authorId: "author-1",
    });
    await expect(
      service.deleteTagComment("tag-1", "comment-1", {
        id: "user-1",
        role: "user",
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("lets the author edit and trims a tag post", async () => {
    const { service, prisma } = createService();
    const now = new Date();
    prisma.contentComment.findFirst.mockResolvedValue({
      id: "comment-1",
      authorId: "user-1",
      targetId: "tag-1",
    });
    prisma.contentComment.update.mockResolvedValue({
      id: "comment-1",
      body: "Updated post",
      likeCount: 2,
      createdAt: now,
      updatedAt: now,
      author: { id: "user-1", name: "User", username: "user" },
    });

    await expect(
      service.updateTagComment("comment-1", "  Updated post  ", {
        id: "user-1",
        role: "user",
      } as never),
    ).resolves.toEqual(
      expect.objectContaining({
        id: "comment-1",
        body: "Updated post",
        tagId: "tag-1",
      }),
    );
    expect(prisma.contentComment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { body: "Updated post" } }),
    );
  });

  it("prevents another member from editing a tag post", async () => {
    const { service, prisma } = createService();
    prisma.contentComment.findFirst.mockResolvedValue({
      id: "comment-1",
      authorId: "author-1",
      targetId: "tag-1",
    });

    await expect(
      service.updateTagComment("comment-1", "Changed", {
        id: "user-1",
        role: "user",
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.contentComment.update).not.toHaveBeenCalled();
  });

  it("combines interested members and post authors on the tag users page", async () => {
    const { service, prisma } = createService();
    prisma.tag.findFirst.mockResolvedValue({ id: "tag-1" });
    prisma.userBlock.findUnique.mockResolvedValue(null);
    prisma.userInterestTag.findMany.mockResolvedValue([
      {
        sentiment: "like",
        user: {
          id: "user-1",
          name: "Member",
          username: "member",
          city: null,
          country: null,
          profileVerifiedAt: null,
        },
      },
    ]);
    prisma.contentComment.findMany.mockResolvedValue([
      {
        author: {
          id: "user-1",
          name: "Member",
          username: "member",
          city: null,
          country: null,
          profileVerifiedAt: null,
        },
      },
    ]);

    await expect(service.listRelatedUsers("tag-1")).resolves.toEqual([
      expect.objectContaining({
        id: "user-1",
        relation: "ilgileniyor · paylaşım yaptı",
        sentiment: "like",
      }),
    ]);
  });
});
