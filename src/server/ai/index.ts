import { createLocalEmbedder } from "@/server/ai/embedders/local";
import { createMockEmbedder } from "@/server/ai/embedders/mock";
import type { EmbeddingProvider } from "@/server/ai/types";
import { env } from "@/server/env";

/**
 * The only place that decides which implementation is in use. Everything else
 * takes the interface. Adding a corporate AI Gateway is a new file here plus an
 * env value — no call site changes.
 */
let embedder: EmbeddingProvider | null = null;

export function getEmbedder(): EmbeddingProvider {
  if (embedder) return embedder;

  embedder =
    env.EMBEDDING_PROVIDER === "local"
      ? createLocalEmbedder()
      : createMockEmbedder();

  return embedder;
}
