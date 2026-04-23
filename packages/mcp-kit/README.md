# @adhdesigns/mcp-kit

Shared toolkit for building ADHDesigns MCP servers on top of `@modelcontextprotocol/sdk`. Handles the boilerplate: tool definitions, HTTP and stdio transports, an auth/context plumbing story, standard error types, and response formatters tuned for markdown-friendly clients like Claude.

## Install

```bash
pnpm add @adhdesigns/mcp-kit @modelcontextprotocol/sdk zod
```

Peer deps: `@modelcontextprotocol/sdk ^1.12`, `zod ^3.25 || ^4`.

## Define a tool

`defineTool` validates the name against the `xx_verb[_resource]` convention and returns the definition unchanged. `defineToolSet` is a helper for the common case of many tools sharing a prefix.

```ts
import { z } from "zod";
import {
  defineToolSet,
  markdownResponse,
  markdownItem,
  useAuth,
  NotFoundError,
  type ToolDefinition,
} from "@adhdesigns/mcp-kit";

const cpTools: ToolDefinition[] = defineToolSet("cp", {
  list_patches: {
    description: "List patches for the authenticated user.",
    inputSchema: {
      status: z.enum(["open", "in_progress", "done"]).optional(),
    },
    handler: async (args) => {
      const { userId } = useAuth();
      const items = await db.patches.findMany({ userId, status: args.status });
      return markdownResponse(items, {
        title: `Patches for ${userId}`,
        fields: ["id", "title", "status", "priority"],
      });
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
  },

  get_patch: {
    description: "Get a single patch by id.",
    inputSchema: { patch_id: z.string() },
    handler: async (args) => {
      const patch = await db.patches.findOne({ id: args.patch_id });
      if (!patch) throw new NotFoundError(`Patch ${args.patch_id} not found.`);
      return markdownItem(patch, {
        fields: [
          "id",
          "title",
          { key: "status", label: "Status" },
          {
            key: "priority",
            label: "Priority",
            format: (v) => (v === "high" ? `🔥 ${v}` : String(v)),
          },
        ],
      });
    },
    annotations: { readOnlyHint: true },
  },
});
```

### Naming convention

`defineTool` / `defineToolSet` emit `console.warn` when names drift from the shared pattern:

- Names must match `^[a-z][a-z0-9]*_[a-z][a-z0-9_]*$` — lowercase, digits, underscores (`cp_list_patches`, `cc_complete_task`, `pctx_get_context`).
- The first verb in the suffix should be one of: `list`, `add`, `get`, `update`, `delete`, `complete`, `reopen`, `start`, `search`, `create`.

Warnings don't throw — they nudge. If you genuinely need a different verb, ignore it (but consider whether the surrounding servers should align).

## HTTP transport (Next.js, Hono, any Web-standard framework)

`createHTTPHandler` returns a `(req: Request) => Promise<Response>` — drop it into any handler that speaks the Web Fetch API.

```ts
// app/api/mcp/route.ts — Next.js App Router
import { createHTTPHandler } from "@adhdesigns/mcp-kit";
import { createClerkVerifier } from "@adhdesigns/clerk";
import { cpTools } from "./tools";

const handler = createHTTPHandler({
  name: "chaospatch",
  version: "0.3.0",
  tools: cpTools,
  verify: createClerkVerifier({
    authorizedParties: ["https://chaospatch.adhdesigns.dev"],
  }),
});

export { handler as GET, handler as POST, handler as DELETE };
```

For Express or any Node-only server, adapt via `Request`/`Response` shims (e.g. `@whatwg-node/server`) — the handler is framework-agnostic by design.

### Verifier contract

A `Verifier` is `(req: Request) => Promise<AuthContext | null>`. Return `null` to reject the request (401 by default; override with `unauthenticatedResponse`). Return `{ userId, claims? }` to accept and make that context available via `useAuth()` inside tool handlers.

`@adhdesigns/clerk` ships `createClerkVerifier` pre-shaped for this contract.

## Stdio transport (local MCPs for Cody)

```ts
// bin/mcp-server.ts
import { createStdioServer } from "@adhdesigns/mcp-kit/stdio";
import { tools } from "../src/tools";

await createStdioServer({
  name: "my-local-mcp",
  version: "0.1.0",
  tools,
  // Optional: provide userId from env or hard-coded for the local user
  context: () => ({ userId: process.env.USER_ID ?? "nae" }),
});
```

Stdio has no HTTP request to authenticate, so the caller controls the context. Default is `{ userId: "stdio-local" }`.

## Context and auth

Inside a handler, pull the verified context from anywhere in the call stack:

```ts
import { useAuth, tryAuth } from "@adhdesigns/mcp-kit";

function whoAmI() {
  const { userId, claims } = useAuth();       // throws if called outside a handler
  const maybe = tryAuth();                    // returns null outside a handler
  return userId;
}
```

Backed by `AsyncLocalStorage`, so async deep-nesting works without threading context by hand.

## Errors

Throw one of these and the handler converts it to an `isError: true` response with a readable message and a code prefix:

```ts
import {
  NotFoundError,       // "not_found"
  ValidationError,     // "validation"
  AuthError,           // "auth"
  ForbiddenError,      // "forbidden"
  ConflictError,       // "conflict"
  McpError,            // generic, pass a code
} from "@adhdesigns/mcp-kit";

throw new NotFoundError(`Patch ${id} not found.`);
throw new McpError("Upstream timed out.", "internal");
```

Unknown errors become `Error: <message>` with `isError: true`. Nothing ever crashes the transport.

## Response formatters

Tool handlers return `{ content: [{ type: "text", text }], isError? }`. These helpers build that shape:

```ts
import {
  textResponse,         // (text, isError?) — plain string
  jsonResponse,         // (data) — pretty-printed JSON
  markdownResponse,     // (items[], { fields, title?, emptyMessage? })
  markdownItem,         // (item | null, { fields, notFoundMessage? })
} from "@adhdesigns/mcp-kit";
```

### `FieldSpec` for markdown formatters

Each field is either a key of `T`, or an object with richer control:

```ts
type FieldSpec<T> =
  | keyof T
  | {
      key: keyof T;
      label?: string;                               // defaults to the key name
      format?: (value: unknown, row: T) => string;  // override default formatting
    };
```

Defaults: `null`/`undefined` → `—`, `Date` → ISO string, objects → JSON.

```ts
markdownResponse(patches, {
  title: "Open patches",
  emptyMessage: "No open patches.",
  fields: [
    "id",
    "title",
    { key: "status", label: "Status" },
    {
      key: "priority",
      format: (v) => (v === "high" ? `🔥 ${v}` : String(v)),
    },
  ],
});
```

Each row renders as `- **Label:** value · **Label:** value`, which most markdown-aware MCP clients (Claude, ChatGPT, Cursor) render cleanly.

## Scripts

```bash
pnpm --filter @adhdesigns/mcp-kit build         # tsc
pnpm --filter @adhdesigns/mcp-kit typecheck     # tsc --noEmit
pnpm --filter @adhdesigns/mcp-kit smoke         # build + run examples/runtime-smoke.mjs
```

The `examples/` directory contains a compile-time smoke (`smoke-test.ts`) and a runtime smoke (`runtime-smoke.mjs`) that exercises the public API so drift is caught before a consumer app notices.
