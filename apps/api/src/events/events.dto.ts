import { EventFormat, EventParticipantRole, EventParticipantStatus, EventStatus, EventVisibility } from "@prisma/client";
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  Max,
  MinLength
} from "class-validator";
import { Type } from "class-transformer";

export class EventQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  language?: string;

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

export class CreateEventDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(300)
  summary!: string;

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

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  timezone!: string;

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

  @IsString()
  @MinLength(2)
  @MaxLength(16)
  language!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  organizerName?: string;

  @IsOptional()
  @IsUrl()
  externalRegistrationUrl?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  tagIds?: string[];
}

export class InviteParticipantDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

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
