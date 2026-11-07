import { moderationCopy } from "./moderation-copy";
describe("moderation notification context",()=>{
 it.each([["tag_comment","tag","etiketinde"],["event_comment","event","etkinliğinde"],["place_comment","place","mekânında"]])("identifies the target and author of %s",(type,kind,noun)=>{
  const copy=moderationCopy(type,{title:"Original text",owner:{username:"author"},payload:{rootLabel:"Target",rootKind:kind}});
  expect(copy.description).toContain(`“Target” ${noun}`);expect(copy.subject).toContain("@author");expect(copy.excerpt).toBe("Original text");
 });
 it("identifies the parent post author for a removed reply",()=>{
  const copy=moderationCopy("comment_reply",{payload:{parent:{author:{username:"parent"}},rootLabel:"Target",rootKind:"event",excerpt:"Reply"}});
  expect(copy.description).toContain("@parent");expect(copy.description).toContain("yorum");expect(copy.excerpt).toBe("Reply");
 });
 it("distinguishes profile media from event media",()=>{
  expect(moderationCopy("media",{}).description).toContain("Profilinizde");
  expect(moderationCopy("media",{payload:{rootLabel:"Festival",rootKind:"event"}}).description).toContain("Festival” etkinliğinde");
 });
});
