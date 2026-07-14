import { IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUrl, IsUUID, Matches, MaxLength, MinLength } from "class-validator";

export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[\p{L}\p{N} .-]+$/u)
  username?: string;

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
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsIn(["male", "female"])
  gender?: "male" | "female";

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  website?: string;

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
  @MaxLength(80)
  companyType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  businessCategory?: string;
}

export class UpdatePrivacySettingsDto {
  @IsIn(["everybody", "following", "network"])
  messageAudience!: "everybody" | "following" | "network";

  @IsBoolean()
  directoryDiscoverable!: boolean;

  @IsIn(["everybody", "following", "network"])
  eventAudience!: "everybody" | "following" | "network";

  @IsIn(["everybody", "following", "network"])
  eventInviteAudience!: "everybody" | "following" | "network";

  @IsIn(["everybody", "following", "network"])
  placeAudience!: "everybody" | "following" | "network";

  @IsIn(["everybody", "following", "network"])
  placeInviteAudience!: "everybody" | "following" | "network";
}

export class UpdateProfileInterestsDto {
  @IsArray()
  @IsUUID("4", { each: true })
  tagIds!: string[];
}
