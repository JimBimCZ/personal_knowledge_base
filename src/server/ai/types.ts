/**
 * The two seams. Nothing outside src/server/ai/ knows which implementation is
 * in use, and nothing outside the provider files knows about HTTP, headers or
 * vendor JSON. See CLAUDE.md §5.
 */

export interface AnswerInput {
  question: string;
  chunks: { id: string; documentId: string; content: string }[];
}

export interface AnswerResult {
  answer: string;
  citations: { chunkId: string; documentId: string }[];
  usage: { inputTokens: number; outputTokens: number };
}

export interface LlmProvider {
  readonly name: string;
  answer(input: AnswerInput): Promise<AnswerResult>;
}

export interface EmbeddingProvider {
  readonly name: string;
  /** Recorded on every chunk: vectors from different models are not comparable. */
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

/** Every stored vector has this width. Changing it is a migration, not a config change. */
export const EMBEDDING_DIMENSIONS = 384;
