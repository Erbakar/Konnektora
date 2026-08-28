import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from "class-validator";

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

class StrongPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(strongPassword, {
    message: "Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.",
  })
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

  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: "Telefon numarası E.164 formatında olmalıdır.",
  })
  phone!: string;

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

export class PasswordResetRequestDto {
  @IsOptional()
  @IsIn(["email", "phone"])
  channel?: "email" | "phone";

  @ValidateIf((value: PasswordResetRequestDto) => (value.channel ?? "email") === "email")
  @IsEmail()
  email?: string;

  @ValidateIf((value: PasswordResetRequestDto) => value.channel === "phone")
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: "Telefon numarası E.164 formatında olmalıdır." })
  phone?: string;
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
  @Matches(strongPassword, {
    message: "Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.",
  })
  newPassword!: string;
}

export class ChangeEmailDto extends EmailDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword!: string;
}

export class DeactivateAccountDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class RequestPhoneVerificationDto {
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: "Telefon numarası E.164 formatında olmalıdır.",
  })
  phone!: string;
}

export class ConfirmPhoneVerificationDto extends RequestPhoneVerificationDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class AvailabilityQueryDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @Matches(/^\+[1-9]\d{7,14}$/) phone?: string;
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[\p{L}\p{N} .-]+$/u)
  username?: string;
}

export class SocialAuthDto {
  @IsIn(["google", "facebook"])
  provider!: "google" | "facebook";

  @IsString()
  @MinLength(3)
  @MaxLength(4096)
  credential!: string;
}
