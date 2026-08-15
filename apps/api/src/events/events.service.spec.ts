import { ConflictException, ForbiddenException } from "@nestjs/common";
import { EventParticipantRole, EventParticipantStatus } from "@prisma/client";
import { EventsService } from "./events.service";

describe("EventsService", () => {
  const actor = {
    id: "user-1",
    email: "user@example.com",
    name: "User",
    role: "user",
    status: "active",
  };

  const createService = () => {
    const prisma = {
      event: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      userBlock: { findMany: jest.fn() },
      user: { findUnique: jest.fn(), create: jest.fn() },
      guestList: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
      guestListMember: { upsert: jest.fn(), deleteMany: jest.fn() },
      eventParticipant: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
    };
    const mailService = {
      sendEventInviteEmail: jest.fn(),
    };
    const authService = {
      createInviteAcceptToken: jest.fn(),
    };

    return {
      service: new EventsService(
        prisma as never,
        mailService as never,
        authService as never,
      ),
      prisma,
    };
  };

  it("creates and lists named guest lists for the current owner", async () => {
    const { service, prisma } = createService();
    prisma.guestList.create.mockResolvedValue({ id: "list-1", name: "VIP", ownerId: actor.id, members: [] });
    prisma.guestList.findMany.mockResolvedValue([{ id: "list-1", name: "VIP", ownerId: actor.id, members: [] }]);
    await expect(service.createGuestList(" VIP ", actor as never)).resolves.toEqual(expect.objectContaining({ name: "VIP" }));
    await service.listGuestLists(actor as never);
    expect(prisma.guestList.create).toHaveBeenCalledWith(expect.objectContaining({ data: { ownerId: actor.id, name: "VIP" } }));
    expect(prisma.guestList.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: actor.id } }));
  });

  it("prevents another user from editing a named guest list", async () => {
    const { service, prisma } = createService();
    prisma.guestList.findUnique.mockResolvedValue({ ownerId: "another-user" });
    await expect(service.renameGuestList("list-1", "New name", actor as never)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.guestList.update).not.toHaveBeenCalled();
  });

  it("keeps invite-only events closed to users without an invitation", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue({
      id: "event-1",
      status: "published",
      visibility: "invite_only",
      capacity: null,
    });
    prisma.eventParticipant.findUnique.mockResolvedValue(null);

    await expect(
      service.requestAttendance("event-1", actor.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.eventParticipant.upsert).not.toHaveBeenCalled();
  });

  it("accepts an invited user but keeps approval-required requests pending", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue({
      id: "event-1",
      status: "published",
      visibility: "invite_only",
      capacity: 10,
    });
    prisma.eventParticipant.findUnique.mockResolvedValue({
      status: EventParticipantStatus.invited,
    });
    prisma.eventParticipant.count.mockResolvedValue(2);
    prisma.eventParticipant.upsert.mockResolvedValue({
      status: EventParticipantStatus.accepted,
    });

    await service.requestAttendance("event-1", actor.id);
    expect(prisma.eventParticipant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { status: EventParticipantStatus.accepted },
      }),
    );

    prisma.event.findUnique.mockResolvedValue({
      id: "event-2",
      status: "published",
      visibility: "approval_required",
      capacity: 10,
    });
    prisma.eventParticipant.findUnique.mockResolvedValue(null);
    await service.requestAttendance("event-2", actor.id);
    expect(prisma.eventParticipant.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        update: { status: EventParticipantStatus.requested },
      }),
    );
  });

  it("rejects new attendance when event capacity is full", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue({
      id: "event-1",
      status: "published",
      visibility: "open",
      capacity: 2,
    });
    prisma.eventParticipant.findUnique.mockResolvedValue(null);
    prisma.eventParticipant.count.mockResolvedValue(2);

    await expect(
      service.requestAttendance("event-1", actor.id),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("allows the event creator to manage the guest list", async () => {
    const { service, prisma } = createService();

    prisma.event.findUnique.mockResolvedValue({ createdById: actor.id });
    prisma.eventParticipant.findMany.mockResolvedValue([]);

    await expect(
      service.listParticipants("event-1", actor as never),
    ).resolves.toEqual([]);
    expect(prisma.eventParticipant.findUnique).not.toHaveBeenCalled();
  });

  it("allows accepted organizers and managers to manage the guest list", async () => {
    const { service, prisma } = createService();

    prisma.event.findUnique.mockResolvedValue({ createdById: "owner-1" });
    prisma.eventParticipant.findUnique.mockResolvedValue({
      role: EventParticipantRole.organizer,
      status: EventParticipantStatus.accepted,
    });
    prisma.eventParticipant.findMany.mockResolvedValue([
      { id: "participant-1" },
    ]);

    await expect(
      service.listParticipants("event-1", actor as never),
    ).resolves.toEqual([{ id: "participant-1" }]);

    prisma.eventParticipant.findUnique.mockResolvedValue({
      role: EventParticipantRole.manager,
      status: EventParticipantStatus.accepted,
    });

    await expect(
      service.listParticipants("event-1", actor as never),
    ).resolves.toEqual([{ id: "participant-1" }]);
  });

  it("allows admins to manage any event guest list without participant lookup", async () => {
    const { service, prisma } = createService();

    prisma.eventParticipant.findMany.mockResolvedValue([]);

    await expect(
      service.listParticipants("event-1", { ...actor, role: "admin" } as never),
    ).resolves.toEqual([]);
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
    expect(prisma.eventParticipant.findUnique).not.toHaveBeenCalled();
  });

  it("rejects attendees and pending organizers from guest list management", async () => {
    const { service, prisma } = createService();

    prisma.event.findUnique.mockResolvedValue({ createdById: "owner-1" });
    prisma.eventParticipant.findUnique.mockResolvedValue({
      role: EventParticipantRole.attendee,
      status: EventParticipantStatus.accepted,
    });

    await expect(
      service.listParticipants("event-1", actor as never),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.eventParticipant.findUnique.mockResolvedValue({
      role: EventParticipantRole.organizer,
      status: EventParticipantStatus.requested,
    });

    await expect(
      service.listParticipants("event-1", actor as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("filters blocked events, organizers and tags from member discovery", async () => {
    const { service, prisma } = createService();
    prisma.userBlock.findMany.mockResolvedValue([
      { targetType: "event", targetId: "event-2" },
      { targetType: "user", targetId: "owner-2" },
      { targetType: "tag", targetId: "tag-2" },
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
            { tags: { some: { tagId: { in: ["tag-2"] } } } },
          ],
        }),
      }),
    );
  });

  it("issues an opaque QR ticket only for an accepted participant", async () => {
    const { service, prisma } = createService();
    prisma.eventParticipant.findUnique.mockResolvedValue({
      id: "participant-1",
      status: EventParticipantStatus.accepted,
      event: { id: "event-1", title: "Community Night", status: "published" },
    });
    prisma.eventParticipant.update.mockResolvedValue({});

    const ticket = await service.issueCheckInTicket("event-1", actor.id);
    expect(ticket.token).toMatch(/^[a-f0-9]{64}$/);
    expect(ticket.qrPayload).toContain(ticket.token);
    expect(prisma.eventParticipant.update).toHaveBeenCalledWith({
      where: { id: "participant-1" },
      data: {
        checkInTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        checkInTokenIssuedAt: expect.any(Date),
      },
    });
  });

  it("rejects reuse of an already attended QR ticket", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue({ createdById: actor.id });
    prisma.eventParticipant.findUnique.mockResolvedValue({
      id: "participant-1",
      eventId: "event-1",
      status: EventParticipantStatus.attended,
    });

    await expect(
      service.checkInWithTicket("event-1", "a".repeat(64), actor as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("resolves event manager invitations by username", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique
      .mockResolvedValueOnce({ createdById: actor.id })
      .mockResolvedValueOnce({
        id: "event-1",
        title: "Community Night",
        slug: "community-night",
      });
    prisma.user.findUnique.mockResolvedValue({
      id: "manager-1",
      username: "ayse",
      email: "ayse@example.com",
      name: "Ayşe",
      status: "active",
    });
    prisma.eventParticipant.upsert.mockResolvedValue({ id: "participant-1" });

    await service.inviteParticipant(
      "event-1",
      { username: "@Ayse", role: EventParticipantRole.manager },
      actor as never,
    );

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { username: "ayse" },
    });
    expect(prisma.eventParticipant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: "manager-1",
          role: EventParticipantRole.manager,
        }),
      }),
    );
  });

  it("lists only accepted users on the public related users page", async () => {
    const { service, prisma } = createService();
    prisma.event.findFirst.mockResolvedValue({ id: "event-1" });
    prisma.eventParticipant.findMany.mockResolvedValue([
      {
        role: "attendee",
        checkedInAt: new Date(),
        user: {
          id: "user-2",
          name: "Guest",
          username: "guest",
          city: "Istanbul",
          country: "TR",
          profileVerifiedAt: null,
        },
      },
    ]);

    await expect(service.listRelatedUsers("event-1")).resolves.toEqual([
      expect.objectContaining({
        id: "user-2",
        relation: "attendee",
        checkedIn: true,
      }),
    ]);
    expect(prisma.eventParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: [
              EventParticipantStatus.accepted,
              EventParticipantStatus.attended,
            ],
          },
        }),
      }),
    );
  });
});
