import type { McpToolResponse } from "./types.js";

export function textResponse(text: string, isError = false): McpToolResponse {
  const response: McpToolResponse = { content: [{ type: "text", text }] };
  if (isError) response.isError = true;
  return response;
}

export function jsonResponse(data: unknown): McpToolResponse {
  return textResponse(JSON.stringify(data, null, 2));
}

type FieldFormatter<T> = (value: unknown, row: T) => string;

export type FieldSpec<T> =
  | keyof T
  | {
      key: keyof T;
      label?: string;
      format?: FieldFormatter<T>;
    };

type NormalizedField<T> = {
  key: keyof T;
  label: string;
  format?: FieldFormatter<T>;
};

function normalizeField<T>(field: FieldSpec<T>): NormalizedField<T> {
  if (typeof field === "object" && field !== null && "key" in field) {
    return {
      key: field.key,
      label: field.label ?? String(field.key),
      format: field.format,
    };
  }
  return { key: field, label: String(field) };
}

export function markdownResponse<T extends Record<string, unknown>>(
  items: T[],
  opts: {
    fields: FieldSpec<T>[];
    emptyMessage?: string;
    title?: string;
  },
): McpToolResponse {
  if (items.length === 0) {
    return textResponse(opts.emptyMessage ?? "No results.");
  }

  const fields = opts.fields.map(normalizeField);

  const lines: string[] = [];
  if (opts.title) {
    lines.push(`# ${opts.title}`, "");
  }

  for (const item of items) {
    const parts: string[] = [];
    for (const field of fields) {
      const raw = item[field.key];
      const value = field.format ? field.format(raw, item) : formatDefault(raw);
      parts.push(`**${field.label}:** ${value}`);
    }
    lines.push(`- ${parts.join(" · ")}`);
  }

  return textResponse(lines.join("\n"));
}

export function markdownItem<T extends Record<string, unknown>>(
  item: T | null | undefined,
  opts: {
    fields: FieldSpec<T>[];
    notFoundMessage?: string;
  },
): McpToolResponse {
  if (!item) {
    return textResponse(opts.notFoundMessage ?? "Not found.");
  }
  return markdownResponse([item], { fields: opts.fields });
}

function formatDefault(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
