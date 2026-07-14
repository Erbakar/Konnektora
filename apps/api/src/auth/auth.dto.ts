import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from "class-validator";

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/;

class StrongPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(strongPassword, { message: "Şifre en az bir büyük harf, bir küçük harf ve bir özel karakter içermelidir." })
  password!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class RegisterDto extends StrongPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsIn(["individual", "corporate"])
  accountType?: "individual" | "corporate";

  @ValidateIf((value: RegisterDto) => value.accountType === "corporate")
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  companyName?: string;

  @ValidateIf((value: RegisterDto) => value.accountType === "corporate")
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  tradeName?: string;

  @ValidateIf((value: RegisterDto) => value.accountType === "corporate")
  @IsIn(["sole_proprietorship", "limited_or_corporation", "association", "foundation", "public_body", "other"])
  companyType?: string;

  @ValidateIf((value: RegisterDto) => value.accountType === "corporate")
  @IsIn(["event_organizer", "restaurant_bar_cafe", "night_club", "university_club", "ngo", "brand", "tourism_company", "sports_club", "other"])
  businessCategory?: string;
}

export class EmailDto {
  @IsEmail()
  email!: string;
}

export class TokenDto {
  @IsString()
  token!: string;
}

export class ResetPasswordDto extends StrongPasswordDto {
  @IsString()
  token!: string;
}

export class AcceptInviteDto extends ResetPasswordDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(strongPassword, { message: "Şifre en az bir büyük harf, bir küçük harf ve bir özel karakter içermelidir." })
  newPassword!: string;
}
