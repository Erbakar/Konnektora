import { platformReport } from "../finance/platform-report";
import { PlansService } from "../plans/plans.service";
import { PublicProfileService } from "../public-profile/public-profile.service";
import { effectivePlan } from "../plans/plan-runtime";
import { defaultPlanCatalog } from "../plans/plan-catalog";
import { PlatformRevenueService } from "./platform-revenue.service";
import { FinanceInvoicesService } from "../finance/finance-invoices.service";
import { randomUUID } from "crypto";
import { PrismaClient, User } from "@prisma/client";
import { FinanceService } from "../finance/finance.service";
import { CuratorFinanceService } from "./curator-finance.service";
import { CuratorsService } from "../curators/curators.service";
const url = process.env.FINANCE_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
suite("Finance integration on isolated PostgreSQL", () => {
 let db: PrismaClient; let finance: FinanceService; let curators: CuratorFinanceService; let actor: User; let owner: User; let buyer: User; let curator: User; let eventId: string;
 beforeAll(() => { const parsed = new URL(url!); if (parsed.hostname !== "127.0.0.1" || parsed.pathname !== "/konnektora_qa") throw new Error("Only the isolated local QA database is allowed"); db = new PrismaClient({ datasourceUrl: url }); finance = new FinanceService(db as never); curators = new CuratorFinanceService(db as never); });
 afterAll(async () => db.$disconnect());
 async function user(role: "user" | "admin" | "curator", accountType = "individual") { const id = randomUUID(); return db.user.create({ data: { id, role, accountType, name: `QA ${role}`, username: `qa-${id}`, email: `${id}@qa.invalid`, passwordHash: "qa-only" } }); }
 beforeEach(async () => { actor = await user("admin"); owner = await user("user", "corporate"); buyer = await user("user"); curator = await user("curator"); const id = randomUUID(); const event = await db.event.create({ data: { id, title: "QA Finance", slug: id, summary: "QA", description: "QA", city: id, country: "Türkiye", startsAt: new Date(Date.now() - 80 * 3600000), endsAt: new Date(Date.now() - 73 * 3600000), timezone: "Europe/Istanbul", format: "offline", language: "tr", createdById: owner.id, price: 100 } }); eventId = event.id; await curators.saveAgreement(curator.id, { active: true, territories: [{ country: "Türkiye", city: event.city! }, { country: "Türkiye", city: `${id}-second` }], rates: { ticket_commission: 20 } }, actor); });
 async function payment() { const created = await finance.createPayment(eventId, buyer, { idempotencyKey: randomUUID() }); await finance.confirm(created.id, buyer, { paymentMethodToken: "pm_qa-token" }); return db.paymentTransaction.findUniqueOrThrow({ where: { id: created.id } }); }
 it("credits simultaneous confirmations and commission only once", async () => { const created = await finance.createPayment(eventId, buyer, { idempotencyKey: randomUUID() }); await Promise.all(Array.from({ length: 8 }, () => finance.confirm(created.id, buyer, { paymentMethodToken: "pm_qa-token" }))); const account = await db.financialAccount.findUniqueOrThrow({ where: { userId: owner.id } }); expect(Number(account.heldBalance)).toBe(95); expect(Number(account.availableBalance)).toBe(0); const ledger = await curators.ledger(curator.id); expect(ledger.total).toBe(1); expect(ledger.balances.TRY).toEqual({ available: 0, held: 1, total: 1 }); const held = (await finance.listHeldEvents()).find(row => row.id === eventId)!; expect(held.totals).toEqual([{ currency: "TRY", amount: 95 }]); expect(held.curatorTotals).toEqual([{ currency: "TRY", amount: 1 }]); });
 it("keeps old commission rate after agreement changes", async () => { await payment(); const contract = (await curators.agreements(curator.id))[0]!; await curators.saveAgreement(curator.id, { active: true, territories: contract.territories as never, rates: { ticket_commission: 50 } }, actor); await payment(); const rows = await db.curatorLedgerEntry.findMany({ where: { userId: curator.id }, orderBy: { createdAt: "asc" } }); expect(rows.map(row => Number(row.amount))).toEqual([1, 2.5]); expect(rows.map(row => Number(row.rate))).toEqual([20, 50]); });
 it("releases held income once even with simultaneous admin requests", async () => { await payment(); await Promise.allSettled(Array.from({ length: 6 }, () => finance.releaseEventIncome(eventId, actor))); const account = await db.financialAccount.findUniqueOrThrow({ where: { userId: owner.id } }); expect(Number(account.heldBalance)).toBe(0); expect(Number(account.availableBalance)).toBe(95); expect((await curators.ledger(curator.id)).balances.TRY).toEqual({ held: 0, available: 1, total: 1 }); });
 it("reverses curator shares proportionally on partial and full refunds", async () => { const pay = await payment(); await finance.refund(pay.id, owner, { amount: 50 }); expect((await curators.ledger(curator.id)).balances.TRY!.held).toBe(0.5); await finance.refund(pay.id, owner, {}); expect((await curators.ledger(curator.id)).balances.TRY!.held).toBe(0); const account = await db.financialAccount.findUniqueOrThrow({ where: { userId: owner.id } }); expect(Number(account.heldBalance)).toBe(0); });
 it("does not overspend available balance with simultaneous withdrawals", async () => { await db.financialAccount.create({ data: { userId: owner.id, availableBalance: 100, kycStatus: "approved", bankAccountLast4: "1234" } }); const results = await Promise.allSettled([finance.payout(owner, { amount: 80 }), finance.payout(owner, { amount: 80 })]); expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1); expect(Number((await db.financialAccount.findUniqueOrThrow({ where: { userId: owner.id } })).availableBalance)).toBe(20); });
 it("blocks manual payments from held income", async () => { await payment(); await expect(curators.manual(curator.id, { kind: "payment", category: "other", amount: 1, currency: "TRY", description: "QA cash", method: "cash", occurredAt: new Date().toISOString(), requestId: randomUUID() }, actor)).rejects.toThrow("bakiyeyi aşamaz"); });
 it("preserves correction history and rejects reducing previously spent income", async () => { const entry = await curators.manual(curator.id, { kind: "income", category: "other", amount: 100, currency: "EUR", description: "Original", method: "other", occurredAt: new Date().toISOString(), requestId: randomUUID() }, actor); await curators.manual(curator.id, { kind: "payment", category: "other", amount: 80, currency: "EUR", description: "Cash receipt", method: "cash", occurredAt: new Date().toISOString(), requestId: randomUUID() }, actor); await expect(curators.manual(curator.id, { kind: "income", category: "other", amount: 50, currency: "EUR", description: "Correction", method: "other", occurredAt: new Date().toISOString(), requestId: randomUUID() }, actor, entry.id)).rejects.toThrow("bakiyeyi aşamaz"); expect((await curators.ledger(curator.id)).total).toBe(2); await curators.manual(curator.id, { kind: "income", category: "other", amount: 90, currency: "EUR", description: "Correction", method: "other", occurredAt: new Date().toISOString(), requestId: randomUUID() }, actor, entry.id); const ledger = await curators.ledger(curator.id); expect(ledger.total).toBe(4); expect(ledger.balances.EUR!.available).toBe(10); });
 it("uses every contracted city and active place statuses in the dashboard", async () => { const service = new CuratorsService(db as never, {} as never); const dashboard = await service.dashboard(curator); expect(dashboard.events.some(event => event.id === eventId)).toBe(true); expect(dashboard.city).toContain("second"); });
 it("returns all history pages without leaking another payer's payments", async () => { await payment(); const secondBuyer = await user("user"); const created = await finance.createPayment(eventId, secondBuyer, { idempotencyKey: randomUUID() }); const page = await finance.transactionsPage({ pageSize: "1" }, buyer); expect(page.total).toBe(1); expect(page.items[0]!.payerId).toBe(buyer.id); expect(page.items.some(row => row.id === created.id)).toBe(false); });
 it("stores invoice PDFs privately and denies an unrelated user", async () => { const pay = await payment(); const invoices = new FinanceInvoicesService(db as never); const data = Buffer.from("%PDF-1.7\nQA-only document\n%%EOF"); const uploaded = await invoices.upload(pay.id, "QA-001", "invoice", new Date().toISOString(), { buffer: data, size: data.length } as Express.Multer.File, actor); expect(Buffer.from((await invoices.file(uploaded.id, buyer)).data).equals(data)).toBe(true); await expect(invoices.file(uploaded.id, curator)).rejects.toThrow("Fatura bulunamadı"); expect((await invoices.list(curator)).some(row => row.id === uploaded.id)).toBe(false); });
 it("rejects overlapping agreements that allocate more than the platform commission", async () => { const other = await user("curator"); const contract = (await curators.agreements(curator.id))[0]!; await expect(curators.saveAgreement(other.id, { active: true, territories: contract.territories as never, rates: { ticket_commission: 90 } }, actor)).rejects.toThrow("%100'ü aşamaz"); expect(await db.curatorAgreement.count({ where: { userId: other.id } })).toBe(0); });
 it("rolls back a correction that moves already spent income into another currency", async () => { const entry = await curators.manual(curator.id, { kind: "income", category: "other", amount: 100, currency: "EUR", description: "Original", method: "other", occurredAt: new Date().toISOString(), requestId: randomUUID() }, actor); await curators.manual(curator.id, { kind: "payment", category: "other", amount: 80, currency: "EUR", description: "Receipt", method: "cash", occurredAt: new Date().toISOString(), requestId: randomUUID() }, actor); await expect(curators.manual(curator.id, { kind: "income", category: "other", amount: 100, currency: "TRY", description: "Wrong currency", method: "other", occurredAt: new Date().toISOString(), requestId: randomUUID() }, actor, entry.id)).rejects.toThrow("bakiyeyi aşamaz"); expect((await curators.ledger(curator.id)).total).toBe(2); });

 it("deduplicates simultaneous settled receipts and refunds without rewriting earned rates", async () => {
  const service = new PlatformRevenueService(db as never);
  const contract = (await curators.agreements(curator.id))[0]!;
  await curators.saveAgreement(curator.id, { active: true, territories: contract.territories as never, rates: { corporate_subscription: 30 } }, actor);
  const input = { sourceKey: randomUUID(), category: "corporate_subscription" as const, amount: 100, currency: "TRY", country: "Türkiye", city: eventId, description: "Settled subscription", occurredAt: new Date().toISOString() };
  const receipts = await Promise.all(Array.from({ length: 8 }, () => service.record(input, actor)));
  expect(new Set(receipts.map(row => row.id)).size).toBe(1);
  const id = receipts[0]!.id;
  expect(await db.curatorLedgerEntry.count({ where: { revenueId: id } })).toBe(1);
  await curators.saveAgreement(curator.id, { active: true, territories: contract.territories as never, rates: { corporate_subscription: 10 } }, actor);
  await Promise.all(Array.from({ length: 5 }, () => service.refund(id, 50)));
  expect((await curators.ledger(curator.id)).balances.TRY!.available).toBe(15);
  await service.refund(id, 100);
  expect((await curators.ledger(curator.id)).balances.TRY!.available).toBe(0);
  expect(await db.curatorLedgerEntry.count({ where: { revenueId: id } })).toBe(3);
  await expect(service.refund(id, 101)).rejects.toThrow();
  await expect(service.record({ ...input, amount: 101 }, actor)).rejects.toThrow();
 });
 it("rolls back the receipt when invalid agreements over-allocate its income", async () => {
  const service = new PlatformRevenueService(db as never);
  const contract = (await curators.agreements(curator.id))[0]!;
  await db.curatorAgreement.update({ where: { id: contract.id }, data: { rates: { corporate_subscription: 100 }, referrerId: actor.id, referralRate: 5 } });
  const sourceKey = randomUUID();
  await expect(service.record({ sourceKey, category: "corporate_subscription", amount: 100, currency: "TRY", country: "Türkiye", city: eventId, description: "Invalid allocation", occurredAt: new Date().toISOString() }, actor)).rejects.toThrow();
  expect(await db.platformRevenue.count({ where: { sourceKey } })).toBe(0);
 });

 it("gifts and revokes access without replacing paid plans or clearing usage", async () => {
  const plans = new PlansService(db as never);
  await db.user.update({where:{id:buyer.id},data:{memberPlan:"premium"}});
  await db.planUsage.create({data:{userId:buyer.id,kind:"event",scope:"",targetId:randomUUID()}});
  await plans.gift(buyer.id,{audience:"individual",plan:"platinum",duration:1,unit:"weeks",reason:"QA gift"},actor);
  let member=await db.user.findUniqueOrThrow({where:{id:buyer.id}});
  expect(effectivePlan(member).key).toBe("platinum");expect(member.memberPlan).toBe("premium");
  await plans.gift(buyer.id,{audience:"individual",plan:"platinum",duration:1,unit:"days",reason:"QA revoke",revoke:true},actor);
  member=await db.user.findUniqueOrThrow({where:{id:buyer.id}});expect(effectivePlan(member).key).toBe("premium");
  expect(await db.planUsage.count({where:{userId:buyer.id}})).toBe(1);
  expect(await db.planAudit.count({where:{userId:buyer.id}})).toBe(2);
 });
 it("rejects stale simultaneous catalog edits and preserves a complete audit",async()=>{
  const service=new PlansService(db as never);const original=await service.catalog();
  const plans=structuredClone(defaultPlanCatalog);plans.individual!.premium!.price=5;
  const results=await Promise.allSettled([service.update({revision:original.revision,plans},actor),service.update({revision:original.revision,plans},actor)]);
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  const current=await service.catalog();expect(current.plans.individual!.premium!.price).toBe(5);
  await service.update({revision:current.revision,plans:original.plans},actor);
 });
 it("limits free own-profile analytics to two sessions without charging ordinary profile visits",async()=>{
  const profiles=new PublicProfileService(db as never);const first=randomUUID();
  await profiles.getById(buyer.id,buyer.id,"user");expect(await db.planUsage.count({where:{userId:buyer.id,kind:"profile"}})).toBe(0);
  await profiles.getById(buyer.id,buyer.id,"user",first);
  await profiles.getById(buyer.id,buyer.id,"user",first);
  await profiles.getById(buyer.id,buyer.id,"user",randomUUID());
  await expect(profiles.getById(buyer.id,buyer.id,"user",randomUUID())).rejects.toThrow("Profil istatistiği");
  await expect(profiles.getById(buyer.id,owner.id,"user",randomUUID())).rejects.toThrow("kendi profilinizin");
  expect(await db.planUsage.count({where:{userId:buyer.id,kind:"profile"}})).toBe(2);
 });

 it("reports ticket and other income after refunds and curator shares, with currency-safe totals",async()=>{
  const pay=await payment();const sources=new PlatformRevenueService(db as never);
  const contract=(await curators.agreements(curator.id))[0]!;
  await curators.saveAgreement(curator.id,{active:true,territories:contract.territories as never,rates:{corporate_subscription:30}},actor);
  const source=await sources.record({sourceKey:randomUUID(),customerId:buyer.id,category:"corporate_subscription",amount:100,currency:"EUR",country:"Türkiye",city:eventId,description:"QA report",occurredAt:new Date().toISOString()},actor);
  await sources.refund(source.id,50);
  const report=await platformReport(db as never,{city:eventId});
  expect(report.total).toBe(2);
  expect(report.totals).toEqual(expect.arrayContaining([{currency:"EUR",available:35,held:0,count:1},{currency:"TRY",available:0,held:4,count:1}]));
  expect(report.items.find(row=>row.id===`source:${source.id}`)).toMatchObject({customer_id:buyer.id,gross:50,curator:15,net:35});
  const filtered=await platformReport(db as never,{city:eventId,categories:"ticket_commission",pageSize:"1"});expect(filtered.total).toBe(1);expect(filtered.items[0]!.id).toBe(`ticket:${pay.id}`);
  expect((await platformReport(db as never,{q:"' OR 1=1 --"})).total).toBe(0);
 });
 it("keeps event source income held even with no curator and releases it explicitly",async()=>{
  const sources=new PlatformRevenueService(db as never);
  const source=await sources.record({sourceKey:randomUUID(),category:"sponsorship",eventId,amount:100,currency:"USD",country:"Türkiye",city:eventId,description:"QA sponsorship",occurredAt:new Date().toISOString()},actor);
  expect(source.held).toBe(true);expect((await finance.listHeldEvents()).some(row=>row.id===eventId)).toBe(true);
  await finance.releaseEventIncome(eventId,actor);
  expect((await db.platformRevenue.findUniqueOrThrow({where:{id:source.id}})).held).toBe(false);
 });

 it("returns held event audit details without inventing prior changes",async()=>{
  await db.eventRevision.create({data:{eventId,actorId:actor.id,before:{city:"Before"},after:{city:"After"}}});
  const detail=await finance.heldEventDetail(eventId);
  expect(detail.createdBy?.id).toBe(owner.id);
  expect(detail.revisions).toHaveLength(1);
  expect(detail.revisions[0]!.before).toEqual({city:"Before"});
  expect(detail.counts).toEqual({comments:0,views:0,uniqueViewers:0,reports:0,invitations:0});
  await expect(finance.heldEventDetail(randomUUID())).rejects.toThrow("Etkinlik bulunamadı");
 });

});
