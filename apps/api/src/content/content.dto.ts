import { ReportTargetType } from "@prisma/client";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUrl, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateMediaDto {
  @IsUrl()
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  @IsEnum(ReportTargetType)
  contentType!: ReportTargetType;

  @IsString()
  @MaxLength(160)
  contentId!: string;
}

export class ReorderProfileMediaDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID("4", { each: true })
  mediaIds!: string[];
}

export class CreateCommentDto {
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;

  @IsString()
  @MaxLength(160)
  targetId!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  @MaxLength(3000)
  body!: string;
}

export class UpdateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  body!: string;
}

export class CreateReactionDto {
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;

  @IsString()
  @MaxLength(160)
  targetId!: string;

  @IsString()
  @MaxLength(40)
  reaction!: string;
}

export class CreatePollDto {
  @IsString()
  @MaxLength(300)
  question!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  options!: string[];

  @IsOptional()
  @IsBoolean()
  allowMultiple?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxChoices?: number;

  @IsOptional()
  @IsBoolean()
  allowOpenAnswer?: boolean;

  @IsOptional()
  @IsIn(["everyone", "participants"])
  audience?: "everyone" | "participants";

  @IsOptional()
  @IsDateString()
  closesAt?: string;
}

export class VotePollDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID("4", { each: true })
  optionIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  openAnswer?: string;
}
