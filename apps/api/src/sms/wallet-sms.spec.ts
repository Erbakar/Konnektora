import { SmsService } from "./sms.service";
describe("wallet SMS delivery",()=>{
 afterEach(()=>jest.restoreAllMocks());
 it("fails closed even when authentication bypass is enabled",async()=>{const config={get:(key:string)=>key==="ALLOW_SMS_VERIFICATION_BYPASS"?"true":undefined};await expect(new SmsService(config as never).sendWalletCode("+905551112233","12345678")).rejects.toThrow("yapılandırılmamış");});
 it("requires provider acceptance and includes the correct expiry",async()=>{const config={get:(key:string)=>({SMS_WEBHOOK_URL:"https://sms.example.test",SMS_API_KEY:"test-key"})[key]};const send=jest.spyOn(global,"fetch").mockResolvedValue({ok:false} as Response);const service=new SmsService(config as never);await expect(service.sendWalletCode("+905551112233","12345678")).rejects.toThrow("gönderilemedi");send.mockResolvedValue({ok:true} as Response);await service.sendWalletCode("+905551112233","12345678");expect(JSON.parse(String(send.mock.calls[1]?.[1]?.body)).message).toContain("3 dakika");});
});
