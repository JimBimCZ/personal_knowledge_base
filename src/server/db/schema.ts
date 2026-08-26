/**
 * Drizzle schema. Tables arrive with the slices that need them:
 * users and sessions in slice 2, documents and chunks in slice 3,
 * the LLM audit record in slice 5.
 *
 * The pgvector extension itself is enabled by the first migration, because
 * the chunks table cannot be created without it.
 */
export {};
