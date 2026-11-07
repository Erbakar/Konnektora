import { Prisma, User } from "@prisma/client";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { publicName } from "../common/public-name";
import { audienceAllows, audienceForViewer } from "../common/privacy-context";
export type ActivityContext = { actorId?: string; groupKey?: string; postId?: string; targetUrl?: string; targetLabel?: string; ticketCount?: number; hiddenDiscovery?: boolean; admin?: boolean; mediaUrl?: string; decision?: string; oldValue?: string; newValue?: string };
type DB = Pick<PrismaService,"notification"|"user"|"userBlock"|"userFollow"|"contentComment"|"contentNotificationSubscription"|"tag"|"event"|"place"|"eventParticipant"|"placeMember"|"contactInvite"|"eventInvitation"|"placeInvitation"|"ownedEventTicket"|"ticketTransfer">;
export async function recordActivity(db: Pick<DB,"notification">, input: {userId:string;type:string;title:string;body:string;targetType?:string;targetId?:string;key:string;context?:ActivityContext;createdAt?:Date}) {
 const {key,...data}=input;
 await db.notification.createMany({data:[{...data,eventKey:`${input.userId}:${key}`,context:(input.context??{}) as Prisma.InputJsonValue}],skipDuplicates:true});
}
export const actorLabel = (actor: {name:string;username?:string|null;accountType?:string;companyName?:string|null}) => `${publicName(actor)}${actor.username?` (@${actor.username})`:""}`;
export async function targetVisible(db: DB, kind: string, id: string, viewerId: string, actorId?:string) {
 const blocked=await db.userBlock.findFirst({where:{OR:[{userId:viewerId,targetType:kind as any,targetId:id},...(actorId?[{targetType:"user" as const,OR:[{userId:viewerId,targetId:actorId},{userId:actorId,targetId:viewerId}]}]:[])]},select:{userId:true}});
 if(blocked)return false;
 if(kind==="tag")return Boolean(await db.tag.findFirst({where:{id,status:"active"},select:{id:true}}));
 if(kind==="event")return Boolean(await db.event.findFirst({where:{id,status:"published",OR:[{visibility:"open"},{createdById:viewerId},{participants:{some:{userId:viewerId,status:{in:["accepted","attended","invited","not_attending"]}}}}]},select:{id:true}}));
 if(kind==="place")return Boolean(await db.place.findFirst({where:{id,status:"active",OR:[{visibility:"open"},{createdById:viewerId},{members:{some:{userId:viewerId,status:{in:["accepted","invited"]}}}}]},select:{id:true}}));
 return true;
}
export async function notifyMembershipInvite(db:DB, actor:User, recipient:{id:string;privacySettings?:{directoryDiscoverable?:boolean}|null}, key:string, viaContact=false) {
 const settings=viaContact?(recipient.privacySettings??(await db.user.findUnique({where:{id:recipient.id},select:{privacySettings:true}}))?.privacySettings):null;
 const hidden=viaContact&&settings?.directoryDiscoverable===false;
 await recordActivity(db,{userId:recipient.id,type:"membership_invite",title:"Üyeliğe davet edildiniz",body:`${actorLabel(actor)} sizi Konnektora’ya davet etti.${hidden?' Sizi göremedi çünkü “Arkadaşlarım beni aramada bulabilsin” gizlilik ayarınız kapalı.':""}`,targetType:"user",targetId:actor.id,key:`membership:${actor.id}`,context:{actorId:actor.id,hiddenDiscovery:hidden}});
}
export async function notifyRegistration(db:DB,user:User) {
 const hashes=[user.email?.trim().toLowerCase(),user.phone].filter((v):v is string=>Boolean(v)).map(v=>createHash("sha256").update(v).digest("hex"));
 const invites=hashes.length?await db.contactInvite.findMany({where:{recipientHash:{in:hashes}},select:{id:true,userId:true,createdAt:true},orderBy:{createdAt:"desc"}}):[];
 const senders=new Map(invites.map(invite=>[invite.userId,invite]));
 const history=await db.notification.findMany({where:{userId:user.id,type:"membership_invite"},select:{id:true,context:true,createdAt:true}});
 for(const item of history){const actorId=(item.context as ActivityContext|null)?.actorId;if(actorId&&!senders.has(actorId))senders.set(actorId,{id:item.id,userId:actorId,createdAt:item.createdAt});}
 if(user.invitedById&&!senders.has(user.invitedById))senders.set(user.invitedById,{id:`direct:${user.id}`,userId:user.invitedById,createdAt:user.createdAt});
 for(const [senderId,invite]of senders){
  if(senderId===user.id)continue;
  const sender=await db.user.findUnique({where:{id:senderId}});if(!sender)continue;
  await recordActivity(db,{userId:user.id,type:"membership_invite",title:"Üyeliğe davet edildiniz",body:`${actorLabel(sender)} sizi Konnektora’ya davet etti.`,targetType:"user",targetId:senderId,key:`membership:${senderId}`,context:{actorId:senderId},createdAt:invite.createdAt});
  await recordActivity(db,{userId:senderId,type:"invite_registered",title:"Davetiniz üzerine üye oldu",body:`${actorLabel(user)} davetiniz üzerine üye oldu.`,targetType:"user",targetId:user.id,key:`registered:${user.id}`,context:{actorId:user.id}});
 }
}
export function mentionedUsernames(body:string){return [...new Set([...body.matchAll(/(?:^|[^\p{L}\p{N}_@])@([\p{L}\p{N}_.-]+)/gu)].map(match=>match[1]!.toLowerCase()))];}
export async function notifyComment(db:DB,comment:{id:string;authorId:string|null;body:string;targetType:string;targetId:string;parentId?:string|null}) {
 if(!comment.authorId)return;
 const actor=await db.user.findUnique({where:{id:comment.authorId}});if(!actor)return;
 let parent=comment.parentId?await db.contentComment.findUnique({where:{id:comment.parentId}}):null;
 if(comment.targetType==="tag_comment")parent=await db.contentComment.findUnique({where:{id:comment.targetId}});
 const kind=parent?.targetType??comment.targetType;const targetId=parent?.targetId??comment.targetId;
 if(!["tag","event","place"].includes(kind))return;
 const target:any=kind==="tag"?await db.tag.findUnique({where:{id:targetId}}):kind==="event"?await db.event.findUnique({where:{id:targetId}}):await db.place.findUnique({where:{id:targetId}});
 if(!target)return;
 const title=target.title??target.name;const noun=kind==="tag"?"etiketindeki":kind==="event"?"etkinliğindeki":"mekânındaki";
 const url=`/${kind==="tag"?"tags":kind==="event"?"events":"places"}/${target.slug}#post-${comment.id}`;
 const context={actorId:actor.id,postId:comment.id,targetUrl:url,targetLabel:parent?"yorumunda":"iletisinde"};
 const postAuthor=parent?.authorId?await db.user.findUnique({where:{id:parent.authorId},select:{username:true}}):null;
 const mentioned=mentionedUsernames(comment.body);
 const recipients=mentioned.length?await db.user.findMany({where:{status:"active",username:{in:mentioned,mode:"insensitive"}},select:{id:true}}):[];
 for(const user of recipients){if(user.id===actor.id||!await targetVisible(db,kind,targetId,user.id,actor.id))continue;
  const author=parent?.authorId===actor.id?"kendi iletisindeki yorumunda":parent?`@${postAuthor?.username??"bir kullanıcı"} isimli kullanıcının iletisindeki yorumunda`:"iletisinde";
  await recordActivity(db,{userId:user.id,type:"mention",title:"Sizden bahsedildi",body:`@${actor.username??actor.name} ${title} ${noun} ${author} sizden bahsetti.`,targetType:kind,targetId,key:`mention:${comment.id}`,context});
 }
 if(parent?.authorId&&parent.authorId!==actor.id&&await targetVisible(db,kind,targetId,parent.authorId,actor.id))await recordActivity(db,{userId:parent.authorId,type:"comment",title:"İletinize yorum yazıldı",body:`@${actor.username??actor.name} ${title} ${noun} iletinize yorum yazdı.`,targetType:kind,targetId,key:`comment:${comment.id}`,context:{...context,targetLabel:"yorum",groupKey:`comment:${parent.id}:${new Date().toISOString().slice(0,10)}`}});
 const subscriptions=await db.contentNotificationSubscription.findMany({where:{enabled:true,OR:[{targetType:kind,targetId},{targetType:"user",targetId:actor.id}]}});
 const manager=target.createdById===actor.id || (kind==="event"?Boolean(await db.eventParticipant.findFirst({where:{eventId:targetId,userId:actor.id,role:{in:["manager","organizer"]},status:{in:["accepted","attended","not_attending"]}}})):kind==="place"?Boolean(await db.placeMember.findFirst({where:{placeId:targetId,userId:actor.id,role:{in:["manager","organizer"]},status:"accepted"}})):false);
 for(const sub of subscriptions){if(sub.userId===actor.id||!await targetVisible(db,kind,targetId,sub.userId,actor.id))continue;
  if(sub.targetType==="user"&&(kind==="event"||kind==="place")){
   const context=await audienceForViewer(db as PrismaService,sub.userId);const settings=await db.user.findUnique({where:{id:actor.id},select:{privacySettings:true}});
   if(!audienceAllows(actor.id,kind==="event"?settings?.privacySettings?.eventAudience??"everybody":settings?.privacySettings?.placeAudience??"everybody",context))continue;
  }
  const type=sub.targetType==="user"?"subscribed_user_post":manager?"subscribed_manager_post":"subscribed_post";
  await recordActivity(db,{userId:sub.userId,type,title:"Yeni ileti",body:`@${actor.username??actor.name}, bildirimlerini açtığınız ${title} ${kind==="tag"?"etiketine":kind==="event"?"etkinliğine":"mekânına"}${manager?" yönetici olarak":""} ileti yazdı.`,targetType:kind,targetId,key:`${type}:${comment.id}`,context:{...context,targetLabel:"ileti",groupKey:`${type}:${kind}:${targetId}:${new Date().toISOString().slice(0,10)}`}});
 }
}

export async function isUndiscoverable(db: Pick<PrismaService,"privacySettings">,id:string) { return (await db.privacySettings.findUnique({where:{userId:id},select:{directoryDiscoverable:true}}))?.directoryDiscoverable===false; }

export async function notifyUserActivity(db:PrismaService,actorId:string,kind:"tag"|"event"|"place",targetId:string,action:string,key:string) {
 const [actor,target,subscriptions]=await Promise.all([db.user.findUnique({where:{id:actorId},include:{privacySettings:true}}),kind==="tag"?db.tag.findUnique({where:{id:targetId}}):kind==="event"?db.event.findUnique({where:{id:targetId}}):db.place.findUnique({where:{id:targetId}}),db.contentNotificationSubscription.findMany({where:{targetType:"user",targetId:actorId,enabled:true}})]);
 if(!actor||!target)return;
 const affinity=kind==="tag"?await db.userInterestTag.findUnique({where:{userId_tagId:{userId:actorId,tagId:targetId}},select:{sentiment:true}}):null;
 const sentiment=affinity?({like:"Beğeniyorum",dislike:"Beğenmiyorum",neutral:"Kararsızım"} as Record<string,string>)[affinity.sentiment]:undefined;
 for(const sub of subscriptions){if(sub.userId===actorId||!await targetVisible(db,kind,targetId,sub.userId,actorId))continue;
  const context=await audienceForViewer(db,sub.userId);
  if((kind==="event"||kind==="place")&&!audienceAllows(actorId,kind==="event"?actor.privacySettings?.eventAudience??"everybody":actor.privacySettings?.placeAudience??"everybody",context))continue;
  await recordActivity(db,{userId:sub.userId,type:`subscribed_user_${action}`,title:"Takip ettiğiniz kullanıcıdan güncelleme",body:`Bildirimlerini açtığınız @${actor.username??actor.name} ${sentiment?`“${sentiment}” diyerek `:""}“${"title" in target?target.title:target.name}” ${action==="joined"?(kind==="event"?"etkinliğine":"mekânına"):(kind==="tag"?"etiketini":kind==="event"?"etkinliğini":"mekânını")} ${action==="created"?"oluşturdu":action==="tagged"?"profiline ekledi":"katıldı"}.`,targetType:kind,targetId,key:`user:${key}`,context:{actorId}});
 }
}
/** Bildirimi açık bir kullanıcı profiline medya yükledi (07/11 #23). Aynı saat içindeki yüklemeler tek bildirimde toplanır. */
export async function notifyProfileMediaAdded(db:PrismaService,actorId:string,at=new Date()) {
 const actor=await db.user.findFirst({where:{id:actorId,status:"active"},select:{id:true,name:true,username:true,accountType:true,companyName:true,privacySettings:{select:{profileNameAudience:true}}}});
 if(!actor)return;
 const subscriptions=await db.contentNotificationSubscription.findMany({where:{targetType:"user",targetId:actorId,enabled:true},select:{userId:true}});
 const bucket=at.toISOString().slice(0,13);
 for(const sub of subscriptions){
  if(sub.userId===actorId||!await targetVisible(db,"user",actorId,sub.userId,actorId))continue;
  await recordActivity(db,{userId:sub.userId,type:"subscribed_user_media",title:"Takip ettiğiniz kullanıcıdan güncelleme",body:`Bildirimlerini açtığınız @${actor.username??actor.name} isimli kullanıcı profiline yeni medya ekledi.`,targetType:"user",targetId:actorId,key:`user:media:${actorId}:${bucket}`,context:{actorId,groupKey:`user-media:${actorId}:${bucket}`}});
 }
}
export async function notifyEntityCreated(db:PrismaService,kind:"event"|"place",id:string,actorId?:string) {
 const target:any=kind==="event"?await db.event.findUnique({where:{id},include:{tags:true}}):await db.place.findUnique({where:{id},include:{tags:true}});if(!target)return;
 if(actorId)await notifyUserActivity(db,actorId,kind,id,"created",`created:${kind}:${id}`);
 const tags=target.tags.map((row:any)=>row.tagId);
 const subscriptions=await db.contentNotificationSubscription.findMany({where:{enabled:true,OR:[{targetType:"tag",targetId:{in:tags}},...(kind==="event"&&target.placeId?[{targetType:"place",targetId:target.placeId}]:[])]},include:{user:{select:{city:true}}}});
 for(const sub of subscriptions){if(sub.userId===actorId||!await targetVisible(db,kind,id,sub.userId,actorId))continue;
  if(sub.targetType==="tag"&&(!sub.user.city||!target.city||sub.user.city.localeCompare(target.city,undefined,{sensitivity:"accent"})!==0))continue;
  const lineup=sub.targetType==="tag"&&JSON.stringify(target.lineup??[]).includes(sub.targetId);
  await recordActivity(db,{userId:sub.userId,type:lineup?"subscribed_tag_lineup":"subscribed_entity_created",title:kind==="event"?"Yeni etkinlik":"Yeni mekân",body:`${sub.targetType==="tag"?"Bölgenizde bildirimlerini açtığınız etiketle ilişkili":"Bildirimlerini açtığınız mekânda"} ${kind==="event"?"yeni bir etkinlik":"yeni bir mekân"} ${lineup?"programına eklendi":"oluşturuldu"}.`,targetType:kind,targetId:id,key:`created:${kind}:${id}:${sub.targetType}:${sub.targetId}`,context:{actorId}});
 }
}
/** Bildirim metinleri için "01.11.2026 02:00" biçimi; etkinliğin saat diliminde gösterilir. */
export function formatNotificationDateTime(value:Date,timeZone="Europe/Istanbul") {
 const format=(zone:string)=>{const parts=Object.fromEntries(new Intl.DateTimeFormat("tr-TR",{timeZone:zone,day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(value).map(part=>[part.type,part.value]));return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}`;};
 try{return format(timeZone);}catch{return format("Europe/Istanbul");}
}
export async function notifyEntityChanges(db:PrismaService,kind:"event"|"place",before:any,after:any) {
 const fields=kind==="event"?["title","placeId","locationName","locationAddress","city","region","country","startsAt","endsAt"]:["name","address","city","region","country"];
 const changes=fields.filter(field=>String(before[field]??"")!==String(after[field]??""));if(!changes.length)return;
 const participants=kind==="event"?await db.eventParticipant.findMany({where:{eventId:after.id,status:{in:["accepted","attended","not_attending"]}},select:{userId:true}}):await db.placeMember.findMany({where:{placeId:after.id,status:"accepted"},select:{userId:true}});
 const subs=await db.contentNotificationSubscription.findMany({where:{targetType:kind,targetId:after.id,enabled:true},select:{userId:true}});
 const tickets=kind==="event"?await db.ownedEventTicket.findMany({where:{eventId:after.id,status:{in:["active","used"]}},select:{ownerId:true}}):[];
 const recipients=new Set([...participants.map(row=>row.userId),...subs.map(row=>row.userId),...tickets.map(row=>row.ownerId),...(after.createdById?[after.createdById]:[])]);
 const labels:Record<string,string>={title:"Etkinlik adı",name:"Mekân adı",placeId:"Etkinlik mekânı",locationName:"Etkinlik yeri",locationAddress:"Etkinlik adresi",startsAt:"Etkinlik başlangıcı",endsAt:"Etkinlik bitişi",address:"Mekân adresi",city:"Şehir",region:"Eyalet",country:"Ülke"};
 for(const field of changes)for(const userId of recipients){
  if(!await targetVisible(db,kind,after.id,userId))continue;
  const zone=after.timezone??before.timezone??"Europe/Istanbul";
  let oldValue=before[field] instanceof Date?formatNotificationDateTime(before[field],zone):String(before[field]??"Belirtilmemiş");let newValue=after[field] instanceof Date?formatNotificationDateTime(after[field],zone):String(after[field]??"Belirtilmemiş");
  if(field==="placeId"){
   const [oldPlace,newPlace]=await Promise.all([before.placeId?db.place.findUnique({where:{id:before.placeId},select:{name:true}}):null,after.placeId?db.place.findUnique({where:{id:after.placeId},select:{name:true}}):null]);
   oldValue=oldPlace?.name??"Belirtilmemiş";newValue=newPlace?.name??"Belirtilmemiş";
  }
  const refund=kind==="event"&&!["title"].includes(field);
  await recordActivity(db,{userId,type:`${kind}_changed`,title:`${labels[field]} değiştirildi`,body:`Eski ${labels[field]!.toLowerCase()} “${oldValue}” olan ${kind==="event"?"etkinliğin":"mekânın"} yeni bilgisi “${newValue}” olarak değiştirildi.${refund?" Biletiniz var ve iade etmek isterseniz Biletlerim sayfasını ziyaret ediniz.":""}`,targetType:kind,targetId:after.id,key:`change:${kind}:${after.id}:${field}:${String(after.updatedAt)}:${newValue}`,context:{targetLabel:refund?"Biletlerim sayfası":undefined,targetUrl:refund?"/tickets":undefined,oldValue,newValue}});
 }
}
export async function notifyEventAvailability(db:PrismaService,now=new Date()) {
 const subscriptions=await db.contentNotificationSubscription.findMany({where:{enabled:true,targetType:"event"}});
 const ids=[...new Set(subscriptions.map(row=>row.targetId))];if(!ids.length)return;
 const events=await db.event.findMany({where:{id:{in:ids},status:"published"},include:{ticketTypeRecords:true}});
 for(const event of events)for(const sub of subscriptions.filter(row=>row.targetId===event.id)){
  if(!await targetVisible(db,"event",event.id,sub.userId))continue;
  const hours=(event.startsAt.getTime()-now.getTime())/3600000;
  if(hours>11.5&&hours<=12.5)await recordActivity(db,{userId:sub.userId,type:"event_reminder",title:"Etkinliğiniz yaklaşıyor",body:"Bildirimlerini açtığınız etkinlik 12 saat sonra başlayacak.",targetType:"event",targetId:event.id,key:`12hour:${event.id}:${event.startsAt.toISOString()}`});
  const available=event.ticketTypeRecords.filter(type=>type.status==="active"&&type.capacity>type.soldCount&&(!type.saleEndsAt||type.saleEndsAt>now));
  for(const type of available){
   const changed=type.availabilityChangedAt??type.createdAt;
   if(changed<=now&&changed.getTime()>now.getTime()-86400000)await recordActivity(db,{userId:sub.userId,type:"event_ticket_available",title:"Yeni bilet kontenjanı",body:"Bildirimlerini açtığınız etkinliğe yeni bilet veya bilet kontenjanı tanımlandı.",targetType:"event",targetId:event.id,key:`availability:${type.id}:${changed.toISOString()}`,context:{targetUrl:`/events/${event.slug}#tickets`,targetLabel:"yeni bilet"}});
  }
  const first=available.map(type=>type.saleStartsAt??type.createdAt).sort((a,b)=>a.getTime()-b.getTime())[0];
  if(first&&first<=now&&first.getTime()>now.getTime()-86400000)await recordActivity(db,{userId:sub.userId,type:"event_sale_started",title:"Bilet satışı başladı",body:"Bildirimlerini açtığınız etkinlik bilet satışına başladı.",targetType:"event",targetId:event.id,key:`sales:${event.id}:${first.toISOString()}`,context:{targetUrl:`/events/${event.slug}#tickets`,targetLabel:"bilet satışı"}});
 }
}
