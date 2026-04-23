# @adhdesigns/clerk

Shared Clerk helpers for ADHDesigns Neon+Clerk apps. Captures the middleware, JWT verification, server-component helpers, and Neon user-sync patterns that were being re-implemented in every app.

## Install

```bash
pnpm add @adhdesigns/clerk @clerk/nextjs @clerk/backend next
# optional — only if you use syncClerkUserToNeon
pnpm add drizzle-orm
```

Peer deps: `@clerk/backend ^1 || ^2`, `@clerk/nextjs ^5 || ^6`, `next ^14 || ^15 || ^16`. `drizzle-orm` is an optional peer — the middleware/verifier/current-user helpers don't require it; only the sync helpers do.

Requires `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in the environment.

## `createClerkMiddleware` — Next.js middleware wrapper

Skips `@clerk/nextjs`'s boilerplate around `clerkMiddleware` + `createRouteMatcher` and handles the "local dev before keys are wired up" case out of the box.

```ts
// middleware.ts
import {
  createClerkMiddleware,
  DEFAULT_CLERK_MIDDLEWARE_CONFIG,
} from "@adhdesigns/clerk";

export default createClerkMiddleware({
  publicRoutes: ["/", "/sign-in(.*)", "/sign-up(.*)", "/api/cron(.*)"],
});

export const config = DEFAULT_CLERK_MIDDLEWARE_CONFIG;
```

Options:

- `publicRoutes: string[]` — Next.js matcher patterns that bypass auth. Everything else requires a signed-in user.
- `skipWhenUnconfigured?: boolean` (default `true`) — when `CLERK_SECRET_KEY` is missing, short-circuit to `NextResponse.next()` instead of crashing. Keeps local dev running before you've added the env var.

`DEFAULT_CLERK_MIDDLEWARE_CONFIG.matcher` skips Next.js internals and static assets and runs on all app routes + `api|trpc`. Drop it in unless you have app-specific overrides.

## `verifyClerkJWT` + `createClerkVerifier` — verify bearer tokens

Use `verifyClerkJWT` when you have a raw token string (webhook secrets, worker queues). Use `createClerkVerifier` to hand a `Verifier` to `@adhdesigns/mcp-kit`.

```ts
import { verifyClerkJWT, createClerkVerifier } from "@adhdesigns/clerk";

// 1. Raw verification — returns null on any failure, never throws
const result = await verifyClerkJWT(token, {
  authorizedParties: ["https://app.example.com"],
  audience: "my-api",
});
if (!result) return new Response("Unauthorized", { status: 401 });
const { userId, claims } = result;

// 2. Shaped for mcp-kit's Verifier contract
import { createHTTPHandler } from "@adhdesigns/mcp-kit";

const handler = createHTTPHandler({
  name: "my-mcp",
  version: "0.1.0",
  tools,
  verify: createClerkVerifier({
    authorizedParties: ["https://app.example.com"],
  }),
});
```

`createClerkVerifier` reads `Authorization: Bearer <token>` from the request, calls `verifyClerkJWT`, and returns `{ userId, claims }` or `null` — ready to drop into mcp-kit.

Options for both:
- `secretKey?` — override `process.env.CLERK_SECRET_KEY`.
- `authorizedParties?: string[]` — allow-list for the `azp` claim.
- `audience?: string | string[]` — allow-list for the `aud` claim.

## `getCurrentUser` / `getCurrentUserId` — server-component helpers

Thin wrappers over Clerk's `auth()` with a narrower, app-friendly shape.

```tsx
// app/dashboard/page.tsx (Server Component)
import { getCurrentUser, getCurrentUserId } from "@adhdesigns/clerk";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

type AppUser = { id: string; email: string; timezone: string };

export default async function Dashboard() {
  const user = await getCurrentUser<AppUser>({
    fetchUser: async (userId) => {
      const rows = await db.select().from(users).where(eq(users.id, userId));
      return rows[0] ?? null;
    },
  });

  if (!user) return <SignInPrompt />;
  return <div>Hello, {user.email}</div>;
}
```

`getCurrentUserId()` returns just the Clerk id (or `null`) — use it when you don't need the app row.

`getCurrentUser` returns `null` in two cases: **unauthenticated**, or **authenticated but the app row doesn't exist yet** (e.g. user just signed up and the webhook hasn't synced). Handle both with a single branch.

## `syncClerkUserToNeon` — upsert a Clerk user into your users table

Default behavior matches the `ensureUser` pattern: if a row exists, leave it alone.

```ts
import { syncClerkUserToNeon } from "@adhdesigns/clerk/sync";
import { db } from "@/db";
import { users } from "@/db/schema";

await syncClerkUserToNeon({
  userId: "user_abc",
  db,
  usersTable: users,
});
```

Default assumptions: your table has an `id` column holding the Clerk user id, plus `email` and `displayName` columns. The helper inserts `{ id, email, displayName }`.

### Custom schema — `mapFields`

If your columns are named differently (or you want to persist more), pass a `mapFields`:

```ts
await syncClerkUserToNeon({
  userId: "user_abc",
  db,
  usersTable: users,
  mapFields: (u) => ({
    id: u.id,
    primary_email: u.email,
    full_name: u.displayName,
    avatar: u.imageUrl,
    created_at: new Date(),
  }),
});
```

The `u` argument is a `ClerkUserFetched`:

```ts
type ClerkUserFetched = {
  id: string;
  email: string | null;
  displayName: string | null;       // "First Last" ?? username ?? null
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string | null;
};
```

### `updateOnConflict` semantics

- `updateOnConflict: false` (default) — existing rows are left alone. Matches the `ensureUser` pattern; you're saying "make sure this user exists," not "keep this user in sync."
- `updateOnConflict: true` — existing rows are updated with the fresh Clerk values. Use this from a Clerk webhook on `user.updated`.

### Schema requirement

The helper's only hard requirement is `usersTable.id` — a Drizzle column holding the Clerk user id. It throws a clear error if missing. For fully custom shapes (composite keys, non-Drizzle tables), write an app-specific upsert directly instead.

### `fetchClerkUser` — pure fetch, no DB

Exposed from `@adhdesigns/clerk/sync` for custom sync flows:

```ts
import { fetchClerkUser } from "@adhdesigns/clerk/sync";
const user = await fetchClerkUser("user_abc"); // ClerkUserFetched
```

## Scripts

```bash
pnpm --filter @adhdesigns/clerk build           # tsc
pnpm --filter @adhdesigns/clerk typecheck       # tsc --noEmit
pnpm --filter @adhdesigns/clerk smoke           # build + runtime smoke
```
