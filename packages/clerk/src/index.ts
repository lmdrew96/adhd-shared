export {
  verifyClerkJWT,
  createClerkVerifier,
} from "./verify-jwt.js";
export {
  createClerkMiddleware,
  DEFAULT_CLERK_MIDDLEWARE_CONFIG,
  type CreateClerkMiddlewareOptions,
} from "./middleware.js";
export {
  getCurrentUser,
  getCurrentUserId,
  type GetCurrentUserOptions,
} from "./current-user.js";
export type {
  VerifyClerkJWTOptions,
  VerifyClerkJWTResult,
  ClerkUserFetched,
} from "./types.js";
