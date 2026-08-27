import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
export class CuratorApplicationDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsEmail() @MaxLength(160) email!: string;
  @IsString() @MinLength(2) @MaxLength(120) city!: string;
  @IsOptional() @IsString() @MaxLength(120) country?: string;
  @IsString() @MinLength(50) @MaxLength(5000) motivation!: string;
  @IsOptional() @IsString() @MaxLength(1000) cvUrl?: string;
}
