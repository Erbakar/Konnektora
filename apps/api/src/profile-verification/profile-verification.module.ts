import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProfileVerificationController } from "./profile-verification.controller";
import { ProfileVerificationService } from "./profile-verification.service";

@Module({
  imports: [AuthModule],
  controllers: [ProfileVerificationController],
  providers: [ProfileVerificationService],
})
export class ProfileVerificationModule {}
