import { ContentService } from "./content.service";
import { ReportTargetType } from "@prisma/client";

describe("23/10 #1 persisted comment likes", () => {
  it("returns only the viewer's likes for posts and replies", async () => {
    const prisma = {
      contentComment: { findMany: jest.fn().mockResolvedValue([{ id: "post", author: null, replies: [{ id: "reply", author: null }] }]) },
      mediaFile: { findMany: jest.fn().mockResolvedValue([]) },
      contentReaction: { findMany: jest.fn().mockResolvedValue([{ targetId: "reply" }]) },
      contentPoll: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new ContentService(prisma as never);
    const result = await service.listComments(ReportTargetType.event, "event", "viewer");
    expect(result[0].liked).toBe(false);
    expect(result[0].replies[0].liked).toBe(true);
    expect(prisma.contentReaction.findMany).toHaveBeenCalledWith({ where: { userId: "viewer", targetId: { in: ["post", "reply"] }, targetType: ReportTargetType.comment_reply, reaction: "like" }, select: { targetId: true } });
    prisma.contentReaction.findMany.mockClear();
    const anonymous = await service.listComments(ReportTargetType.event, "event");
    expect(anonymous[0].replies[0].liked).toBe(false);
    expect(prisma.contentReaction.findMany).not.toHaveBeenCalled();
  });
});
