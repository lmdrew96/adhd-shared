import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { McpError } from "./errors.js";
import { runWithContext } from "./context.js";
import { textResponse } from "./responses.js";
import type {
  AuthContext,
  ToolDefinition,
  McpToolResponse,
  Verifier,
} from "./types.js";

export type CreateHTTPHandlerOptions = {
  name: string;
  version: string;
  tools: ToolDefinition[];
  verify?: Verifier;
  unauthenticatedResponse?: (req: Request) => Response | Promise<Response>;
};

export function createHTTPHandler(
  opts: CreateHTTPHandlerOptions,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    let ctx: AuthContext;
    if (opts.verify) {
      const result = await opts.verify(req);
      if (!result) {
        return (
          (await opts.unauthenticatedResponse?.(req)) ??
          new Response("Unauthorized", { status: 401 })
        );
      }
      ctx = result;
    } else {
      ctx = { userId: "anonymous" };
    }

    const server = new McpServer({ name: opts.name, version: opts.version });

    for (const tool of opts.tools) {
      registerToolOnServer(server, tool, ctx);
    }

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    return transport.handleRequest(req);
  };
}

function registerToolOnServer(
  server: McpServer,
  tool: ToolDefinition,
  ctx: AuthContext,
): void {
  const wrapped = async (args: unknown): Promise<McpToolResponse> => {
    try {
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

function toErrorResponse(err: unknown): McpToolResponse {
  if (err instanceof McpError) {
    return textResponse(`Error (${err.code}): ${err.message}`, true);
  }
  const message = err instanceof Error ? err.message : String(err);
  return textResponse(`Error: ${message}`, true);
}
