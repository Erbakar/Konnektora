import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export class ContactDto {
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
}

export class ImportContactsDto {
  @IsIn(["phone", "google"]) source!: "phone" | "google";
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  contacts!: ContactDto[];
}

export class InviteContactsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  contacts!: ContactDto[];
}

export class SearchContactsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  query!: string;

  @IsOptional()
  @IsIn(["name", "email", "phone"])
  type?: "name" | "email" | "phone";
}
