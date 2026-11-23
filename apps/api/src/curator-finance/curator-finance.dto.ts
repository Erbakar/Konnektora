import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested, IsISO8601 } from "class-validator";
export const incomeCategories = ["event_gate", "sponsorship", "ticket_commission", "corporate_subscription", "individual_subscription", "researcher_subscription", "extra_invite", "extra_message", "event_banner_ad", "tag_sponsorship_ad", "tag_theme_ad", "other_corporate", "other", "referral"] as const;
export class TerritoryDto {
  @IsString() @MaxLength(80) country!: string;
  @IsString() @MaxLength(120) city!: string;
  @IsOptional() @IsString() @MaxLength(120) region?: string;
}
export class CuratorReferrerDto {
  @IsUUID() referrerId!: string;
  @IsNumber() @Min(0) @Max(100) referralRate!: number;
}
export class CuratorAgreementDto {
  @IsBoolean() active!: boolean;
  @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => TerritoryDto) territories!: TerritoryDto[];
  @IsObject() rates!: Record<string, number>;
  @IsOptional() @IsUUID() referrerId?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) referralRate?: number;
  /** 23/11 #9: birden fazla referans küratör */
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => CuratorReferrerDto) referrers?: CuratorReferrerDto[];
  @IsOptional() @IsString() @MaxLength(120) bankName?: string;
  @IsOptional() @IsString() @MaxLength(180) accountName?: string;
  @IsOptional() @IsString() @MaxLength(40) iban?: string;
  @IsOptional() @IsString() @MaxLength(1000) paymentDetails?: string;
}
export class CuratorEntryDto {
  @IsIn(["income", "payment"]) kind!: "income" | "payment";
  @IsIn(incomeCategories) category!: string;
  @IsString() @MaxLength(1000) description!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number;
  @IsIn(["TRY", "USD", "EUR", "GBP"]) currency!: string;
  @IsISO8601() occurredAt!: string;
  @IsOptional() @IsUUID() eventId?: string;
  @IsIn(["bank_transfer", "cash", "other"]) method!: string;
  @IsUUID() requestId!: string;
}

/** 23/11 #10: küratörün ödeme talebi. */
export class CuratorPayoutRequestDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) amount!: number;
  @IsIn(["TRY", "USD", "EUR", "GBP"]) currency!: string;
}
