import { canUseAdvancedAnalytics } from "./analytics-access";
import { planContext } from "../plans/plan-runtime";
import { defaultPlanCatalog, PlanCatalog } from "../plans/plan-catalog";
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { PrismaService } from "../prisma/prisma.service";
import { audienceForViewer, privacyContext } from "./privacy-context";
@Injectable()
export class PrivacyContextInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}
  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const configuration = await this.prisma.planConfiguration.findUnique({ where: { id: "catalog" } });
    const audience = await audienceForViewer(this.prisma, request.user?.id);
    if (request.user) context.switchToHttp().getResponse().setHeader("Cache-Control", "private, no-store");
    return new Observable(subscriber => planContext.run((configuration?.data as PlanCatalog | undefined) ?? defaultPlanCatalog, () => privacyContext.run(audience, () => {
      audience.advancedFilters = Boolean(request.user && canUseAdvancedAnalytics(request.user));
      const subscription = next.handle().subscribe(subscriber);
      return () => subscription.unsubscribe();
    })));
  }
}
