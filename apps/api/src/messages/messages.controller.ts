import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { User, UserMessageType } from "@prisma/client";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions";
import { AdminMessageQueryDto, CreateUserMessageDto, UpdateUserMessageDto } from "./messages.dto";
import { MessagesService } from "./messages.service";

@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post("messages")
  createMessage(@Body() body: CreateUserMessageDto) {
    return this.messagesService.createMessage(body);
  }

  @Post("me/messages")
  @UseGuards(JwtAuthGuard)
  createMyMessage(@Body() body: CreateUserMessageDto, @CurrentUser() user: User) {
    return this.messagesService.createMessage(body, user);
  }

  @Get("admin/messages/faq")
  @UseGuards(AdminGuard)
  @RequirePermissions("messages.faq.manage")
  listFaqMessages(@Query() query: AdminMessageQueryDto) {
    return this.messagesService.listAdminMessages(UserMessageType.faq, query);
  }

  @Get("admin/messages/account-freeze")
  @UseGuards(AdminGuard)
  @RequirePermissions("messages.account_freeze.manage")
  listAccountFreezeMessages(@Query() query: AdminMessageQueryDto) {
    return this.messagesService.listAdminMessages(UserMessageType.account_freeze, query);
  }

  @Get("admin/messages/write-to-us")
  @UseGuards(AdminGuard)
  @RequirePermissions("messages.write_to_us.manage")
  listWriteToUsMessages(@Query() query: AdminMessageQueryDto) {
    return this.messagesService.listAdminMessages(UserMessageType.write_to_us, query);
  }

  @Get("admin/messages/:id")
  @UseGuards(AdminGuard)
  @RequirePermissions("messages.manage")
  getMessage(@Param("id") id: string, @CurrentUser() admin: User) {
    return this.messagesService.getAdminMessage(id, admin);
  }

  @Patch("admin/messages/:id")
  @UseGuards(AdminGuard)
  @RequirePermissions("messages.manage")
  updateMessage(@Param("id") id: string, @Body() body: UpdateUserMessageDto, @CurrentUser() admin: User) {
    return this.messagesService.updateAdminMessage(id, body, admin);
  }
}
