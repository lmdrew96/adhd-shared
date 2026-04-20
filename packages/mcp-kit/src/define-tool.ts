import type { z } from "zod";
import type { ToolDefinition } from "./types.js";

const KNOWN_VERBS = new Set([
  "list",
  "add",
  "get",
  "update",
  "delete",
  "complete",
  "reopen",
  "start",
  "search",
  "create",
]);

function validateName(name: string): void {
  const match = name.match(/^([a-z][a-z0-9]*)_([a-z][a-z0-9_]*)$/);
  if (!match) {
    console.warn(
      `[mcp-kit] tool name "${name}" does not match the xx_verb[_resource] convention ` +
        `(lowercase + digits + underscores, e.g., cp_list_patches).`,
    );
    return;
  }
  const firstVerb = match[2]!.split("_")[0]!;
  if (!KNOWN_VERBS.has(firstVerb)) {
    console.warn(
      `[mcp-kit] tool "${name}" uses verb "${firstVerb}" — not in the standard set ` +
        `(${[...KNOWN_VERBS].join(", ")}). Consider renaming for consistency.`,
    );
  }
}

export function defineTool<TShape extends z.ZodRawShape>(
  def: ToolDefinition<TShape>,
): ToolDefinition<TShape> {
  validateName(def.name);
  return def;
}

export function defineToolSet(
  prefix: string,
  tools: Record<string, Omit<ToolDefinition, "name">>,
): ToolDefinition[] {
  if (!/^[a-z][a-z0-9]*$/.test(prefix)) {
    console.warn(
      `[mcp-kit] prefix "${prefix}" should be lowercase letters/digits only (e.g., "cp", "cc", "pctx").`,
    );
  }
  return Object.entries(tools).map(([suffix, rest]) => {
    const name = `${prefix}_${suffix}`;
    validateName(name);
    return { name, ...rest };
  });
}
