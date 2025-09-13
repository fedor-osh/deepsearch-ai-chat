import type { Message } from "ai";
import { createDataStreamResponse, appendResponseMessages } from "ai";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { auth } from "~/server/auth";
import { upsertChat } from "~/server/db/queries";
import { streamFromDeepSearch } from "~/deep-search";
import { checkRateLimit, recordRateLimit } from "~/server/rate-limit";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Create Langfuse trace at the beginning
  const trace = langfuse.trace({
    name: "chat",
    userId: session.user.id,
  });

  // Check rate limit before processing the request
  const rateLimitSpan = trace.span({
    name: "check-global-rate-limit",
    input: {
      userId: session.user.id,
    },
  });

  // Configure rate limiting: 1 request per 5 seconds for testing
  const rateLimitConfig = {
    maxRequests: 1,
    maxRetries: 3,
    windowMs: 5_000, // 5 seconds
    keyPrefix: "global",
  };

  const rateLimitCheck = await checkRateLimit(rateLimitConfig);

  rateLimitSpan.end({
    output: {
      allowed: rateLimitCheck.allowed,
      totalHits: rateLimitCheck.totalHits,
      remaining: rateLimitCheck.remaining,
      resetTime: rateLimitCheck.resetTime,
    },
  });

  if (!rateLimitCheck.allowed) {
    console.log("Rate limit exceeded, waiting...");
    const isAllowed = await rateLimitCheck.retry();

    // If the rate limit is still exceeded after retries, return a 429
    if (!isAllowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `Rate limit exceeded. Please try again later.`,
          totalHits: rateLimitCheck.totalHits,
          resetTime: rateLimitCheck.resetTime,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": rateLimitConfig.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(
              rateLimitCheck.resetTime,
            ).toISOString(),
          },
        },
      );
    }
  }

  // Record the request
  await recordRateLimit(rateLimitConfig);

  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId: string;
    isNewChat: boolean;
  };

  // If chatId is provided and it's not a new chat, check if it belongs to the user
  if (!body.isNewChat) {
    const getChatSpan = trace.span({
      name: "get-existing-chat",
      input: {
        chatId: body.chatId,
        userId: session.user.id,
      },
    });

    const { getChat } = await import("~/server/db/queries");
    const chat = await getChat(body.chatId, session.user.id);

    getChatSpan.end({
      output: {
        chatFound: !!chat,
        chatId: body.chatId,
      },
    });

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

      const currentChatId = chatId;

      if (isNewChat) {
        // Only create a new chat if isNewChat is true
        const createChatSpan = trace.span({
          name: "create-new-chat",
          input: {
            userId: session.user.id,
            chatId: chatId,
            title: initialTitle,
            messageCount: messages.length,
          },
        });

        await upsertChat({
          userId: session.user.id,
          chatId: chatId,
          title: initialTitle,
          messages: messages,
        });

        createChatSpan.end({
          output: {
            chatId: chatId,
            title: initialTitle,
          },
        });

        // Send the new chat ID to the frontend
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: chatId,
        });
      }

      // Update trace with sessionId now that we have the chatId
      trace.update({
        sessionId: currentChatId,
      });

      const result = await streamFromDeepSearch({
        messages,
        onFinish: async ({ response }) => {
          // Use the proper appendResponseMessages from the AI SDK
          const updatedMessages = appendResponseMessages({
            messages,
            responseMessages: response.messages,
          });

          const lastMessage = updatedMessages.at(-1);
          if (!lastMessage) {
            return;
          }

          // Update the chat with the complete message history
          const updateChatSpan = trace.span({
            name: "update-chat-with-response",
            input: {
              userId: session.user.id,
              chatId: currentChatId,
              title: lastMessage.content.slice(0, 50) + "...",
              messageCount: updatedMessages.length,
            },
          });

          await upsertChat({
            userId: session.user.id,
            chatId: currentChatId,
            title: lastMessage.content.slice(0, 50) + "...",
            messages: updatedMessages,
          });

          updateChatSpan.end({
            output: {
              chatId: currentChatId,
              title: lastMessage.content.slice(0, 50) + "...",
            },
          });

          // Flush the trace to Langfuse
          await langfuse.flushAsync();
        },
        telemetry: {
          isEnabled: true,
          functionId: `agent`,
          metadata: {
            langfuseTraceId: trace.id,
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
