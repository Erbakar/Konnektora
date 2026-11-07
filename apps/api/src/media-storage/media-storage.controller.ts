import { Controller, Get, Headers, NotFoundException, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";

@Controller("uploads")
export class MediaStorageController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":filename")
  async read(@Param("filename") filename: string, @Headers("range") range: string | undefined, @Res() response: Response) {
    if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(filename)) throw new NotFoundException("Dosya bulunamadı.");
    const file = await this.prisma.storedUpload.findUnique({ where: { filename } });
    if (!file) throw new NotFoundException("Dosya bulunamadı.");
    const bytes = Buffer.from(file.bytes);
    response.setHeader("Content-Type", file.mimeType);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "private, max-age=300");
    response.setHeader("Accept-Ranges", "bytes");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      const start = match?.[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match?.[2]));
      const end = match?.[1] && match[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
      if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= bytes.length) {
        response.setHeader("Content-Range", `bytes */${bytes.length}`);
        return response.status(416).end();
      }
      response.setHeader("Content-Range", `bytes ${start}-${end}/${bytes.length}`);
      response.setHeader("Content-Length", end - start + 1);
      return response.status(206).send(bytes.subarray(start, end + 1));
    }
    response.setHeader("Content-Length", bytes.length);
    return response.send(bytes);
  }
}
