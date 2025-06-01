import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import type { Context } from "hono";
import { stream } from "hono/streaming";

const preamble = `You are a helpful AI assistant.
Please provide clear and helpful responses to user questions.
`;

export async function handleChat(c: Context) {
  const { prompt } = await c.req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    prompt: `${preamble}${prompt}`,
  });

  c.header("Content-Type", "text/plain; charset=utf-8");
  return stream(c, (stream) => stream.pipe(result.toDataStream()));
}
