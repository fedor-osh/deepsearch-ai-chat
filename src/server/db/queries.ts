import { and, count, eq, gte } from "drizzle-orm";
import { db } from "./index";
import { users, userRequests, chats } from "./schema";
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

  const currentCount = result?.count || 0;
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

  return result?.count || 0;
}

export async function upsertChat({
  userId,
  chatId,
  title,
  messages,
}: {
  userId: string;
  chatId: string;
  title: string;
  messages: Message[];
}) {
  const existingChat = await db
    .select()
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  if (existingChat.length > 0) {
    // Update existing chat
    await db
      .update(chats)
      .set({
        title,
        messages,
        updatedAt: new Date(),
      })
      .where(eq(chats.id, chatId));
  } else {
    // Create new chat
    await db.insert(chats).values({
      id: chatId,
      userId,
      title,
      messages,
    });
  }
}

export function appendResponseMessages({
  messages,
  responseMessages,
}: {
  messages: Message[];
  responseMessages: Message[];
}): Message[] {
  return [...messages, ...responseMessages];
}

export async function getChatsByUserId(userId: string): Promise<DB.Chat[]> {
  return db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(chats.updatedAt);
}

export async function getChatById(chatId: string): Promise<DB.Chat | null> {
  const result = await db
    .select()
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  return result[0] || null;
}

export async function deleteChat(chatId: string): Promise<void> {
  await db.delete(chats).where(eq(chats.id, chatId));
}
