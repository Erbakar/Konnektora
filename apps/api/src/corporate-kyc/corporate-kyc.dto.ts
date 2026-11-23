import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsNumber, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
// 23/11 #24: yetkili kimliğinin ön ve arka yüzü ayrı belge türleri; eski "representative_id" kayıtları ön yüz sayılır.
export enum CorporateKycDocumentType { registration_certificate="registration_certificate",tax_certificate="tax_certificate",representative_id="representative_id",representative_id_front="representative_id_front",representative_id_back="representative_id_back",bank_proof="bank_proof",ownership_chart="ownership_chart",address_proof="address_proof" }
export class BeneficialOwnerDto { @IsString() @MinLength(2) @MaxLength(160) name!:string; @IsString() @MaxLength(80) nationality!:string; @Type(()=>Number) @IsNumber() @Min(0) @Max(100) ownershipPercent!:number; @IsOptional() @IsString() @MaxLength(4) identityNumberLast4?:string; @IsOptional() @IsString() @MaxLength(500) controlBasis?:string; }
const emptyToUndefined = () => Transform(({ value }) => (typeof value === "string" && value.trim() === "" ? undefined : value));
// 23/11 #23: boş bırakılan isteğe bağlı alanlar (ör. web sitesi) "geçersiz" sayılıp tüm kaydı engellemesin.
export class SaveCorporateKycDto {
  @emptyToUndefined() @IsOptional() @IsString() @MinLength(2) @MaxLength(200) legalName?:string;
  @emptyToUndefined() @IsOptional() @IsString() @MinLength(2) @MaxLength(80) registrationNumber?:string;
  @emptyToUndefined() @IsOptional() @IsString() @MinLength(5) @MaxLength(40) taxNumber?:string;
  @emptyToUndefined() @IsOptional() @IsString() @MinLength(2) @MaxLength(80) incorporationCountry?:string;
  @emptyToUndefined() @IsOptional() @IsDateString() incorporationDate?:string;
  @emptyToUndefined() @IsOptional() @IsString() @MinLength(10) @MaxLength(500) registeredAddress?:string;
  @emptyToUndefined() @IsOptional() @IsUrl() website?:string;
  @emptyToUndefined() @IsOptional() @IsString() @MinLength(3) @MaxLength(500) businessActivity?:string;
  @emptyToUndefined() @IsOptional() @IsString() @MinLength(2) @MaxLength(160) representativeName?:string;
  @emptyToUndefined() @IsOptional() @IsString() @MinLength(2) @MaxLength(120) representativeTitle?:string;
  @emptyToUndefined() @IsOptional() @IsEmail() representativeEmail?:string;
  @emptyToUndefined() @IsOptional() @IsString() @MinLength(7) @MaxLength(40) representativePhone?:string;
  @emptyToUndefined() @IsOptional() @IsDateString() representativeBirthDate?:string;
  @emptyToUndefined() @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(()=>BeneficialOwnerDto) beneficialOwners?:BeneficialOwnerDto[];
  @emptyToUndefined() @IsOptional() @IsBoolean() termsAccepted?:boolean;
  @emptyToUndefined() @IsOptional() @IsBoolean() informationConfirmed?:boolean;
}
export class CorporateKycDecisionDto { @IsIn(["approved","rejected"]) status!:"approved"|"rejected"; @IsOptional() @IsString() @MaxLength(1000) reason?:string; }
