import type { JwtPayload } from "@clerk/types";

export type VerifyClerkJWTOptions = {
  /** Overrides `process.env.CLERK_SECRET_KEY`. */
  secretKey?: string;
  /** `azp` claim allow-list. */
  authorizedParties?: string[];
  /** `aud` claim allow-list. */
  audience?: string | string[];
};

export type VerifyClerkJWTResult = {
  userId: string;
  claims: JwtPayload;
};

export type ClerkUserFetched = {
  id: string;
  email: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string | null;
};
