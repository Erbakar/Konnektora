import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { PlaceMemberRole, PlaceMemberStatus } from "@prisma/client";
import { PlacesService } from "./places.service";

describe("PlacesService", () => {
  const place = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const placeMember = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
  };
  const placeInvitation = { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() };
  const placeFollow = {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };
  const user = { findFirst: jest.fn(), create: jest.fn() };
  const userBlock = { findMany: jest.fn(), findUnique: jest.fn() };
  const privacySettings = { findUnique: jest.fn() };
  const userFollow = { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() };
  const userInterestTag = { findMany: jest.fn() };
  const guestList = { findMany: jest.fn() };
  const notification = { create: jest.fn() };
  const notifications = { dispatch: jest.fn() };
  const tx = { place, placeMember, placeFollow, notification };
  const prisma = {
    place,
    placeMember,
    placeInvitation,
    placeFollow,
    user,
    userBlock,
    privacySettings,
    userFollow,
    userInterestTag,
    guestList,
    notification,
    $transaction: jest.fn(async (operation: unknown) =>
      typeof operation === "function"
        ? operation(tx)
        : Promise.all(operation as Promise<unknown>[]),
    ),
  };
  const identity = { resolveMemberPass: jest.fn() };
  const auth = { createInviteAcceptToken: jest.fn() };
  const mail = { sendPlaceInviteEmail: jest.fn() };
  const sms = { sendPlaceInvite: jest.fn() };
  const service = new PlacesService(
    prisma as never,
    notifications as never,
    identity as never,
    auth as never,
    mail as never,
    sms as never,
  );
  const actor = {
    id: "11111111-1111-4111-8111-111111111111",
    role: "user",
    name: "Owner",
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    userBlock.findMany.mockResolvedValue([]);
    userBlock.findUnique.mockResolvedValue(null);
    privacySettings.findUnique.mockResolvedValue(null);
    userFollow.findMany.mockResolvedValue([]);
    userFollow.findFirst.mockResolvedValue(null);
    place.findUnique.mockResolvedValue(null);
    place.findFirst.mockResolvedValue(null);
    placeMember.count.mockResolvedValue(0);
    placeInvitation.findUnique.mockResolvedValue(null);
    placeInvitation.findMany.mockResolvedValue([]);
    guestList.findMany.mockResolvedValue([]);
    userFollow.count.mockResolvedValue(0);
    userInterestTag.findMany.mockResolvedValue([]);
  });

  it("creates the owner as an accepted organizer", async () => {
    place.create.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      slug: "studio",
      name: "Studio",
    });
    placeMember.create.mockResolvedValue({});
    place.findUnique.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
    });
    place.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "22222222-2222-4222-8222-222222222222" }).mockResolvedValueOnce({
      id: "22222222-2222-4222-8222-222222222222",
      slug: "studio",
      name: "Studio",
      followers: [],
      members: [{ status: "accepted", role: "organizer" }],
    });

    await service.create({ name: "Studio", tagIds: ["tag-b", "tag-a"] }, actor);

    expect(placeMember.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: actor.id,
        status: "accepted",
        role: "organizer",
      }),
    });
    expect(place.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tags: { create: [
          { tagId: "tag-b", sortOrder: 0 },
          { tagId: "tag-a", sortOrder: 1 },
        ] },
      }),
    }));
  });

  it("accepts pending members when an approval-required place becomes open", async () => {
    place.findUnique.mockResolvedValue({
      id: "place-1",
      name: "Studio",
      slug: "studio-310001",
      legacySlugs: [],
      visibility: "approval_required",
      createdById: actor.id,
      members: [],
    });
    place.update.mockResolvedValue({ id: "place-1", slug: "studio-310001" });
    place.findFirst
      .mockResolvedValueOnce({ id: "place-1" })
      .mockResolvedValueOnce({
        id: "place-1",
        name: "Studio",
        slug: "studio-310001",
        status: "active",
        latitude: null,
        longitude: null,
        followers: [],
        members: [],
        tags: [],
        _count: { members: 0, followers: 0, events: 0 },
      });
    placeMember.findMany.mockResolvedValue([]);

    await service.update("place-1", { visibility: "open" }, actor);

    expect(placeMember.updateMany).toHaveBeenCalledWith({
      where: { placeId: "place-1", status: "pending" },
      data: { status: "accepted" },
    });
  });

  it("keeps follow requests idempotent", async () => {
    place.findFirst.mockResolvedValue({ id: "place-1" });
    placeFollow.findUnique.mockResolvedValue({
      placeId: "place-1",
      userId: "user-1",
    });

    await expect(service.follow("place-1", "user-1")).resolves.toEqual({
      following: true,
    });
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
    expect(place.update).toHaveBeenCalledWith({
      where: { id: "place-1" },
      data: { followerCount: { increment: 1 } },
    });
  });

  it("prevents a manager from changing member roles", async () => {
    place.findUnique.mockResolvedValue({
      id: "place-1",
      createdById: "owner-1",
      members: [{ role: "manager" }],
    });
    placeMember.findUnique.mockResolvedValue({
      placeId: "place-1",
      userId: "member-1",
      role: "member",
      status: "accepted",
    });

    await expect(
      service.updateMember("place-1", "member-1", { role: "manager" }, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("only accepts accepted or declined invitation responses", async () => {
    await expect(
      service.respondToInvite("place-1", PlaceMemberStatus.banned, "user-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("checks in only an accepted place member", async () => {
    place.findUnique.mockResolvedValue({
      id: "place-1",
      createdById: actor.id,
      members: [],
    });
    placeMember.findUnique.mockResolvedValue({
      placeId: "place-1",
      userId: "member-1",
      status: "accepted",
    });
    placeMember.update.mockResolvedValue({
      placeId: "place-1",
      userId: "member-1",
      checkedInAt: new Date(),
    });
    await service.checkInMember("place-1", "member-1", actor);
    expect(placeMember.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ checkedInAt: expect.any(Date) }) }),
    );
  });

  it("creates a member invitation and notification atomically", async () => {
    const invitedUser = {
      id: "33333333-3333-4333-8333-333333333333",
      email: "member@example.com",
      name: "Member",
      role: "user",
      status: "active",
    };
    place.findUnique.mockResolvedValue({
      id: "place-1",
      name: "Hub",
      createdById: actor.id,
      members: [],
    });
    user.findFirst.mockResolvedValue(invitedUser);
    placeMember.findUnique.mockResolvedValue(null);
    placeMember.upsert.mockResolvedValue({
      placeId: "place-1",
      userId: invitedUser.id,
      status: "invited",
      role: "member",
    });
    place.update.mockResolvedValue({});

    await service.invite("place-1", { email: invitedUser.email }, actor);

    expect(notifications.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: invitedUser.id,
        type: "place_invite",
        targetId: "place-1",
      }),
    );
    expect(place.update).toHaveBeenCalledWith({
      where: { id: "place-1" },
      data: { inviteCount: { increment: 1 } },
    });
  });

  it("blocks a duplicate place invitation from the same inviter", async () => {
    const invitedUser = { id: "33333333-3333-4333-8333-333333333333", email: "member@example.com", name: "Member", role: "user", status: "active" };
    place.findUnique.mockResolvedValue({ id: "place-1", name: "Hub", createdById: actor.id, members: [] });
    user.findFirst.mockResolvedValue(invitedUser);
    placeInvitation.findUnique.mockResolvedValue({ id: "invite-1" });

    await expect(service.invite("place-1", { userId: invitedUser.id }, actor)).rejects.toBeInstanceOf(ConflictException);
    expect(placeInvitation.create).not.toHaveBeenCalled();
    expect(placeMember.upsert).not.toHaveBeenCalled();
  });

  it("lists only invitations sent by the current visitor for Already invited grouping", async () => {
    placeInvitation.findMany.mockResolvedValue([{
      id: "invite-1",
      createdAt: new Date("2026-08-02T12:00:00Z"),
      invitee: { id: "member-2", name: "Ece", username: "ece", uploadedMedia: [{ url: "/ece.jpg" }] },
    }]);

    await expect(service.listSentInvitations("place-1", actor.id)).resolves.toEqual([{
      id: "member-2",
      name: "Ece",
      username: "ece",
      avatarUrl: "/ece.jpg",
      invitedAt: new Date("2026-08-02T12:00:00Z"),
    }]);
    expect(placeInvitation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { placeId: "place-1", inviterId: actor.id },
    }));
  });

  it("rejects an existing active member before writing an orphan invitation record", async () => {
    const invitedUser = { id: "33333333-3333-4333-8333-333333333333", email: "member@example.com", name: "Member", role: "user", status: "active" };
    place.findUnique.mockResolvedValue({ id: "place-1", name: "Hub", createdById: actor.id, members: [] });
    user.findFirst.mockResolvedValue(invitedUser);
    placeMember.findUnique.mockResolvedValue({ status: PlaceMemberStatus.accepted });

    await expect(service.invite("place-1", { userId: invitedUser.id }, actor)).rejects.toBeInstanceOf(BadRequestException);

    expect(placeInvitation.findUnique).not.toHaveBeenCalled();
    expect(placeInvitation.create).not.toHaveBeenCalled();
    expect(placeMember.upsert).not.toHaveBeenCalled();
  });

  it("creates an invited account and emails a non-member place invite", async () => {
    const external = { id: "44444444-4444-4444-8444-444444444444", email: "new@example.com", name: "New", role: "user", status: "invited" };
    place.findUnique.mockResolvedValue({ id: "place-1", name: "Hub", slug: "hub", createdById: actor.id, members: [] });
    user.findFirst.mockResolvedValue(null);
    user.create.mockResolvedValue(external);
    placeMember.findUnique.mockResolvedValue(null);
    placeMember.upsert.mockResolvedValue({ placeId: "place-1", userId: external.id, status: "invited", role: "member" });
    place.update.mockResolvedValue({});
    auth.createInviteAcceptToken.mockResolvedValue("accept-token");

    await service.invite("place-1", { email: external.email, name: external.name }, actor);
    expect(user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: external.email, status: "invited" }) }));
    expect(mail.sendPlaceInviteEmail).toHaveBeenCalledWith(expect.objectContaining({ to: external.email, placeSlug: "hub", acceptToken: "accept-token" }));
  });

  it("creates an invited account and sends SMS for a non-member phone invite", async () => {
    const external = { id: "phone-user-1", email: "phone-hash@invite.konnektora.local", phone: "+905551112233", name: "+905551112233", role: "user", status: "invited" };
    place.findUnique.mockResolvedValue({ id: "place-1", name: "Hub", slug: "hub", createdById: actor.id, members: [] });
    user.findFirst.mockResolvedValue(null);
    user.create.mockResolvedValue(external);
    placeMember.findUnique.mockResolvedValue(null);
    placeMember.upsert.mockResolvedValue({ placeId: "place-1", userId: external.id, status: "invited", role: "member" });
    place.update.mockResolvedValue({});
    auth.createInviteAcceptToken.mockResolvedValue("accept-token");

    await service.invite("place-1", { phone: "+90 555 111 22 33" }, actor);

    expect(user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ phone: "+905551112233", status: "invited" }) }));
    expect(sms.sendPlaceInvite).toHaveBeenCalledWith("+905551112233", actor.name, "Hub", "hub", "accept-token");
  });

  it("lets an accepted member invite another member without assigning a manager role", async () => {
    const invitedUser = { id: "55555555-5555-4555-8555-555555555555", email: "peer@example.com", name: "Peer", role: "user", status: "active" };
    place.findUnique.mockResolvedValue({ id: "place-1", name: "Hub", slug: "hub", createdById: "owner-1", members: [{ role: "member" }] });
    user.findFirst.mockResolvedValue(invitedUser);
    placeMember.findUnique.mockResolvedValue(null);
    placeMember.upsert.mockResolvedValue({ placeId: "place-1", userId: invitedUser.id, status: "invited", role: "member" });
    place.update.mockResolvedValue({});

    await service.invite("place-1", { userId: invitedUser.id, role: PlaceMemberRole.organizer }, actor);
    expect(placeMember.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ role: PlaceMemberRole.member }) }));
  });

  it("previews a member passport without completing check-in", async () => {
    identity.resolveMemberPass.mockResolvedValue("member-1");
    place.findUnique.mockResolvedValue({ id: "place-1", createdById: actor.id, members: [] });
    placeMember.findUnique.mockResolvedValue({
      place: { id: "place-1", name: "Hub" },
      user: { id: "member-1", email: "member@example.com", name: "Member", username: "member", role: "user", status: "active", accountType: "individual", followerCount: 2, profileVerifiedAt: null, uploadedMedia: [] },
      status: PlaceMemberStatus.accepted,
      role: "member",
      checkedInAt: null,
      checkInOrder: null,
      checkInMethod: null,
    });

    await expect(service.previewMemberPass("place-1", "signed-pass", "nfc", actor)).resolves.toEqual(expect.objectContaining({ alreadyInside: false, checkInMethod: "nfc" }));
    expect(placeMember.update).not.toHaveBeenCalled();
  });

  it("records a place entrance decision and notifies the member", async () => {
    place.findUnique.mockResolvedValue({ id: "place-1", createdById: actor.id, members: [] });
    placeMember.findUnique.mockResolvedValue({ checkedInAt: null, place: { name: "Hub" } });
    placeMember.count.mockResolvedValue(5);
    placeMember.update.mockResolvedValue({ placeId: "place-1", userId: "member-1", status: PlaceMemberStatus.accepted });

    await service.decideCheckInPassport("place-1", "member-1", { decision: "admit", method: "qr" }, actor);
    expect(placeMember.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ checkInMethod: "qr", checkInOrder: 6, checkedInAt: expect.any(Date) }) }));
    expect(notifications.dispatch).toHaveBeenCalledWith(expect.objectContaining({ userId: "member-1", type: "place_check_in_admitted" }));
  });

  it("respects the recipient's place invitation privacy", async () => {
    const invitedUser = {
      id: "33333333-3333-4333-8333-333333333333",
      email: "private@example.com",
      name: "Private",
      role: "user",
      status: "active",
    };
    place.findUnique.mockResolvedValue({
      id: "place-1",
      name: "Hub",
      createdById: actor.id,
      members: [],
    });
    user.findFirst.mockResolvedValue(invitedUser);
    privacySettings.findUnique.mockResolvedValue({
      placeInviteAudience: "following",
    });
    userFollow.findMany.mockResolvedValue([]);

    await expect(
      service.invite("place-1", { userId: invitedUser.id }, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(placeMember.upsert).not.toHaveBeenCalled();
  });

  it("checks in a signed member pass through the place control screen", async () => {
    identity.resolveMemberPass.mockResolvedValue("member-1");
    place.findUnique.mockResolvedValue({
      id: "place-1",
      createdById: actor.id,
      members: [],
    });
    placeMember.findUnique.mockResolvedValue({
      placeId: "place-1",
      userId: "member-1",
      status: PlaceMemberStatus.accepted,
    });
    placeMember.update.mockResolvedValue({
      placeId: "place-1",
      userId: "member-1",
      checkedInAt: new Date(),
    });

    await service.checkInMemberPass("place-1", "signed-member-pass", actor);
    expect(identity.resolveMemberPass).toHaveBeenCalledWith(
      "signed-member-pass",
    );
    expect(placeMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { placeId_userId: { placeId: "place-1", userId: "member-1" } },
      }),
    );
  });

  it("keeps the stable numeric place code when the name changes", async () => {
    place.findUnique.mockResolvedValue({ slug: "eski-mekan-731482" });
    await expect((service as any).uniqueSlug("Yeni Mekân", "place-1")).resolves.toBe("yeni-mekan-731482");
  });

  it("shows a regular visitor only accepted members and people they invited", async () => {
    place.findFirst.mockResolvedValue({ id: "place-1", createdById: "owner-1" });
    placeMember.findFirst.mockResolvedValue(null);
    placeInvitation.findMany.mockResolvedValue([{ inviteeId: "my-invite-1" }]);
    placeMember.findMany.mockResolvedValue([]);

    await service.listRelatedUsers("place-1", actor);

    expect(placeInvitation.findMany).toHaveBeenCalledWith({
      where: { placeId: "place-1", inviterId: actor.id },
      select: { inviteeId: true },
    });
    expect(placeMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          placeId: "place-1",
          OR: [
            { status: PlaceMemberStatus.accepted },
            {
              status: PlaceMemberStatus.invited,
              userId: { in: ["my-invite-1"] },
            },
          ],
        },
      }),
    );
  });

  it("shows all membership states to a place manager", async () => {
    place.findFirst.mockResolvedValue({ id: "place-1", createdById: actor.id });
    placeMember.findFirst.mockResolvedValue(null);
    placeMember.findMany.mockResolvedValue([]);

    await service.listRelatedUsers("place-1", actor);

    expect(placeInvitation.findMany).not.toHaveBeenCalled();
    expect(placeMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { placeId: "place-1" } }),
    );
  });

  it("resolves a previous place address after its name changes", async () => {
    place.findFirst
      .mockResolvedValueOnce({ id: "place-1" })
      .mockResolvedValueOnce({
        id: "place-1",
        slug: "yeni-mekan-731482",
        name: "Yeni Mekân",
        status: "active",
        latitude: null,
        longitude: null,
        followers: [],
        members: [],
        tags: [],
        events: [],
        _count: { followers: 0 },
      });
    placeMember.findMany.mockResolvedValue([]);

    await service.getBySlug("eski-mekan-731482");

    expect(place.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([
            { slug: "eski-mekan-731482" },
            { legacySlugs: { has: "eski-mekan-731482" } },
            { slug: { endsWith: "-731482" } },
          ]),
        },
      }),
    );
  });
});
