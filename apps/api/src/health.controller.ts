import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "./prisma/prisma.service";

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  @Get("health")
  async health() {
    return this.ready();
  }

  @Get("health/live")
  live() {
    return {
      ok: true,
      service: "konnektora-api",
      timestamp: new Date().toISOString()
    };
  }

  @Get("health/ready")
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException("Database bağlantısı hazır değil.");
    }
    return {
      ok: true,
      service: "konnektora-api",
      database: "ready",
      providers: {
        email: Boolean(this.config.get("RESEND_API_KEY") && this.config.get("EMAIL_FROM")),
        sms: Boolean(this.config.get("SMS_WEBHOOK_URL")),
        push: Boolean(this.config.get("VAPID_PUBLIC_KEY") && this.config.get("VAPID_PRIVATE_KEY")),
        profileVerification: Boolean(this.config.get("FACE_VERIFICATION_URL"))
      },
      timestamp: new Date().toISOString()
    };
  }
}
