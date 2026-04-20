export type McpErrorCode =
  | "not_found"
  | "validation"
  | "auth"
  | "forbidden"
  | "conflict"
  | "internal";

export class McpError extends Error {
  readonly code: McpErrorCode;
  constructor(message: string, code: McpErrorCode = "internal") {
    super(message);
    this.name = "McpError";
    this.code = code;
  }
}

export class NotFoundError extends McpError {
  constructor(message: string) {
    super(message, "not_found");
    this.name = "NotFoundError";
  }
}

export class ValidationError extends McpError {
  constructor(message: string) {
    super(message, "validation");
    this.name = "ValidationError";
  }
}

export class AuthError extends McpError {
  constructor(message: string = "Authentication required.") {
    super(message, "auth");
    this.name = "AuthError";
  }
}

export class ForbiddenError extends McpError {
  constructor(message: string = "Forbidden.") {
    super(message, "forbidden");
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends McpError {
  constructor(message: string) {
    super(message, "conflict");
    this.name = "ConflictError";
  }
}
