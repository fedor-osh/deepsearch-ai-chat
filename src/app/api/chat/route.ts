import type { Message } from "ai";
import {
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { auth } from "~/server/auth";
import {
  checkUserRateLimit,
  recordUserRequest,
  upsertChat,
} from "~/server/db/queries";
import { streamFromDeepSearch } from "~/deep-search";

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
    name: "check-user-rate-limit",
    input: {
      userId: session.user.id,
    },
  });

  const rateLimitCheck = await checkUserRateLimit(session.user.id);

  rateLimitSpan.end({
    output: {
      allowed: rateLimitCheck.allowed,
      currentCount: rateLimitCheck.currentCount,
      limit: rateLimitCheck.limit,
    },
  });

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

      let currentChatId = chatId;

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

      const result = streamFromDeepSearch({
        messages,
        onFinish: async ({ response }) => {
          // Record the request after we've confirmed it's allowed
          const recordRequestSpan = trace.span({
            name: "record-user-request",
            input: {
              userId: session.user.id,
            },
          });

          await recordUserRequest(session.user.id);

          recordRequestSpan.end({
            output: {
              success: true,
            },
          });

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
