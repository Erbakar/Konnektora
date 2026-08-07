import { Type } from "class-transformer";
import { IsEmail, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

export class FinanceSettingsDto {
  @IsIn(["TRY", "EUR", "USD", "GBP"]) preferredCurrency!: string;
  @IsOptional() @IsString() @MaxLength(180) legalName?: string;
  @IsOptional() @IsString() @MaxLength(40) taxNumber?: string;
  @IsOptional() @IsString() @MaxLength(120) taxOffice?: string;
  @IsOptional() @IsEmail() billingEmail?: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(300) addressLine?: string;
  @IsOptional() @IsString() @MaxLength(80) bankProvider?: string;
  @IsOptional() @IsString() @MaxLength(120) bankAccountLabel?: string;
  @IsOptional() @IsString() @MinLength(4) @MaxLength(4) bankAccountLast4?: string;
}
export class CreatePaymentDto { @IsString() @MinLength(8) @MaxLength(120) idempotencyKey!: string; }
export class ConfirmPaymentDto { @IsString() @MinLength(8) @MaxLength(200) paymentMethodToken!: string; }
export class RefundPaymentDto { @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) amount?: number; @IsOptional() @IsString() @MaxLength(300) reason?: string; }
export class PayoutDto { @Type(() => Number) @IsNumber() @Min(1) amount!: number; }
export class BusinessPlanDto {
  @IsIn(["starter", "growth", "scale"]) plan!: "starter" | "growth" | "scale";
  @IsOptional() @IsString() @MinLength(8) @MaxLength(200) paymentMethodToken?: string;
}

export class MemberPlanDto {
  @IsIn(["free", "plus", "premium"]) plan!: "free" | "plus" | "premium";
  @IsOptional() @IsString() paymentMethodToken?: string;
}
