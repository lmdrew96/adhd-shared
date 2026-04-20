import type { z } from "zod";

export type AuthContext = {
  userId: string;
  claims?: Record<string, unknown>;
};

export type ToolContext = AuthContext;

export type Verifier = (req: Request) => Promise<AuthContext | null>;

export type McpTextContent = { type: "text"; text: string };

export type McpToolResponse = {
  content: McpTextContent[];
  isError?: boolean;
};

export type ToolHandler<TShape extends z.ZodRawShape> = (
  args: z.infer<z.ZodObject<TShape>>,
  ctx: ToolContext,
) => Promise<McpToolResponse> | McpToolResponse;

export type ToolAnnotations = {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
};

export type ToolDefinition<TShape extends z.ZodRawShape = z.ZodRawShape> = {
  name: string;
  description: string;
  inputSchema: TShape;
  handler: ToolHandler<TShape>;
  annotations?: ToolAnnotations;
};
