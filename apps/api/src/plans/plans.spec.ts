import { defaultPlanCatalog } from "./plan-catalog";
import { effectivePlan, planContext } from "./plan-runtime";
import { limitsFor } from "../common/plan-policy";
import { canUseAdvancedAnalytics } from "../common/analytics-access";
import { PlansService } from "./plans.service";
import { consumeQuota } from "../common/usage-quota";
const user={id:"u",role:"user",accountType:"individual",memberPlan:"premium",businessPlan:"free",createdAt:new Date("2026-01-01"),planGifts:null};
describe("plan controls",()=>{
 it("expires a gift without changing the paid membership",()=>{
  const gift={...user,planGifts:{individual:{plan:"platinum",expiresAt:new Date(Date.now()+10000).toISOString()}}};
  expect(effectivePlan(gift).key).toBe("platinum");
  gift.planGifts.individual.expiresAt=new Date(Date.now()-1).toISOString();
  expect(effectivePlan(gift).key).toBe("premium");expect(user.memberPlan).toBe("premium");
 });
 it("research gifts add only tag rights, never new event or guest permissions",()=>{
  const member={...user,memberPlan:"free",planGifts:{researcher:{plan:"explorer",expiresAt:new Date(Date.now()+10000).toISOString()}}};
  expect(limitsFor(member)).toMatchObject({events:4,tags:200,messages:20});expect(canUseAdvancedAnalytics(member)).toBe(false);
 });
 it("applies configured limits consistently while keeping request contexts isolated",async()=>{
  const custom=structuredClone(defaultPlanCatalog);custom.individual!.premium!.events=1;
  const results=await Promise.all([planContext.run(custom,async()=>{await Promise.resolve();return limitsFor(user).events;}),Promise.resolve(limitsFor(user).events)]);
  expect(results).toEqual([1,8]);
 });
 it.each([-1,1.5,NaN,1000001])("rejects invalid quotas before writing: %s",async value=>{
  const prisma={$transaction:jest.fn()};const plans=structuredClone(defaultPlanCatalog);plans.individual!.free!.events=value;
  await expect(new PlansService(prisma as never).update({revision:0,plans},user as never)).rejects.toThrow();expect(prisma.$transaction).not.toHaveBeenCalled();
 });
 it("does not consume a third free profile view and does not permit stale replay",async()=>{
  const tx={$queryRaw:jest.fn(),planUsage:{findUnique:jest.fn().mockResolvedValue(null),count:jest.fn().mockResolvedValue(2),create:jest.fn()}};
  await expect(consumeQuota(tx as never,{...user,memberPlan:"free"} as never,"profile","request")).rejects.toThrow("Profil istatistiği");
  tx.planUsage.findUnique.mockResolvedValue({createdAt:new Date()});await consumeQuota(tx as never,user as never,"profile","request");expect(tx.planUsage.create).not.toHaveBeenCalled();
  tx.planUsage.findUnique.mockResolvedValue({createdAt:new Date(Date.now()-301000)});await expect(consumeQuota(tx as never,user as never,"profile","request")).rejects.toThrow("sona erdi");
 });
});
