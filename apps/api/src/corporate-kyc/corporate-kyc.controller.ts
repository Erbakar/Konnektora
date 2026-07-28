import { BadRequestException, Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { KycStatus, User } from "@prisma/client";
import { randomUUID } from "crypto";
import { createReadStream, mkdirSync } from "fs";
import { unlink } from "fs/promises";
import { diskStorage } from "multer";
import { basename, resolve } from "path";
import type { Response } from "express";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions";
import { CorporateKycDecisionDto, CorporateKycDocumentType, SaveCorporateKycDto } from "./corporate-kyc.dto";
import { CorporateKycService } from "./corporate-kyc.service";

const privateDirectory = resolve(process.cwd(), "private-uploads", "corporate-kyc"); mkdirSync(privateDirectory, { recursive: true });
const extensions: Record<string, string> = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const upload = FileInterceptor("file", { storage: diskStorage({ destination: privateDirectory, filename: (_request, file, callback) => callback(null, `${randomUUID()}${extensions[file.mimetype] ?? ""}`) }), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_request, file, callback) => { const allowed = Boolean(extensions[file.mimetype]); callback(allowed ? null : new BadRequestException("Yalnız PDF, JPG, PNG veya WebP belge yüklenebilir."), allowed); } });

@Controller("me/corporate-kyc") @UseGuards(JwtAuthGuard)
export class CorporateKycController {
  constructor(private readonly kyc: CorporateKycService) {}
  @Get() mine(@CurrentUser() user: User) { return this.kyc.getMine(user); }
  @Patch() save(@Body() body: SaveCorporateKycDto, @CurrentUser() user: User) { return this.kyc.saveDraft(user, body); }
  @Post("submit") submit(@CurrentUser() user: User) { return this.kyc.submit(user); }
  @Post("documents/:type") @UseInterceptors(upload) async document(@Param("type", new ParseEnumPipe(CorporateKycDocumentType)) type: CorporateKycDocumentType, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: User) { if (!file) throw new BadRequestException("Belge seçilmedi."); try { return await this.kyc.addDocument(user, type, file); } catch (error) { await unlink(file.path).catch(() => undefined); throw error; } }
  @Delete("documents/:id") remove(@Param("id") id: string, @CurrentUser() user: User) { return this.kyc.removeDocument(user, id); }
  @Get("documents/:id/download") async download(@Param("id") id: string, @CurrentUser() user: User, @Res({ passthrough: true }) response: Response) { const doc = await this.kyc.documentForUser(user, id); response.setHeader("Content-Type", doc.mimeType); response.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(basename(doc.originalName))}`); response.setHeader("Cache-Control", "private, no-store"); return new StreamableFile(createReadStream(doc.storagePath)); }
}

@Controller("admin/corporate-kyc") @UseGuards(AdminGuard) @RequirePermissions("users.manage")
export class AdminCorporateKycController {
  constructor(private readonly kyc: CorporateKycService) {}
  @Get() list(@Query("status") status?: KycStatus) { return this.kyc.listAdmin(status); }
  @Get(":id") get(@Param("id") id: string) { return this.kyc.getAdmin(id); }
  @Patch(":id/decision") decide(@Param("id") id: string, @Body() body: CorporateKycDecisionDto, @CurrentUser() user: User) { return this.kyc.decide(id, user, body); }
  @Get("documents/:id/download") async download(@Param("id") id: string, @Res({ passthrough: true }) response: Response) { const doc = await this.kyc.documentForAdmin(id); response.setHeader("Content-Type", doc.mimeType); response.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(basename(doc.originalName))}`); response.setHeader("Cache-Control", "private, no-store"); return new StreamableFile(createReadStream(doc.storagePath)); }
}
