import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";

export class PurchaseTicketsDto { @Type(() => Number) @IsInt() @Min(1) @Max(20) quantity!: number; }
export class TransferTicketsDto {
  @IsArray() @ArrayMinSize(1) @IsUUID("4", { each: true }) ticketIds!: string[];
  @IsOptional() @IsString() @MaxLength(160) username?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(24) phone?: string;
  @IsOptional() @IsString() @MaxLength(160) name?: string;
}
export class RefundTicketOrderDto { @IsOptional() @IsString() @MaxLength(300) reason?: string; }
export class ScanOwnedTicketDto { @IsString() @MaxLength(200) qrPayload!: string; }
export class ManageTicketTypeDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @Type(() => Number) @IsInt() @Min(1) capacity!: number;
  @Type(() => Number) @IsNumber() @Min(0) price!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) perUserLimit?: number;
  @IsString() @MaxLength(8) currency!: string;
  @IsOptional() @IsIn(["door", "konnektora", "external"]) salesPlatform?: "door" | "konnektora" | "external";
  @IsOptional() @IsString() @MaxLength(500) externalSalesUrl?: string;
  @IsOptional() @IsDateString() saleStartsAt?: string; @IsOptional() @IsDateString() saleEndsAt?: string;
  @IsOptional() @IsDateString() gateOpensAt?: string; @IsOptional() @IsDateString() gateClosesAt?: string;
  @IsOptional() @IsIn(["active", "inactive"]) status?: "active" | "inactive";
}
