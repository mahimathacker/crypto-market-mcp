import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CMC_API_KEY, fetchLiveQuotes } from "../cmc.js";
import { SAMPLE_PRICES } from "../data.js";

export function registerGetTokenPrice(server: McpServer): void {
  server.registerTool(
    "get_token_price",
    {
      description:
        "Return the current price, market note, and timestamp for a given token symbol. " +
        "Uses live CoinMarketCap data when CMC_API_KEY is set, otherwise falls back to illustrative sample data.",
      inputSchema: {
        symbol: z.string().describe("Token ticker symbol, e.g. BTC, ETH, SOL"),
      },
    },
    async ({ symbol }) => {
      const key = symbol.trim().toUpperCase();
      const sample = SAMPLE_PRICES[key];

      const live = (await fetchLiveQuotes([key]))?.get(key);
      if (live) {
        const change =
          live.percentChange24h !== null
            ? `${live.percentChange24h >= 0 ? "+" : ""}${live.percentChange24h.toFixed(2)}%`
            : "n/a";
        const marketCap =
          live.marketCap !== null
            ? `$${Math.round(live.marketCap).toLocaleString()}`
            : "n/a";
        const note = sample?.note ?? `${live.name} — live data via CoinMarketCap.`;
        return {
          content: [
            {
              type: "text",
              text:
                `Symbol: ${key} (${live.name})\n` +
                `Price: $${live.price.toLocaleString(undefined, { maximumFractionDigits: 6 })}\n` +
                `24h change: ${change}\n` +
                `Market cap: ${marketCap}\n` +
                `Market note: ${note}\n` +
                `Source: CoinMarketCap\n` +
                `Timestamp: ${live.lastUpdated}`,
            },
          ],
        };
      }

      if (!sample) {
        return {
          content: [
            {
              type: "text",
              text:
                `No price available for "${symbol}". ` +
                (CMC_API_KEY
                  ? "CoinMarketCap returned no data and no sample exists. "
                  : "Set CMC_API_KEY for live data, or use a known sample symbol. ") +
                `Known sample symbols: ${Object.keys(SAMPLE_PRICES).join(", ")}.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text:
              `Symbol: ${key}\n` +
              `Sample price: $${sample.price.toLocaleString()}\n` +
              `Market note: ${sample.note}\n` +
              `Source: sample data (set CMC_API_KEY for live prices)\n` +
              `Timestamp: ${new Date().toISOString()}`,
          },
        ],
      };
    }
  );
}
