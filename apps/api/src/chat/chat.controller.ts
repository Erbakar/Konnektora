import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ChatService } from "./chat.service";
import { ConversationMessagesQueryDto, SendPrivateMessageDto } from "./chat.dto";

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
  send(@Body() body: SendPrivateMessageDto, @CurrentUser() user: User) {
    return this.chatService.send(user, body);
  }

  @Patch("conversations/:peerId/read")
  markRead(@Param("peerId") peerId: string, @CurrentUser() user: User) {
    return this.chatService.markRead(user.id, peerId);
  }
}
