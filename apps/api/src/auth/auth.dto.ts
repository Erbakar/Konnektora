import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class RegisterDto extends LoginDto {
  @IsString()
  @MinLength(2)
  name!: string;
}

export class EmailDto {
  @IsEmail()
  email!: string;
}

export class TokenDto {
  @IsString()
  token!: string;
}

export class ResetPasswordDto extends TokenDto {
  @IsString()
  @MinLength(8)
  password!: string;
}

export class AcceptInviteDto extends ResetPasswordDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
