import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

/**
 * Claude, via the official SDK.
 * Good for: reasoning over our data, summarising notes, ranking warm paths,
 * drafting intro emails. Default model comes from ANTHROPIC_MODEL.
 *
 * Mock mode: with no ANTHROPIC_API_KEY, functions return `mock` data so the
 * app still works locally and on preview deploys.
 */
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
export const isMock = () => !process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
export function anthropic() {
  client ??= new Anthropic(); // reads ANTHROPIC_API_KEY
  return client;
}

/**
 * Ask Claude for JSON matching a Zod schema. Returns the parsed object.
 *
 *   const out = await claudeJson({ schema: MySchema, system, prompt, mock: {...} });
 */
export async function claudeJson<S extends z.ZodType>({
  schema,
  system,
  prompt,
  mock,
  model = MODEL,
  maxTokens = 4000,
}: {
  schema: S;
  system: string;
  prompt: string;
  mock: z.infer<S>;
  model?: string;
  maxTokens?: number;
}): Promise<{ data: z.infer<S>; mocked: boolean }> {
  if (isMock()) return { data: mock, mocked: true };

  const response = await anthropic().messages.parse({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(schema) },
  });
  if (response.stop_reason === "refusal") throw new Error("Claude declined this request.");
  if (!response.parsed_output) throw new Error("Claude returned output that didn't match the schema.");
  return { data: response.parsed_output as z.infer<S>, mocked: false };
}

/**
 * Stream plain text from Claude as a web ReadableStream, ready to return
 * from a route handler: `return new Response(claudeStream({...}))`.
 * Use this for long answers so users see text as it arrives.
 */
export function claudeStream({
  system,
  prompt,
  mock = "Mock mode: set ANTHROPIC_API_KEY to get a real answer from Claude.",
  model = MODEL,
  maxTokens = 8000,
}: {
  system: string;
  prompt: string;
  mock?: string;
  model?: string;
  maxTokens?: number;
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        if (isMock()) {
          for (const word of mock.split(" ")) {
            controller.enqueue(encoder.encode(word + " "));
            await new Promise((r) => setTimeout(r, 20));
          }
        } else {
          const stream = anthropic().messages.stream({
            model,
            max_tokens: maxTokens,
            system,
            messages: [{ role: "user", content: prompt }],
          });
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\n[error: ${(err as Error).message}]`));
      } finally {
        controller.close();
      }
    },
  });
}
