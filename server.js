import express from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const PORT = 3000;
const MCP_PATH = "/mcp";

const app = express();
app.use(express.json({ limit: "1mb" }));

// --- Minimal DNS-rebinding mitigation ---
// The MCP spec warns to validate Origin for Streamable HTTP servers. [1](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function originAllowed(req) {
  const origin = req.headers.origin;
  // Many non-browser clients won't send Origin; allow those.
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

app.use((req, res, next) => {
  if (req.path === MCP_PATH && !originAllowed(req)) {
    return res.status(403).json({ error: "Forbidden origin" });
  }
  next();
});

// --- MCP server definition ---
const mcp = new McpServer({
  name: "express-mcp-local",
  version: "0.1.0",
});

// Example tools (Zod-validated)
mcp.tool(
  "hello",
  "Return a friendly greeting.",
  { name: z.string().optional().describe("Optional name to greet") },
  async ({ name }) => ({
    content: [{ type: "text", text: `Hello, ${name?.trim() || "there"}! 👋` }],
  })
);

mcp.tool(
  "echo",
  "Echo back the provided text.",
  { text: z.string().describe("Text to echo back") },
  async ({ text }) => ({
    content: [{ type: "text", text }],
  })
);

// --- Streamable HTTP transport ---
// Stateless mode: sessionIdGenerator: undefined (simple, API-like).
// This pattern is shown in an Express integration example using StreamableHTTPServerTransport. [4](https://dev.to/udarabibile/integrating-mcp-tools-into-express-with-minimal-changes-28e6)[2](https://www.npmjs.com/package/@modelcontextprotocol/sdk)[3](https://ts.sdk.modelcontextprotocol.io/documents/server.html)
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

// MCP endpoint must support POST and GET per transport spec. [1](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
app.post(MCP_PATH, async (req, res) => {
  // Streamable transport expects the raw JSON-RPC message body.
  await transport.handleRequest(req, res, req.body);
});

app.get(MCP_PATH, async (req, res) => {
  // Establishes the SSE stream for server-to-client messages when used.
  await transport.handleRequest(req, res);
});

// Optional: basic health route
app.get("/health", (_req, res) => res.json({ ok: true }));

// Start MCP + Express
await mcp.connect(transport);

app.listen(PORT, "127.0.0.1", () => {
  console.log(`✅ Express MCP server listening on http://127.0.0.1:${PORT}${MCP_PATH}`);
  console.log(`   Health: http://127.0.0.1:${PORT}/health`);
});