import { Controller, Get, Param, Req } from "@nestjs/common";
import type { Request } from "express";
import { SocialPreviewService } from "./social-preview.service";
@Controller("social-preview")
export class SocialPreviewController {
  constructor(private readonly preview: SocialPreviewService) {}
  @Get(":type/:identity") get(@Param("type") type: string, @Param("identity") identity: string, @Req() request: Request) {
    const prefix = request.originalUrl.startsWith("/api/") ? "/api" : "";
    return this.preview.get(type, identity, `${request.protocol}://${request.get("host")}${prefix}`);
  }
}
