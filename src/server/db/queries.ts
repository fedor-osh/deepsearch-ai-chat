import { and, count, eq, gte } from "drizzle-orm";
import { db } from "./index";
import { users, userRequests } from "./schema";

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
      and(
        eq(userRequests.userId, userId),
        gte(userRequests.createdAt, today),
      ),
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
      and(
        eq(userRequests.userId, userId),
        gte(userRequests.createdAt, today),
      ),
    );

  return result?.count || 0;
} 