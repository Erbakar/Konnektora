import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

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
