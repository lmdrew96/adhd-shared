/**
 * Smoke test for @adhdesigns/mcp-kit — not published; compiled by tsc to
 * confirm the public API shape is sound and types flow correctly.
 *
 * Run: pnpm --filter @adhdesigns/mcp-kit build
 */

import { z } from "zod";
import {
  defineToolSet,
  createHTTPHandler,
  markdownResponse,
  markdownItem,
  useAuth,
  NotFoundError,
  type ToolDefinition,
} from "../src/index.js";

type Patch = {
  id: string;
  title: string;
  status: "open" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
};

const fakePatches: Patch[] = [
  { id: "1", title: "First patch", status: "open", priority: "high" },
  { id: "2", title: "Second patch", status: "done", priority: "medium" },
];

const cpTools: ToolDefinition[] = defineToolSet("cp", {
  list_patches: {
    description: "List patches for the authenticated user.",
    inputSchema: {
      status: z
        .enum(["open", "in_progress", "done"])
        .optional()
        .describe("Filter by status"),
    },
    handler: async (args) => {
      const { userId } = useAuth();
      const items = fakePatches.filter(
        (p) => !args.status || p.status === args.status,
      );
      return markdownResponse(items, {
        title: `Patches for ${userId}`,
        fields: ["id", "title", "status", "priority"],
      });
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
  },

  get_patch: {
    description: "Get a single patch by id.",
    inputSchema: {
      patch_id: z.string().describe("Patch UUID"),
    },
    handler: async (args) => {
      const patch = fakePatches.find((p) => p.id === args.patch_id);
      if (!patch) throw new NotFoundError(`Patch ${args.patch_id} not found.`);
      return markdownItem(patch, {
        fields: [
          "id",
          "title",
          { key: "status", label: "Status" },
          {
            key: "priority",
            label: "Priority",
            format: (v) => (v === "high" ? `🔥 ${String(v)}` : String(v)),
          },
        ],
      });
    },
    annotations: { readOnlyHint: true },
  },
});

export const handler = createHTTPHandler({
  name: "chaospatch-smoke",
  version: "0.0.0",
  tools: cpTools,
  verify: async (req) => {
    const bearer = req.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");
    if (!bearer) return null;
    return { userId: bearer };
  },
});

export { handler as GET, handler as POST, handler as DELETE };
