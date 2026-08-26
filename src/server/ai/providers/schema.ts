import { z } from "zod";

/**
 * The shape the model must return. Shared by the two providers that speak the
 * Anthropic wire format; the mock constructs its result directly.
 *
 * The API is asked to enforce this server-side (structured outputs), and we
 * validate it again on arrival. That is not belt-and-braces for its own sake:
 * `gateway` points at whatever a company puts in front of the model, and there
 * is no guarantee a proxy enforces anything. A malformed response has to fail
 * as a rejected answer, never as an undefined field read three files away.
 */
export const answerSchema = z.object({
  answer: z.string(),
  /**
   * Source numbers as shown in the prompt, 1-based. Whether they are in range
   * is the citation guard's decision, not this schema's — see rag/answer.ts.
   */
  citations: z.array(z.number().int()),
});

export type AnswerJson = z.infer<typeof answerSchema>;
