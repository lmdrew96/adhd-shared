import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import type { ClerkUserFetched } from "./types.js";

/**
 * Fetch a Clerk user by id and normalize the shape. Pure — no database work.
 * Useful as a building block for custom sync flows.
 */
export async function fetchClerkUser(
  userId: string,
): Promise<ClerkUserFetched> {
  const client = await clerkClient();
  const u = await client.users.getUser(userId);
  const email =
    u.primaryEmailAddress?.emailAddress ??
    u.emailAddresses[0]?.emailAddress ??
    null;
  const firstName = u.firstName ?? null;
  const lastName = u.lastName ?? null;
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    u.username ||
    null;
  return {
    id: u.id,
    email,
    displayName,
    firstName,
    lastName,
    username: u.username ?? null,
    imageUrl: u.imageUrl ?? null,
  };
}

export type SyncClerkUserToNeonOptions<TRow> = {
  userId: string;
  /** Drizzle DB instance (neon-http or pg). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  /** Drizzle PG table with an `id` column holding the Clerk user id. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  usersTable: any;
  /**
   * Maps a fetched Clerk user to row values for INSERT. Default assumes
   * `{ id, email, displayName }` columns. Override when your schema differs.
   */
  mapFields?: (user: ClerkUserFetched) => TRow;
  /**
   * If true, UPDATE on conflict. Default: false (existing rows left alone —
   * matches the `ensureUser` pattern CC uses today).
   */
  updateOnConflict?: boolean;
};

/**
 * Ensures a Neon users row exists for the given Clerk user id. Fetches
 * the Clerk user on demand and inserts if missing. By default leaves
 * existing rows alone (pass `updateOnConflict: true` to keep them in sync).
 */
export async function syncClerkUserToNeon<TRow = Record<string, unknown>>(
  opts: SyncClerkUserToNeonOptions<TRow>,
): Promise<void> {
  const clerkUser = await fetchClerkUser(opts.userId);

  const defaultMap = (u: ClerkUserFetched): Record<string, unknown> => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
  });
  const values = (opts.mapFields ?? defaultMap)(clerkUser) as Record<
    string,
    unknown
  >;

  const idColumn = opts.usersTable.id;
  if (!idColumn) {
    throw new Error(
      "[adhdesigns/clerk] syncClerkUserToNeon: usersTable must have an `id` column " +
        "holding the Clerk user id. Pass a custom upsert if your schema differs.",
    );
  }

  const existing = await opts.db
    .select()
    .from(opts.usersTable)
    .where(eq(idColumn, opts.userId))
    .limit(1);

  if (existing.length === 0) {
    await opts.db.insert(opts.usersTable).values(values);
    return;
  }

  if (opts.updateOnConflict) {
    await opts.db
      .update(opts.usersTable)
      .set(values)
      .where(eq(idColumn, opts.userId));
  }
}
