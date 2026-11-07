import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { configureMediaDatabase } from "./durable-storage";
import { MediaStorageController } from "./media-storage.controller";

@Module({ controllers: [MediaStorageController] })
export class MediaStorageModule {
  constructor(prisma: PrismaService) { configureMediaDatabase(prisma); }
}
