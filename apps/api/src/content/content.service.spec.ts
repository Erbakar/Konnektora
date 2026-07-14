import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ReportTargetType } from "@prisma/client";
import { ContentService } from "./content.service";

describe("ContentService profile media", () => {
  const mediaFile = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn()
  };
  const prisma = {
    mediaFile,
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
});
