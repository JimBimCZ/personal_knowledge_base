import { getLlmProvider } from "@/server/ai";
import { answerWithAudit } from "@/server/ai/call";
import { logger } from "@/server/log/logger";
import { retrieveChunks, type RetrievedChunk } from "@/server/rag/retrieve";

export interface Citation {
  chunkId: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  /** The passage the answer was drawn from, so the UI can show it in place. */
  content: string;
}

export type AskResult =
  | { status: "answered"; answer: string; citations: Citation[] }
  /** The honest outcome. `reason` is for the log and the UI's explanation. */
  | { status: "not_found"; reason: "no_relevant_chunks" | "citations_rejected" };

/** The text shown for every not_found outcome. One sentence, no hedging. */
export const NOT_FOUND_MESSAGE = "Not found in your knowledge base.";

/**
 * Question in, cited answer out — or nothing.
 *
 * The promise in CLAUDE.md §6 is that an answer without a source is not
 * shipped, so this function is written so that "answered" is the narrow path
 * and refusal is the default. Every early return below is a refusal.
 *
 * A citation is a 1-based position in the chunk list we sent, not an id. The
 * model is never shown a chunk id, so it cannot produce one that happens to be
 * real: a citation either indexes the set we retrieved or it does not, and
 * there is no third case to reason about.
 *
 * One retry is allowed, with a stricter prompt, and then we stop. A model that
 * cites badly twice is not going to be argued into citing well, and each retry
 * is another call the user waits for and pays for.
 */
export async function askQuestion(
  ownerSub: string,
  question: string,
): Promise<AskResult> {
  const retrieved = await retrieveChunks(ownerSub, question);

  // Nothing cleared the similarity floor. The corpus does not cover this, and
  // no model call is made — asking anyway would invite an ungrounded answer.
  if (retrieved.length === 0) {
    logger.info({ sub: ownerSub, outcome: "no_relevant_chunks" }, "ask");
    return { status: "not_found", reason: "no_relevant_chunks" };
  }

  const provider = getLlmProvider();
  const input = {
    question,
    chunks: retrieved.map((c) => ({
      id: c.id,
      documentId: c.documentId,
      content: c.content,
    })),
  };

  for (const retry of [false, true]) {
    const result = await answerWithAudit(provider, { ...input, retry });
    const citations = resolveCitations(result.citations, retrieved);

    if (citations.length > 0 && result.answer.trim().length > 0) {
      logger.info(
        {
          sub: ownerSub,
          outcome: "answered",
          retried: retry,
          chunksRetrieved: retrieved.length,
          citationCount: citations.length,
          topScore: Number(retrieved[0]!.score.toFixed(3)),
        },
        "ask",
      );
      return { status: "answered", answer: result.answer, citations };
    }

    // Worth a warning: a model citing outside the set it was given is the
    // failure this whole guard exists for, and it should be visible in the
    // logs rather than silently absorbed by the retry.
    logger.warn(
      {
        sub: ownerSub,
        retried: retry,
        returnedCitations: result.citations.length,
        validCitations: citations.length,
      },
      "answer rejected by citation guard",
    );
  }

  logger.info({ sub: ownerSub, outcome: "citations_rejected" }, "ask");
  return { status: "not_found", reason: "citations_rejected" };
}

/**
 * Positions to real chunks, dropping anything out of range or repeated.
 *
 * Dropping rather than repairing is the point: if the model cited [9] out of
 * six sources, that citation supports nothing, and an answer left with no
 * surviving citations is rejected by the caller. Order follows the model's, so
 * the UI lists sources in the order the answer used them.
 */
function resolveCitations(
  positions: number[],
  retrieved: RetrievedChunk[],
): Citation[] {
  const seen = new Set<number>();
  const citations: Citation[] = [];

  for (const position of positions) {
    if (position < 1 || position > retrieved.length || seen.has(position)) {
      continue;
    }
    seen.add(position);

    const chunk = retrieved[position - 1]!;
    citations.push({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      filename: chunk.filename,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
    });
  }

  return citations;
}
