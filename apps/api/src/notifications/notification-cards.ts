import { PrismaService } from "../prisma/prisma.service";
import { audienceAllows, audienceForViewer, privacyContext } from "../common/privacy-context";
import { publicName } from "../common/public-name";
import { ActivityContext, targetVisible } from "./activity-events";
export async function notificationCards(db:PrismaService,viewerId:string,items:any[]) {
 const viewerContext=privacyContext.getStore()??await audienceForViewer(db,viewerId);
 const actorIds=[...new Set(items.map(item=>(item.context as ActivityContext|null)?.actorId).filter((id):id is string=>Boolean(id)))];
 const people=actorIds.length?await db.user.findMany({where:{id:{in:actorIds},status:"active"},include:{privacySettings:true,uploadedMedia:{where:{contentType:"user",status:"active",isProfilePicture:true},select:{url:true},take:1}}}):[];
 const follows=actorIds.length?await db.userFollow.findMany({where:{followerId:viewerId,followingId:{in:actorIds}},select:{followingId:true}}):[];
 const following=new Set(follows.map(row=>row.followingId));
 const actors=new Map(people.map(user=>[user.id,{id:user.id,name:privacyContext.run(viewerContext,()=>publicName(user)),username:user.username,avatarUrl:user.uploadedMedia[0]?.url??null,following:following.has(user.id),canMessage:audienceAllows(user.id,user.privacySettings?.messageAudience??"everybody",viewerContext)} ]));
 const groups=new Map<string,any>();
 for(const item of items){
  const data=(item.context??{})as ActivityContext;
  if(!item.context){groups.set(item.id,item);continue;}
  if(data.actorId&&!actors.has(data.actorId))continue;
  if(data.actorId&&viewerContext.blocked.has(data.actorId))continue;
  if(data.actorId&&item.type.startsWith("subscribed_user_")&&["event","place"].includes(item.targetType)){
   const owner=people.find(person=>person.id===data.actorId);const audience=item.targetType==="event"?owner?.privacySettings?.eventAudience:owner?.privacySettings?.placeAudience;
   if(!audienceAllows(data.actorId,audience??"everybody",viewerContext))continue;
  }
  if(["tag","event","place"].includes(item.targetType)&&!data.admin&&!await targetVisible(db as any,item.targetType,item.targetId,viewerId,data.actorId))continue;
  const actor=data.actorId?actors.get(data.actorId):undefined;
  let entity:any=null;
  if(item.targetType==="event"){
   const event=await db.event.findUnique({where:{id:item.targetId},select:{id:true,slug:true,title:true,coverImageUrl:true,locationName:true,city:true,country:true,startsAt:true,endsAt:true}});
   if(event)entity={id:event.id,type:"event",title:event.title,imageUrl:event.coverImageUrl,location:[event.locationName,event.city,event.country].filter(Boolean).join(", "),startsAt:event.startsAt,endsAt:event.endsAt,url:`/events/${event.slug}`};
  }else if(item.targetType==="place"){
   const place=await db.place.findUnique({where:{id:item.targetId},select:{id:true,slug:true,name:true,coverImageUrl:true,city:true,country:true}});
   if(place)entity={id:place.id,type:"place",title:place.name,imageUrl:place.coverImageUrl,location:[place.city,place.country].filter(Boolean).join(", "),url:`/places/${place.slug}`};
  }
  let body=item.body;const label=actor?`${actor.name}${actor.username?` (@${actor.username})`:""}`:"Konnektora";
  if(item.type==="membership_invite")body=data.hiddenDiscovery?`${label} sizi aradı ve zaten üye olduğunuzu bilmediğinden sizi üyeliğe davet etmek istedi. Sizi göremedi çünkü “Arkadaşlarım beni aramada bulabilsin” gizlilik ayarınız kapalı.`:`${label} sizi Konnektora’ya davet etti.`;
  if(item.type==="invite_registered")body=`${label} davetiniz üzerine üye oldu.`;
  if(item.type==="ticket_transfer")body=`${label} size ${data.ticketCount??1} adet etkinlik biletini devretti.${data.hiddenDiscovery?' Sizi göremedi çünkü “Arkadaşlarım beni aramada bulabilsin” gizlilik ayarınız kapalı.':""} Detay ve koşullar için Biletlerime git.`;
  let canRespond=false;
  if(["event_invite","event_manager"].includes(item.type)){const participation=await db.eventParticipant.findUnique({where:{eventId_userId:{eventId:item.targetId,userId:viewerId}},select:{status:true}});canRespond=participation?.status==="invited";body=`@${actor?.username??actor?.name??"Bir üye"} sizi etkinliğe${item.type==="event_manager"?" yönetici olarak":""} davet etti.`;}
  if(["place_invite","place_manager"].includes(item.type)){const membership=await db.placeMember.findUnique({where:{placeId_userId:{placeId:item.targetId,userId:viewerId}},select:{status:true}});canRespond=membership?.status==="invited";body=`@${actor?.username??actor?.name??"Bir üye"} sizi mekâna${item.type==="place_manager"?" yönetici olarak":""} davet etti.`;}
  const card={...item,body,actors:actor?[actor]:[],entity,canRespond,admin:Boolean(data.admin),mediaUrl:data.mediaUrl??null,targetUrl:data.admin?"/help/rules":data.targetUrl??item.targetUrl,targetLabel:data.admin?"Konnektora Kuralları":data.targetLabel??item.targetLabel};
  const key=data.groupKey??item.id;const previous=groups.get(key);
  if(!previous){groups.set(key,card);continue;}
  for(const person of card.actors)if(!previous.actors.some((existing:any)=>existing.id===person.id))previous.actors.push(person);
  if(!card.readAt)previous.readAt=null;
  const count=previous.actors.length;
  if(count>1){const names=previous.actors.map((person:any)=>`@${person.username??person.name}`);
   if(item.type==="comment")previous.body=`${names[0]} ve ${count-1} başka kullanıcı${previous.entity?.title?` “${previous.entity.title}” içindeki`:""} iletinize yorum yazdılar.`;
   else if(item.type.includes("invite")||item.type.endsWith("manager"))previous.body=`${names.join(", ")} sizi ${item.targetType==="event"?"etkinliğe":"mekâna"}${item.type.endsWith("manager")?" yönetici olarak":""} davet ettiler.`;
   else previous.body=`${names[0]} ve ${count-1} başka kullanıcı bildirimlerini açtığınız içeriğe iletiler yazdılar.`;
  }
 }
 return [...groups.values()];
}
