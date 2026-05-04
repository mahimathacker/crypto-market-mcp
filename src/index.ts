import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetTokenPrice } from "./tools/getTokenPrice.js";
import { registerExplainProtocolRisk } from "./tools/explainProtocolRisk.js";
import { registerCompareTokens } from "./tools/compareTokens.js";

const server = new McpServer({
  name: "crypto-market-mcp",
  version: "1.0.0",
});

registerGetTokenPrice(server);
registerExplainProtocolRisk(server);
registerCompareTokens(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("crypto-market-mcp server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting crypto-market-mcp:", err);
  process.exit(1);
});
