jest.mock("../notifications/activity-events", () => ({ notifyEntityCreated: jest.fn(), notifyEntityChanges: jest.fn(), notifyUserActivity: jest.fn(), notifyEventAvailability: jest.fn(), isUndiscoverable: jest.fn().mockResolvedValue(false), notifyRegistration: jest.fn(), notifyMembershipInvite: jest.fn(), notifyComment: jest.fn(), recordActivity: jest.fn() }));
import { ConflictException } from "@nestjs/common";
import { composerMediaMaxBytes, contentMediaExtensions, contentMediaHelp } from "./media-policy";
import { TagsService, tagPostMediaLimit } from "../tags/tags.service";

/** 26/11 #62.11 / #63 test dönüşü: çoklu medya gönderiminin yarıda kalma nedenleri. */
describe("composer media policy", () => {
  it("accepts iPhone MOV videos and phone-sized files", () => {
    expect(contentMediaExtensions["video/quicktime"]).toBe(".mov");
    expect(contentMediaHelp).toContain("MOV");
    expect(composerMediaMaxBytes).toBe(50 * 1024 * 1024);
  });

  it("lets an interest post hold more than 4 media and stops at the shared limit", async () => {
    const prisma = {
      contentComment: { findFirst: jest.fn().mockResolvedValue({ authorId: "u1" }) },
      mediaFile: { count: jest.fn().mockResolvedValue(4), create: jest.fn().mockResolvedValue({ id: "m5" }) },
    };
    const service = new TagsService(prisma as never);
    const user = { id: "u1", role: "user" } as never;
    await expect(service.addCommentMedia("c1", user, "/uploads/5.jpg", "image")).resolves.toEqual({ id: "m5" });
    prisma.mediaFile.count.mockResolvedValue(tagPostMediaLimit);
    await expect(service.addCommentMedia("c1", user, "/uploads/x.jpg", "image")).rejects.toBeInstanceOf(ConflictException);
  });
});
