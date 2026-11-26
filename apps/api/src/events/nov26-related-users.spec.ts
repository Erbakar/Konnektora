jest.mock("../notifications/activity-events", () => ({ actorLabel: jest.fn(), recordActivity: jest.fn(), notifyMembershipInvite: jest.fn(), isUndiscoverable: jest.fn().mockResolvedValue(false) }));
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { EventParticipantRole, EventParticipantStatus } from "@prisma/client";
import { EventsService } from "./events.service";

describe("26/11 etkinlik ilgili kullanıcılar", () => {
  const prisma = {
    event: { findUnique: jest.fn() },
    eventParticipant: { findUnique: jest.fn(), deleteMany: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn() },
  };
  const service = new EventsService(prisma as never, {} as never, {} as never, {} as never, {} as never);
  const actor = { id: "actor-1", role: "user" } as never;
  const curator = { id: "curator-1", role: "curator" } as never;
  const future = { status: "published", startsAt: new Date(Date.now() + 60_000), endsAt: new Date(Date.now() + 3_600_000) };

  beforeEach(() => jest.clearAllMocks());

  it("#93 affet yasaklı katılım kaydını siler (sıfır durum)", async () => {
    prisma.event.findUnique.mockResolvedValue({ createdById: "actor-1" });
    prisma.eventParticipant.findUnique.mockResolvedValue({ status: EventParticipantStatus.banned, role: EventParticipantRole.attendee });
    await expect(service.pardonParticipant("event-1", "user-2", actor)).resolves.toEqual({ pardoned: true });
    expect(prisma.eventParticipant.deleteMany).toHaveBeenCalledWith({ where: { eventId: "event-1", userId: "user-2", status: EventParticipantStatus.banned } });
  });

  it("#93 yasaklı olmayan katılımcıyı affetmez", async () => {
    prisma.event.findUnique.mockResolvedValue({ createdById: "actor-1" });
    prisma.eventParticipant.findUnique.mockResolvedValue({ status: EventParticipantStatus.accepted, role: EventParticipantRole.attendee });
    await expect(service.pardonParticipant("event-1", "user-2", actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.eventParticipant.deleteMany).not.toHaveBeenCalled();
  });

  it("#117 etkinlik ekibinde olmayan küratör yönetici rolüyle davet gönderemez", async () => {
    prisma.event.findUnique.mockResolvedValue({ id: "event-1", createdById: "owner-1", createdBy: { id: "owner-1" }, ...future, participants: [] });
    await expect(service.inviteParticipant("event-1", { username: "ayse", role: EventParticipantRole.organizer }, curator)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("#117 etkinlik yöneticisi kurucu rolüyle davet gönderemez", async () => {
    prisma.event.findUnique.mockResolvedValue({ id: "event-1", createdById: "owner-1", createdBy: { id: "owner-1" }, ...future, participants: [{ status: "accepted", role: EventParticipantRole.organizer }] });
    prisma.eventParticipant.findUnique.mockResolvedValue({ status: "accepted", role: EventParticipantRole.organizer });
    await expect(service.inviteParticipant("event-1", { username: "ayse", role: EventParticipantRole.manager }, actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
