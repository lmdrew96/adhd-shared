import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpError } from "./errors.js";
import { runWithContext } from "./context.js";
import { textResponse } from "./responses.js";
import type {
  AuthContext,
  ToolDefinition,
  McpToolResponse,
} from "./types.js";

export type CreateStdioServerOptions = {
  name: string;
  version: string;
  tools: ToolDefinition[];
  /**
   * Provides the auth/tool context for stdio mode. Stdio servers have no HTTP
   * request to authenticate against — the caller typically reads an env var
   * or hard-codes a user id. Defaults to `{ userId: "stdio-local" }`.
   */
  context?: () => AuthContext | Promise<AuthContext>;
};

export async function createStdioServer(
  opts: CreateStdioServerOptions,
): Promise<void> {
  const server = new McpServer({ name: opts.name, version: opts.version });
  const ctxProvider =
    opts.context ?? ((): AuthContext => ({ userId: "stdio-local" }));

  for (const tool of opts.tools) {
    const wrapped = async (args: unknown): Promise<McpToolResponse> => {
      try {
        const ctx = await ctxProvider();
        return await runWithContext(ctx, () =>
          Promise.resolve(tool.handler(args as never, ctx)),
        );
      } catch (err) {
        return toErrorResponse(err);
      }
    };

    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        ...(tool.annotations && { annotations: tool.annotations }),
      },
      wrapped,
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function toErrorResponse(err: unknown): McpToolResponse {
  if (err instanceof McpError) {
    return textResponse(`Error (${err.code}): ${err.message}`, true);
  }
  const message = err instanceof Error ? err.message : String(err);
  return textResponse(`Error: ${message}`, true);
}
