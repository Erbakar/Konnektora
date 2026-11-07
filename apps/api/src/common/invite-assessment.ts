import { PrismaService } from "../prisma/prisma.service";
import { memberCompatibility } from "./compatibility";
import { audienceAllows, audienceForViewer } from "./privacy-context";
export async function assessInvitees(db:PrismaService,actorId:string,kind:"event"|"place",targetId:string,ids:string[]) {
 const context=await audienceForViewer(db,actorId);
 const [users,scores]=await Promise.all([db.user.findMany({where:{id:{in:ids},status:"active"},select:{id:true,privacySettings:true,lastOnlineAt:true,interestTags:{select:{tagId:true,sentiment:true}}}}),memberCompatibility(db,actorId,ids)]);
 const scoreMap=new Map(scores.map(row=>[row.id,row]));
 const participants=kind==="event"?await db.eventParticipant.findMany({where:{eventId:targetId,status:{in:["accepted","attended"]}},select:{user:{select:{interestTags:{select:{tagId:true,sentiment:true}}}}}}):await db.placeMember.findMany({where:{placeId:targetId,status:"accepted"},select:{user:{select:{interestTags:{select:{tagId:true,sentiment:true}}}}}});
 const eventIds=kind==="place"?(await db.event.findMany({where:{placeId:targetId,status:"published"},select:{id:true}})).map(row=>row.id):[];
 const past=await db.eventParticipant.findMany({where:{userId:{in:ids},status:{in:["accepted","attended"]},event:{endsAt:{lt:new Date()},...(kind==="place"?{id:{in:eventIds}}:{createdById:actorId})}},select:{userId:true},distinct:["userId"]});
 const pastIds=new Set(past.map(row=>row.userId));
 return users.map(user=>{
  const audience=kind==="event"?user.privacySettings?.eventInviteAudience:user.privacySettings?.placeInviteAudience;
  const canInvite=user.id!==actorId&&audienceAllows(user.id,audience??"everybody",context);
  const pair=scoreMap.get(user.id);const own=new Set(user.interestTags.map(row=>`${row.tagId}:${row.sentiment}`));
  const mean=participants.length?participants.reduce((sum,row)=>{const count=row.user.interestTags.filter(tag=>own.has(`${tag.tagId}:${tag.sentiment}`)).length;return sum+Math.min(100,count*14);},0)/participants.length:0;
  const recent=Boolean(user.lastOnlineAt&&user.lastOnlineAt.getTime()>Date.now()-30*86400000);
  const reasons=[...(pair&&pair.commonTagCount>0?["shared_interests"]:[]),...(pair&&pair.eventPartner>0?["event_partner"]:[]),...(mean>0?["attendee_compatibility"]:[]),...(pastIds.has(user.id)?["past_attendee"]:[]),...(recent?["active_recently"]:[])];
  return {id:user.id,canInvite,eventPartner:pair?.eventPartner??0,attendeeCompatibility:Math.round(mean),score:Math.min(100,Math.round(((pair?.overall??0)+(pair?.eventPartner??0)+mean)/3)+(pastIds.has(user.id)?6:0)+(recent?2:0)),reasons,sharedInterestCount:pair?.commonTagCount??0};
 });
}
