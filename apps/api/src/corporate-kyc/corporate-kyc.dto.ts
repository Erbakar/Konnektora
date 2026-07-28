import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsNumber, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
export enum CorporateKycDocumentType { registration_certificate="registration_certificate",tax_certificate="tax_certificate",representative_id="representative_id",bank_proof="bank_proof",ownership_chart="ownership_chart",address_proof="address_proof" }
export class BeneficialOwnerDto { @IsString() @MinLength(2) @MaxLength(160) name!:string; @IsString() @MaxLength(80) nationality!:string; @Type(()=>Number) @IsNumber() @Min(0.01) @Max(100) ownershipPercent!:number; @IsOptional() @IsString() @MaxLength(4) identityNumberLast4?:string; }
export class SaveCorporateKycDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) legalName?:string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) registrationNumber?:string;
  @IsOptional() @IsString() @MinLength(5) @MaxLength(40) taxNumber?:string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) incorporationCountry?:string;
  @IsOptional() @IsDateString() incorporationDate?:string;
  @IsOptional() @IsString() @MinLength(10) @MaxLength(500) registeredAddress?:string;
  @IsOptional() @IsUrl() website?:string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(500) businessActivity?:string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) representativeName?:string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) representativeTitle?:string;
  @IsOptional() @IsEmail() representativeEmail?:string;
  @IsOptional() @IsString() @MinLength(7) @MaxLength(40) representativePhone?:string;
  @IsOptional() @IsDateString() representativeBirthDate?:string;
  @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(()=>BeneficialOwnerDto) beneficialOwners?:BeneficialOwnerDto[];
  @IsOptional() @IsBoolean() termsAccepted?:boolean;
  @IsOptional() @IsBoolean() informationConfirmed?:boolean;
}
export class CorporateKycDecisionDto { @IsIn(["approved","rejected"]) status!:"approved"|"rejected"; @IsOptional() @IsString() @MaxLength(1000) reason?:string; }
