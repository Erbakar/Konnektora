import { Type } from "class-transformer";
import { IsArray, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";
import { UserRole, UserStatus } from "@prisma/client";
import { ADMIN_PERMISSIONS, AdminPermission } from "../auth/permissions";

export class AdminUserQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  @IsIn(["individual", "corporate"])
  accountType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  joinedFrom?: string;

  @IsOptional()
  @IsString()
  joinedTo?: string;

  @IsOptional()
  @IsString()
  lastOnlineFrom?: string;

  @IsOptional()
  @IsString()
  lastOnlineTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsUUID()
  adminRoleGroupId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  gender?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  website?: string;

  @IsOptional()
  @IsString()
  @IsIn(["individual", "corporate"])
  accountType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  tradeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  businessCategory?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  followerCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  followingCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  penaltyScoreLastYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  penaltyScoreAllTime?: number;
}

export class CreateAdminRoleGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @IsIn(ADMIN_PERMISSIONS, { each: true })
  permissions!: AdminPermission[];
}

export class UpdateAdminRoleGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsIn(ADMIN_PERMISSIONS, { each: true })
  permissions?: AdminPermission[];

  @IsOptional()
  @IsString()
  @IsIn(["active", "passive"])
  status?: string;
}
