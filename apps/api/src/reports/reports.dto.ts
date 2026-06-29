import { ReportStatus, ReportTargetType } from "@prisma/client";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";

export enum ModerationAction {
  archive_event = "archive_event",
  archive_tag = "archive_tag",
  remove_media = "remove_media",
  archive_place = "archive_place",
  remove_comment = "remove_comment",
  reset_username = "reset_username",
  remove_website = "remove_website",
  remove_private_messages = "remove_private_messages",
  disable_user = "disable_user"
}

export class CreateReportDto {
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;

  @IsUUID()
  targetId!: string;

  @IsOptional()
  @IsUUID()
  ruleId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

export class UpdateReportDto {
  @IsEnum(ReportStatus)
  status!: ReportStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionNote?: string;
}

export class ResolveReportActionDto {
  @IsEnum(ModerationAction)
  action!: ModerationAction;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionNote?: string;
}

export class CreateReportRuleDto {
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  violationScore!: number;
}

export class UpdateReportRuleDto {
  @IsOptional()
  @IsEnum(ReportTargetType)
  targetType?: ReportTargetType;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  violationScore?: number;

  @IsOptional()
  @IsString()
  @IsIn(["active", "passive"])
  status?: string;
}

export class UpdateReportGroupNoteDto {
  @IsString()
  @MaxLength(2000)
  note!: string;
}

export class CreateModerationDecisionDto {
  @IsString()
  @IsIn(["violation", "no_violation"])
  decision!: string;

  @IsString()
  @IsIn([
    "none",
    "warn_user",
    "suspend_user",
    "ban_user",
    "archive_event",
    "archive_tag",
    "remove_media",
    "archive_place",
    "remove_comment",
    "reset_username",
    "remove_website",
    "remove_private_messages"
  ])
  action!: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  penaltyScore!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsString()
  suspensionEndsAt?: string;
}
