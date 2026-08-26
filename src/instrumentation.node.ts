import { runMigrations } from "@/server/db/migrate";
import { logger } from "@/server/log/logger";

logger.info(
  { nodeVersion: process.version, nodeEnv: process.env.NODE_ENV },
  "application starting",
);

try {
  await runMigrations();
} catch (error) {
  logger.error({ err: error }, "startup failed: could not apply migrations");
  throw error;
}

logger.info("application started");
