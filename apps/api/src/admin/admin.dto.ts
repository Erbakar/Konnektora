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
