import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { KycStatus } from "@prisma/client";
import { CorporateKycService } from "./corporate-kyc.service";
describe("CorporateKycService",()=>{const application={findUnique:jest.fn(),upsert:jest.fn(),update:jest.fn(),findMany:jest.fn()};const document={create:jest.fn(),findFirst:jest.fn(),delete:jest.fn(),findUnique:jest.fn()};const audit={create:jest.fn()};const account={upsert:jest.fn()};const notification={create:jest.fn()};const tx={corporateKycApplication:application,corporateKycDocument:document,corporateKycAuditLog:audit,financialAccount:account,notification};const prisma={...tx,$transaction:jest.fn(async(fn:any)=>fn(tx))};const notifications={dispatch:jest.fn()};const service=new CorporateKycService(prisma as never,notifications as never);const corporate={id:"11111111-1111-4111-8111-111111111111",accountType:"corporate"} as any;
beforeEach(()=>jest.clearAllMocks());
it("blocks non-corporate applicants",async()=>{await expect(service.getMine({...corporate,accountType:"individual"})).rejects.toBeInstanceOf(ForbiddenException)});
it("requires at least two different document types before submission",async()=>{application.findUnique.mockResolvedValue({id:"a",userId:corporate.id,status:KycStatus.not_started,legalName:"A",registrationNumber:"1",taxNumber:"12345",incorporationCountry:"TR",incorporationDate:new Date(),registeredAddress:"Address long",businessActivity:"Tech",representativeName:"Name",representativeTitle:"CEO",representativeEmail:"a@b.com",representativePhone:"1234567",representativeBirthDate:new Date(),beneficialOwners:[{name:"Owner"}],termsAccepted:true,informationConfirmed:true,documents:[]});await expect(service.submit(corporate)).rejects.toBeInstanceOf(BadRequestException)});
it("requires a rejection reason",async()=>{application.findUnique.mockResolvedValue({id:"a",userId:corporate.id,status:KycStatus.pending});await expect(service.decide("a",{id:"admin"} as any,{status:"rejected"})).rejects.toBeInstanceOf(BadRequestException)});
it("23/10 #31 accepts two distinct document types and rejects duplicates",async()=>{
 const base={id:"a",userId:corporate.id,status:KycStatus.not_started,legalName:"A",registrationNumber:"1",taxNumber:"12345",incorporationCountry:"TR",incorporationDate:new Date(),registeredAddress:"Address long",businessActivity:"Tech",representativeName:"Name",representativeTitle:"CEO",representativeEmail:"a@b.com",representativePhone:"1234567",representativeBirthDate:new Date(),beneficialOwners:[{name:"Owner"}],termsAccepted:true,informationConfirmed:true};
 application.findUnique.mockResolvedValue({...base,documents:[{type:"tax_certificate"},{type:"tax_certificate"}]});
 await expect(service.submit(corporate)).rejects.toThrow("en az 2");
 const documents=[{type:"tax_certificate"},{type:"bank_proof"}];
 application.findUnique.mockResolvedValue({...base,documents});
 application.update.mockResolvedValue({...base,status:KycStatus.pending,documents});
 const result=await service.submit(corporate);
 expect(result.status).toBe(KycStatus.pending);
 expect(account.upsert).toHaveBeenCalled();
});

});
