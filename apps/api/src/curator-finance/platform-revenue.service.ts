import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { quotaLock } from "../common/usage-quota";
import { territoryMatches } from "./territory";
import { PlatformRevenueDto } from "./platform-revenue.dto";
const cents = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
@Injectable()
export class PlatformRevenueService {
 constructor(private readonly prisma: PrismaService) {}
 list() { return this.prisma.platformRevenue.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { entries: { select: { userId: true, amount: true, category: true, agreementId: true } } } }); }
 // Call only after a receipt has settled. Admin ingestion records existing income; it never charges a customer.
 async record(input: PlatformRevenueDto, actor: User) {
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 999999999 || Math.abs(input.amount * 100 - Math.round(input.amount * 100)) > 0.000001) throw new BadRequestException("Geçerli net gelir tutarı girin.");
  const occurredAt = new Date(input.occurredAt);
  if (!Number.isFinite(occurredAt.getTime()) || occurredAt.getTime() > Date.now()) throw new BadRequestException("Yalnız gerçekleşmiş gelir kaydedilebilir.");
  const sourceKey=input.sourceKey.trim();
  if (!sourceKey || !input.country.trim() || !input.city.trim() || !input.description.trim()) throw new BadRequestException("Kaynak, açıklama ve konum zorunludur.");
  return this.prisma.$transaction(async tx => {
   await quotaLock(tx, `platform-revenue:${sourceKey}`);
   const data = { sourceKey, category:input.category, amount:cents(input.amount), currency:input.currency, country:input.country.trim(), city:input.city.trim(), region:input.region?.trim() || null, eventId:input.eventId || null, customerId:input.customerId || null, description:input.description.trim(), occurredAt };
   const existing=await tx.platformRevenue.findUnique({where:{sourceKey}});
   if(existing) {
    if(Object.entries(data).some(([key,value]) => key==="amount" ? !existing.amount.equals(value as Prisma.Decimal) : key==="occurredAt" ? existing.occurredAt.getTime() !== occurredAt.getTime() : (existing as unknown as Record<string,unknown>)[key] !== value)) throw new BadRequestException("Aynı gelir kaynağı farklı bilgilerle tekrar kaydedilemez.");
    return existing;
   }
   const eventIncome=["event_gate","sponsorship"].includes(input.category);
   if(eventIncome && !input.eventId) throw new BadRequestException("Etkinlik geliri için kaynak etkinlik zorunludur.");
   if(input.eventId && !await tx.event.findUnique({where:{id:input.eventId},select:{id:true}})) throw new BadRequestException("Kaynak etkinlik bulunamadı.");
   if(input.customerId && !await tx.user.findUnique({where:{id:input.customerId},select:{id:true}})) throw new BadRequestException("Gelirin müşterisi bulunamadı.");
   const revenue=await tx.platformRevenue.create({data:{...data,held:eventIncome,createdById:actor.id}});
   const agreements=await tx.curatorAgreement.findMany({where:{effectiveAt:{lte:occurredAt},user:{role:"curator",status:"active"}},orderBy:[{userId:"asc"},{version:"desc"}]});
   const seen=new Set<string>(); const rows: Prisma.CuratorLedgerEntryCreateManyInput[]=[];
   for(const agreement of agreements) {
    if(seen.has(agreement.userId)) continue; seen.add(agreement.userId);
    if(!agreement.active || !territoryMatches(agreement.territories,data)) continue;
    const rate=Number((agreement.rates as Record<string,number>)[input.category]??0);
    if(!Number.isFinite(rate)||rate<0||rate>100) throw new BadRequestException("Anlaşma oranı geçersiz.");
    const amount=cents(data.amount.mul(rate).div(100));
    if(amount.isZero()) continue;
    const common={agreementId:agreement.id,revenueId:revenue.id,eventId:input.eventId,currency:input.currency,held:eventIncome,occurredAt};
    rows.push({...common,userId:agreement.userId,kind:"income",category:input.category,amount,rate,description:input.description,sourceKey:`revenue:${revenue.id}:curator:${agreement.userId}`});
    const referral=cents(amount.mul(agreement.referralRate).div(100));
    if(agreement.referrerId && referral.gt(0)) rows.push({...common,userId:agreement.referrerId,kind:"income",category:"referral",amount:referral,rate:agreement.referralRate,description:`Referans payı: ${input.description}`,sourceKey:`revenue:${revenue.id}:referral:${agreement.userId}`});
   }
   if(rows.reduce((sum,row)=>sum.add(String(row.amount)),new Prisma.Decimal(0)).gt(data.amount)) throw new BadRequestException("Toplam küratör payı gelir tutarını aşamaz.");
   if(rows.length) await tx.curatorLedgerEntry.createMany({data:rows});
   return revenue;
  });
 }
 async refund(id:string, refundedAmount:number) {
  return this.prisma.$transaction(async tx=>{
   await quotaLock(tx, `revenue-refund:${id}`);
   const source=await tx.platformRevenue.findUniqueOrThrow({where:{id}}); const after=cents(refundedAmount);
   if(after.lt(source.refundedAmount)||after.gt(source.amount)) throw new BadRequestException("Toplam iade önceki iadeden az veya gelirden fazla olamaz.");
   if(after.equals(source.refundedAmount)) return source;
   const entries=await tx.curatorLedgerEntry.findMany({where:{revenueId:id,kind:"income"},orderBy:{id:"asc"}});
   for(const entry of entries) {
    const claimed=await tx.curatorLedgerEntry.updateMany({where:{id:entry.id,held:entry.held},data:{held:entry.held}});
    if(!claimed.count) throw new BadRequestException("Gelir değişti. Yeniden deneyin.");
    const amount=cents(entry.amount.mul(source.refundedAmount).div(source.amount)).sub(cents(entry.amount.mul(after).div(source.amount)));
    if(amount.isZero()) continue;
    await tx.curatorLedgerEntry.create({data:{userId:entry.userId,agreementId:entry.agreementId,revenueId:id,eventId:entry.eventId,kind:"refund",category:entry.category,description:`İade: ${entry.description}`,amount,currency:entry.currency,held:entry.held,rate:entry.rate,sourceKey:`revenue-refund:${id}:${entry.id}:${after.toFixed(2)}`}});
   }
   return tx.platformRevenue.update({where:{id},data:{refundedAmount:after}});
  });
 }
}
