import { pollSummaries, votePoll, createPoll } from "./polls";
import { formatNotificationDateTime } from "../notifications/activity-events";

const future = new Date(Date.now() + 86400000);

function db(overrides: Record<string, unknown> = {}) {
  const poll = { id: "p1", commentId: "c1", question: "Hangi gün?", allowMultiple: false, maxChoices: 1, allowOpenAnswer: false, audience: "everyone", closesAt: null, comment: { id: "c1", status: "active", targetType: "event", targetId: "e1" }, options: [{ id: "o1", label: "Cuma" }, { id: "o2", label: "Cumartesi" }] };
  const tx = { contentPollOption: { create: jest.fn(), deleteMany: jest.fn() }, contentPollVote: { deleteMany: jest.fn(), createMany: jest.fn() } };
  return {
    tx,
    contentPoll: {
      findUnique: jest.fn().mockResolvedValue({ ...poll, ...overrides }),
      findMany: jest.fn().mockResolvedValue([{ ...poll, ...overrides, comment: { targetType: "event", targetId: "e1" }, options: [{ id: "o1", label: "Cuma", isOpenAnswer: false, _count: { votes: 1 } }, { id: "o2", label: "Cumartesi", isOpenAnswer: false, _count: { votes: 3 } }], votes: [{ userId: "u1", optionId: "o1" }, { userId: "u2", optionId: "o2" }, { userId: "u3", optionId: "o2" }, { userId: "u4", optionId: "o2" }] }]),
      create: jest.fn(),
    },
    contentComment: { findUnique: jest.fn() },
    event: { findUnique: jest.fn().mockResolvedValue({ endsAt: future, createdById: "owner" }) },
    eventParticipant: { findMany: jest.fn().mockResolvedValue([{ userId: "u1" }, { userId: "u2" }, { userId: "u3" }, { userId: "u4" }, { userId: "u5" }, { userId: "u6" }, { userId: "u7" }]) },
    $transaction: jest.fn(async (fn: (client: unknown) => unknown) => fn(tx)),
  };
}

describe("07/11 #21 içerik anketleri", () => {
  it("sonuçları yalnız oy veren kullanıcıya oranlarıyla gösterir ve katılım oranını hesaplar", async () => {
    const prisma = db();
    const voted = (await pollSummaries(prisma as never, ["c1"], "u1")).get("c1") as any;
    expect(voted.resultsVisible).toBe(true);
    expect(voted.viewerOptionIds).toEqual(["o1"]);
    expect(voted.options.map((option: any) => [option.votes, option.percent])).toEqual([[1, 25], [3, 75]]);
    expect(voted.totalVoters).toBe(4);
    expect(voted.eligibleCount).toBe(8);
    expect(voted.participationRate).toBe(50);
    const stranger = (await pollSummaries(prisma as never, ["c1"], "u9")).get("c1") as any;
    expect(stranger.resultsVisible).toBe(false);
    expect(stranger.options.every((option: any) => option.votes === null)).toBe(true);
  });

  it("tek seçimli ankette birden fazla oyu ve yalnız katılımcılara açık ankette dışarıdan oyu reddeder", async () => {
    await expect(votePoll(db() as never, "p1", { optionIds: ["o1", "o2"] }, { id: "u1" } as never)).rejects.toThrow("Yalnız bir seçenek");
    await expect(votePoll(db({ audience: "participants" }) as never, "p1", { optionIds: ["o1"] }, { id: "dışarıdan" } as never)).rejects.toThrow("etkinlik katılımcıları");
  });

  it("oy değiştirildiğinde önceki oyları silip yenisini kaydeder", async () => {
    const prisma = db();
    await votePoll(prisma as never, "p1", { optionIds: ["o2"] }, { id: "u1" } as never);
    expect(prisma.tx.contentPollVote.deleteMany).toHaveBeenCalledWith({ where: { pollId: "p1", userId: "u1" } });
    expect(prisma.tx.contentPollVote.createMany).toHaveBeenCalledWith({ data: [{ pollId: "p1", optionId: "o2", userId: "u1" }], skipDuplicates: true });
  });

  it("anketi yalnız ileti sahibi ekleyebilir", async () => {
    const prisma = db();
    prisma.contentComment.findUnique.mockResolvedValue({ id: "c1", authorId: "owner", status: "active", parentId: null, targetType: "event", targetId: "e1", poll: null });
    await expect(createPoll(prisma as never, "c1", { question: "Soru?", options: ["A", "B"] }, { id: "başkası" } as never)).rejects.toThrow("ileti sahibi");
  });
});

describe("07/11 #4 bildirim tarih biçimi", () => {
  it("ISO zaman yerine okunur tarih ve saat üretir", () => {
    expect(formatNotificationDateTime(new Date("2026-10-31T19:00:00.000Z"), "UTC")).toBe("31.10.2026 19:00");
    expect(formatNotificationDateTime(new Date("2026-11-01T02:00:00.000Z"), "Europe/Istanbul")).toBe("01.11.2026 05:00");
  });
});
