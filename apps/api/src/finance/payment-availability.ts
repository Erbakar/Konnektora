import { ServiceUnavailableException } from "@nestjs/common";
// Live charges, refunds, KYC and transfers must never be simulated in production.
export function requireSandboxEnvironment() {
  if (!["development", "test"].includes(process.env.NODE_ENV ?? "")) throw new ServiceUnavailableException("Ödeme hizmeti henüz etkin değil. İşlem gerçekleştirilmedi.");
}
