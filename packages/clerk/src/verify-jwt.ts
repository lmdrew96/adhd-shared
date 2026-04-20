import { verifyToken } from "@clerk/backend";
import type {
  VerifyClerkJWTOptions,
  VerifyClerkJWTResult,
} from "./types.js";

/**
 * Verify a Clerk-issued JWT. Returns null on any failure (missing token,
 * expired, wrong audience, bad signature, etc.) — never throws.
 *
 * Requires `CLERK_SECRET_KEY` in the environment (or `options.secretKey`).
 */
export async function verifyClerkJWT(
  token: string,
  options: VerifyClerkJWTOptions = {},
): Promise<VerifyClerkJWTResult | null> {
  const secretKey = options.secretKey ?? process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;

  try {
    const payload = await verifyToken(token, {
      secretKey,
      ...(options.authorizedParties && {
        authorizedParties: options.authorizedParties,
      }),
      ...(options.audience && { audience: options.audience }),
    });
    if (!payload.sub) return null;
    return { userId: payload.sub, claims: payload };
  } catch {
    return null;
  }
}

/**
 * Verifier factory shaped for @adhdesigns/mcp-kit's `verify` option.
 * Reads a Bearer token from the Authorization header and verifies it
 * as a Clerk JWT.
 *
 *   createHTTPHandler({
 *     ...,
 *     verify: createClerkVerifier({ authorizedParties: ['https://app.example'] }),
 *   })
 */
export function createClerkVerifier(options: VerifyClerkJWTOptions = {}) {
  return async (
    req: Request,
  ): Promise<{ userId: string; claims: Record<string, unknown> } | null> => {
    const header = req.headers.get("authorization");
    const token = header?.startsWith("Bearer ")
      ? header.slice(7).trim()
      : null;
    if (!token) return null;
    const result = await verifyClerkJWT(token, options);
    if (!result) return null;
    return {
      userId: result.userId,
      claims: result.claims as unknown as Record<string, unknown>,
    };
  };
}
