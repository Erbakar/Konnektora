import { ReportTargetType } from "@prisma/client";
import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString, IsUrl, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreatePlaceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

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
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;
}

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
  @MinLength(1)
  @MaxLength(3000)
  body!: string;
}

export class CreatePrivateMessageDto {
  @IsString()
  recipientId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
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
