import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TagsController } from "./tags.controller";
import { TagsService } from "./tags.service";
import { TagSuggestionsService } from "./tag-suggestions.service";

@Module({
  imports: [AuthModule],
  controllers: [TagsController],
  providers: [TagsService, TagSuggestionsService],
  exports: [TagsService]
})
export class TagsModule {}
