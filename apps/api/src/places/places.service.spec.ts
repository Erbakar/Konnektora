import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { PlaceMemberStatus } from "@prisma/client";
import { PlacesService } from "./places.service";

describe("PlacesService", () => {
  const place = {
    findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(),
    create: jest.fn(), update: jest.fn(), updateMany: jest.fn()
  };
  const placeMember = {
    create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), upsert: jest.fn()
  };
  const placeFollow = { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() };
  const user = { findFirst: jest.fn() };
  const userBlock = { findMany: jest.fn(), findUnique: jest.fn() };
  const privacySettings = { findUnique: jest.fn() };
  const userFollow = { findMany: jest.fn(), findFirst: jest.fn() };
  const notification = { create: jest.fn() };
  const tx = { place, placeMember, placeFollow, notification };
  const prisma = {
    place, placeMember, placeFollow, user, userBlock, privacySettings, userFollow, notification,
    $transaction: jest.fn(async (operation: unknown) =>
      typeof operation === "function" ? operation(tx) : Promise.all(operation as Promise<unknown>[])
    )
  };
  const service = new PlacesService(prisma as never);
  const actor = { id: "11111111-1111-4111-8111-111111111111", role: "user", name: "Owner" } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    userBlock.findMany.mockResolvedValue([]);
    userBlock.findUnique.mockResolvedValue(null);
    privacySettings.findUnique.mockResolvedValue(null);
    userFollow.findMany.mockResolvedValue([]);
    userFollow.findFirst.mockResolvedValue(null);
    place.findUnique.mockResolvedValue(null);
    place.findFirst.mockResolvedValue(null);
  });

  it("creates the owner as an accepted organizer", async () => {
    place.create.mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222", slug: "studio", name: "Studio" });
    placeMember.create.mockResolvedValue({});
    place.findUnique.mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222" });
    place.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "22222222-2222-4222-8222-222222222222", slug: "studio", name: "Studio", followers: [], members: [{ status: "accepted", role: "organizer" }]
    });

    await service.create({ name: "Studio" }, actor);

    expect(placeMember.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: actor.id, status: "accepted", role: "organizer" })
    });
  });

  it("keeps follow requests idempotent", async () => {
    place.findFirst.mockResolvedValue({ id: "place-1" });
    placeFollow.findUnique.mockResolvedValue({ placeId: "place-1", userId: "user-1" });

    await expect(service.follow("place-1", "user-1")).resolves.toEqual({ following: true });
    expect(placeFollow.create).not.toHaveBeenCalled();
    expect(place.update).not.toHaveBeenCalled();
  });

  it("increments follower count only for a new follow", async () => {
    place.findFirst.mockResolvedValue({ id: "place-1" });
    placeFollow.findUnique.mockResolvedValue(null);
    placeFollow.create.mockResolvedValue({});
    place.update.mockResolvedValue({});

    await service.follow("place-1", "user-1");

    expect(placeFollow.create).toHaveBeenCalledTimes(1);
    expect(place.update).toHaveBeenCalledWith({ where: { id: "place-1" }, data: { followerCount: { increment: 1 } } });
  });

  it("prevents a manager from changing member roles", async () => {
    place.findUnique.mockResolvedValue({ id: "place-1", createdById: "owner-1", members: [{ role: "manager" }] });
    placeMember.findUnique.mockResolvedValue({ placeId: "place-1", userId: "member-1", role: "member", status: "accepted" });

    await expect(service.updateMember("place-1", "member-1", { role: "manager" }, actor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("only accepts accepted or declined invitation responses", async () => {
    await expect(service.respondToInvite("place-1", PlaceMemberStatus.banned, "user-1")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("creates a member invitation and notification atomically", async () => {
    const invitedUser = {
      id: "33333333-3333-4333-8333-333333333333", email: "member@example.com", name: "Member", role: "user", status: "active"
    };
    place.findUnique.mockResolvedValue({ id: "place-1", name: "Hub", createdById: actor.id, members: [] });
    user.findFirst.mockResolvedValue(invitedUser);
    placeMember.findUnique.mockResolvedValue(null);
    placeMember.upsert.mockResolvedValue({ placeId: "place-1", userId: invitedUser.id, status: "invited", role: "member" });
    place.update.mockResolvedValue({});
    notification.create.mockResolvedValue({});

    await service.invite("place-1", { email: invitedUser.email }, actor);

    expect(notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: invitedUser.id, type: "place_invite", targetId: "place-1" }) });
    expect(place.update).toHaveBeenCalledWith({ where: { id: "place-1" }, data: { inviteCount: { increment: 1 } } });
  });

  it("respects the recipient's place invitation privacy", async () => {
    const invitedUser = {
      id: "33333333-3333-4333-8333-333333333333", email: "private@example.com", name: "Private", role: "user", status: "active"
    };
    place.findUnique.mockResolvedValue({ id: "place-1", name: "Hub", createdById: actor.id, members: [] });
    user.findFirst.mockResolvedValue(invitedUser);
    privacySettings.findUnique.mockResolvedValue({ placeInviteAudience: "following" });
    userFollow.findMany.mockResolvedValue([]);

    await expect(service.invite("place-1", { userId: invitedUser.id }, actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(placeMember.upsert).not.toHaveBeenCalled();
  });
});
