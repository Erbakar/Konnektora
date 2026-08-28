import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
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
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      eventTag: { findMany: jest.fn(), count: jest.fn() },
      tag: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      userBlock: { findMany: jest.fn() },
      user: { findUnique: jest.fn(), create: jest.fn() },
      userFollow: { count: jest.fn() },
      guestList: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
      guestListMember: { upsert: jest.fn(), deleteMany: jest.fn() },
      eventInvitation: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
      placeInvitation: { findMany: jest.fn() },
      placeMember: { findUnique: jest.fn() },
      eventTicketOrder: { findMany: jest.fn(), update: jest.fn() },
      financialAccount: { findUnique: jest.fn(), update: jest.fn() },
      paymentTransaction: { update: jest.fn() },
      ticketRefund: { create: jest.fn() },
      ownedEventTicket: { updateMany: jest.fn() },
      eventTicketType: { update: jest.fn() },
      eventParticipant: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (operation: unknown) =>
      typeof operation === "function"
        ? (operation as (tx: typeof prisma) => Promise<unknown>)(prisma)
        : Promise.all(operation as Promise<unknown>[]),
    );
    const mailService = {
      sendEventInviteEmail: jest.fn(),
    };
    const authService = {
      createInviteAcceptToken: jest.fn(),
    };
    const notifications = {
      dispatch: jest.fn(),
    };
    const smsService = {
      sendEventInvite: jest.fn(),
    };

    return {
      service: new EventsService(
        prisma as never,
        mailService as never,
        authService as never,
        notifications as never,
        smsService as never,
      ),
      prisma,
      notifications,
      smsService,
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

  it("returns full editable event data for managers", async () => {
    const { service, prisma } = createService();
    prisma.event.findMany.mockResolvedValue([{
      id: "event-1",
      title: "Community Night",
      slug: "community-night-420001",
      price: 0,
      startsAt: new Date("2026-09-01T18:00:00.000Z"),
      endsAt: new Date("2026-09-01T21:00:00.000Z"),
      latitude: null,
      longitude: null,
      tags: [],
      ticketTypeRecords: [{ id: "ticket-1", name: "General", description: null, price: 0, currency: "TRY", salesPlatform: "door", externalSalesUrl: null, capacity: 100, perUserLimit: null, saleStartsAt: null, saleEndsAt: null, gateOpensAt: null, gateClosesAt: null, status: "active" }],
    }]);

    const result = await service.listManagedEvents(actor as never);

    expect(prisma.event.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ ticketTypeRecords: expect.any(Object) }),
    }));
    expect(result[0]).toEqual(expect.objectContaining({ ticketTypes: [expect.objectContaining({ name: "General" })] }));
  });

  it("turns programme session titles into event tags", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue(null);
    prisma.tag.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "tag-existing", status: "active" });
    prisma.tag.create.mockResolvedValue({ id: "tag-created" });
    prisma.event.create.mockResolvedValue({
      id: "event-1",
      title: "Programme event",
      slug: "programme-event-123456",
      price: 0,
      startsAt: new Date("2026-09-01T18:00:00.000Z"),
      endsAt: null,
      latitude: null,
      longitude: null,
      tags: [],
      participants: [],
      _count: { participants: 0 },
    });

    await service.createEvent({
      title: "Programme event",
      summary: "Programme event summary",
      description: "Programme event description",
      startsAt: "2026-09-01T18:00:00.000Z",
      format: "offline",
      lineup: [
        { type: "session", title: "New Artist" },
        { type: "session", title: "Existing Artist" },
        { type: "heading", title: "Day One" },
      ],
    } as never, actor.id);

    expect(prisma.tag.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: "New Artist", slug: "new-artist" }) }));
    expect(prisma.event.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tags: { create: [
          { tagId: "tag-created", sortOrder: 0 },
          { tagId: "tag-existing", sortOrder: 1 },
        ] },
      }),
    }));
  });

  it("lets elevated roles load all events in the editor", async () => {
    const { service, prisma } = createService();
    prisma.event.findMany.mockResolvedValue([]);

    await service.listManagedEvents({ ...actor, role: "admin" } as never);

    expect(prisma.event.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it("accepts all pending attendance requests when an event becomes open", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue({ visibility: "approval_required" });
    prisma.eventTag.findMany.mockResolvedValue([]);
    prisma.event.update.mockResolvedValue({
      id: "event-1",
      visibility: "open",
      startsAt: new Date("2026-09-01T18:00:00.000Z"),
      endsAt: null,
      price: 0,
      latitude: null,
      longitude: null,
      tags: [],
    });

    await service.updateManagedEvent(
      "event-1",
      { visibility: "open" },
      { ...actor, role: "admin" } as never,
    );

    expect(prisma.eventParticipant.updateMany).toHaveBeenCalledWith({
      where: { eventId: "event-1", status: EventParticipantStatus.requested },
      data: { status: EventParticipantStatus.accepted },
    });
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
      { id: "participant-1", userId: "user-2", createdAt: new Date(), user: { id: "user-2", name: "User 2", followerCount: 7, _count: { followers: 2 }, ownedTickets: [], uploadedMedia: [] } },
    ]);

    await expect(
      service.listParticipants("event-1", actor as never),
    ).resolves.toEqual([expect.objectContaining({ id: "participant-1", joinOrder: 1, user: expect.objectContaining({ id: "user-2", name: "User 2", avatarUrl: null, followerCount: 7, relatedFollowerCount: 2 }), tickets: [] })]);

    prisma.eventParticipant.findUnique.mockResolvedValue({
      role: EventParticipantRole.manager,
      status: EventParticipantStatus.accepted,
    });

    await expect(
      service.listParticipants("event-1", actor as never),
    ).resolves.toEqual([expect.objectContaining({ id: "participant-1", joinOrder: 1, user: expect.objectContaining({ id: "user-2", name: "User 2", avatarUrl: null, followerCount: 7, relatedFollowerCount: 2 }), tickets: [] })]);
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

  it("falls back from city to country and then global popular events", async () => {
    const { service, prisma } = createService();
    prisma.event.count.mockResolvedValue(0);
    prisma.event.findMany.mockResolvedValue([]);

    await service.listPublicEvents({ scope: "popular", city: "Istanbul", country: "Türkiye" });

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ city: expect.anything(), country: expect.anything() }),
        orderBy: [{ participants: { _count: "desc" } }, { startsAt: "asc" }],
      }),
    );
  });

  it("returns attendee, invited and followed-attendee counts for event cards", async () => {
    const { service, prisma } = createService();
    prisma.userBlock.findMany.mockResolvedValue([]);
    prisma.event.count.mockResolvedValue(1);
    prisma.event.findMany.mockResolvedValue([{
      id: "event-1",
      title: "Community Night",
      price: 0,
      startsAt: new Date("2027-01-10T18:00:00.000Z"),
      endsAt: null,
      latitude: null,
      longitude: null,
      tags: [],
      participants: [
        { status: "accepted", userId: "friend-1", user: { followers: [{ followerId: actor.id }] } },
        { status: "attended", userId: "member-2", user: { followers: [] } },
        { status: "invited", userId: "member-3", user: { followers: [] } },
      ],
      _count: { participants: 2 },
    }]);

    const result = await service.listPublicEvents({}, actor.id);

    expect(result.items[0]).toEqual(expect.objectContaining({ attendeeCount: 2, invitedCount: 1, followingAttendeeCount: 1 }));
    expect(result.items[0]).not.toHaveProperty("participants");
  });

  it("scores individual events by interests, network, location and time", async () => {
    const { service, prisma } = createService();
    prisma.userBlock.findMany.mockResolvedValue([]);
    const base = {
      price: 0,
      endsAt: null,
      latitude: null,
      longitude: null,
      _count: { participants: 1 },
    };
    prisma.event.count.mockResolvedValue(2);
    prisma.user.findUnique.mockResolvedValue({
      city: "Istanbul",
      country: "Türkiye",
      interestTags: [{ tagId: "tag-match" }],
      following: [{ followingId: "friend-1" }],
    });
    prisma.event.findMany.mockResolvedValue([
      {
        ...base,
        id: "near-unrelated",
        title: "Yakın ama ilgisiz",
        startsAt: new Date(Date.now() + 86_400_000),
        city: "Ankara",
        country: "Türkiye",
        tags: [],
        participants: [],
      },
      {
        ...base,
        id: "matched",
        title: "Kişisel eşleşme",
        startsAt: new Date(Date.now() + 5 * 86_400_000),
        city: "Istanbul",
        country: "Türkiye",
        tags: [{ tagId: "tag-match", tag: { id: "tag-match", name: "Startup" } }],
        participants: [{ userId: "friend-1" }],
      },
    ]);

    const result = await service.listPublicEvents({ scope: "individual", pageSize: 15 }, actor.id);

    expect(result.items.map((item) => item.id)).toEqual(["matched", "near-unrelated"]);
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
    prisma.event.findUnique
      .mockResolvedValueOnce({ createdById: actor.id })
      .mockResolvedValueOnce({ startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 60_000) });
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
        status: "published",
        startsAt: new Date(Date.now() + 60_000),
        endsAt: new Date(Date.now() + 3_600_000),
        participants: [],
      });
    prisma.user.findUnique.mockResolvedValue({
      id: "manager-1",
      username: "ayse",
      email: "ayse@example.com",
      name: "Ayşe",
      status: "active",
    });
    prisma.eventParticipant.upsert.mockResolvedValue({ id: "participant-1" });
    prisma.eventInvitation.findUnique.mockResolvedValue(null);
    prisma.eventInvitation.create.mockResolvedValue({ id: "invitation-1" });

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

  it("blocks the same member from being invited to the same event twice by one inviter", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique
      .mockResolvedValueOnce({ createdById: actor.id })
      .mockResolvedValueOnce({ id: "event-1", title: "Community Night", slug: "community-night", status: "published", startsAt: new Date(Date.now() + 60_000), endsAt: new Date(Date.now() + 3_600_000), participants: [] });
    prisma.user.findUnique.mockResolvedValue({ id: "member-1", username: "member", email: "member@example.com", name: "Member", status: "active" });
    prisma.eventInvitation.findUnique.mockResolvedValue({ id: "invite-1" });

    await expect(service.inviteParticipant("event-1", { username: "member" }, actor as never)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.eventInvitation.create).not.toHaveBeenCalled();
    expect(prisma.eventParticipant.upsert).not.toHaveBeenCalled();
  });

  it("allows an accepted attendee to invite another member without assigning a management role", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique
      .mockResolvedValueOnce({ createdById: "owner-1" })
      .mockResolvedValueOnce({ id: "event-1", title: "Community Night", slug: "community-night", status: "published", startsAt: new Date(Date.now() + 60_000), endsAt: new Date(Date.now() + 3_600_000), participants: [{ status: EventParticipantStatus.accepted }] });
    prisma.eventParticipant.findUnique.mockResolvedValue({ role: EventParticipantRole.attendee, status: EventParticipantStatus.accepted });
    prisma.user.findUnique.mockResolvedValue({ id: "member-2", username: "guest", email: "guest@example.com", name: "Guest", status: "active" });
    prisma.eventInvitation.findUnique.mockResolvedValue(null);
    prisma.eventParticipant.upsert.mockResolvedValue({ id: "participant-2" });

    await service.inviteParticipant("event-1", { username: "guest" }, actor as never);

    expect(prisma.eventParticipant.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ role: EventParticipantRole.attendee }) }));
  });

  it("rejects event invitations from a user who is neither a participant nor an invitee", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique
      .mockResolvedValueOnce({ createdById: "owner-1" })
      .mockResolvedValueOnce({ id: "event-1", title: "Community Night", slug: "community-night", status: "published", startsAt: new Date(Date.now() + 60_000), endsAt: new Date(Date.now() + 3_600_000), participants: [] });
    prisma.eventParticipant.findUnique.mockResolvedValue(null);

    await expect(service.inviteParticipant("event-1", { username: "guest" }, actor as never)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("creates an invited account and sends SMS for a non-member phone invite", async () => {
    const { service, prisma, smsService } = createService();
    const external = { id: "phone-user-1", email: "phone-hash@invite.konnektora.local", phone: "+905551112233", name: "+905551112233", status: "invited" };
    prisma.event.findUnique
      .mockResolvedValueOnce({ createdById: actor.id })
      .mockResolvedValueOnce({ id: "event-1", title: "Community Night", slug: "community-night", status: "published", startsAt: new Date(Date.now() + 60_000), endsAt: new Date(Date.now() + 3_600_000), participants: [] });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(external);
    prisma.eventParticipant.upsert.mockResolvedValue({ id: "participant-1", user: external });

    await service.inviteParticipant("event-1", { phone: "+90 555 111 22 33" }, actor as never);

    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ phone: "+905551112233", status: "invited" }) }));
    expect(smsService.sendEventInvite).toHaveBeenCalledWith("+905551112233", actor.name, "Community Night", "community-night", undefined);
  });

  it("closes check-in 12 hours after an explicit event end", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique
      .mockResolvedValueOnce({ createdById: actor.id })
      .mockResolvedValueOnce({ startsAt: new Date(Date.now() - 48 * 60 * 60 * 1000), endsAt: new Date(Date.now() - 13 * 60 * 60 * 1000) });

    await expect(service.checkInParticipant("event-1", "member-1", actor as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.eventParticipant.update).not.toHaveBeenCalled();
  });

  it("closes check-in 24 hours after start when no end time exists", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique
      .mockResolvedValueOnce({ createdById: actor.id })
      .mockResolvedValueOnce({ startsAt: new Date(Date.now() - 25 * 60 * 60 * 1000), endsAt: null });

    await expect(service.checkInParticipant("event-1", "member-1", actor as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.eventParticipant.update).not.toHaveBeenCalled();
  });

  it("previews a QR passport without checking the participant in", async () => {
    const { service, prisma } = createService();
    const event = { id: "event-1", title: "Community Night" };
    prisma.event.findUnique
      .mockResolvedValueOnce({ createdById: actor.id })
      .mockResolvedValueOnce({ createdById: actor.id })
      .mockResolvedValueOnce({ startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 60_000) });
    prisma.eventParticipant.findUnique
      .mockResolvedValueOnce({ eventId: "event-1", userId: "member-1" })
      .mockResolvedValueOnce({
        event,
        user: { id: "member-1", email: "member@example.com", name: "Member", username: "member", role: "user", status: "active", accountType: "individual", followerCount: 4, profileVerifiedAt: null, uploadedMedia: [], ownedTickets: [] },
        status: EventParticipantStatus.accepted,
        role: EventParticipantRole.attendee,
        checkedInAt: null,
        checkInOrder: null,
        checkInMethod: null,
      });
    prisma.eventInvitation.findMany.mockResolvedValue([]);
    prisma.guestList.findMany.mockResolvedValue([]);
    prisma.userFollow.count.mockResolvedValue(0);

    await expect(service.previewCheckInWithTicket("event-1", "ticket", "qr", actor as never)).resolves.toEqual(expect.objectContaining({ alreadyInside: false, checkInMethod: "qr" }));
    expect(prisma.eventParticipant.update).not.toHaveBeenCalled();
  });

  it("records the operator decision, method and entrance order", async () => {
    const { service, prisma, notifications } = createService();
    prisma.event.findUnique
      .mockResolvedValueOnce({ createdById: actor.id })
      .mockResolvedValueOnce({ startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 60_000) });
    prisma.eventParticipant.findUnique.mockResolvedValue({ status: EventParticipantStatus.accepted, event: { title: "Community Night" } });
    prisma.eventParticipant.count.mockResolvedValue(2);
    prisma.eventParticipant.update.mockResolvedValue({ id: "participant-1", status: EventParticipantStatus.attended });

    await service.decideCheckInPassport("event-1", "member-1", { decision: "admit", method: "nfc" }, actor as never);
    expect(prisma.eventParticipant.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: EventParticipantStatus.attended, checkInMethod: "nfc", checkInOrder: 3, checkedInAt: expect.any(Date) }) }));
    expect(notifications.dispatch).toHaveBeenCalledWith(expect.objectContaining({ userId: "member-1", type: "event_check_in_admitted" }));
  });

  it("refunds an eligible paid Konnektora ticket when entry is declined", async () => {
    const { service, prisma, notifications } = createService();
    prisma.event.findUnique
      .mockResolvedValueOnce({ createdById: actor.id })
      .mockResolvedValueOnce({ startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 60_000) });
    prisma.eventParticipant.findUnique.mockResolvedValue({ status: EventParticipantStatus.accepted, event: { title: "Community Night" } });
    prisma.eventTicketOrder.findMany.mockResolvedValue([{ id: "order-1", ticketTypeId: "type-1", quantity: 2, currency: "TRY", payment: { id: "payment-1", payeeId: actor.id, netAmount: 190, grossAmount: 200, provider: "sandbox" } }]);
    prisma.financialAccount.findUnique.mockResolvedValue({ availableBalance: 500 });
    prisma.eventParticipant.update.mockResolvedValue({ id: "participant-1", status: EventParticipantStatus.declined });

    await service.decideCheckInPassport("event-1", "member-1", { decision: "decline", method: "qr" }, actor as never);

    expect(prisma.paymentTransaction.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "payment-1" }, data: expect.objectContaining({ status: "refunded" }) }));
    expect(prisma.ownedEventTicket.updateMany).toHaveBeenCalledWith({ where: { orderId: "order-1" }, data: { status: "refunded" } });
    expect(notifications.dispatch).toHaveBeenCalledWith(expect.objectContaining({ body: expect.stringContaining("200 TRY bilet ücretiniz iade edildi") }));
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

  it("lets the event creator promote a participant to the owner role", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue({ createdById: actor.id });
    prisma.eventParticipant.findUnique.mockResolvedValue({ userId: "user-2", role: EventParticipantRole.attendee, status: EventParticipantStatus.accepted });
    prisma.eventParticipant.update.mockResolvedValue({ userId: "user-2", role: EventParticipantRole.manager, status: EventParticipantStatus.accepted });

    await service.updateParticipant("event-1", "user-2", { role: EventParticipantRole.manager }, actor as never);

    expect(prisma.eventParticipant.update).toHaveBeenCalledWith(expect.objectContaining({ data: { role: EventParticipantRole.manager } }));
  });

  it("keeps the stable numeric event code when the title changes", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue({ slug: "eski-etkinlik-482731" });
    await expect((service as any).uniqueSlug("Yeni Etkinlik", "event-1")).resolves.toBe("yeni-etkinlik-482731");
  });

  it("resolves a previous event address after its title changes", async () => {
    const { service, prisma } = createService();
    prisma.event.findFirst.mockResolvedValue({
      id: "event-1",
      slug: "yeni-etkinlik-482731",
      title: "Yeni Etkinlik",
      price: 0,
      startsAt: new Date("2026-08-27T18:00:00.000Z"),
      endsAt: null,
      latitude: null,
      longitude: null,
      tags: [],
      participants: [],
      _count: { participants: 0 },
    });

    await service.getPublicEvent("eski-etkinlik-482731");

    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { slug: "eski-etkinlik-482731" },
            { legacySlugs: { has: "eski-etkinlik-482731" } },
            { slug: { endsWith: "-482731" } },
          ]),
        }),
      }),
    );
  });
});
