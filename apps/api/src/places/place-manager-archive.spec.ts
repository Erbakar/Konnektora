import { ForbiddenException } from "@nestjs/common";
import { PlacesService } from "./places.service";
describe("23/10 #32 place manager archive permission",()=>{
 it("allows accepted managers while rejecting unrelated members",async()=>{
 const prisma={place:{findUnique:jest.fn().mockResolvedValue({id:"place",createdById:"creator"}),update:jest.fn().mockResolvedValue({status:"archived"})},placeMember:{findFirst:jest.fn().mockResolvedValue(null)}};
 const service=new PlacesService(prisma as never,{} as never,{} as never,{} as never,{} as never,{} as never);
 const actor={id:"viewer",role:"user"} as never;
 await expect(service.archive("place",actor)).rejects.toBeInstanceOf(ForbiddenException);
 expect(prisma.place.update).not.toHaveBeenCalled();
 prisma.placeMember.findFirst.mockResolvedValue({userId:"viewer"} as never);
 await expect(service.archive("place",actor)).resolves.toEqual({status:"archived"});
 expect(prisma.placeMember.findFirst).toHaveBeenCalledWith({where:{placeId:"place",userId:"viewer",status:"accepted",role:{in:["manager","organizer"]}},select:{userId:true}});
 });
});
