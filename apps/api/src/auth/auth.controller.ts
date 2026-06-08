import { Body, Controller, Post } from "@nestjs/common";
import { LoginDto, RegisterDto } from "./auth.dto";
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

  @Post("admin/auth/login")
  adminLogin(@Body() body: LoginDto) {
    return this.authService.login(body, { adminOnly: true });
  }
}
