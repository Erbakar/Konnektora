import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class DiscoveryFeedQueryDto {
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(120) country?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class DiscoverySearchQueryDto {
  @IsString() @MinLength(2) @MaxLength(100) q!: string;
}
