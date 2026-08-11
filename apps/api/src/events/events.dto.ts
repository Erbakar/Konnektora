import {
  EventFormat,
  EventParticipantRole,
  EventParticipantStatus,
  EventStatus,
  EventVisibility,
} from "@prisma/client";
import {
  IsArray,
  ArrayMaxSize,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Matches,
  Min,
  Max,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";

export class EventQueryDto {
  @IsOptional()
  @IsIn(["popular", "following", "for_you", "mine"])
  scope?: "popular" | "following" | "for_you" | "mine";

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsEnum(EventFormat)
  format?: EventFormat;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}

export class ScanCheckInTicketDto {
  @IsString()
  @MinLength(64)
  @MaxLength(64)
  @Matches(/^[a-f0-9]{64}$/)
  token!: string;
}

export class CreateEventDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsUUID()
  placeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  summary?: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  timezone?: string;

  @IsEnum(EventFormat)
  format!: EventFormat;

  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  locationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  locationAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(16)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  organizerName?: string;

  @IsOptional()
  @IsUrl()
  externalRegistrationUrl?: string;

  @IsOptional() @IsUrl() liveUrl?: string;
  @IsOptional() @IsString() @MaxLength(3000) timeline?: string;
  @IsOptional() @IsArray() lineup?: Array<{
    type?: "heading" | "subheading" | "session" | "break";
    title: string;
    startsAt?: string;
    description?: string;
  }>;
  @IsOptional() @IsArray() ticketTypes?: Array<{
    name: string;
    description?: string;
    price: number;
    currency: string;
    capacity?: number;
    saleStartsAt?: string;
    saleEndsAt?: string;
    gateOpensAt?: string;
    gateClosesAt?: string;
    status?: string;
  }>;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsIn(["TRY", "EUR", "USD", "GBP"]) currency?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID("4", { each: true })
  tagIds?: string[];
}

export class InviteParticipantDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^\+?[1-9]\d{7,14}$/)
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsEnum(EventParticipantRole)
  role?: EventParticipantRole;
}

export class UpdateParticipantDto {
  @IsEnum(EventParticipantStatus)
  status!: EventParticipantStatus;
}
