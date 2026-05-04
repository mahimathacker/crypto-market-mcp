import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PROTOCOL_RISKS } from "../data.js";

export function registerExplainProtocolRisk(server: McpServer): void {
  server.registerTool(
    "explain_protocol_risk",
    {
      description:
        "Explain the main risks of a DeFi protocol category in plain language. " +
        "Supported types: AMM, bridge, lending, perps.",
      inputSchema: {
        protocol_type: z
          .string()
          .describe("Protocol category: AMM, bridge, lending, or perps"),
      },
    },
    async ({ protocol_type }) => {
      const key = protocol_type.trim().toUpperCase();
      const explanation = PROTOCOL_RISKS[key];

      if (!explanation) {
        return {
          content: [
            {
              type: "text",
              text:
                `Unknown protocol type "${protocol_type}". ` +
                `Supported: AMM, bridge, lending, perps.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Risk overview — ${key}:\n${explanation}`,
          },
        ],
      };
    }
  );
}
