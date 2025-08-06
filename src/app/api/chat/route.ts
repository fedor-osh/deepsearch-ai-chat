import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { z } from "zod";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { auth } from "~/server/auth";
import { model } from "~/models";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/scraper";
import {
  checkUserRateLimit,
  recordUserRequest,
  upsertChat,
} from "~/server/db/queries";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

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
    chatId: string;
    isNewChat: boolean;
  };

  // If chatId is provided and it's not a new chat, check if it belongs to the user
  if (!body.isNewChat) {
    const { getChat } = await import("~/server/db/queries");
    const chat = await getChat(body.chatId, session.user.id);
    if (!chat) {
      return new Response("Forbidden: You do not have access to this chat.", {
        status: 403,
      });
    }
  }

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages, chatId, isNewChat } = body;

      // Create the chat before the stream begins to protect against broken streams
      const lastUserMessage = messages
        .filter((msg) => msg.role === "user")
        .at(-1);
      const initialTitle = lastUserMessage
        ? lastUserMessage.content.slice(0, 50) + "..."
        : "New Chat";

      let currentChatId = chatId;

      if (isNewChat) {
        // Only create a new chat if isNewChat is true
        await upsertChat({
          userId: session.user.id,
          chatId: chatId,
          title: initialTitle,
          messages: messages,
        });

        // Send the new chat ID to the frontend
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: chatId,
        });
      }

      // Create Langfuse trace with session and user tracking
      const trace = langfuse.trace({
        sessionId: currentChatId,
        name: "chat",
        userId: session.user.id,
      });

      const result = streamText({
        model,
        messages,
        maxSteps: 10,
        experimental_telemetry: {
          isEnabled: true,
          functionId: `agent`,
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
        system: `You are a helpful AI assistant with access to web search and web scraping capabilities. 

CURRENT DATE AND TIME: ${new Date().toISOString()}

When users ask questions that require current information, facts, or recent events, you should use the searchWeb tool to find relevant information from the internet. The search results include publication dates for articles, which you should use to determine how recent the information is.

When users ask for "up to date" information, compare the publication dates in your search results with the current date above. Prioritize information from sources that are more recent, and clearly indicate when information might be outdated.

You have access to the scrapePages tool which can extract the full text content from web pages. You MUST ALWAYS use this tool after performing a web search to get the complete content of the most relevant web pages found in your search results.

After using searchWeb, ALWAYS use scrapePages to extract the full content from 4-6 of the most relevant and diverse URLs found in your search results. Choose URLs from different sources and perspectives to ensure comprehensive coverage of the topic. This ensures you have the most comprehensive and up-to-date information available from multiple viewpoints.

Always search the web when:
- Users ask about current events, news, or recent developments
- Users ask for factual information that might be outdated or need verification
- Users ask about specific products, services, or companies
- Users ask about weather, sports scores, or other real-time information
- Users ask about topics you're not completely confident about
- Always format URLs as markdown links.

After searching and scraping, ALWAYS cite your sources using proper markdown link formatting: [source title](url). Never just paste raw URLs - always format them as clickable markdown links.

For example, instead of writing "According to https://example.com/article", write "According to [Example Article](https://example.com/article)".

Be helpful, accurate, and always provide properly formatted source links when using web search results.`,
        onFinish: async ({ response }) => {
          // Record the request after we've confirmed it's allowed
          await recordUserRequest(session.user.id);

          // Use the proper appendResponseMessages from the AI SDK
          const updatedMessages = appendResponseMessages({
            messages,
            responseMessages: response.messages as any,
          });

          const lastMessage = updatedMessages.at(-1);
          if (!lastMessage) {
            return;
          }

          // Update the chat with the complete message history
          await upsertChat({
            userId: session.user.id,
            chatId: currentChatId,
            title: lastMessage.content.slice(0, 50) + "...",
            messages: updatedMessages,
          });

          // Flush the trace to Langfuse
          await langfuse.flushAsync();
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
                date: result.date,
              }));
            },
          },
          scrapePages: {
            parameters: z.object({
              urls: z
                .array(z.string())
                .describe("Array of URLs to scrape for full content"),
            }),
            execute: async ({ urls }, { abortSignal }) => {
              const results = await bulkCrawlWebsites({
                urls,
                maxRetries: 3,
              });

              if (!results.success) {
                return {
                  error: results.error,
                  results: results.results.map((r) => ({
                    url: r.url,
                    success: r.result.success,
                    data: r.result.success ? r.result.data : r.result.error,
                  })),
                };
              }

              return {
                success: true,
                results: results.results.map((r) => ({
                  url: r.url,
                  data: r.result.data,
                })),
              };
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
