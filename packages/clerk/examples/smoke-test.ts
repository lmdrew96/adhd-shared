/**
 * Compile-time smoke — exercises the public API shape so tsc catches
 * drift before runtime.
 */

import {
  verifyClerkJWT,
  createClerkVerifier,
  createClerkMiddleware,
  DEFAULT_CLERK_MIDDLEWARE_CONFIG,
  getCurrentUser,
  getCurrentUserId,
  type VerifyClerkJWTResult,
} from "../src/index.js";
import {
  fetchClerkUser,
  syncClerkUserToNeon,
} from "../src/sync.js";

// 1. verifyClerkJWT — narrow return type + options accepted
async function verifyExample(token: string): Promise<string | null> {
  const result: VerifyClerkJWTResult | null = await verifyClerkJWT(token, {
    authorizedParties: ["https://app.example.com"],
    audience: "my-api",
  });
  return result?.userId ?? null;
}

// 2. createClerkVerifier — shape matches mcp-kit's Verifier
const verifier = createClerkVerifier({ authorizedParties: ["x"] });
async function verifierExample(req: Request) {
  const ctx = await verifier(req);
  if (!ctx) return null;
  const userId: string = ctx.userId;
  const claims: Record<string, unknown> = ctx.claims;
  return { userId, claims };
}

// 3. createClerkMiddleware + default config
const middleware = createClerkMiddleware({
  publicRoutes: ["/", "/sign-in(.*)", "/api/cron(.*)"],
});
const middlewareConfig = DEFAULT_CLERK_MIDDLEWARE_CONFIG;

// 4. getCurrentUser with an app-specific user type
type AppUser = { id: string; email: string; timezone: string };
async function currentUserExample(): Promise<AppUser | null> {
  return getCurrentUser<AppUser>({
    fetchUser: async (userId) => ({
      id: userId,
      email: "x@example.com",
      timezone: "America/New_York",
    }),
  });
}
async function currentUserIdExample(): Promise<string | null> {
  return getCurrentUserId();
}

// 5. sync — fetch + upsert helpers
async function syncExample() {
  const user = await fetchClerkUser("user_abc");
  const name: string | null = user.displayName;
  const email: string | null = user.email;
  return { name, email };
}

async function syncUpsertExample() {
  const fakeTable = {
    id: {} as unknown,
  };
  const fakeDb = {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [] as unknown[] }),
      }),
    }),
    insert: () => ({ values: async () => undefined }),
    update: () => ({
      set: () => ({ where: async () => undefined }),
    }),
  };
  await syncClerkUserToNeon({
    userId: "user_abc",
    db: fakeDb,
    usersTable: fakeTable,
    updateOnConflict: true,
  });
}

export {
  verifyExample,
  verifierExample,
  middleware,
  middlewareConfig,
  currentUserExample,
  currentUserIdExample,
  syncExample,
  syncUpsertExample,
};
