import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { CuratorsController } from "./curators.controller";
import { CuratorsService } from "./curators.service";
@Module({ imports: [AuthModule, MailModule], controllers: [CuratorsController], providers: [CuratorsService] }) export class CuratorsModule {}
