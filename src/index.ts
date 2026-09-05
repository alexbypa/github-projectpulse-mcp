import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod";
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

const server = new McpServer({ name: "projectpulse-mcp", version: pkg.version });

registerCheckCiStatus(server);
registerGetRepoHealth(server);
registerAnalyzeDependencies(server);
registerAnalyzeCodeScanning(server);
registerGetHealthScore(server);
registerGetDoraMetrics(server);
registerCompareRepos(server);

const transport = new StdioServerTransport()
await server.connect(transport);