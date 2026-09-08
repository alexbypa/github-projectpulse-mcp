import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { registerCheckCiStatus } from "./tools/check-ci-status.js";
import { registerGetRepoHealth } from "./tools/get-repo-health.js";
import { registerAnalyzeDependencies } from "./tools/analyze-dependencies.js";
import { registerAnalyzeCodeScanning } from "./tools/analyze-code-scanning.js";
import { registerGetHealthScore } from "./tools/get-health-score.js";
import { registerGetDoraMetrics } from "./tools/get-dora-metrics.js";
import { registerCompareRepos } from "./tools/compare-repos.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));

function createMcpServer(): McpServer {
  const server = new McpServer({ name: "projectpulse-mcp", version: pkg.version });
  registerCheckCiStatus(server);
  registerGetRepoHealth(server);
  registerAnalyzeDependencies(server);
  registerAnalyzeCodeScanning(server);
  registerGetHealthScore(server);
  registerGetDoraMetrics(server);
  registerCompareRepos(server);
  return server;
}

// --- Transport selection ---
// Default: stdio (backward compatible, per uso locale e npx)
// MCP_TRANSPORT=http: Streamable HTTP server (per Docker e remote clients)
const transportMode = (process.env.MCP_TRANSPORT ?? "stdio").toLowerCase();

if (transportMode === "http") {
  const port = parseInt(process.env.MCP_PORT ?? "3000", 10);
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);

    // Only handle /mcp path — MCP protocol endpoint
    if (url.pathname !== "/mcp") {
      // Health check on root
      if (url.pathname === "/" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", server: "projectpulse-mcp", version: pkg.version }));
        return;
      }
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    // Parse JSON body for POST requests
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = JSON.parse(Buffer.concat(chunks).toString());
      (req as any).body = body;

      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && transports.has(sessionId)) {
        // Existing session — reuse transport
        await transports.get(sessionId)!.handleRequest(req, res, body);
      } else if (!sessionId && isInitializeRequest(body)) {
        // New session — create transport + server
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            transports.set(sid, transport);
          },
        });
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid) transports.delete(sid);
        };
        const server = createMcpServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, body);
      } else {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: No valid session ID" }, id: null }));
      }
    } else if (req.method === "GET" || req.method === "DELETE") {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (!sessionId || !transports.has(sessionId)) {
        res.writeHead(400);
        res.end("Invalid or missing session ID");
        return;
      }
      await transports.get(sessionId)!.handleRequest(req, res);
    } else {
      res.writeHead(405);
      res.end("Method Not Allowed");
    }
  });

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`ProjectPulse MCP server (HTTP) listening on http://0.0.0.0:${port}/mcp`);
  });

  process.on("SIGINT", async () => {
    for (const [, transport] of transports) {
      await transport.close();
    }
    transports.clear();
    httpServer.close();
    process.exit(0);
  });
} else {
  // Default: stdio transport (backward compatible)
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}