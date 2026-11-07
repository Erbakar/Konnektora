// Read-only production checks. No SMS, payment or user mutation is performed.
const { PrismaClient } = require('@prisma/client');
const { createHmac } = require('node:crypto');
const prisma = new PrismaClient();
function sign(id) {
 const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
 const now=Math.floor(Date.now()/1000);
 const payload=Buffer.from(JSON.stringify({sub:id,role:'user',iat:now,exp:now+60})).toString('base64url');
 return `${header}.${payload}.${createHmac('sha256',process.env.JWT_SECRET).update(`${header}.${payload}`).digest('base64url')}`;
}
(async()=>{
 const corporate=await prisma.user.findFirst({where:{status:'active',accountType:'corporate',role:'user'},select:{id:true}});
 const individual=await prisma.user.findFirst({where:{status:'active',accountType:'individual',role:'user'},select:{id:true}});
 const results=[];
 for(const [kind,user] of [['corporate',corporate],['individual',individual]]) {
  if(!user) throw new Error(`Missing ${kind} read-only test account`);
  const token=sign(user.id);
  for(const [path,expected] of [['/me/membership',200],['/me/finance',403],['/me/finance/transactions',403]]) {
   const response=await fetch(`http://127.0.0.1:${process.env.PORT||3000}/api${path}`,{headers:{authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});
   if(response.status!==expected)throw new Error(`${kind} ${path}: ${response.status}, expected ${expected}`);
   if(path==='/me/membership') { const data=await response.json();if(!data.limits||!data.period||!data.used)throw new Error('Membership quota fields missing'); }
   results.push({kind,path,status:response.status});
  }
 }
 const usage=await prisma.planUsage.groupBy({by:['kind'],_count:{_all:true}});
 console.log(JSON.stringify({checks:results,usage:usage.map(row=>({kind:row.kind,count:row._count._all})),smsConfigured:Boolean(process.env.SMS_WEBHOOK_URL&&process.env.SMS_API_KEY),emailConfigured:Boolean(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM)}));
})().catch(error=>{console.error(error.message);process.exitCode=1}).finally(()=>prisma.$disconnect());
