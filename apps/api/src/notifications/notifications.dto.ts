import { IsString, IsUrl, MaxLength } from "class-validator";

export class RegisterPushSubscriptionDto {
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  endpoint!: string;

  @IsString()
  @MaxLength(500)
  p256dh!: string;

  @IsString()
  @MaxLength(500)
  auth!: string;
}
