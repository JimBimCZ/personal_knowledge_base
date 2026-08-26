import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { renderAnswerPrompt } from "@/server/ai/prompts";
import { answerSchema } from "@/server/ai/providers/schema";
import type { AnswerInput, AnswerResult, LlmProvider } from "@/server/ai/types";
import { env } from "@/server/env";

/**
 * One Messages API call, shared by the two providers that speak the Anthropic
 * wire format.
 *
 * It lives in its own file to make the point `gateway.ts` exists to make: the
 * entire difference between calling the vendor directly and calling a corporate
 * AI Gateway is how the client is constructed — base URL and auth header.
 * Nothing about the request, the prompt, or the parsing changes. If that were
 * not true, the abstraction in CLAUDE.md §5 would be decoration.
 */

/**
 * Extraction with a citation obligation, not open-ended reasoning — but the
 * answer is only trustworthy if the model actually checks each claim against a
 * source, so this is not the place to economise down to `low`.
 */
const EFFORT = "medium" as const;

/**
 * Room for adaptive thinking plus a three-sentence answer. Thinking tokens
 * count against this, so it is not sized for the answer alone.
 */
const MAX_TOKENS = 8_000;

export function createMessagesProvider(
  name: string,
  client: Anthropic,
): LlmProvider {
  return {
    name,
    model: env.LLM_MODEL,

    async answer(input: AnswerInput, signal: AbortSignal): Promise<AnswerResult> {
      const { system, user } = renderAnswerPrompt(input);

      const response = await client.messages.parse(
        {
          model: env.LLM_MODEL,
          max_tokens: MAX_TOKENS,
          system,
          messages: [{ role: "user", content: user }],
          output_config: {
            effort: EFFORT,
            // Asks the API to enforce the shape server-side. We validate again
            // below, because a gateway is not guaranteed to honour it.
            format: zodOutputFormat(answerSchema),
          },
        },
        { signal },
      );

      // A refusal or a truncated response leaves no parsed output. Treat it as
      // a failed call rather than an answer with no citations — the guard's
      // "not found in your knowledge base" means the corpus lacks the answer,
      // and saying that when the model never replied would be a lie.
      if (!response.parsed_output) {
        throw new Error(
          `Model returned no parseable answer (stop_reason: ${response.stop_reason})`,
        );
      }

      const parsed = answerSchema.parse(response.parsed_output);

      return {
        answer: parsed.answer,
        citations: parsed.citations,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    },
  };
}
