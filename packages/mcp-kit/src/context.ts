import { AsyncLocalStorage } from "node:async_hooks";
import type { ToolContext } from "./types.js";

const storage = new AsyncLocalStorage<ToolContext>();

export function runWithContext<T>(ctx: ToolContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function useAuth(): ToolContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      "useAuth() called outside of a tool handler. " +
        "Check that your server was created via createHTTPHandler/createStdioServer.",
    );
  }
  return ctx;
}

export function tryAuth(): ToolContext | null {
  return storage.getStore() ?? null;
}
