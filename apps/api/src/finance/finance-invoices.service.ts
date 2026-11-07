import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
@Injectable()
export class FinanceInvoicesService {
 constructor(private readonly prisma: PrismaService) {}
 list(user?: User) { return this.prisma.financeInvoice.findMany({ where: user ? { payment: { OR: [{ payerId: user.id }, { payeeId: user.id }] } } : {}, orderBy: { issuedAt: "desc" }, select: { id: true, number: true, documentType: true, issuedAt: true, paymentId: true, payment: { select: { currency: true, grossAmount: true, event: { select: { title: true, slug: true } } } } } }); }
 async upload(paymentId: string, number: string, documentType: string, issuedAt: string, file: Express.Multer.File, actor: User) {
  if (!file?.buffer || file.size > 10 * 1024 * 1024 || file.buffer.subarray(0,5).toString() !== "%PDF-") throw new BadRequestException("En fazla 10 MB geçerli bir PDF yükleyin.");
  const date = new Date(issuedAt);
  if (!paymentId?.trim() || !number?.trim() || number.trim().length > 120 || !["invoice", "credit_note"].includes(documentType) || !Number.isFinite(date.getTime()) || date > new Date()) throw new BadRequestException("Fatura numarası, belge türü ve tarih geçerli olmalı.");
  if (!await this.prisma.paymentTransaction.findUnique({ where: { id: paymentId }, select: { id: true } })) throw new NotFoundException("İşlem bulunamadı.");
  try { return await this.prisma.financeInvoice.create({ data: { paymentId, number: number.trim(), documentType, issuedAt: date, data: new Uint8Array(file.buffer), createdById: actor.id }, select: { id: true } }); }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") { const existing = await this.prisma.financeInvoice.findUnique({ where: { paymentId_number_documentType: { paymentId, number: number.trim(), documentType } }, select: { id: true, data: true, issuedAt: true } }); if (existing && Buffer.from(existing.data).equals(file.buffer) && existing.issuedAt.getTime() === date.getTime()) return { id: existing.id }; throw new BadRequestException("Bu numaralı belge zaten kayıtlı. Mevcut fatura değiştirilemez."); } throw error; }
 }
 async file(id: string, user: User, admin = false) {
  const invoice = await this.prisma.financeInvoice.findFirst({ where: { id, ...(admin ? {} : { payment: { OR: [{ payerId: user.id }, { payeeId: user.id }] } }) }, select: { data: true, id: true } });
  if (!invoice) throw new NotFoundException("Fatura bulunamadı.");
  return invoice;
 }
}
