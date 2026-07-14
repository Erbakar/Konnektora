import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { AcceptInviteDto, ChangePasswordDto, EmailDto, LoginDto, RegisterDto, ResetPasswordDto, TokenDto } from "./auth.dto";
import { CurrentUser } from "./current-user.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";
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

  @Post("auth/password/change")
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: User, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(user.id, body);
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
