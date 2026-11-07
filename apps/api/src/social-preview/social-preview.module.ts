import { Module } from "@nestjs/common";
import { SocialPreviewController } from "./social-preview.controller";
import { SocialPreviewService } from "./social-preview.service";
@Module({ controllers: [SocialPreviewController], providers: [SocialPreviewService], exports: [SocialPreviewService] })
export class SocialPreviewModule {}
