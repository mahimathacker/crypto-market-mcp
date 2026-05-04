import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const CMC_API_KEY = process.env["CMC_API_KEY"];
const CMC_QUOTES_URL =
  "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest";

type LiveQuote = {
  name: string;
  price: number;
  percentChange24h: number | null;
  marketCap: number | null;
  lastUpdated: string;
};

async function fetchLiveQuotes(
  symbols: string[]
): Promise<Map<string, LiveQuote> | null> {
  if (!CMC_API_KEY || symbols.length === 0) return null;

  const url = `${CMC_QUOTES_URL}?symbol=${encodeURIComponent(symbols.join(","))}`;
  try {
    const res = await fetch(url, {
      headers: {
        "X-CMC_PRO_API_KEY": CMC_API_KEY,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.error(`CMC API error ${res.status}: ${await res.text()}`);
      return null;
    }
    const body = (await res.json()) as {
      data?: Record<
        string,
        Array<{
          name: string;
          symbol: string;
          quote: {
            USD: {
              price: number;
              percent_change_24h: number | null;
              market_cap: number | null;
              last_updated: string;
            };
          };
        }>
      >;
    };

    const out = new Map<string, LiveQuote>();
    for (const sym of symbols) {
      const entries = body.data?.[sym];
      const first = entries?.[0];
      if (!first) continue;
      const usd = first.quote.USD;
      out.set(sym, {
        name: first.name,
        price: usd.price,
        percentChange24h: usd.percent_change_24h,
        marketCap: usd.market_cap,
        lastUpdated: usd.last_updated,
      });
    }
    return out;
  } catch (err) {
    console.error("CMC fetch failed:", err);
    return null;
  }
}

const SAMPLE_PRICES: Record<string, { price: number; note: string }> = {
  BTC: { price: 67432.18, note: "Bitcoin — flagship store-of-value asset; deepest liquidity." },
  ETH: { price: 3284.55, note: "Ethereum — leading smart-contract L1; gas token for DeFi." },
  SOL: { price: 158.92, note: "Solana — high-throughput L1; popular for memecoins and DEXs." },
  USDC: { price: 1.0, note: "USDC — fiat-backed stablecoin issued by Circle." },
  USDT: { price: 1.0, note: "USDT — largest stablecoin by market cap; issued by Tether." },
  ARB: { price: 0.78, note: "Arbitrum — leading Ethereum L2 rollup governance token." },
  OP: { price: 1.92, note: "Optimism — OP Stack L2 governance token." },
  MATIC: { price: 0.51, note: "Polygon — sidechain / zkEVM ecosystem token." },
  LINK: { price: 14.27, note: "Chainlink — dominant decentralized oracle network." },
  UNI: { price: 8.13, note: "Uniswap — governance token of the largest DEX." },
  AAVE: { price: 112.4, note: "Aave — leading decentralized lending protocol." },
};

const PROTOCOL_RISKS: Record<string, string> = {
  AMM:
    "AMMs (automated market makers) let users swap tokens against a pooled reserve priced by a formula (e.g., x*y=k). " +
    "Main risks: impermanent loss for LPs when prices diverge, sandwich/MEV attacks on swaps, " +
    "low-liquidity slippage, and smart-contract bugs in the pool or router.",
  BRIDGE:
    "Bridges move assets between chains, usually by locking on chain A and minting a wrapped version on chain B. " +
    "Main risks: validator/multisig compromise, smart-contract exploits on either side, " +
    "and the wrapped asset depegging if the bridge's reserves are drained. Bridges are historically the most-hacked DeFi primitive.",
  LENDING:
    "Lending protocols let users deposit collateral and borrow against it, with positions liquidated if collateral value drops. " +
    "Main risks: oracle manipulation pushing prices off-market, cascading liquidations during volatility, " +
    "bad-debt accumulation when liquidations can't clear fast enough, and isolated-asset listing risk.",
  PERPS:
    "Perpetual futures (perps) let traders take leveraged long/short positions with no expiry, funded by a periodic funding rate. " +
    "Main risks: liquidation cascades and ADL (auto-deleveraging) under fast moves, oracle/price-feed manipulation, " +
    "insurance fund insolvency, and counterparty risk if the protocol's matching engine or vault is exploited.",
};

const server = new McpServer({
  name: "crypto-market-mcp",
  version: "1.0.0",
});

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

    const fmtRow = (
      sym: string,
      lq: LiveQuote | undefined,
      sp: { price: number; note: string } | undefined
    ): string => {
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
    };

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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("crypto-market-mcp server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting crypto-market-mcp:", err);
  process.exit(1);
});
