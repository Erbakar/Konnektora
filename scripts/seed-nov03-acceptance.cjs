// Disposable local acceptance data. This script intentionally cannot target production.
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');
const fs = require('node:fs');
const db = new PrismaClient({ datasourceUrl: 'postgresql://qa@localhost:55433/konnektora_test' });

async function comment(targetType, targetId, authorId, body, parentId) {
  return await db.contentComment.findFirst({ where: { targetType, targetId, authorId, body, parentId: parentId ?? null } })
    ?? db.contentComment.create({ data: { targetType, targetId, authorId, body, parentId } });
}

(async () => {
  const users = [];
  for (const [i, name] of ['Ziyaretçi Test', 'Gizli İsim', 'Kurum Temsilcisi'].entries()) {
    users.push(await db.user.upsert({
      where: { email: `nov03-${i}@test.local` }, update: {},
      create: {
        email: `nov03-${i}@test.local`, username: `nov03user${i}`, name,
        passwordHash: await hash('LocalQA123!', 10), status: 'active', emailVerified: true,
        phoneVerified: true, phone: `+1555123000${i}`, onboardingCompletedAt: new Date(),
        memberPlan: 'platinum', accountType: i === 2 ? 'corporate' : 'individual',
        companyName: i === 2 ? 'Test Markası' : null, businessPlan: i === 0 ? 'platinum' : 'free',
        city: 'Gizli Şehir', country: 'TR', gender: 'female', birthDate: new Date('1990-01-01'),
        privacySettings: { create: { profileNameAudience: i === 1 ? 'nobody' : 'everybody', locationAudience: 'nobody', demographicsAudience: 'nobody', directoryDiscoverable: true } },
      },
    }));
  }
  const [a, b, c] = users;
  const event = await db.event.upsert({ where: { slug: 'nov03-test' }, update: {}, create: {
    slug: 'nov03-test', title: '3 Kasım kabul testi', summary: 'Gerçek yerel API testi',
    description: 'Etkinlik açıklaması', startsAt: new Date('2026-12-15T18:00:00Z'),
    endsAt: new Date('2026-12-15T21:00:00Z'), timezone: 'Europe/Istanbul', format: 'offline',
    language: 'tr', createdById: a.id, status: 'published', city: 'Istanbul', country: 'TR',
  } });
  const place = await db.place.upsert({ where: { slug: 'nov03-place' }, update: {}, create: {
    slug: 'nov03-place', name: 'Kabul testi mekânı', description: 'Test mekânı', createdById: a.id, status: 'active', city: 'Istanbul', country: 'TR',
  } });
  const tag = await db.tag.upsert({ where: { slug: 'nov03-tag' }, update: {}, create: { slug: 'nov03-tag', name: 'Kabul testi', status: 'active' } });
  for (const user of users) await db.userInterestTag.upsert({ where: { userId_tagId: { userId: user.id, tagId: tag.id } }, update: {}, create: { userId: user.id, tagId: tag.id, sentiment: 'like' } });
  for (const [targetType, targetId] of [['event', event.id], ['place', place.id]]) {
    const post = await comment(targetType, targetId, b.id, 'Yerel test gönderisi: takip yıldızı ve beğeni iki yönde çalışmalı.');
    await comment(targetType, targetId, c.id, 'Alt yorum testi.', post.id);
  }
  const tagPost = await comment('tag', tag.id, b.id, 'Etiket gönderisi takip ve beğeni testi');
  await comment('tag_comment', tagPost.id, c.id, 'Etiket alt yorumu');
  if (!await db.privateMessage.findFirst({ where: { senderId: b.id, recipientId: a.id } })) await db.privateMessage.create({ data: { senderId: b.id, recipientId: a.id, body: 'Gizli ad görünmemeli.' } });
  const list = await db.guestList.findFirst({ where: { ownerId: a.id, name: '3 Kasım QA' } })
    ?? await db.guestList.create({ data: { ownerId: a.id, name: '3 Kasım QA', members: { create: { userId: b.id } } } });
  await db.eventParticipant.upsert({ where: { eventId_userId: { eventId: event.id, userId: c.id } }, update: {}, create: { eventId: event.id, userId: c.id, status: 'accepted', role: 'attendee' } });
  await db.placeMember.upsert({ where: { placeId_userId: { placeId: place.id, userId: c.id } }, update: {}, create: { placeId: place.id, userId: c.id, status: 'accepted', role: 'member' } });
  for (const [i, price] of [100, 250].entries()) {
    const name = i ? 'Standart' : 'Erken dönem';
    if (!await db.eventTicketType.findFirst({ where: { eventId: event.id, name } })) await db.eventTicketType.create({ data: { eventId: event.id, name, capacity: 20, price, currency: 'TRY', salesPlatform: 'external', externalSalesUrl: 'https://example.com/tickets' } });
  }
  const body = 'Akış gönderisi: tırnak ve metin yan yana. Link https://example.com';
  if (!await db.post.findFirst({ where: { authorId: b.id, body } })) await db.post.create({ data: { authorId: b.id, body, visibility: 'everybody' } });
  if (!await db.notification.findFirst({ where: { userId: a.id, targetId: event.id, title: 'Yeni yorum' } })) await db.notification.create({ data: { userId: a.id, type: 'comment', title: 'Yeni yorum', body: 'Yeni yorum eklendi', targetType: 'event', targetId: event.id, context: { actorId: b.id } } });
  fs.mkdirSync('tmp', { recursive: true });
  fs.mkdirSync('output/nov03-qa', { recursive: true });
  fs.writeFileSync('tmp/nov03-fixtures.json', JSON.stringify({ users: users.map(({ id, email, username }) => ({ id, email, username })), event, place, tag, list }, null, 2));
  console.log('Isolated acceptance fixtures ready. No external messages sent.');
})().finally(() => db.$disconnect()).catch(error => { console.error(error.message); process.exitCode = 1; });
