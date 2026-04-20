# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Server

```bash
node server.js
```

The server starts on `http://127.0.0.1:3000`. There are no build or lint steps.

## Architecture

This is a single-file Express MCP server (`server.js`) using the **Streamable HTTP transport** from `@modelcontextprotocol/sdk`. It runs stateless (no session management).

**Request flow:**
1. `POST /mcp` — clients send JSON-RPC tool calls; handled by `StreamableHTTPServerTransport`
2. `GET /mcp` — optional SSE stream for server-to-client messages
3. `GET /health` — liveness check

**Adding a tool** — call `mcp.tool(name, description, zodSchema, handler)` before `mcp.connect(transport)`. The handler must return `{ content: [{ type: "text", text: "..." }] }`.

**Origin validation** — browser clients sending an `Origin` header must match `ALLOWED_ORIGINS`. Non-browser clients (no `Origin` header) are always allowed.

## Key Dependencies

| Package | Role |
|---|---|
| `@modelcontextprotocol/sdk` | MCP server + Streamable HTTP transport |
| `express` v5 | HTTP routing |
| `zod` | Tool input schema validation |

The project uses ES modules (`"type": "module"` in package.json); use `import`/`export` syntax throughout.
