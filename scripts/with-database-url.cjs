#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);
const skipIfMissingIndex = args.indexOf("--skip-if-missing");
const skipIfMissing = skipIfMissingIndex !== -1;

if (skipIfMissing) {
  args.splice(skipIfMissingIndex, 1);
}

if (args.length === 0) {
  console.error("Usage: node scripts/with-database-url.cjs [--skip-if-missing] <command> [args...]");
  process.exit(1);
}

let resolvedFromNetlify = false;
let hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

if (!process.env.DATABASE_URL && process.env.NETLIFY_DB_URL) {
  process.env.DATABASE_URL = process.env.NETLIFY_DB_URL;
  resolvedFromNetlify = true;
  hasDatabaseUrl = true;
}

if (!process.env.DATABASE_URL) {
  try {
    const { getConnectionString } = require("@netlify/database");
    process.env.DATABASE_URL = getConnectionString();
    resolvedFromNetlify = true;
    hasDatabaseUrl = true;
  } catch {
    if (skipIfMissing) {
      console.log("Skipping command because Netlify Database connection is not available.");
      process.exit(0);
    }

    process.env.DATABASE_URL = "postgresql://konnektora:konnektora@localhost:5432/konnektora";
    hasDatabaseUrl = true;
  }
}

if (skipIfMissing && !hasDatabaseUrl && !resolvedFromNetlify) {
  console.log("Skipping command because Netlify Database connection is not available.");
  process.exit(0);
}

const result = spawnSync(args[0], args.slice(1), {
  env: process.env,
  shell: process.platform === "win32",
  stdio: "inherit"
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
