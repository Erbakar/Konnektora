import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getInviteAssessment } from "../lib/api";
const Target=createContext<{kind:"event"|"place";id:string}|null>(null);
export function InviteAssessmentProvider({kind,id,children}:{kind:"event"|"place";id:string;children:ReactNode}) {return <Target.Provider value={{kind,id}}>{children}</Target.Provider>;}
export function useInviteTargetKind() {return useContext(Target)?.kind;}
export function useInviteAssessment(ids:string[]) {
 const target=useContext(Target);const stable=[...new Set(ids)].sort();
 return useQuery({queryKey:["invite-assessment",target?.kind,target?.id,stable.join(",")],enabled:Boolean(target&&stable.length),retry:false,queryFn:async()=>{const rows:Awaited<ReturnType<typeof getInviteAssessment>>=[];for(let i=0;i<stable.length;i+=100)rows.push(...await getInviteAssessment(target!.kind,target!.id,stable.slice(i,i+100)));return rows;}});
}
