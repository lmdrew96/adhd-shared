import { z } from "zod";
import {
  createHTTPHandler,
  defineTool,
  markdownResponse,
  useAuth,
} from "../dist/index.js";

const ping = defineTool({
  name: "smoke_get_ping",
  description: "Returns the authenticated user id so we prove auth ctx flows.",
  inputSchema: { hello: z.string().default("world") },
  handler: async (args) => {
    const { userId } = useAuth();
    return markdownResponse([{ userId, hello: args.hello }], {
      fields: ["userId", "hello"],
    });
  },
});

const handler = createHTTPHandler({
  name: "smoke",
  version: "0.0.0",
  tools: [ping],
  verify: async () => ({ userId: "smoke-user" }),
});

const rpc = async (method, params = {}) => {
  const res = await handler(
    new Request("http://localhost/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  );
  const text = await res.text();
  return { status: res.status, body: text };
};

const init = await rpc("initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "smoke-client", version: "0" },
});
console.log("initialize →", init.status, init.body.slice(0, 140));

const list = await rpc("tools/list");
console.log("tools/list →", list.status, list.body.slice(0, 220));

const call = await rpc("tools/call", {
  name: "smoke_get_ping",
  arguments: { hello: "kit" },
});
console.log("tools/call →", call.status, call.body.slice(0, 220));

const ok =
  init.status === 200 &&
  list.status === 200 &&
  list.body.includes("smoke_get_ping") &&
  call.status === 200 &&
  call.body.includes("smoke-user");

console.log(ok ? "\n✓ runtime smoke PASSED" : "\n✗ runtime smoke FAILED");
process.exit(ok ? 0 : 1);
