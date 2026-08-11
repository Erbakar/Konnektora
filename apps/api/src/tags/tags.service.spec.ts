import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { TagsService } from "./tags.service";

describe("TagsService comments", () => {
  const createService = () => {
    const prisma = {
      tag: { findFirst: jest.fn(), findMany: jest.fn() },
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
      eventTag: { count: jest.fn() },
      placeTag: { count: jest.fn() },
      userInterestTag: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
      contentView: { count: jest.fn() },
      $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    };
    return { service: new TagsService(prisma as never), prisma };
  };

  it("hides comments written by blocked users", async () => {
    const { service, prisma } = createService();
    prisma.tag.findFirst.mockResolvedValue({ id: "tag-1" });
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
    prisma.contentView.count.mockResolvedValue(20);
    await expect(service.getPublicStats("tag-1", { id: "curator-1", role: "curator" } as never)).resolves.toEqual({
      events: 4,
      places: 2,
      followers: 8,
      likes: 5,
      ok: 3,
      dislikes: 2,
      posts: 5,
      views: 20,
      reactions: 6,
      engagementRate: 55,
    });
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
      }),
    ]);
  });
});
