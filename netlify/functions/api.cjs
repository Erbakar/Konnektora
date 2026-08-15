require("reflect-metadata");

// Netlify Functions ship the application under a read-only /var/task directory.
// Existing upload controllers resolve their temporary storage from cwd.
if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) process.chdir("/tmp");

const express = require("express");
const { randomUUID } = require("crypto");
const rateLimit = require("express-rate-limit").rateLimit;
const helmet = require("helmet");
const serverless = require("serverless-http");
const { ValidationPipe } = require("@nestjs/common");
const { ConfigService } = require("@nestjs/config");
const { getConnectionString } = require("@netlify/database");
const { NestFactory } = require("@nestjs/core");
const { ExpressAdapter } = require("@nestjs/platform-express");
const { AppModule } = require("../../apps/api/dist/app.module");

let cachedHandler;

function requestKey(req) {
  const forwarded = req.headers["x-nf-client-connection-ip"] || req.headers["x-forwarded-for"];
  return String(forwarded || "netlify-client").split(",")[0].trim();
}

async function createHandler() {
  const expressApp = express();
  expressApp.set("trust proxy", 1);
  expressApp.use((req, _res, next) => {
    req.url = req.url.replace(/^\/(?:api|\.netlify\/functions\/api)(?=\/|$)/, "") || "/";
    next();
  });
  expressApp.use(helmet({ crossOriginResourcePolicy: false }));
  expressApp.use((req, res, next) => {
    const requestId = String(req.headers["x-request-id"] || "").slice(0, 100) || randomUUID();
    res.setHeader("x-request-id", requestId);
    const startedAt = Date.now();
    res.on("finish", () => console.log(JSON.stringify({ level: "info", event: "http_request", requestId, method: req.method, path: req.url.split("?")[0], status: res.statusCode, durationMs: Date.now() - startedAt })));
    next();
  });
  expressApp.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false, keyGenerator: requestKey, skip: (req) => req.path.startsWith("/health") }));
  expressApp.use("/auth", rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false, keyGenerator: requestKey }));

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: ["error", "warn", "log"]
  });
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get("WEB_ORIGIN", "https://konnektora.netlify.app"),
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  await app.init();

  return serverless(expressApp);
}

exports.handler = async (event, context) => {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = getConnectionString();
  }
  cachedHandler = cachedHandler || (await createHandler());
  return cachedHandler(event, context);
};
