require("reflect-metadata");

const express = require("express");
const serverless = require("serverless-http");
const { ValidationPipe } = require("@nestjs/common");
const { ConfigService } = require("@nestjs/config");
const { NestFactory } = require("@nestjs/core");
const { ExpressAdapter } = require("@nestjs/platform-express");
const { AppModule } = require("../../apps/api/dist/app.module");

let cachedHandler;

async function createHandler() {
  const expressApp = express();

  expressApp.use((req, _res, next) => {
    req.url = req.url.replace(/^\/(?:api|\.netlify\/functions\/api)(?=\/|$)/, "") || "/";
    next();
  });

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
  cachedHandler = cachedHandler || (await createHandler());
  return cachedHandler(event, context);
};
