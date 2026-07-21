import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class ScanMemberDto {
  @IsString()
  @MinLength(16)
  @MaxLength(4000)
  payload!: string;

  @IsIn(["qr", "nfc"])
  method!: "qr" | "nfc";
}
