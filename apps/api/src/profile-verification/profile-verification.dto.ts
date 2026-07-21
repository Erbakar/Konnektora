import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateProfileVerificationDto {
  @IsIn(["blink", "smile", "turn_left", "turn_right"])
  challenge!: string;
}

export class ReviewProfileVerificationDto {
  @IsIn(["approved", "rejected"])
  status!: "approved" | "rejected";

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}
