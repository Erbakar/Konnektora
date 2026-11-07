import { EventsService } from "./events.service";
it.each([[10, 20, true], [10, 10, false], [10, 8, false]])("records a feed occurrence only when available capacity grows from %s to %s", async (oldCapacity, newCapacity, emits) => {
 const eventTicketType = { findMany: jest.fn().mockResolvedValue([{id:"ticket",capacity:oldCapacity,soldCount:2,status:"active"}]), update:jest.fn(),create:jest.fn(),updateMany:jest.fn() };
 const service = new EventsService({eventTicketType} as never,{} as never,{} as never,{} as never,{} as never) as unknown as {syncTicketTypes(eventId:string,tickets:unknown[]):Promise<void>};
 await service.syncTicketTypes("event",[{name:"General",capacity:newCapacity,price:0,currency:"TRY"}]);
 const data=eventTicketType.update.mock.calls[0]?.[0].data;
 if(emits) expect(data.availabilityChangedAt).toBeInstanceOf(Date); else expect(data).not.toHaveProperty("availabilityChangedAt");
});
