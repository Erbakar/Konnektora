import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { EventsService } from '../apps/api/src/events/events.service';
import { PlacesService } from '../apps/api/src/places/places.service';
import { TicketsService } from '../apps/api/src/tickets/tickets.service';
import { NotificationsService } from '../apps/api/src/notifications/notifications.service';
import { ContactsService } from '../apps/api/src/contacts/contacts.service';
import { notifyRegistration } from '../apps/api/src/notifications/activity-events';
import { notificationCards } from '../apps/api/src/notifications/notification-cards';
const connection=process.env.TEST_DATABASE_URL;
if(!connection)throw new Error('TEST_DATABASE_URL is required.');
const url=new URL(connection);if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!url.pathname.includes('test'))throw new Error('Only a disposable local test database is allowed.');
const db=new PrismaClient({datasourceUrl:connection});
const results:string[]=[];const pass=(text:string)=>{results.push(text);console.log('PASS',text)};
const sent:string[]=[];
const mail:any={getAppUrl:()=> 'http://localhost:4309'};const sms:any={};
for(const method of ['sendContactInviteEmail','sendEventInviteEmail','sendPlaceInviteEmail','sendTicketTransferEmail','sendNotificationEmail'])mail[method]=async()=>{sent.push(method);return {provider:'local-test'}};
for(const method of ['sendContactInvite','sendEventInvite','sendPlaceInvite','sendTicketTransfer'])sms[method]=async()=>{sent.push(method);return {provider:'local-test'}};
const auth:any={createInviteAcceptToken:async()=> 'local-test-token'};
const notifications=new NotificationsService(db as any,mail,{} as any);
const events=new EventsService(db as any,mail,auth,notifications,sms);
const places=new PlacesService(db as any,notifications,{} as any,auth,mail,sms);
const tickets=new TicketsService(db as any,notifications,auth,mail,sms);
const contacts=new ContactsService(db as any,mail,sms);
async function main(){
 const stamp=Date.now();let serial=0;
 const actor=await db.user.create({data:{email:`matrix-actor-${stamp}@test.local`,name:'Corporate Representative',username:`matrix${stamp}`,passwordHash:'test',role:'curator',status:'active',accountType:'corporate',companyName:'Test Company'}});
 const other=await db.user.create({data:{email:`matrix-other-${stamp}@test.local`,name:'Other',username:`other${stamp}`,passwordHash:'test',role:'curator',status:'active'}});
 const event=await db.event.create({data:{title:'Matrix event',slug:`matrix-${stamp}`,summary:'Test',description:'Test',startsAt:new Date(Date.now()+86400000),timezone:'UTC',format:'offline',language:'tr',createdById:actor.id}});
 await db.eventParticipant.createMany({data:[{eventId:event.id,userId:actor.id,role:'organizer',status:'accepted'},{eventId:event.id,userId:other.id,role:'manager',status:'accepted'}]});
 const place=await db.place.create({data:{name:'Matrix place',slug:`matrix-${stamp}`,createdById:actor.id}});
 const scenarios=['new-email','new-phone','hidden-email','hidden-phone','public-email','public-phone','username'] as const;
 async function recipient(scenario:typeof scenarios[number]){
  const number=++serial;const email=`matrix-${stamp}-${number}@test.local`;const phone=`+1202${String(stamp).slice(-4)}${String(number).padStart(3,'0')}`;
  const username=`person${stamp}${number}`;const registered=!scenario.startsWith('new');
  if(registered)await db.user.create({data:{email,phone,phoneVerified:true,name:'Recipient',username,status:'active',passwordHash:'test',privacySettings:{create:{directoryDiscoverable:!scenario.startsWith('hidden')}}}});
  return {email,phone,username,registered,input:scenario==='username'?{username}:scenario.endsWith('phone')?{phone,name:'Recipient'}:{email,name:'Recipient'}};
 }
 for(const kind of ['event','place'] as const)for(const manager of [false,true])for(const scenario of scenarios){
  const person=await recipient(scenario);sent.length=0;
  if(kind==='event')await events.inviteParticipant(event.id,{...person.input,role:manager?'manager':'attendee'},actor);
  else await places.invite(place.id,{...person.input,role:manager?'manager':'member'},actor);
  const user=await db.user.findFirstOrThrow({where:scenario.endsWith('phone')?{phone:person.phone}:{email:person.email}});
  const type=`${kind}_${manager?'manager':'invite'}`;
  const rows=await db.notification.findMany({where:{userId:user.id}});
  assert.equal(rows.filter(row=>row.type===type).length,1);
  const membershipExpected=!person.registered||scenario.startsWith('hidden');
  assert.equal(rows.filter(row=>row.type==='membership_invite').length,membershipExpected?1:0);
  if(!person.registered){assert(sent.includes(scenario.endsWith('phone')?'sendContactInvite':'sendContactInviteEmail'));await db.user.update({where:{id:user.id},data:{status:'active',username:person.username}});await notifyRegistration(db as any,{...user,status:'active'});assert.equal(await db.notification.count({where:{userId:actor.id,type:'invite_registered',targetId:user.id}}),1);}
  const cards=await notificationCards(db as any,user.id,await db.notification.findMany({where:{userId:user.id},orderBy:{createdAt:'desc'}}));
  const invitation=cards.find(card=>card.type===type);assert.equal(invitation.canRespond,true);assert.equal(invitation.entity.type,kind);assert.equal(invitation.actors[0].name,'Test Company');
  await notifications.respondToInvitation(user.id,invitation.id,manager?'accept':'decline');
  const changed=kind==='event'?await db.eventParticipant.findUniqueOrThrow({where:{eventId_userId:{eventId:event.id,userId:user.id}}}):await db.placeMember.findUniqueOrThrow({where:{placeId_userId:{placeId:place.id,userId:user.id}}});
  assert.equal(changed.status,manager?'accepted':'declined');assert.equal(changed.role,manager?'manager':kind==='event'?'attendee':'member');
  pass(`${kind} ${manager?'manager':'participant'} ${scenario}: membership count, corporate identity, entity and response`);
 }
 const denied=await db.user.create({data:{email:`denied-${stamp}@test.local`,username:`denied${stamp}`,name:'Denied',passwordHash:'test',status:'active',privacySettings:{create:{eventInviteAudience:'nobody',placeInviteAudience:'nobody'}}}});
 await assert.rejects(()=>events.inviteParticipant(event.id,{username:denied.username!},actor));await assert.rejects(()=>places.invite(place.id,{username:denied.username!},actor));assert.equal(await db.notification.count({where:{userId:denied.id}}),0);pass('invitation privacy rejects event and place invitations without notifications');
 const type=await db.eventTicketType.create({data:{eventId:event.id,name:'Free test',capacity:100,price:0}});
 for(const scenario of scenarios){
  const person=await recipient(scenario);sent.length=0;
  const order=await db.eventTicketOrder.create({data:{eventId:event.id,ticketTypeId:type.id,buyerId:actor.id,quantity:2,unitPrice:0,totalAmount:0,currency:'TRY',status:'paid',tickets:{create:[0,1].map(()=>({eventId:event.id,ticketTypeId:type.id,ownerId:actor.id,qrToken:randomUUID(),qrTokenHash:createHash('sha256').update(randomUUID()).digest('hex')}))}},include:{tickets:true}});
  const response=await tickets.transfer({...person.input,ticketIds:order.tickets.map(ticket=>ticket.id)},actor);assert.equal(response.transferred,2);assert.equal(response.deliveryFailed,false);if(scenario.endsWith('phone'))assert(sent.includes('sendTicketTransfer'));
  const rows=await db.notification.findMany({where:{userId:response.recipient.id},orderBy:{createdAt:'desc'}});const card=(await notificationCards(db as any,response.recipient.id,rows)).find(item=>item.type==='ticket_transfer');assert(card);assert.match(card.body,/2 adet/);assert.equal(card.targetUrl,'/tickets');assert.equal(Boolean(card.body.includes('gizlilik ayarınız kapalı')),scenario.startsWith('hidden'));
  assert.equal(await db.ownedEventTicket.count({where:{orderId:order.id,ownerId:response.recipient.id}}),2);if(!person.registered)assert(sent.includes(scenario.endsWith('phone')?'sendContactInvite':'sendContactInviteEmail'));
  pass(`ticket transfer ${scenario}: two tickets, discovery privacy, membership and detail link`);
 }
 for(const kind of ['event','place'] as const){
  const person=await recipient('new-email');
  if(kind==='event'){await events.inviteParticipant(event.id,{email:person.email},actor);await events.inviteParticipant(event.id,{email:person.email},other);}
  else {await places.invite(place.id,{email:person.email},actor);await places.invite(place.id,{email:person.email},other);}
  const user=await db.user.findUniqueOrThrow({where:{email:person.email}});await db.user.update({where:{id:user.id},data:{status:'active',username:person.username}});await notifyRegistration(db as any,user);
  const cards=await notificationCards(db as any,user.id,await db.notification.findMany({where:{userId:user.id},orderBy:{createdAt:'desc'}}));
  assert.equal(cards.filter(row=>row.type==='membership_invite').length,2);const invites=cards.filter(row=>row.type===`${kind}_invite`);assert.equal(invites.length,1);assert.equal(invites[0].actors.length,2);assert.match(invites[0].body,/davet ettiler/);assert.equal(await db.notification.count({where:{type:'invite_registered',targetId:user.id}}),2);pass(`${kind} non-member invitation retains both senders across signup and groups the entity card`);
 }
 const recruit=await recipient('new-email');await contacts.invite(actor.id,{contacts:[{name:'Recipient',email:recruit.email}]});await contacts.invite(other.id,{contacts:[{name:'Recipient',email:recruit.email}]});
 const registered=await db.user.create({data:{email:recruit.email,name:'Recruit',username:recruit.username,status:'active',passwordHash:'test'}});await notifyRegistration(db as any,registered);await notifyRegistration(db as any,registered);
 assert.equal(await db.notification.count({where:{userId:registered.id,type:'membership_invite'}}),2);assert.equal(await db.notification.count({where:{type:'invite_registered',targetId:registered.id}}),2);pass('contact signup records every inviter and notifies each exactly once');
 console.log(JSON.stringify({verified:true,checks:results.length,results},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>db.$disconnect());
