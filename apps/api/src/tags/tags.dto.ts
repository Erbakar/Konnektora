import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateTagDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class MergeTagDto {
  @IsUUID()
  targetTagId!: string;
}
