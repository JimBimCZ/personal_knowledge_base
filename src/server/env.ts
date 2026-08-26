import { z } from "zod";

/**
 * Every environment variable the app reads is declared here, once.
 * Adding a variable means touching three places together: this schema,
 * `.env.example`, and the README. See CLAUDE.md §8.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // Report variable NAMES only. The offending value may itself be a secret,
    // and this message ends up in logs and terminal output.
    const names = [...new Set(parsed.error.issues.map((i) => i.path.join(".")))];
    throw new Error(
      `Invalid environment configuration. Check these variables: ${names.join(", ")}`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();
