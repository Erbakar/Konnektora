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
        create: jest.fn(),
        update: jest.fn()
      }
    };
    return { service: new TagsService(prisma as never), prisma };
  };

  it("hides comments written by blocked users", async () => {
    const { service, prisma } = createService();
    prisma.tag.findFirst.mockResolvedValue({ id: "tag-1" });
    prisma.userBlock.findUnique.mockResolvedValue(null);
    prisma.userBlock.findMany.mockResolvedValue([{ targetId: "blocked-user" }]);
    prisma.contentComment.findMany.mockResolvedValue([]);

    await service.listTagComments("tag-1", "viewer-1");
    expect(prisma.contentComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ authorId: { notIn: ["blocked-user"] } }) })
    );
  });

  it("does not expose a blocked tag", async () => {
    const { service, prisma } = createService();
    prisma.tag.findFirst.mockResolvedValue({ id: "tag-1" });
    prisma.userBlock.findUnique.mockResolvedValue({ userId: "viewer-1" });

    await expect(service.listTagComments("tag-1", "viewer-1")).rejects.toBeInstanceOf(NotFoundException);
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
      author: { id: "user-1", name: "User", username: "user" }
    });

    const comment = await service.createTagComment("tag-1", "  Great topic  ", "user-1");
    expect(comment.canDelete).toBe(true);
    expect(prisma.contentComment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ authorId: "user-1", body: "Great topic" }) })
    );
  });

  it("prevents another member from deleting a comment", async () => {
    const { service, prisma } = createService();
    prisma.contentComment.findFirst.mockResolvedValue({ id: "comment-1", authorId: "author-1" });
    await expect(
      service.deleteTagComment("tag-1", "comment-1", { id: "user-1", role: "user" } as never)
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
