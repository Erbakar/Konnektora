import { Controller, Headers, Post } from "@nestjs/common";
import { AutomationsService } from "./automations.service";
@Controller("automations") export class AutomationsController { constructor(private readonly service: AutomationsService) {} @Post("event-reminders/run") run(@Headers("x-cron-secret") secret?: string) { this.service.assertSecret(secret); return this.service.sendEventReminders(); } }
