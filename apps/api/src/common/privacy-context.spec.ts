import { audienceAllows, audienceForViewer, privacyContext } from "./privacy-context";
import { publicName } from "./public-name";
const member={id:"owner",name:"Private name",username:"handle",privacySettings:{profileNameAudience:"following"}};
describe("viewer-aware privacy",()=>{
 it("uses the owner's following direction, not followers of the owner",async()=>{
  const prisma={userFollow:{findMany:jest.fn().mockResolvedValueOnce([{followerId:"owner"}]).mockResolvedValueOnce([{followerId:"second-owner"}])},userBlock:{findMany:jest.fn().mockResolvedValue([])}};
  const context=await audienceForViewer(prisma as never,"viewer");
  expect(prisma.userFollow.findMany).toHaveBeenNthCalledWith(1,{where:{followingId:"viewer"},select:{followerId:true}});
  expect(audienceAllows("owner","following",context)).toBe(true);
  expect(audienceAllows("owner","network",context)).toBe(false);
  expect(audienceAllows("second-owner","network",context)).toBe(true);
  expect(audienceAllows("unrelated","following",context)).toBe(false);
 });
 it("never opens a blocked name or nobody to another account",()=>{
  const context={viewerId:"viewer",following:new Set(["owner"]),network:new Set(["owner"]),blocked:new Set(["owner"])};
  expect(audienceAllows("owner","everybody",context)).toBe(false);
  privacyContext.run({...context,blocked:new Set()},()=>{expect(publicName(member)).toBe("Private name");expect(publicName({...member,privacySettings:{profileNameAudience:"nobody"}})).toBe("handle");});
  expect(publicName(member)).toBe("handle");
 });
 it("isolates concurrent requests and allows self viewing",async()=>{
  const context={following:new Set<string>(),network:new Set<string>(),blocked:new Set<string>()};
  const values=await Promise.all([privacyContext.run({...context,viewerId:"owner"},async()=>{await Promise.resolve();return publicName(member);}),privacyContext.run({...context,viewerId:"stranger"},async()=>{await Promise.resolve();return publicName(member);})]);
  expect(values).toEqual(["Private name","handle"]);
 });
});
