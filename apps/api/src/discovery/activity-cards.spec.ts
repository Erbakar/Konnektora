import { additionalActivities } from "./activity-cards";
const now = new Date();
const actor = { id: "actor", name: "Private Name", username: "alias", uploadedMedia: [], privacySettings: { profileNameAudience: "nobody" } };
const event = { id: "event", title: "Concert", slug: "concert", startsAt: now, createdAt: now, createdById: "owner", place: { name: "Venue", slug: "venue" }, tags: [], participants: [{ userId: "viewer", role: "attendee" }, { userId: "actor", role: "manager" }], ticketTypeRecords: [] };
function database() { return { eventRevision: { findMany: jest.fn().mockResolvedValue([]) }, contentComment: { findMany: jest.fn().mockResolvedValue([]) }, event: { findMany: jest.fn().mockResolvedValue([]) }, place: { findMany: jest.fn().mockResolvedValue([]) }, tag: { findMany: jest.fn().mockResolvedValue([]) }, mediaFile: { findMany: jest.fn().mockResolvedValue([]) }, userInterestTag: { findMany: jest.fn().mockResolvedValue([]) } }; }
it.each(["tag", "place", "event"])("creates %s post cards with private actor names protected and attached media", async kind => {
 const db = database(); db.contentComment.findMany.mockResolvedValue([{ id: "comment", targetType: kind, targetId: kind, authorId: "actor", author: actor, createdAt: now, body: "Hello" }]);
 if (kind === "event") db.event.findMany.mockResolvedValueOnce([event]);
 if (kind === "place") db.place.findMany.mockResolvedValue([{ id: kind, name: "Venue", slug: "venue", members: [], createdById: "owner" }]);
 if (kind === "tag") db.tag.findMany.mockResolvedValue([{ id: kind, name: "Music", slug: "music" }]);
 db.mediaFile.findMany.mockResolvedValue([{ id: "media", contentId: "comment", url: "/uploads/video.mp4", type: "video" }]);
 const result = await additionalActivities(db as never, "viewer", [], {});
 expect(result[0]).toMatchObject({ kind, body: "Hello", actor: { name: "alias" }, media: [{ type: "video" }], canManageContent: false }); expect(JSON.stringify(result)).not.toContain("Private Name");
 if (kind === "event") expect(result[0]?.action).toBe("Etkinlik yöneticisi ileti yazdı");
});
it("does not expose posts whose target was deleted, hidden or inaccessible", async () => {
 const db = database(); db.contentComment.findMany.mockResolvedValue([{ id: "comment", targetType: "event", targetId: "hidden", authorId: "actor", author: actor, createdAt: now, body: "Secret" }]);
 expect(await additionalActivities(db as never, undefined, ["blocked"], {})).toEqual([]);
 expect(db.event.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "published", OR: [{visibility:"open"}] }) }));
 expect(db.contentComment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ author: { status: "active", id: { notIn: ["blocked"] } } }) }));
});
it("groups recent profile interests in descending query order with all expansion links", async () => {
 const db = database(); db.userInterestTag.findMany.mockResolvedValue(Array.from({ length: 7 }, (_, i) => ({ userId: actor.id, tagId: String(i), createdAt: now, user: actor, tag: { id: String(i), name: `Tag ${i}`, slug: `tag-${i}` } })));
 const result = await additionalActivities(db as never, undefined, [], {}); expect(result).toHaveLength(1); expect(result[0]?.tags).toHaveLength(7); expect(result[0]?.actor?.name).toBe("alias");
});
it("includes creations from followed people, places and interests", async () => {
 const db = database(); db.event.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...event, createdBy: actor }]).mockResolvedValueOnce([]);
 const result = await additionalActivities(db as never, "viewer", [], {}); expect(result[0]).toMatchObject({ action: "Etkinlik oluşturuldu", place: { slug: "venue" } });
 expect(db.event.findMany.mock.calls[1]?.[0].where.OR).toHaveLength(3);
});
it("separates new tickets, capacity increases and the first sale without emitting future sales", async () => {
 const db = database(); const future = new Date(Date.now() + 86400000); const tickets = [{ id: "one", createdAt: now, availabilityChangedAt: null, saleStartsAt: now, capacity: 10, soldCount: 0 }, { id: "two", createdAt: now, availabilityChangedAt: now, saleStartsAt: future, capacity: 20, soldCount: 10 }];
 db.event.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...event, ticketTypeRecords: tickets }]);
 const result = await additionalActivities(db as never, "viewer", [], {}); expect(result.map(r => r.action)).toEqual(["Katıldığınız etkinliğe yeni bilet tanımlandı", "Katıldığınız etkinlikte yeni bilet kontenjanı açıldı", "Katıldığınız etkinlik bilet satışına başladı"]);
 expect(db.event.findMany.mock.calls[2]?.[0].where.participants.some).toEqual({ userId: "viewer", status: { in: ["accepted", "attended"] } });
});
it("respects time filters and never claims a future sale has started", async () => {
 const db = database(); db.event.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...event, ticketTypeRecords: [{ id: "one", createdAt: new Date(0), saleStartsAt: new Date(Date.now() + 86400000), capacity: 1, soldCount: 0 }] }]);
 expect(await additionalActivities(db as never, "viewer", [], { gte: now })).toEqual([]);
});

it("uses revision time for a newly followed lineup tag and ignores unrelated edits", async () => {
 const db=database(); db.eventRevision.findMany.mockResolvedValue([{id:"rev",createdAt:now,actorId:"owner",before:{tagIds:["old"]},after:{tagIds:["old","new"]},event:{...event,tags:[{tagId:"new",tag:{id:"new",name:"DJ",slug:"dj"}}]}},{id:"other",createdAt:now,before:{tagIds:["new"]},after:{tagIds:["new"]},event:{...event,tags:[{tagId:"new",tag:{id:"new",name:"DJ",slug:"dj"}}]}}]);
 const result=await additionalActivities(db as never,"viewer",[],{});expect(result).toHaveLength(1);expect(result[0]).toMatchObject({action:"Takip ettiğiniz etiket etkinliğe eklendi",occurredAt:now,tags:[{slug:"dj"}]});
});
