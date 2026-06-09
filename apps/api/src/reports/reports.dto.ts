import { ReportStatus, ReportTargetType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateReportDto {
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;

  @IsUUID()
  targetId!: string;

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
