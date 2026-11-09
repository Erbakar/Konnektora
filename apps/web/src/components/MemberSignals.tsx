import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { followUser, getMemberCompatibility, getUserSession, listFollowing, unfollowUser } from "../lib/api";
import { useLanguage } from "../lib/i18n";
type Score = Awaited<ReturnType<typeof getMemberCompatibility>>[number];
const Scores = createContext<Map<string, Score>>(new Map());
export function MemberSignalsProvider({ids,children}:{ids:string[];children:ReactNode}) {
 const viewer=getUserSession(); const stable=[...new Set(ids)].filter(id=>id!==viewer?.id).sort();
 const query=useQuery({queryKey:["member-compatibility",viewer?.id,stable.join(",")],enabled:Boolean(viewer&&stable.length),retry:false,queryFn:async()=>{
  const result:Score[]=[];for(let i=0;i<stable.length;i+=100) result.push(...await getMemberCompatibility(stable.slice(i,i+100)));return result;
 }});
 return <Scores.Provider value={new Map((query.data??[]).map(score=>[score.id,score]))}>{children}</Scores.Provider>;
}
/** matchScore/matchLabel yalnız etkinlik/mekân yöneticilerine verilir ve "Genel uyum"dan önce gösterilir (07/11 #49, #50). */
export function MemberCompatibility({id,showFollowers=false,commonTagCount,matchScore,matchLabel}:{id:string;showFollowers?:boolean;commonTagCount?:number;matchScore?:number;matchLabel?:string}) {
 const {language}=useLanguage();const tr=language==="tr";const score=useContext(Scores).get(id);const viewer=getUserSession();
 if(!viewer||viewer.id===id)return null;
 return <div className="member-compatibility">{showFollowers&&score?<small>{score.followerCount} {tr?"takipçi":"followers"}</small>:null}{matchScore!==undefined&&matchLabel?<span className="compatibility-score is-match"><span>{matchLabel}</span><strong>{Math.min(100,matchScore)}</strong></span>:null}<span className="compatibility-score"><span>{tr?"Genel uyum":"Overall compatibility"}</span><strong>{score?`%${score.overall}`:"—"}</strong></span><span className="compatibility-score is-partner"><span>{tr?"Etkinlik partneri uyumu":"Event partner compatibility"}</span><strong>{score?`%${score.eventPartner}`:"—"}</strong></span>{(score?.commonTagCount??commonTagCount??0)>0?<span className="compatibility-score is-shared"><span>{tr?"Ortak ilgi alanı":"Shared interests"}</span><strong>{score?.commonTagCount??commonTagCount}</strong></span>:null}</div>;
}
export function FollowStar({id, ariaLabel}:{id:string; ariaLabel?:string}) {
 const viewer=getUserSession();const client=useQueryClient();const {language}=useLanguage();
 const following=useQuery({queryKey:["following",viewer?.id],queryFn:listFollowing,enabled:Boolean(viewer&&viewer.id!==id)});
 const active=following.data?.some(user=>user.id===id)??false;
 const toggle=useMutation({mutationFn:()=>active?unfollowUser(id):followUser(id),onSuccess:async()=>{await Promise.all([client.invalidateQueries({queryKey:["following"]}),client.invalidateQueries({queryKey:["member-suggestions"]}),client.invalidateQueries({queryKey:["new-members"]}),client.invalidateQueries({queryKey:["public-profile"]}),client.invalidateQueries({queryKey:["member-compatibility"]}),client.invalidateQueries({queryKey:["community"]})]);}});
 if(!viewer||viewer.id===id)return null;
 return <><button type="button" className="follow-star" aria-pressed={active} aria-label={ariaLabel ?? (language==="tr"?active?"Takibi bırak":"Takip et":active?"Unfollow":"Follow")} disabled={following.isLoading||toggle.isPending} onClick={event=>{event.preventDefault();event.stopPropagation();toggle.mutate();}}><Star size={17} fill={active?"currentColor":"none"}/></button>{toggle.isError ? <span className="form-error" role="alert">{toggle.error instanceof Error ? toggle.error.message : "Takip durumu değiştirilemedi."}</span> : null}</>;
}
