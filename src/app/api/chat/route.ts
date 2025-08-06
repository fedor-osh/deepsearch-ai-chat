import type { Message } from "ai";
import { streamText, createDataStreamResponse } from "ai";
import { z } from "zod";
import { auth } from "~/server/auth";
import { model } from "~/models";
import { searchSerper } from "~/serper";
import {
  checkUserRateLimit,
  recordUserRequest,
  upsertChat,
  appendResponseMessages,
} from "~/server/db/queries";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check rate limit before processing the request
  const rateLimitCheck = await checkUserRateLimit(session.user.id);

  if (!rateLimitCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: `You have exceeded your daily limit of ${rateLimitCheck.limit} requests. You have made ${rateLimitCheck.currentCount} requests today.`,
        currentCount: rateLimitCheck.currentCount,
        limit: rateLimitCheck.limit,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": rateLimitCheck.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  }

  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId?: string;
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages, chatId } = body;

      const result = streamText({
        model,
        messages,
        maxSteps: 10,
        system: `You are a helpful AI assistant with access to web search capabilities. 

When users ask questions that require current information, facts, or recent events, you should use the searchWeb tool to find relevant information from the internet.

Always search the web when:
- Users ask about current events, news, or recent developments
- Users ask for factual information that might be outdated or need verification
- Users ask about specific products, services, or companies
- Users ask about weather, sports scores, or other real-time information
- Users ask about topics you're not completely confident about
- Always format URLs as markdown links.

After searching, ALWAYS cite your sources using proper markdown link formatting: [source title](url). Never just paste raw URLs - always format them as clickable markdown links.

For example, instead of writing "According to https://example.com/article", write "According to [Example Article](https://example.com/article)".

Be helpful, accurate, and always provide properly formatted source links when using web search results.`,
        onFinish: async ({ response }) => {
          // Record the request after we've confirmed it's allowed
          await recordUserRequest(session.user.id);
          
          // Convert response messages to the expected format, filtering out tool messages
          const responseMessages: Message[] = response.messages
            .filter((msg) => msg.role === "assistant")
            .map((msg) => ({
              id: msg.id,
              role: msg.role as "assistant",
              content:
                typeof msg.content === "string"
                  ? msg.content
                  : JSON.stringify(msg.content),
            }));

          // Merge existing messages with the new result
          const updatedMessages = appendResponseMessages({
            messages,
            responseMessages,
          });

          const lastMessage = updatedMessages.at(-1);
          if (!lastMessage) {
            return;
          }

          // Generate a chatId if not provided
          const finalChatId = chatId || crypto.randomUUID();

          // Save the chat to the database
          await upsertChat({
            userId: session.user.id,
            chatId: finalChatId,
            title: lastMessage.content.slice(0, 50) + "...",
            messages: updatedMessages,
          });
        },
        tools: {
          searchWeb: {
            parameters: z.object({
              query: z.string().describe("The query to search the web for"),
            }),
            execute: async ({ query }, { abortSignal }) => {
              const results = await searchSerper(
                { q: query, num: 10 },
                abortSignal,
              );

              return results.organic.map((result) => ({
                title: result.title,
                link: result.link,
                snippet: result.snippet,
              }));
            },
          },
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
}
