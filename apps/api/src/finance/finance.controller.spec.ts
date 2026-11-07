import "reflect-metadata";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/permissions";
import { AdminFinanceController } from "./finance.controller";
describe("Finance access", () => {
  it("requires the dedicated finance permission for account, transaction and payout endpoints", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AdminFinanceController)).toEqual(["finance.manage"]);
  });
});

import { GUARDS_METADATA } from "@nestjs/common/constants";
import { FinanceController } from "./finance.controller";
import { WalletGuard } from "./wallet-access.controller";
import { CuratorFinanceController } from "../curator-finance/curator-finance.controller";
it.each(["history", "dashboard", "settings", "payout"])("protects %s server-side with wallet verification", name => {
 expect(Reflect.getMetadata(GUARDS_METADATA, FinanceController.prototype[name as keyof FinanceController])).toContain(WalletGuard);
});
it("guards curator ledger but leaves membership eligibility available without opening wallet",()=>{
 expect(Reflect.getMetadata(GUARDS_METADATA,CuratorFinanceController)).toContain(WalletGuard);
 expect(Reflect.getMetadata(GUARDS_METADATA,FinanceController.prototype.membership)??[]).not.toContain(WalletGuard);
});
