import { PlaceMemberRole, PlaceMemberStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUrl, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";

export class PlaceQueryDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(120) country?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize?: number;
}

export class CreatePlaceDto {
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(120) country?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(240) address?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(500) coverImageUrl?: string;
}

export class UpdatePlaceDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(120) country?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(240) address?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(500) coverImageUrl?: string;
}

export class InvitePlaceMemberDto {
  @IsOptional() @IsUUID() userId?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(PlaceMemberRole) role?: PlaceMemberRole;
}

export class UpdatePlaceMemberDto {
  @IsOptional() @IsEnum(PlaceMemberStatus) status?: PlaceMemberStatus;
  @IsOptional() @IsEnum(PlaceMemberRole) role?: PlaceMemberRole;
}

export class RespondPlaceInviteDto {
  @IsEnum(PlaceMemberStatus) status!: PlaceMemberStatus;
}
