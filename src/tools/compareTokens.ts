import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CMC_API_KEY, fetchLiveQuotes, type LiveQuote } from "../cmc.js";
import { SAMPLE_PRICES, type SamplePrice } from "../data.js";

function fmtRow(
  sym: string,
  lq: LiveQuote | undefined,
  sp: SamplePrice | undefined
): string {
  if (lq) {
    const change =
      lq.percentChange24h !== null
        ? `${lq.percentChange24h >= 0 ? "+" : ""}${lq.percentChange24h.toFixed(2)}%`
        : "n/a";
    const mcap =
      lq.marketCap !== null
        ? `$${Math.round(lq.marketCap).toLocaleString()}`
        : "n/a";
    const note = sp?.note ?? `${lq.name} — live data via CoinMarketCap.`;
    return (
      `${sym} (${lq.name})\n` +
      `  Price: $${lq.price.toLocaleString(undefined, { maximumFractionDigits: 6 })}\n` +
      `  24h change: ${change}\n` +
      `  Market cap: ${mcap}\n` +
      `  Note: ${note}`
    );
  }
  return (
    `${sym}\n` +
    `  Sample price: $${sp!.price.toLocaleString()}\n` +
    `  Note: ${sp!.note}`
  );
}

export function registerCompareTokens(server: McpServer): void {
  server.registerTool(
    "compare_tokens",
    {
      description:
        "Return a side-by-side comparison of two tokens (price, 24h change, market cap when available). " +
        "Uses live CoinMarketCap data when CMC_API_KEY is set, otherwise falls back to sample data.",
      inputSchema: {
        token_a: z.string().describe("First token symbol, e.g. BTC"),
        token_b: z.string().describe("Second token symbol, e.g. ETH"),
      },
    },
    async ({ token_a, token_b }) => {
      const a = token_a.trim().toUpperCase();
      const b = token_b.trim().toUpperCase();
      const sampleA = SAMPLE_PRICES[a];
      const sampleB = SAMPLE_PRICES[b];

      const live = await fetchLiveQuotes([a, b]);
      const liveA = live?.get(a);
      const liveB = live?.get(b);

      const priceA = liveA?.price ?? sampleA?.price;
      const priceB = liveB?.price ?? sampleB?.price;

      if (priceA === undefined || priceB === undefined) {
        const missing = [
          priceA === undefined ? a : null,
          priceB === undefined ? b : null,
        ]
          .filter(Boolean)
          .join(", ");
        return {
          content: [
            {
              type: "text",
              text:
                `Cannot compare — no data for: ${missing}. ` +
                (CMC_API_KEY
                  ? "CoinMarketCap returned no data for these symbols."
                  : `Set CMC_API_KEY for live data, or use known sample symbols: ${Object.keys(SAMPLE_PRICES).join(", ")}.`),
            },
          ],
        };
      }

      const ratio = priceA / priceB;
      const richer = priceA > priceB ? a : b;
      const source =
        liveA && liveB
          ? "CoinMarketCap (live)"
          : liveA || liveB
            ? "mixed (live + sample)"
            : "sample data (set CMC_API_KEY for live prices)";

      return {
        content: [
          {
            type: "text",
            text:
              `Comparison: ${a} vs ${b}\n` +
              `Source: ${source}\n` +
              `\n` +
              `${fmtRow(a, liveA, sampleA)}\n` +
              `\n` +
              `${fmtRow(b, liveB, sampleB)}\n` +
              `\n` +
              `Per-unit, 1 ${a} ≈ ${ratio.toFixed(4)} ${b}. ` +
              `Higher unit price: ${richer}. ` +
              `(Unit price alone is not market cap — supply matters.)`,
          },
        ],
      };
    }
  );
}
