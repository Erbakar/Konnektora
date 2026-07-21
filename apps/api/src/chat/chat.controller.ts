import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import { unlink } from "fs/promises";
import { diskStorage } from "multer";
import { resolve } from "path";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ChatService } from "./chat.service";
import { ConversationMessagesQueryDto, ConversationPreferenceDto, EditPrivateMessageDto, MessageReactionDto, SendPrivateMessageDto } from "./chat.dto";

mkdirSync(resolve(process.cwd(), "uploads"), { recursive: true });
const messageFileExtensions: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "video/mp4": ".mp4", "application/pdf": ".pdf", "text/plain": ".txt" };

@Controller("me")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("conversations")
  conversations(@CurrentUser() user: User) {
    return this.chatService.listConversations(user.id);
  }

  @Get("conversations/:peerId/messages")
  messages(@Param("peerId") peerId: string, @Query() query: ConversationMessagesQueryDto, @CurrentUser() user: User) {
    return this.chatService.listMessages(user.id, peerId, query);
  }

  @Post("private-messages")
  @UseInterceptors(FileInterceptor("attachment", { storage: diskStorage({ destination: resolve(process.cwd(), "uploads"), filename: (_request, file, callback) => callback(null, `${randomUUID()}${messageFileExtensions[file.mimetype] ?? ""}`) }), limits: { fileSize: 15 * 1024 * 1024 }, fileFilter: (_request, file, callback) => { const allowed = Boolean(messageFileExtensions[file.mimetype]); callback(allowed ? null : new BadRequestException("Yalnız görsel, MP4, PDF veya metin dosyası gönderilebilir."), allowed); } }))
  async send(@Body() body: SendPrivateMessageDto, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: User) {
    try { return await this.chatService.send(user, body, file); }
    catch (error) { if (file) await unlink(file.path).catch(() => undefined); throw error; }
  }

  @Patch("conversations/:peerId/read")
  markRead(@Param("peerId") peerId: string, @CurrentUser() user: User) {
    return this.chatService.markRead(user.id, peerId);
  }

  @Get("messages/search") search(@Query("q") query: string, @CurrentUser() user: User) { return this.chatService.search(user.id, query ?? ""); }
  @Patch("private-messages/:id") edit(@Param("id") id: string, @Body() body: EditPrivateMessageDto, @CurrentUser() user: User) { return this.chatService.edit(user.id, id, body); }
  @Delete("private-messages/:id") remove(@Param("id") id: string, @CurrentUser() user: User) { return this.chatService.remove(user.id, id); }
  @Post("private-messages/:id/reactions") react(@Param("id") id: string, @Body() body: MessageReactionDto, @CurrentUser() user: User) { return this.chatService.toggleReaction(user.id, id, body); }
  @Post("conversations/:peerId/typing") typing(@Param("peerId") peerId: string, @CurrentUser() user: User) { return this.chatService.setTyping(user.id, peerId); }
  @Get("conversations/:peerId/typing") typingStatus(@Param("peerId") peerId: string, @CurrentUser() user: User) { return this.chatService.getTyping(user.id, peerId); }
  @Patch("conversations/:peerId/preferences") preference(@Param("peerId") peerId: string, @Body() body: ConversationPreferenceDto, @CurrentUser() user: User) { return this.chatService.setPreference(user.id, peerId, body); }
}
