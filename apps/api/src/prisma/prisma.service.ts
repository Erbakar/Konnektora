import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { getConnectionString } from "@netlify/database";
import { PrismaClient } from "@prisma/client";

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.NETLIFY_DB_URL) {
    process.env.DATABASE_URL = process.env.NETLIFY_DB_URL;
    return process.env.NETLIFY_DB_URL;
  }

  try {
    const databaseUrl = getConnectionString();
    process.env.DATABASE_URL = databaseUrl;
    return databaseUrl;
  } catch {
    // Prisma will surface the missing DATABASE_URL error with schema context.
    return undefined;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const databaseUrl = resolveDatabaseUrl();
    super(databaseUrl ? { datasourceUrl: databaseUrl } : undefined);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
