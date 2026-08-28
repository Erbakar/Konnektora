import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { User } from "@prisma/client";
import { Observable, tap } from "rxjs";
import { PrismaService } from "../prisma/prisma.service";

type RequestWithUser = {
  user?: User;
  method: string;
  originalUrl?: string;
  url: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
};

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();
    const path = (request.originalUrl ?? request.url).split("?")[0] ?? "/";
    if (path === "/health" || path.startsWith("/admin/activity-logs")) return next.handle();
    const startedAt = Date.now();
    const record = (statusCode: number) => {
      const userAgent = request.headers["user-agent"];
      const forwardedFor = request.headers["x-forwarded-for"];
      const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0]?.trim() || request.ip || null;
      const segments = path.split("/").filter(Boolean);
      const category = this.categoryFor(segments[0] ?? "system");
      const targetId = segments.find((segment) => /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) ?? request.user?.id ?? "public";
      void this.prisma.adminActivityLog.create({
        data: {
          actorId: request.user?.id ?? null,
          action: `${this.actionFor(request.method)}:${path}`.slice(0, 240),
          targetType: category,
          targetId,
          metadata: {
            method: request.method,
            path,
            statusCode,
            durationMs: Date.now() - startedAt,
            ip,
            userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent ?? null,
            queryFields: Object.keys(request.query ?? {}),
          },
        },
      }).catch(() => undefined);
    };
    return next.handle().pipe(tap({
      next: () => record(response.statusCode),
      error: (error: { status?: number; statusCode?: number }) => record(error.status ?? error.statusCode ?? 500),
    }));
  }

  private actionFor(method: string) {
    return ({ GET: "view", POST: "create", PUT: "replace", PATCH: "update", DELETE: "delete" } as Record<string, string>)[method] ?? method.toLowerCase();
  }

  private categoryFor(segment: string) {
    if (["finance", "tickets", "payments", "billing", "corporate-kyc"].includes(segment)) return "finance";
    if (["auth", "identity", "profile-verification"].includes(segment)) return "identity";
    if (["profile", "users", "me", "public-profile"].includes(segment)) return "user";
    if (["reports", "content-admin", "admin"].includes(segment)) return "moderation";
    if (["cms", "privacy", "notifications", "contacts"].includes(segment)) return "settings";
    return segment;
  }
}
