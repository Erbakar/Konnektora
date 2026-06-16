import { Body, Controller, Post } from "@nestjs/common";
import { AcceptInviteDto, EmailDto, LoginDto, RegisterDto, ResetPasswordDto, TokenDto } from "./auth.dto";
import { AuthService } from "./auth.service";

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("auth/login")
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post("auth/register")
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post("auth/email/verify/request")
  requestEmailVerification(@Body() body: EmailDto) {
    return this.authService.requestEmailVerification(body);
  }

  @Post("auth/email/verify")
  confirmEmail(@Body() body: TokenDto) {
    return this.authService.confirmEmail(body);
  }

  @Post("auth/password/forgot")
  requestPasswordReset(@Body() body: EmailDto) {
    return this.authService.requestPasswordReset(body);
  }

  @Post("auth/password/reset")
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Post("auth/invite/accept")
  acceptInvite(@Body() body: AcceptInviteDto) {
    return this.authService.acceptInvite(body);
  }

  @Post("admin/auth/login")
  adminLogin(@Body() body: LoginDto) {
    return this.authService.login(body, { adminOnly: true });
  }
}
