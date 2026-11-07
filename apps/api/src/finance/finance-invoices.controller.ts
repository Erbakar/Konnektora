import { Body, Controller, Get, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Response } from "express";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminGuard } from "../auth/admin.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions";
import { FinanceInvoicesService } from "./finance-invoices.service";
function sendPdf(response: Response, invoice: { id: string; data: Uint8Array }) { response.setHeader("Content-Type", "application/pdf"); response.setHeader("Content-Disposition", `attachment; filename="konnektora-fatura-${invoice.id}.pdf"`); response.setHeader("Cache-Control", "private, no-store"); response.setHeader("X-Content-Type-Options", "nosniff"); response.send(Buffer.from(invoice.data)); }
@Controller("me/finance/invoices") @UseGuards(JwtAuthGuard)
export class FinanceInvoicesController {
 constructor(private readonly invoices: FinanceInvoicesService) {}
 @Get() list(@CurrentUser() user: User) { return this.invoices.list(user); }
 @Get(":id/pdf") async pdf(@Param("id") id: string, @CurrentUser() user: User, @Res() response: Response) { sendPdf(response, await this.invoices.file(id, user)); }
}
@Controller("admin/finance/invoices") @UseGuards(AdminGuard) @RequirePermissions("finance.manage")
export class AdminFinanceInvoicesController {
 constructor(private readonly invoices: FinanceInvoicesService) {}
 @Get() list() { return this.invoices.list(); }
 @Post() @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } })) upload(@Body("paymentId") paymentId: string, @Body("number") number: string, @Body("documentType") documentType: string, @Body("issuedAt") issuedAt: string, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: User) { return this.invoices.upload(paymentId, number, documentType, issuedAt, file, user); }
 @Get(":id/pdf") async pdf(@Param("id") id: string, @CurrentUser() user: User, @Res() response: Response) { sendPdf(response, await this.invoices.file(id, user, true)); }
}
