import { ContactsService } from "./contacts.service";

describe("ContactsService", () => {
  const prisma = {
    user: { findMany: jest.fn(), findUnique: jest.fn() },
    userInterestTag: { findMany: jest.fn() },
    contactInvite: { create: jest.fn().mockResolvedValue({}) },
  };
  const mail = {
    sendContactInviteEmail: jest.fn().mockResolvedValue(undefined),
  };
  const sms = { sendContactInvite: jest.fn().mockResolvedValue(undefined) };
  const service = new ContactsService(
    prisma as never,
    mail as never,
    sms as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it("searches only discoverable members without exposing email or phone", async () => {
    prisma.user.findMany.mockResolvedValue([{ id: "member-1", name: "Ada", username: "ada", accountType: "individual", city: "Istanbul", country: "TR", followerCount: 4, followers: [], interestTags: [{ tagId: "tag-1" }] }]);
    prisma.userInterestTag.findMany.mockResolvedValue([{ tagId: "tag-1" }]);
    await expect(service.search("me", { query: "ada", type: "name" })).resolves.toEqual([expect.objectContaining({ id: "member-1", commonTagCount: 1 })]);
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ privacySettings: { directoryDiscoverable: true } }) }));
  });

  it("searches only by username in an event or place invite flow", async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.userInterestTag.findMany.mockResolvedValue([]);

    await service.search("me", { query: "@ece", type: "username" });

    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ username: { contains: "ece", mode: "insensitive" } }),
    }));
    expect(prisma.user.findMany.mock.calls[0][0].where).not.toHaveProperty("OR");
  });

  it("returns only discoverable database matches and keeps other contacts as invitees", async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: "member-1",
        name: "Ada",
        username: "ada",
        accountType: "individual",
        city: "Istanbul",
        country: "TR",
        followerCount: 4,
        email: "ada@example.com",
        phone: null,
        followers: [],
        interestTags: [{ tagId: "tag-1" }],
      },
    ]);
    prisma.userInterestTag.findMany.mockResolvedValue([{ tagId: "tag-1" }]);
    const result = await service.import("me", {
      source: "phone",
      contacts: [
        { name: "Ada L.", email: "ADA@example.com" },
        { name: "Mert", phone: "+90 555 111 22 33" },
      ],
    });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          privacySettings: { directoryDiscoverable: true },
        }),
      }),
    );
    expect(result.matches[0]?.member.commonTagCount).toBe(1);
    expect(result.invitees).toEqual([
      { name: "Mert", phone: "+905551112233", email: undefined },
    ]);
  });

  it("sends email and sms invites while storing only recipient hashes", async () => {
    prisma.user.findUnique.mockResolvedValue({ name: "Kadir" });
    const result = await service.invite("me", {
      contacts: [
        { name: "Ada", email: "ada@example.com" },
        { name: "Mert", phone: "+905551112233" },
      ],
    });
    expect(result.invitedCount).toBe(2);
    expect(mail.sendContactInviteEmail).toHaveBeenCalled();
    expect(sms.sendContactInvite).toHaveBeenCalled();
    expect(prisma.contactInvite.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recipientHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    });
  });
});
