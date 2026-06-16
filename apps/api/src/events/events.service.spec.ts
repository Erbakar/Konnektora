import { ForbiddenException } from "@nestjs/common";
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
        findUnique: jest.fn()
      },
      eventParticipant: {
        findMany: jest.fn(),
        findUnique: jest.fn()
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
});
