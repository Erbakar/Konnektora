import { IsIn, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";
export const revenueCategories = ["event_gate", "sponsorship", "corporate_subscription", "individual_subscription", "researcher_subscription", "extra_invite", "extra_message", "event_banner_ad", "tag_sponsorship_ad", "tag_theme_ad", "other_corporate"] as const;
export class PlatformRevenueDto {
 @IsOptional() @IsUUID() customerId?: string;
 @IsString() @MinLength(3) @MaxLength(180) sourceKey!: string;
 @IsIn(revenueCategories) category!: string;
 @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(999999999) amount!: number;
 @IsIn(["TRY", "USD", "EUR", "GBP"]) currency!: string;
 @IsString() @MinLength(1) @MaxLength(80) country!: string;
 @IsString() @MinLength(1) @MaxLength(120) city!: string;
 @IsOptional() @IsString() @MaxLength(120) region?: string;
 @IsOptional() @IsUUID() eventId?: string;
 @IsString() @MinLength(3) @MaxLength(500) description!: string;
 @IsISO8601() occurredAt!: string;
}
export class RevenueRefundDto { @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(999999999) refundedAmount!: number; }
