import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, User } from "@prisma/client";
import { defaultPlanCatalog, PlanCatalog, withCanonicalPlanNames } from "./plan-catalog";
import { PrismaService } from "../prisma/prisma.service";
import { quotaLock } from "../common/usage-quota";
@Injectable()
export class PlansService {
 constructor(private readonly prisma: PrismaService) {}
 async catalog() { const row = await this.prisma.planConfiguration.findUnique({where:{id:"catalog"}}); return { revision: row?.revision ?? 0, plans: withCanonicalPlanNames((row?.data ?? defaultPlanCatalog) as PlanCatalog) }; }
 async update(input: { revision: number; plans: PlanCatalog }, actor: User) {
  const plans = input?.plans;
  if (!Number.isInteger(input?.revision) || !plans || Object.keys(plans).sort().join() !== Object.keys(defaultPlanCatalog).sort().join()) throw new BadRequestException("Geçersiz paket kataloğu.");
  for (const [audience, defaults] of Object.entries(defaultPlanCatalog)) {
   if (!plans[audience] || Object.keys(plans[audience]!).sort().join() !== Object.keys(defaults).sort().join()) throw new BadRequestException("Paket listesi değiştirilemez.");
   for (const [key, template] of Object.entries(defaults)) {
    const row = plans[audience]![key];
    if (!row || row.name !== template.name || Object.keys(row).sort().join() !== Object.keys(template).sort().join()) throw new BadRequestException("Paket alanları geçersiz.");
    for (const field of ["events","tags","invites","messages","sixHours","profileViews"] as const) if (row[field] !== null && (!Number.isInteger(row[field]) || row[field]! < 0 || row[field]! > 1000000)) throw new BadRequestException("Kotalar 0–1.000.000 arasında tam sayı veya sınırsız olmalıdır.");
    if (!Number.isFinite(row.price) || row.price < 0 || row.price > 1000000 || Math.abs(row.price*100-Math.round(row.price*100))>0.000001 || key === "free" && row.price !== 0) throw new BadRequestException("Geçersiz fiyat.");
    if (typeof row.advanced !== "boolean" || typeof row.guest !== "boolean") throw new BadRequestException("Paket hakları geçersiz.");
   }
  }
  return this.prisma.$transaction(async tx => {
   await quotaLock(tx,"plan-catalog"); const old=await tx.planConfiguration.findUnique({where:{id:"catalog"}});
   if ((old?.revision ?? 0) !== input.revision) throw new ConflictException("Katalog başka bir yönetici tarafından değiştirildi. Yenileyin.");
   const data=plans as unknown as Prisma.InputJsonValue;
   await tx.planAudit.create({data:{actorId:actor.id,action:"catalog",data:{before:old?.data ?? defaultPlanCatalog,after:data} as Prisma.InputJsonValue}});
   const row=await tx.planConfiguration.upsert({where:{id:"catalog"},create:{id:"catalog",data,revision:1},update:{data,revision:{increment:1}}});
   return {revision:row.revision,plans:row.data};
  });
 }
 async gift(userId: string, input: { audience: string; plan: string; duration: number; unit: string; reason: string; revoke?: boolean }, actor: User) {
  if (!input || !["individual","corporate","researcher"].includes(input.audience) || typeof input.reason !== "string" || input.revoke !== undefined && typeof input.revoke !== "boolean") throw new BadRequestException("Geçersiz hediye paket isteği.");
  const {plans}=await this.catalog();
  if (!plans[input.audience]?.[input.plan] || !["days","weeks","months"].includes(input.unit) || !Number.isInteger(input.duration) || input.duration < 1 || input.duration > 365 || !input.reason?.trim() || input.reason.length>500) throw new BadRequestException("Geçerli paket, süre ve açıklama girin.");
  const days=input.duration*({days:1,weeks:7,months:31}[input.unit] ?? 1);
  if(days>366) throw new BadRequestException("Deneme süresi en fazla 366 gün olabilir.");
  return this.prisma.$transaction(async tx=>{
   await quotaLock(tx,`plan-gift:${userId}`);
   const user=await tx.user.findUnique({where:{id:userId}});
   if(!user || user.status!=="active") throw new NotFoundException("Aktif kullanıcı bulunamadı.");
   if(input.audience!=="researcher" && input.audience!==(user.accountType==="corporate"?"corporate":"individual")) throw new BadRequestException("Paket hesap türüyle eşleşmiyor.");
   const gifts={...(user.planGifts as Record<string,Prisma.InputJsonValue>|null ?? {})};
   const gift={plan:input.plan,expiresAt:new Date(Date.now()+days*86400000).toISOString()};
   if(input.revoke) delete gifts[input.audience]; else gifts[input.audience]=gift;
   await tx.user.update({where:{id:userId},data:{planGifts:gifts}});
   await tx.planAudit.create({data:{actorId:actor.id,userId,action:input.revoke?"revoke_gift":"gift",data:{audience:input.audience,before:user.planGifts,after:gifts,reason:input.reason.trim()} as Prisma.InputJsonValue}});
   return {gifts};
  });
 }
 history(){return this.prisma.planAudit.findMany({orderBy:{createdAt:"desc"},take:100});}
}
