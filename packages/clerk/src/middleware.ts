import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export type CreateClerkMiddlewareOptions = {
  /**
   * Route patterns that bypass auth. Follows Next.js matcher syntax —
   * e.g. `"/"`, `"/sign-in(.*)"`, `"/api/cron(.*)"`. Everything else
   * requires a signed-in user.
   */
  publicRoutes: string[];
  /**
   * If true, bypass auth entirely when `CLERK_SECRET_KEY` is missing.
   * Keeps local dev usable before Clerk is wired up. Default: true.
   */
  skipWhenUnconfigured?: boolean;
};

export function createClerkMiddleware(opts: CreateClerkMiddlewareOptions) {
  const isPublicRoute = createRouteMatcher(opts.publicRoutes);
  const skipWhenUnconfigured = opts.skipWhenUnconfigured ?? true;

  return clerkMiddleware(async (auth, req) => {
    if (skipWhenUnconfigured && !process.env.CLERK_SECRET_KEY) {
      return NextResponse.next();
    }
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  });
}

/**
 * Standard Next.js middleware matcher config: skips internals and static
 * assets, runs on all routes + API. Drop this alongside your middleware
 * export unless you have app-specific overrides.
 *
 *   export const config = DEFAULT_CLERK_MIDDLEWARE_CONFIG;
 */
export const DEFAULT_CLERK_MIDDLEWARE_CONFIG = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
