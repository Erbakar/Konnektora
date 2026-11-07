import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
// Accounting earnings, never a claim about a bank/provider's cash balance.
export async function platformReport(prisma: PrismaService, query: Record<string,string>) {
 const page=Math.max(1,Math.trunc(Number(query.page))||1),pageSize=Math.min(200,Math.max(1,Math.trunc(Number(query.pageSize))||50));
 const snapshot=query.snapshot?new Date(query.snapshot):new Date();
 const from=query.from?new Date(`${query.from}T00:00:00+03:00`):null;
 const until=query.until?new Date(`${query.until}T00:00:00+03:00`):null;if(until)until.setUTCDate(until.getUTCDate()+1);
 if(!Number.isFinite(snapshot.getTime())||from&&!Number.isFinite(from.getTime())||until&&!Number.isFinite(until.getTime()))throw new BadRequestException("Geçersiz tarih.");
 const conditions=[Prisma.sql`occurred_at <= ${snapshot}`];
 if(from)conditions.push(Prisma.sql`occurred_at >= ${from}`);if(until)conditions.push(Prisma.sql`occurred_at < ${until}`);
 for(const field of ["country","city","region","currency"] as const)if(query[field])conditions.push(Prisma.sql`${Prisma.raw(field)} = ${query[field]}`);
 const categories=(query.categories??"").split(",").filter(Boolean);if(categories.length)conditions.push(Prisma.sql`category IN (${Prisma.join(categories)})`);
 if(query.q)conditions.push(Prisma.sql`(description ILIKE ${`%${query.q}%`} OR username ILIKE ${`%${query.q}%`} OR customer_id = ${query.q})`);
 const common=Prisma.sql`WITH income AS (
  SELECT 'ticket:'||p.id AS id, p.payer_id AS customer_id, u.username, 'ticket_commission'::text AS category,
   e.title AS description, e.country,e.city,e.region,p.currency,COALESCE(p.paid_at,p.created_at) AS occurred_at,
   ROUND(p.platform_fee*GREATEST(0,p.gross_amount-p.refunded_amount)/NULLIF(p.gross_amount,0),2) AS gross,
   COALESCE((SELECT SUM(l.amount) FROM curator_ledger_entries l WHERE l.payment_id=p.id),0) AS curator,
   p.released_at IS NULL AS held
  FROM payment_transactions p JOIN events e ON e.id=p.event_id JOIN users u ON u.id=p.payer_id
  WHERE p.status IN ('succeeded','partially_refunded','refunded')
  UNION ALL
  SELECT 'source:'||r.id,r.customer_id,u.username,r.category,r.description,r.country,r.city,r.region,r.currency,r.occurred_at,
   r.amount-r.refunded_amount,COALESCE((SELECT SUM(l.amount) FROM curator_ledger_entries l WHERE l.revenue_id=r.id),0),r.held
  FROM platform_revenues r LEFT JOIN users u ON u.id=r.customer_id
 ), filtered AS (SELECT *,COALESCE(gross,0)-curator AS net FROM income WHERE ${Prisma.join(conditions," AND ")}),
 running AS (SELECT *,SUM(net) OVER(PARTITION BY currency ORDER BY occurred_at,id) AS balance FROM filtered)`;
 type Row={id:string;customer_id:string|null;username:string|null;category:string;description:string;country:string|null;city:string|null;region:string|null;currency:string;occurred_at:Date;gross:Prisma.Decimal;curator:Prisma.Decimal;net:Prisma.Decimal;balance:Prisma.Decimal;held:boolean};
 return prisma.$transaction(async tx=>{
  const items=await tx.$queryRaw<Row[]>(Prisma.sql`${common} SELECT * FROM running ORDER BY occurred_at DESC,id DESC LIMIT ${pageSize} OFFSET ${(page-1)*pageSize}`);
  const totals=await tx.$queryRaw<Array<{currency:string;available:Prisma.Decimal;held:Prisma.Decimal;count:bigint}>>(Prisma.sql`${common} SELECT currency,COALESCE(SUM(net) FILTER(WHERE NOT held),0) AS available,COALESCE(SUM(net) FILTER(WHERE held),0) AS held,COUNT(*) AS count FROM filtered GROUP BY currency ORDER BY currency`);
  return {items:items.map(row=>({...row,gross:Number(row.gross),curator:Number(row.curator),net:Number(row.net),balance:Number(row.balance)})),totals:totals.map(row=>({...row,available:Number(row.available),held:Number(row.held),count:Number(row.count)})),total:totals.reduce((n,row)=>n+Number(row.count),0),page,pageSize,snapshot:snapshot.toISOString()};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}
