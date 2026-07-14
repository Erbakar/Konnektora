import { ConflictException, ForbiddenException } from "@nestjs/common";
import { EventParticipantRole, EventParticipantStatus } from "@prisma/client";
import { EventsService } from "./events.service";

describe("EventsService", () => {
  const actor = {
    id: "user-1",
    email: "user@example.com",
    name: "User",
    role: "user",
    status: "active"
  };

  const createService = () => {
    const prisma = {
      event: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
      },
      userBlock: { findMany: jest.fn() },
      eventParticipant: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
      }
    };
    const mailService = {
      sendEventInviteEmail: jest.fn()
    };
    const authService = {
      createInviteAcceptToken: jest.fn()
    };

    return {
      service: new EventsService(prisma as never, mailService as never, authService as never),
      prisma
    };
  };

  it("allows the event creator to manage the guest list", async () => {
    const { service, prisma } = createService();

    prisma.event.findUnique.mockResolvedValue({ createdById: actor.id });
    prisma.eventParticipant.findMany.mockResolvedValue([]);

    await expect(service.listParticipants("event-1", actor as never)).resolves.toEqual([]);
    expect(prisma.eventParticipant.findUnique).not.toHaveBeenCalled();
  });

  it("allows accepted organizers and managers to manage the guest list", async () => {
    const { service, prisma } = createService();

    prisma.event.findUnique.mockResolvedValue({ createdById: "owner-1" });
    prisma.eventParticipant.findUnique.mockResolvedValue({
      role: EventParticipantRole.organizer,
      status: EventParticipantStatus.accepted
    });
    prisma.eventParticipant.findMany.mockResolvedValue([{ id: "participant-1" }]);

    await expect(service.listParticipants("event-1", actor as never)).resolves.toEqual([{ id: "participant-1" }]);

    prisma.eventParticipant.findUnique.mockResolvedValue({
      role: EventParticipantRole.manager,
      status: EventParticipantStatus.accepted
    });

    await expect(service.listParticipants("event-1", actor as never)).resolves.toEqual([{ id: "participant-1" }]);
  });

  it("allows admins to manage any event guest list without participant lookup", async () => {
    const { service, prisma } = createService();

    prisma.eventParticipant.findMany.mockResolvedValue([]);

    await expect(service.listParticipants("event-1", { ...actor, role: "admin" } as never)).resolves.toEqual([]);
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
    expect(prisma.eventParticipant.findUnique).not.toHaveBeenCalled();
  });

  it("rejects attendees and pending organizers from guest list management", async () => {
    const { service, prisma } = createService();

    prisma.event.findUnique.mockResolvedValue({ createdById: "owner-1" });
    prisma.eventParticipant.findUnique.mockResolvedValue({
      role: EventParticipantRole.attendee,
      status: EventParticipantStatus.accepted
    });

    await expect(service.listParticipants("event-1", actor as never)).rejects.toBeInstanceOf(ForbiddenException);

    prisma.eventParticipant.findUnique.mockResolvedValue({
      role: EventParticipantRole.organizer,
      status: EventParticipantStatus.requested
    });

    await expect(service.listParticipants("event-1", actor as never)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("filters blocked events, organizers and tags from member discovery", async () => {
    const { service, prisma } = createService();
    prisma.userBlock.findMany.mockResolvedValue([
      { targetType: "event", targetId: "event-2" },
      { targetType: "user", targetId: "owner-2" },
      { targetType: "tag", targetId: "tag-2" }
    ]);
    prisma.event.count.mockResolvedValue(0);
    prisma.event.findMany.mockResolvedValue([]);

    await service.listPublicEvents({}, actor.id);

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: [
            { id: { in: ["event-2"] } },
            { createdById: { in: ["owner-2"] } },
            { tags: { some: { tagId: { in: ["tag-2"] } } } }
          ]
        })
      })
    );
  });

  it("issues an opaque QR ticket only for an accepted participant", async () => {
    const { service, prisma } = createService();
    prisma.eventParticipant.findUnique.mockResolvedValue({
      id: "participant-1",
      status: EventParticipantStatus.accepted,
      event: { id: "event-1", title: "Community Night", status: "published" }
    });
    prisma.eventParticipant.update.mockResolvedValue({});

    const ticket = await service.issueCheckInTicket("event-1", actor.id);
    expect(ticket.token).toMatch(/^[a-f0-9]{64}$/);
    expect(ticket.qrPayload).toContain(ticket.token);
    expect(prisma.eventParticipant.update).toHaveBeenCalledWith({
      where: { id: "participant-1" },
      data: { checkInTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/), checkInTokenIssuedAt: expect.any(Date) }
    });
  });

  it("rejects reuse of an already attended QR ticket", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue({ createdById: actor.id });
    prisma.eventParticipant.findUnique.mockResolvedValue({
      id: "participant-1",
      eventId: "event-1",
      status: EventParticipantStatus.attended
    });

    await expect(service.checkInWithTicket("event-1", "a".repeat(64), actor as never)).rejects.toBeInstanceOf(
      ConflictException
    );
  });
});
