import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { getConnectionString } from "@netlify/database";
import { PrismaClient } from "@prisma/client";

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return;
  }

  if (process.env.NETLIFY_DB_URL) {
    process.env.DATABASE_URL = process.env.NETLIFY_DB_URL;
    return;
  }

  try {
    process.env.DATABASE_URL = getConnectionString();
  } catch {
    // Prisma will surface the missing DATABASE_URL error with schema context.
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    resolveDatabaseUrl();
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
