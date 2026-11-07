import { checkConversationQuota } from "./conversation-quota";

describe("new conversation quotas", () => {
  const sender = { id: "sender", role: "user", accountType: "individual", memberPlan: "free", businessPlan: "free" };
  function transaction(daily: number, recent: number, existing = false) {
    return { privateMessage: { findFirst: jest.fn().mockResolvedValue(existing ? { id: "old" } : null) }, $queryRaw: jest.fn().mockResolvedValue([{ daily: BigInt(daily), recent: BigInt(recent) }]) };
  }
  it("allows existing conversations even at both limits", async () => {
    const tx = transaction(20, 15, true);
    await expect(checkConversationQuota(tx as never, sender as never, "peer")).resolves.toBeUndefined();
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
  });
  it.each([[20, 1], [15, 15]])("rejects a new free conversation at %s daily / %s recent", async (daily, recent) => {
    await expect(checkConversationQuota(transaction(daily, recent) as never, sender as never, "peer")).rejects.toThrow("Yeni sohbet");
  });
  it("allows the last free slot and ignores the six-hour cap on Premium", async () => {
    await expect(checkConversationQuota(transaction(19, 14) as never, sender as never, "peer")).resolves.toBeUndefined();
    await expect(checkConversationQuota(transaction(49, 49) as never, { ...sender, memberPlan: "premium" } as never, "peer")).resolves.toBeUndefined();
    await expect(checkConversationQuota(transaction(50, 49) as never, { ...sender, memberPlan: "premium" } as never, "peer")).rejects.toThrow();
  });
  it("exempts administrators and curators", async () => {
    const tx = transaction(9999, 9999);
    await checkConversationQuota(tx as never, { ...sender, role: "curator" } as never, "peer");
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
});
