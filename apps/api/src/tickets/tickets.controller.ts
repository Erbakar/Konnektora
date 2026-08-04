import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ManageTicketTypeDto, PurchaseTicketsDto, RefundTicketOrderDto, ScanOwnedTicketDto, TransferTicketsDto } from "./tickets.dto";
import { TicketsService } from "./tickets.service";

@Controller() export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}
  @Get("events/:eventId/ticket-types") types(@Param("eventId") eventId: string) { return this.tickets.listEventTypes(eventId); }
  @Post("events/:eventId/ticket-types") @UseGuards(JwtAuthGuard) createType(@Param("eventId") eventId: string, @Body() body: ManageTicketTypeDto, @CurrentUser() user: User) { return this.tickets.createType(eventId, body, user); }
  @Patch("events/:eventId/ticket-types/:id") @UseGuards(JwtAuthGuard) updateType(@Param("eventId") eventId: string, @Param("id") id: string, @Body() body: ManageTicketTypeDto, @CurrentUser() user: User) { return this.tickets.updateType(eventId, id, body, user); }
  @Post("ticket-types/:id/purchase") @UseGuards(JwtAuthGuard) purchase(@Param("id") id: string, @Body() body: PurchaseTicketsDto, @CurrentUser() user: User) { return this.tickets.purchase(id, body.quantity, user); }
  @Get("me/owned-tickets") @UseGuards(JwtAuthGuard) mine(@CurrentUser() user: User) { return this.tickets.mine(user.id); }
  @Post("me/tickets/transfer") @UseGuards(JwtAuthGuard) transfer(@Body() body: TransferTicketsDto, @CurrentUser() user: User) { return this.tickets.transfer(body, user); }
  @Post("me/ticket-orders/:id/refund") @UseGuards(JwtAuthGuard) refund(@Param("id") id: string, @Body() body: RefundTicketOrderDto, @CurrentUser() user: User) { return this.tickets.refund(id, user, body); }
  @Post("events/tickets/scan") @UseGuards(JwtAuthGuard) scan(@Body() body: ScanOwnedTicketDto, @CurrentUser() user: User) { return this.tickets.scan(body.qrPayload, user); }
}
