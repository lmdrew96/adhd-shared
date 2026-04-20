/**
 * Runtime smoke for @adhdesigns/clerk.
 *
 * Covers what's testable in raw Node:
 *   - verifyClerkJWT returns null on missing secret + bogus tokens
 *   - createClerkVerifier handles missing / malformed Authorization headers
 *
 * Not covered (requires Next.js bundler or a live Clerk setup):
 *   - createClerkMiddleware, getCurrentUser, fetchClerkUser, syncClerkUserToNeon.
 *     These are typecheck-only; tsc catches drift at build time.
 *
 * We import from dist/verify-jwt.js directly (not the barrel) so Node doesn't
 * try to resolve next/server transitively.
 */

import {
  verifyClerkJWT,
  createClerkVerifier,
} from "../dist/verify-jwt.js";

const assert = (cond, msg) => {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
};

// 1. verifyClerkJWT returns null, doesn't throw, when secret is missing.
delete process.env.CLERK_SECRET_KEY;
const noSecret = await verifyClerkJWT("anything");
assert(
  noSecret === null,
  "verifyClerkJWT returns null without CLERK_SECRET_KEY",
);

// 2. verifyClerkJWT returns null on obviously bogus token.
process.env.CLERK_SECRET_KEY = "sk_test_fake_secret_for_smoke";
const bogus = await verifyClerkJWT("not.a.real.jwt");
assert(bogus === null, "verifyClerkJWT returns null on bogus token");

// 3. createClerkVerifier with no Authorization header → null.
const verify = createClerkVerifier();
const noHeader = await verify(new Request("http://x/mcp"));
assert(
  noHeader === null,
  "verifier returns null without Authorization header",
);

const wrongScheme = await verify(
  new Request("http://x/mcp", {
    headers: { authorization: "Basic abc" },
  }),
);
assert(
  wrongScheme === null,
  "verifier returns null on non-Bearer scheme",
);

const bogusBearer = await verify(
  new Request("http://x/mcp", {
    headers: { authorization: "Bearer not.a.jwt" },
  }),
);
assert(
  bogusBearer === null,
  "verifier returns null on bogus Bearer token",
);

console.log("\n✓ runtime smoke PASSED");
