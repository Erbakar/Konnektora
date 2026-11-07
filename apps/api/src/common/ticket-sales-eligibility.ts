import { PrismaService } from "../prisma/prisma.service";
export const ticketSalesRequirement = "Sadece kurumsal üyeler; vergi, bankacılık ayarlarını girmiş ve KYB/KYC sürecini tamamlamış kurumlar Konnektora’da bilet satışı yapabilir. Bu ayarları tamamlamak için Ayarlar Merkezini ziyaret ediniz.";
export async function ticketSalesEligibility(prisma: PrismaService, user: {id:string;accountType:string}) {
 if(user.accountType!=="corporate")return {eligible:false};
 const [billing,account]=await Promise.all([prisma.billingProfile.findUnique({where:{userId:user.id}}),prisma.financialAccount.findUnique({where:{userId:user.id}})]);
 return {eligible:Boolean(billing?.legalName&&billing.taxNumber&&billing.country&&billing.addressLine&&account?.bankProvider&&account.bankAccountLast4&&account.kycStatus==="approved")};
}
