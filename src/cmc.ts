export const CMC_API_KEY = process.env["CMC_API_KEY"];

const CMC_QUOTES_URL =
  "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest";

export type LiveQuote = {
  name: string;
  price: number;
  percentChange24h: number | null;
  marketCap: number | null;
  lastUpdated: string;
};

export async function fetchLiveQuotes(
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
