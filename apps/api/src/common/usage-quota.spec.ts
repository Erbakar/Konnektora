import { consumeQuota, paidCorporateEvent } from "./usage-quota";
const user = { id: "u", role: "user", accountType: "individual", memberPlan: "free", businessPlan: "free", createdAt: new Date("2026-01-01") };
function setup(used = 0) { return { $queryRaw: jest.fn(), planUsage: { findUnique: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(used), create: jest.fn() } }; }
describe("durable plan quotas", () => {
 it.each([["event",4],["tag",3],["invite",300]] as const)("rejects %s at the limit", async (kind, used) => { const tx=setup(used); await expect(consumeQuota(tx as never,user as never,kind,"target","event")).rejects.toThrow(); expect(tx.planUsage.create).not.toHaveBeenCalled(); });
 it("allows the last event and serializes competing requests", async()=>{const tx=setup(3); await consumeQuota(tx as never,user as never,"event","event"); expect(tx.$queryRaw).toHaveBeenCalled(); expect(tx.planUsage.create).toHaveBeenCalledTimes(1);});
 it("does not charge a repeat tag even after reaching the limit",async()=>{const tx=setup(3);tx.planUsage.findUnique.mockResolvedValue({id:"existing"} as never);await consumeQuota(tx as never,user as never,"tag","tag");expect(tx.planUsage.count).not.toHaveBeenCalled();expect(tx.planUsage.create).not.toHaveBeenCalled();});
 it("records unlimited usage so downgrade cannot erase history",async()=>{const tx=setup(1000);await consumeQuota(tx as never,{...user,memberPlan:"platinum"} as never,"event","event");expect(tx.planUsage.create).toHaveBeenCalled();});
 it("uses event-scoped invites rather than a monthly attendee cap",async()=>{const tx=setup();await consumeQuota(tx as never,user as never,"invite","invitee","event1");expect(tx.planUsage.count).toHaveBeenCalledWith({where:{userId:"u",kind:"invite",scope:"event1"}});});
 it("does not exempt individual or mixed free-ticket events",()=>{expect(paidCorporateEvent(user,{price:50})).toBe(false);expect(paidCorporateEvent({...user,accountType:"corporate"},{price:50,ticketTypes:[{price:0},{price:50}]})).toBe(false);expect(paidCorporateEvent({...user,accountType:"corporate"},{price:50})).toBe(true);});
});
