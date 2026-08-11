import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ImportContactsDto, InviteContactsDto, SearchContactsDto } from "./contacts.dto";
import { ContactsService } from "./contacts.service";

@Controller("contacts")
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}
  @Get("search") search(@CurrentUser() user: User, @Query() query: SearchContactsDto) {
    return this.contacts.search(user.id, query);
  }
  @Post("import") import(
    @CurrentUser() user: User,
    @Body() body: ImportContactsDto,
  ) {
    return this.contacts.import(user.id, body);
  }
  @Post("invite") invite(
    @CurrentUser() user: User,
    @Body() body: InviteContactsDto,
  ) {
    return this.contacts.invite(user.id, body);
  }
}
