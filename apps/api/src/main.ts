import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { existsSync } from "fs";
import helmet from "helmet";
import { resolve } from "path";
import { AppModule } from "./app.module";
import { contentSecurityPolicyDirectives } from "./config/content-security-policy";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const serveWebApp = config.get<string>("SERVE_WEB_APP") === "true";
  const apiPrefix = serveWebApp ? "/api" : "";

  if (serveWebApp) app.setGlobalPrefix("api");

  app.set("trust proxy", 1);
  app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: contentSecurityPolicyDirectives,
    }
  }));
  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = request.header("x-request-id")?.slice(0, 100) || randomUUID();
    response.setHeader("x-request-id", requestId);
    const startedAt = Date.now();
    response.on("finish", () => {
      process.stdout.write(`${JSON.stringify({ level: "info", event: "http_request", requestId, method: request.method, path: request.originalUrl.split("?")[0], status: response.statusCode, durationMs: Date.now() - startedAt })}\n`);
    });
    next();
  });
  app.use(rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: (request) => request.path.startsWith(`${apiPrefix}/health`) || request.path.startsWith("/health")
  }));
  app.use(`${apiPrefix}/auth`, rateLimit({
    windowMs: 15 * 60_000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false
  }));
  app.enableCors({
    origin: config.get<string>("WEB_ORIGIN", "http://localhost:5173"),
    credentials: true
  });
  app.useStaticAssets(resolve(process.cwd(), "uploads"), { prefix: "/uploads/" });

  if (serveWebApp) {
    const webDist = resolve(__dirname, "../../web/dist");
    const webIndex = resolve(webDist, "index.html");

    if (!existsSync(webIndex)) throw new Error(`Web build output is missing: ${webIndex}`);

    app.useStaticAssets(webDist);
    app.use((request: Request, response: Response, next: NextFunction) => {
      if (
        request.method !== "GET" ||
        request.path === "/api" ||
        request.path.startsWith("/api/") ||
        request.path.startsWith("/uploads/")
      ) return next();

      response.sendFile(webIndex);
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  await app.listen(config.get<number>("PORT", 3000));
}

void bootstrap();
