import "server-only";
import { auth } from "@clerk/nextjs/server";

/** Returns the signed-in Clerk user id, or null if not signed in. */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

export type GetCurrentUserOptions<TUser> = {
  /**
   * Fetches your app's own user row for a given Clerk user id. Supply the
   * app-specific query — this package stays schema-agnostic.
   */
  fetchUser: (userId: string) => Promise<TUser | null>;
};

/**
 * Server-component helper that returns the app's user record (not just
 * Clerk's). Returns null when unauthenticated or the app row doesn't
 * exist yet (e.g. user signed up but webhook hasn't synced).
 */
export async function getCurrentUser<TUser>(
  opts: GetCurrentUserOptions<TUser>,
): Promise<TUser | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return opts.fetchUser(userId);
}
