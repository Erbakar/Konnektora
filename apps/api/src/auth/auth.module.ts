import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MailModule } from "../mail/mail.module";
import { SmsModule } from "../sms/sms.module";
import { AdminGuard } from "./admin.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard";

@Module({
  imports: [
    MailModule,
    SmsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "change-me-in-env",
      signOptions: { expiresIn: "8h" }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, OptionalJwtAuthGuard, AdminGuard],
  exports: [JwtModule, JwtAuthGuard, OptionalJwtAuthGuard, AdminGuard, AuthService]
})
export class AuthModule {}
