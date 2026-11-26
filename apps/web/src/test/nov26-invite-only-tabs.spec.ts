import { describe, expect, it } from "vitest";
import { eventInviteOnlyAccess, placeInviteOnlyAccess } from "../lib/inviteOnlyAccess";
import { defaultEventTab } from "../lib/defaultEventTab";
import { formatDocumentTitle } from "../lib/useDocumentTitle";

describe("26/11 #102 invite-only event access", () => {
  it("locks users who were never invited", () => {
    expect(eventInviteOnlyAccess({ visibility: "invite_only", createdById: "owner", viewerParticipation: null }, "stranger")).toBe("locked");
    expect(eventInviteOnlyAccess({ visibility: "invite_only", viewerParticipation: { status: "declined", role: "attendee" } }, "stranger")).toBe("locked");
  });
  it("lets invitees accept and keeps members, organisers and open events unlocked", () => {
    expect(eventInviteOnlyAccess({ visibility: "invite_only", viewerParticipation: { status: "invited", role: "attendee" } }, "u")).toBe("invited");
    expect(eventInviteOnlyAccess({ visibility: "hidden", viewerParticipation: { status: "accepted", role: "attendee" } }, "u")).toBe("member");
    expect(eventInviteOnlyAccess({ visibility: "invite_only", viewerParticipation: { status: "not_attending", role: "organizer" } }, "u")).toBe("manager");
    expect(eventInviteOnlyAccess({ visibility: "invite_only", createdById: "u", viewerParticipation: null }, "u")).toBe("manager");
    expect(eventInviteOnlyAccess({ visibility: "open", viewerParticipation: null }, "u")).toBe("not_invite_only");
  });
});

describe("26/11 #103 invite-only place access", () => {
  it("distinguishes locked, invited, member and founder viewers", () => {
    expect(placeInviteOnlyAccess({ visibility: "invite_only", createdById: "owner", viewerMembership: null }, "stranger")).toBe("locked");
    expect(placeInviteOnlyAccess({ visibility: "invite_only", viewerMembership: { status: "invited", role: "member" } }, "u")).toBe("invited");
    expect(placeInviteOnlyAccess({ visibility: "invite_only", viewerMembership: { status: "accepted", role: "member" } }, "u")).toBe("member");
    expect(placeInviteOnlyAccess({ visibility: "invite_only", viewerMembership: { status: "accepted", role: "manager" } }, "u")).toBe("manager");
    expect(placeInviteOnlyAccess({ visibility: "invite_only", createdById: "u" }, "u")).toBe("manager");
    expect(placeInviteOnlyAccess({ visibility: "approval_required", viewerMembership: null }, "u")).toBe("not_invite_only");
  });
});

describe("26/11 #119–#120 default event tab", () => {
  const finished = (item: { done: boolean }) => item.done;
  it("opens Past when Current is empty but Past has events", () => {
    expect(defaultEventTab([{ done: true }, { done: true }], finished)).toBe("past");
  });
  it("keeps Current when it has events or when both are empty", () => {
    expect(defaultEventTab([{ done: true }, { done: false }], finished)).toBe("future");
    expect(defaultEventTab([], finished)).toBe("future");
  });
});

describe("26/11 #85 document title", () => {
  it("builds a page-specific tab title", () => {
    expect(formatDocumentTitle("Yaz partisi", "Guest List")).toBe("Yaz partisi · Guest List · Konnektora");
    expect(formatDocumentTitle(" ", null, "Guest List")).toBe("Guest List · Konnektora");
  });
});
