import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class AdminContentQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;
}

export class UpdateAdminContentStatusDto {
  @IsString()
  @IsIn(["active", "archived", "hidden", "deleted", "banned"])
  status!: string;
}
