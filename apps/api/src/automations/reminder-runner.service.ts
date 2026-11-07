import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AutomationsService } from "./automations.service";

@Injectable()
export class ReminderRunnerService implements OnModuleInit, OnModuleDestroy {
 private timer?: ReturnType<typeof setInterval>;
 private running=false;
 private readonly logger=new Logger(ReminderRunnerService.name);
 constructor(private readonly automations:AutomationsService,private readonly config:ConfigService){}
 onModuleInit(){
  // Serverless deployments use the scheduled function; persistent hosts run here.
  if(this.config.get("NODE_ENV")!=="production"||this.config.get("NETLIFY")||this.config.get("AWS_LAMBDA_FUNCTION_NAME")||this.config.get("EVENT_REMINDERS_ENABLED")==="false")return;
  this.timer=setInterval(()=>void this.run(),15*60*1000);this.timer.unref();
  void this.run();
 }
 async run(){if(this.running)return;this.running=true;try{await this.automations.sendEventReminders();}catch{this.logger.error("Etkinlik hatırlatmaları işlenemedi; sonraki çalışmada yeniden denenecek.");}finally{this.running=false;}}
 onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
}
