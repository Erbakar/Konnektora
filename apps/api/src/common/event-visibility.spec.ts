import { hiddenEventAccessWhere, isInvitationOnlyVisibility, visibleEventWhere } from "./event-visibility";

describe("17/10 #14 hidden event visibility filter", () => {
  const db = (role?: string) => ({ user: { findUnique: jest.fn().mockResolvedValue(role ? { role } : null) } });

  it("hides hidden events from anonymous visitors", async () => {
    await expect(visibleEventWhere(db(), undefined)).resolves.toEqual({ OR: [{ visibility: { not: "hidden" } }] });
  });

  it("lets founders, participants, invitees and ticket owners see their hidden events", () => {
    expect(hiddenEventAccessWhere("viewer")).toEqual({
      OR: [
        { visibility: { not: "hidden" } },
        { createdById: "viewer" },
        { participants: { some: { userId: "viewer", status: { not: "banned" } } } },
        { invitations: { some: { inviteeId: "viewer" } } },
        { ownedTickets: { some: { ownerId: "viewer" } } },
      ],
    });
  });

  it.each(["admin", "super_admin", "curator"])("applies no restriction for %s", async (role) => {
    await expect(visibleEventWhere(db(), { id: "staff", role })).resolves.toEqual({});
    const lookup = db(role);
    await expect(visibleEventWhere(lookup, "staff")).resolves.toEqual({});
    expect(lookup.user.findUnique).toHaveBeenCalledWith({ where: { id: "staff" }, select: { role: true } });
  });

  it("restricts ordinary members and survives a failing role lookup", async () => {
    await expect(visibleEventWhere(db("user"), "viewer")).resolves.toEqual(hiddenEventAccessWhere("viewer"));
    await expect(visibleEventWhere({ user: { findUnique: jest.fn().mockRejectedValue(new Error("db")) } }, "viewer")).resolves.toEqual(hiddenEventAccessWhere("viewer"));
  });

  it("treats hidden events as invitation-only for attendance", () => {
    expect(isInvitationOnlyVisibility("hidden")).toBe(true);
    expect(isInvitationOnlyVisibility("invite_only")).toBe(true);
    expect(isInvitationOnlyVisibility("open")).toBe(false);
    expect(isInvitationOnlyVisibility("approval_required")).toBe(false);
  });
});
