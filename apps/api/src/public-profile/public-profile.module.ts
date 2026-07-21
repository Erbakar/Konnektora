import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PublicProfileController } from "./public-profile.controller";
import { PublicProfileService } from "./public-profile.service";

@Module({ imports: [AuthModule], controllers: [PublicProfileController], providers: [PublicProfileService] })
export class PublicProfileModule {}
