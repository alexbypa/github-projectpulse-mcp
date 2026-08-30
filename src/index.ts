import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod";
import { registerCheckCiStatus } from "./tools/check-ci-status.js";
import { registerGetRepoHealth } from "./tools/get-repo-health.js";
import { registerAnalyzeDependencies } from "./tools/analyze-dependencies.js";
import { registerAnalyzeCodeScanning } from "./tools/analyze-code-scanning.js";
import { registerGetHealthScore } from "./tools/get-health-score.js";

const server = new McpServer({ name: "projectpulse-mcp", version: "0.1.0" });

registerCheckCiStatus(server);
registerGetRepoHealth(server);
registerAnalyzeDependencies(server);
registerAnalyzeCodeScanning(server);
registerGetHealthScore(server);

server.registerTool(
    "ping", {
    description: "This is a simple ping, response with pong",
    inputSchema: z.object({
        message: z
            .string()
            .describe("This is a simple ping, response with pong")
    }),
},
    async ({ message }) => {
        return {
            content: [{ type: "text", text: `pong ${message}` }]
        };
    }
)

const transport = new StdioServerTransport()
await server.connect(transport);