import { and, count, eq, gte, desc, asc, ne } from "drizzle-orm";
import { db } from "./index";
import { users, userRequests, chats, messages } from "./schema";
import type { Message } from "ai";
import type { DB } from "./schema";

const DAILY_REQUEST_LIMIT = 50; // Adjust this value as needed

export async function checkUserRateLimit(userId: string): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [user] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId));

  // Admins bypass rate limiting
  if (user?.isAdmin) {
    return {
      allowed: true,
      currentCount: 0,
      limit: -1, // -1 indicates no limit for admins
    };
  }

  const [result] = await db
    .select({ count: count() })
    .from(userRequests)
    .where(
      and(eq(userRequests.userId, userId), gte(userRequests.createdAt, today)),
    );

  const currentCount = result?.count ?? 0;
  const allowed = currentCount < DAILY_REQUEST_LIMIT;

  return {
    allowed,
    currentCount,
    limit: DAILY_REQUEST_LIMIT,
  };
}

export async function recordUserRequest(userId: string): Promise<void> {
  await db.insert(userRequests).values({
    userId,
  });
}

export async function getUserRequestCount(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ count: count() })
    .from(userRequests)
    .where(
      and(eq(userRequests.userId, userId), gte(userRequests.createdAt, today)),
    );

  return result?.count ?? 0;
}

export async function upsertChat({
  userId,
  chatId,
  title,
  messages: messageArray,
}: {
  userId: string;
  chatId: string;
  title: string;
  messages: Message[];
}) {
  // Check if chat exists and belongs to the user
  const existingChat = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);

  // Check if chat exists under a different user
  const chatUnderDifferentUser = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), ne(chats.userId, userId)))
    .limit(1);

  if (chatUnderDifferentUser.length > 0) {
    throw new Error(
      `Chat with ID ${chatId} already exists under a different user`,
    );
  }

  if (existingChat.length > 0) {
    // Delete all existing messages for this chat
    await db.delete(messages).where(eq(messages.chatId, chatId));

    // Update the chat title and timestamp
    await db
      .update(chats)
      .set({
        title,
        updatedAt: new Date(),
      })
      .where(eq(chats.id, chatId));
  } else {
    // Create new chat
    await db.insert(chats).values({
      id: chatId,
      userId,
      title,
    });
  }

  // Insert all messages
  if (messageArray.length > 0) {
    const messageValues = messageArray.map((message, index) => ({
      chatId,
      role: message.role,
      parts: message.parts,
      order: index,
    }));

    await db.insert(messages).values(messageValues);
  }
}

export async function getChat(
  chatId: string,
  userId: string,
): Promise<{
  chat: DB.Chat;
  messages: Message[];
} | null> {
  const chat = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);

  if (!chat[0]) {
    return null;
  }

  const messageRows = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.order));

  const chatMessages: Message[] = messageRows.map((msg: DB.Message) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    content: typeof msg.parts === "string" ? msg.parts : "",
    parts: msg.parts as Message["parts"],
  }));

  return {
    chat: chat[0],
    messages: chatMessages,
  };
}

export async function getChats(userId: string): Promise<DB.Chat[]> {
  return db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt));
}

export async function deleteChat(chatId: string): Promise<void> {
  await db.delete(chats).where(eq(chats.id, chatId));
}
