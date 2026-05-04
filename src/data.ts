export type SamplePrice = { price: number; note: string };

export const SAMPLE_PRICES: Record<string, SamplePrice> = {
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

export const PROTOCOL_RISKS: Record<string, string> = {
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
