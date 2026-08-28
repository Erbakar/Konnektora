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
    accountType: "corporate",
    businessPlan: "growth",
    memberPlan: "free",
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
      user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
      userInterestTag: { findMany: jest.fn() },
      userFollow: { count: jest.fn(), findMany: jest.fn() },
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

  it("ranks at most 25 transparent invite recommendations and excludes current or blocked users", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique
      .mockResolvedValueOnce({ createdById: actor.id })
      .mockResolvedValueOnce({
        id: "event-1",
        status: "published",
        startsAt: new Date("2027-09-01T18:00:00.000Z"),
        endsAt: new Date("2027-09-01T21:00:00.000Z"),
        city: "İstanbul",
        country: "Türkiye",
        tags: [{ tagId: "tag-1" }],
        participants: [{ userId: "participant-1" }],
        invitations: [{ inviteeId: "invited-1" }],
      });
    prisma.userFollow.findMany.mockResolvedValue([{ followingId: "candidate-best" }]);
    prisma.guestList.findMany.mockResolvedValue([{ members: [{ userId: "candidate-best" }] }]);
    prisma.event.findMany.mockResolvedValue([{ id: "past-event" }]);
    prisma.eventParticipant.findMany.mockResolvedValue([{ userId: "candidate-best" }]);
    prisma.userBlock.findMany.mockResolvedValue([{ userId: actor.id, targetId: "blocked-1" }]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: "candidate-country",
        name: "Country Match",
        username: "country",
        city: "Ankara",
        country: "Türkiye",
        followerCount: 1,
        lastOnlineAt: null,
        profileVerifiedAt: null,
        interestTags: [],
        uploadedMedia: [],
      },
      {
        id: "candidate-best",
        name: "Best Match",
        username: "best",
        city: "istanbul",
        country: "Türkiye",
        followerCount: 100,
        lastOnlineAt: new Date(),
        profileVerifiedAt: new Date(),
        interestTags: [{ tagId: "tag-1", sentiment: "like" }],
        uploadedMedia: [{ url: "/best.jpg" }],
      },
      ...Array.from({ length: 25 }, (_, index) => ({
        id: `candidate-${index}`,
        name: `Candidate ${index}`,
        username: `candidate-${index}`,
        city: null,
        country: null,
        followerCount: 0,
        lastOnlineAt: null,
        profileVerifiedAt: null,
        interestTags: [],
        uploadedMedia: [],
      })),
    ]);

    const result = await service.listInviteRecommendations("event-1", actor as never);

    expect(result).toHaveLength(25);
    expect(result[0]).toEqual(expect.objectContaining({
      id: "candidate-best",
      avatarUrl: "/best.jpg",
      sharedInterestCount: 1,
      reasons: expect.arrayContaining(["shared_interests", "same_city", "following", "past_attendee", "guest_list", "verified", "active_recently", "popular"]),
    }));
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: { notIn: expect.arrayContaining([actor.id, "participant-1", "invited-1", "blocked-1"]) },
      }),
      take: 500,
    }));
  });

  it("prevents another user from editing a named guest list", async () => {
    const { service, prisma } = createService();
    prisma.guestList.findUnique.mockResolvedValue({ ownerId: "another-user" });
    await expect(service.renameGuestList("list-1", "New name", actor as never)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.guestList.update).not.toHaveBeenCalled();
  });

  it("allows custom Guest Lists for a manager with an active paid event", async () => {
    const { service, prisma } = createService();
    const freeManager = { ...actor, accountType: "individual", businessPlan: "starter", memberPlan: "free" };
    prisma.event.findFirst.mockResolvedValue({ id: "paid-event" });
    prisma.guestList.findMany.mockResolvedValue([]);
    await expect(service.listGuestLists(freeManager as never)).resolves.toEqual([]);
    expect(prisma.event.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "published" }) }));
  });

  it("rejects custom Guest Lists without a qualifying plan or paid event", async () => {
    const { service, prisma } = createService();
    const freeMember = { ...actor, accountType: "individual", businessPlan: "starter", memberPlan: "free" };
    prisma.event.findFirst.mockResolvedValue(null);
    await expect(service.listGuestLists(freeMember as never)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.guestList.findMany).not.toHaveBeenCalled();
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

  it("sorts nearby events by real geographic distance", async () => {
    const { service, prisma } = createService();
    prisma.userInterestTag.findMany.mockResolvedValue([]);
    prisma.event.count.mockResolvedValue(2);
    const base = { price: 0, endsAt: null, tags: [], participants: [], _count: { participants: 0 } };
    prisma.event.findMany.mockResolvedValue([
      { ...base, id: "far", title: "Far", startsAt: new Date("2027-01-01"), latitude: 41.5, longitude: 29.5 },
      { ...base, id: "near", title: "Near", startsAt: new Date("2027-01-01"), latitude: 41.001, longitude: 29.001 },
    ]);

    const result = await service.listPublicEvents({ scope: "near", latitude: 41, longitude: 29, pageSize: 15 });

    expect(prisma.event.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 200 }));
    expect(result.items.map((item) => item.id)).toEqual(["near", "far"]);
  });

  it("builds My events from actual ticket ownership and keeps text search as an additional filter", async () => {
    const { service, prisma } = createService();
    prisma.userBlock.findMany.mockResolvedValue([]);
    prisma.event.count.mockResolvedValue(0);
    prisma.event.findMany.mockResolvedValue([]);

    await service.listPublicEvents({ scope: "mine", q: "startup" }, actor.id);

    const call = prisma.event.findMany.mock.calls[0][0];
    expect(call.where.AND).toEqual([
      {
        OR: [
          { title: { contains: "startup", mode: "insensitive" } },
          { summary: { contains: "startup", mode: "insensitive" } },
          { description: { contains: "startup", mode: "insensitive" } },
          { organizerName: { contains: "startup", mode: "insensitive" } },
        ],
      },
      {
        OR: [
          { createdById: actor.id },
          { participants: { some: { userId: actor.id, status: { in: ["accepted", "attended"] } } } },
          { ownedTickets: { some: { ownerId: actor.id, status: { in: ["active", "used"] } } } },
        ],
      },
    ]);
    expect(JSON.stringify(call.where)).not.toContain("ticketOrders");
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
        { status: "invited", userId: "member-3", user: { followers: [{ followerId: actor.id }] } },
      ],
      _count: { participants: 2 },
    }]);

    const result = await service.listPublicEvents({}, actor.id);

    expect(result.items[0]).toEqual(expect.objectContaining({ attendeeCount: 2, invitedCount: 1, followingAttendeeCount: 2 }));
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

  it("lists only invitations sent by the current visitor for Already invited grouping", async () => {
    const { service, prisma } = createService();
    prisma.eventInvitation.findMany.mockResolvedValue([{
      id: "invite-1",
      createdAt: new Date("2026-08-01T12:00:00Z"),
      invitee: { id: "member-2", name: "Ece", username: "ece", uploadedMedia: [{ url: "/ece.jpg" }] },
    }]);

    await expect(service.listSentInvitations("event-1", actor.id)).resolves.toEqual([{
      id: "member-2",
      name: "Ece",
      username: "ece",
      avatarUrl: "/ece.jpg",
      invitedAt: new Date("2026-08-01T12:00:00Z"),
    }]);
    expect(prisma.eventInvitation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { eventId: "event-1", inviterId: actor.id },
    }));
  });

  it("does not downgrade an accepted participant when another attendee sends an invitation", async () => {
    const { service, prisma } = createService();
    const invitee = { id: "member-2", email: "member@example.com", name: "Member", username: "member", status: "active" };
    prisma.event.findUnique.mockResolvedValue({
      id: "event-1",
      title: "Community Night",
      slug: "community-night",
      startsAt: new Date(Date.now() + 86_400_000),
      endsAt: null,
      status: "published",
      participants: [{ status: "accepted" }],
    });
    prisma.user.findUnique.mockResolvedValue(invitee);
    prisma.eventInvitation.findUnique.mockResolvedValue(null);
    prisma.eventParticipant.findUnique.mockResolvedValue({ status: EventParticipantStatus.accepted });
    prisma.eventParticipant.upsert.mockResolvedValue({ userId: invitee.id, status: "accepted" });

    await service.inviteParticipant("event-1", { userId: invitee.id }, actor as never);

    expect(prisma.eventInvitation.create).toHaveBeenCalled();
    expect(prisma.eventParticipant.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ status: undefined }),
    }));
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

  it("shows a member only the event invitations they sent", async () => {
    const { service, prisma } = createService();
    prisma.event.findFirst.mockResolvedValue({ id: "event-1", createdById: "owner-1", participants: [{ role: "attendee", status: "accepted" }] });
    prisma.eventInvitation.findMany.mockResolvedValue([{ inviteeId: "user-2" }]);
    prisma.eventParticipant.findMany.mockResolvedValue([]);
    prisma.userInterestTag.findMany.mockResolvedValue([]);

    await service.listRelatedUsers("event-1", actor as never);

    expect(prisma.eventInvitation.findMany).toHaveBeenCalledWith({
      where: { eventId: "event-1", inviterId: actor.id },
      select: { inviteeId: true },
    });
    expect(prisma.eventParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventId: "event-1",
          OR: [
            { status: { in: [EventParticipantStatus.accepted, EventParticipantStatus.attended] } },
            { status: EventParticipantStatus.invited, userId: { in: ["user-2"] } },
          ],
        },
      }),
    );
  });

  it("keeps declined and banned participants visible to event managers", async () => {
    const { service, prisma } = createService();
    prisma.event.findFirst.mockResolvedValue({ id: "event-1", createdById: actor.id, participants: [] });
    prisma.eventParticipant.findMany.mockResolvedValue([]);
    prisma.userInterestTag.findMany.mockResolvedValue([]);

    await service.listRelatedUsers("event-1", actor as never);

    expect(prisma.eventParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: expect.arrayContaining([
              EventParticipantStatus.declined,
              EventParticipantStatus.banned,
            ]),
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

  it("prevents an organiser from removing the event owner role", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique
      .mockResolvedValueOnce({ createdById: "creator-1" })
      .mockResolvedValueOnce({ createdById: "creator-1" });
    prisma.eventParticipant.findUnique
      .mockResolvedValueOnce({ userId: actor.id, role: EventParticipantRole.organizer, status: EventParticipantStatus.accepted })
      .mockResolvedValueOnce({ userId: "owner-2", role: EventParticipantRole.manager, status: EventParticipantStatus.accepted });

    await expect(service.updateParticipant("event-1", "owner-2", { role: EventParticipantRole.attendee }, actor as never)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.eventParticipant.update).not.toHaveBeenCalled();
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
