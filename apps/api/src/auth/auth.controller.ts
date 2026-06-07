import { Body, Controller, Post } from "@nestjs/common";
import { LoginDto } from "./auth.dto";
import { AuthService } from "./auth.service";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("auth/login")
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post("admin/auth/login")
  adminLogin(@Body() body: LoginDto) {
    return this.authService.login(body, { adminOnly: true });
  }
}
