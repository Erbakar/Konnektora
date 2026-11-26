jest.mock("../notifications/activity-events", () => ({ actorLabel: jest.fn(), notifyMembershipInvite: jest.fn(), isUndiscoverable: jest.fn().mockResolvedValue(false) }));
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PlaceMemberRole, PlaceMemberStatus } from "@prisma/client";
import { PlacesService } from "./places.service";

describe("26/11 mekân ilgili kullanıcılar", () => {
  const prisma = {
    place: { findUnique: jest.fn(), findFirst: jest.fn() },
    placeMember: { findUnique: jest.fn(), deleteMany: jest.fn(), upsert: jest.fn() },
    placeInvitation: { findUnique: jest.fn(), create: jest.fn() },
    user: { findFirst: jest.fn() },
  };
  const service = new PlacesService(prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never);
  const actor = { id: "actor-1", role: "user" } as never;
  const adminActor = { id: "admin-1", role: "admin" } as never;

  beforeEach(() => jest.clearAllMocks());

  it("#87 affet yasaklı üyelik kaydını siler (sıfır durum)", async () => {
    prisma.place.findUnique.mockResolvedValue({ id: "place-1", createdById: "actor-1", members: [] });
    prisma.placeMember.findUnique.mockResolvedValue({ status: PlaceMemberStatus.banned, role: PlaceMemberRole.member });
    await expect(service.pardonMember("place-1", "user-2", actor)).resolves.toEqual({ pardoned: true });
    expect(prisma.placeMember.deleteMany).toHaveBeenCalledWith({ where: { placeId: "place-1", userId: "user-2", status: PlaceMemberStatus.banned } });
  });

  it("#87 yasaklı olmayan üyeyi affetmez", async () => {
    prisma.place.findUnique.mockResolvedValue({ id: "place-1", createdById: "actor-1", members: [] });
    prisma.placeMember.findUnique.mockResolvedValue({ status: PlaceMemberStatus.accepted, role: PlaceMemberRole.member });
    await expect(service.pardonMember("place-1", "user-2", actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.placeMember.deleteMany).not.toHaveBeenCalled();
  });

  it("#116 mekân ekibinde olmayan admin yönetici rolüyle davet gönderemez", async () => {
    prisma.place.findUnique.mockResolvedValue({ id: "place-1", createdById: "owner-1", members: [] });
    await expect(service.invite("place-1", { username: "ayse", role: PlaceMemberRole.organizer }, adminActor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.placeMember.upsert).not.toHaveBeenCalled();
  });

  it("#116 mekân yöneticisi kurucu rolüyle davet gönderemez", async () => {
    prisma.place.findUnique.mockResolvedValue({ id: "place-1", createdById: "owner-1", members: [{ role: PlaceMemberRole.organizer }] });
    await expect(service.invite("place-1", { username: "ayse", role: PlaceMemberRole.manager }, actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
});
