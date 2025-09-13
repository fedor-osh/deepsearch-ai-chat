import type { Message, TelemetrySettings, StreamTextResult } from "ai";
import { type streamText } from "ai";
import { runAgentLoop } from "./run-agent-loop";

export const streamFromDeepSearch = async (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
}): Promise<StreamTextResult<Record<string, never>, string>> => {
  // Get the last user message
  const lastUserMessage = opts.messages
    .filter((msg) => msg.role === "user")
    .at(-1);

  if (!lastUserMessage) {
    throw new Error("No user message found");
  }

  // Run the agent loop and return the result
  return runAgentLoop({
    userMessage: lastUserMessage.content,
  });
};

export async function askDeepSearch(messages: Message[]) {
  const result = await streamFromDeepSearch({
    messages,
    onFinish: () => {
      // just a stub
    },
    telemetry: {
      isEnabled: false,
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
}
