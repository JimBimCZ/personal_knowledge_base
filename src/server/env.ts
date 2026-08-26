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

  // --- Identity -------------------------------------------------------
  // Nothing here names a provider. Swapping to Microsoft Entra ID is a change
  // of these values only; see the README.
  AUTH_SECRET: z.string().min(16),
  AUTH_URL: z.string().min(1),
  OIDC_ISSUER: z.string().min(1),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),
  OIDC_SCOPES: z.string().min(1).default("openid profile email"),
  OIDC_ROLES_CLAIM: z.string().min(1).default("roles"),

  // Only needed when the server reaches the IdP at a different origin than the
  // browser does — the case for a mock IdP on a container network. Against a
  // public IdP such as Entra ID this stays unset and both use OIDC_ISSUER.
  OIDC_INTERNAL_ORIGIN: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * `next build` imports every route module to read its config exports, which
 * reaches this file. The build needs no real configuration — it opens no
 * connection and calls no IdP. Validating during the build would force
 * placeholder secrets into the image just to satisfy the schema, so the build
 * phase gets obviously-fake values instead and nothing fake is ever baked in.
 *
 * The running server always takes the real path below, so a genuine
 * misconfiguration still fails at startup, before the first request.
 */
const BUILD_PHASE_PLACEHOLDERS: Env = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://build-phase/unused",
  LOG_LEVEL: "info",
  AUTH_SECRET: "build-phase-placeholder-unused",
  AUTH_URL: "http://build-phase.invalid",
  OIDC_ISSUER: "http://build-phase.invalid",
  OIDC_CLIENT_ID: "build-phase-unused",
  OIDC_CLIENT_SECRET: "build-phase-unused",
  OIDC_SCOPES: "openid profile email",
  OIDC_ROLES_CLAIM: "roles",
  OIDC_INTERNAL_ORIGIN: undefined,
};

function loadEnv(): Env {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return BUILD_PHASE_PLACEHOLDERS;
  }

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

/**
 * Server-side fetch to the IdP.
 *
 * Auth.js discovers from the issuer URL, which is by definition the address the
 * BROWSER uses. On a container network the server cannot reach that address, so
 * requests aimed at the issuer's origin are redirected to the internal one.
 * Nothing else about the request changes, and the issuer in every token stays
 * the public one, so `iss` validation is unaffected.
 *
 * With a public IdP the two origins are the same and this is a plain fetch.
 */
export const idpFetch: typeof fetch = (input, init) => {
  const internal = env.OIDC_INTERNAL_ORIGIN;
  if (!internal) return fetch(input, init);

  const requested = new URL(
    input instanceof Request ? input.url : String(input),
  );
  if (requested.origin !== new URL(env.OIDC_ISSUER).origin) {
    return fetch(input, init);
  }

  const rewritten = new URL(
    requested.pathname + requested.search,
    internal,
  );
  return input instanceof Request
    ? fetch(new Request(rewritten, input), init)
    : fetch(rewritten, init);
};
