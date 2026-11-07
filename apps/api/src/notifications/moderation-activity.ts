import { PrismaService } from "../prisma/prisma.service";
import { recordActivity } from "./activity-events";

/** Preserve the decision and its evidence even after the target is hidden. */
export async function notifyTagModeration(db: PrismaService, before: {id:string;name:string;updatedAt?:Date}, after: {id:string;name:string;status:string;updatedAt?:Date}) {
 const interests=await db.userInterestTag.findMany({where:{tagId:before.id},select:{userId:true}});
 const authors=await db.contentComment.findMany({where:{targetType:"tag",targetId:before.id,authorId:{not:null}},select:{authorId:true},distinct:["authorId"]});
 const renamed=before.name!==after.name||before.id!==after.id;
 const recipients=new Set([...interests.map(row=>row.userId),...(renamed?authors.flatMap(row=>row.authorId?[row.authorId]:[]):[])]);
 for(const userId of recipients)await recordActivity(db,{userId,type:renamed?"tag_merge":"tag_removed",title:renamed?"İlgi alanı değiştirildi":"İlgi alanı yayından kaldırıldı",body:`Konnektora: İlişkili olduğunuz “${before.name}” etiketi, ${renamed?`“${after.name}” olarak değiştirilmiştir`:"kurallar gereği yayından kaldırılmıştır"}. Konnektora Kurallarını öğrenmek için Destek Merkezini ziyaret ediniz.`,targetType:"tag",targetId:after.id,key:`tag-moderation:${before.id}:${after.id}:${after.name}:${after.status}:${after.updatedAt?.toISOString()??""}`,context:{admin:true,targetUrl:"/help/rules",targetLabel:"Konnektora Kuralları"}});
}

export async function notifyRemovedEntity(db: PrismaService,kind:"event"|"place",id:string,label:string,key:string,mediaUrl?:string) {
 const target=kind==="event"?await db.event.findUnique({where:{id}}):await db.place.findUnique({where:{id}});
 if(!target)return;
 const managers=kind==="event"?await db.eventParticipant.findMany({where:{eventId:id,role:{in:["manager","organizer"]},status:{in:["accepted","attended","not_attending"]}},select:{userId:true}}):await db.placeMember.findMany({where:{placeId:id,role:{in:["manager","organizer"]},status:"accepted"},select:{userId:true}});
 const recipients=new Map<string,boolean>([...managers.map(row=>[row.userId,false] as [string,boolean]),...(target.createdById?[[target.createdById,false] as [string,boolean]]:[])]);
 if(kind==="event"&&!mediaUrl){const tickets=await db.ownedEventTicket.findMany({where:{eventId:id,status:{in:["active","used"]}},select:{ownerId:true}});for(const ticket of tickets)if(!recipients.has(ticket.ownerId))recipients.set(ticket.ownerId,true);}
 for(const [userId,ticket] of recipients)await recordActivity(db,{userId,type:"moderation_decision",title:"İçerik yayından kaldırıldı",body:`Konnektora: ${ticket?"Biletiniz olan": "Yöneticisi olduğunuz"} ${ticket&&"startsAt" in target?`${target.startsAt.toLocaleString("tr-TR",{timeZone:target.timezone})} zamanındaki `:""}“${label}” ${kind==="event"?"etkinliği":"mekânı"}${mediaUrl?" içindeki medya":""}, kurallar gereği yayından kaldırılmıştır.${ticket?" Ücret iadesi (varsa) ödeme yaptığınız kanal üzerinden gerçekleştirilecektir.":""} Konnektora Kurallarını öğrenmek için Destek Merkezini ziyaret ediniz.`,targetType:kind,targetId:id,key:`moderation:${key}`,context:{admin:true,mediaUrl,targetUrl:"/help/rules",targetLabel:"Konnektora Kuralları"}});
}
