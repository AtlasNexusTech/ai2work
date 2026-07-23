import { createPublicClient, http, parseAbi, type Address } from "viem";

import { MAINNET } from "@atlasnexus/ai2work-types";

import { celoMainnet } from "@/lib/chain";

const revenueEvent = parseAbi([
  "event ProtocolRevenueAccrued(address indexed token, uint256 amount, uint256 cumulative)",
]);

const rpcOverride = process.env.NEXT_PUBLIC_CELO_MAINNET_RPC;

type RevenueLog = {
  token: Address;
  amount: bigint;
  cumulative: bigint;
  txHash: `0x${string}`;
  blockNumber: bigint;
};

export async function TreasuryFeed() {
  const client = createPublicClient({
    chain: celoMainnet,
    transport: http(rpcOverride),
  });

  // Scan the last 50k blocks in RPC-safe chunks. Forno currently caps
  // eth_getLogs at 5,000 blocks per request (inclusive).
  const latest = await client.getBlockNumber();
  const fromBlock = latest > 49_999n ? latest - 49_999n : 0n;
  const ranges: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
  for (let start = fromBlock; start <= latest; start += 5_000n) {
    const end = start + 4_999n > latest ? latest : start + 4_999n;
    ranges.push({ fromBlock: start, toBlock: end });
  }

  const logs = (
    await Promise.all(
      ranges.map((range) =>
        client.getLogs({
          address: MAINNET.core,
          events: revenueEvent,
          ...range,
        }),
      ),
    )
  ).flat();

  const rows: RevenueLog[] = logs
    .map((log) => ({
      token: log.args.token!,
      amount: log.args.amount!,
      cumulative: log.args.cumulative!,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
    }))
    .reverse()
    .slice(0, 10);

  if (rows.length === 0) {
    return (
      <div className="glass mt-10 rounded-3xl p-8">
        <h2 className="font-display text-2xl">Recent accruals</h2>
        <p className="mt-2 text-muted-foreground">
          No revenue events in the last 50k blocks. Post a bounty to start the
          feed.
        </p>
      </div>
    );
  }

  return (
    <div className="glass mt-10 rounded-3xl p-8">
      <h2 className="font-display text-2xl">Recent accruals</h2>
      <ul className="mt-4 divide-y divide-white/10">
        {rows.map((r) => (
          <li key={r.txHash} className="flex items-center justify-between py-3 text-sm">
            <span className="font-mono">{symbolFor(r.token)}</span>
            <span>{(Number(r.amount) / 10 ** decimalsFor(r.token)).toFixed(4)}</span>
            <a
              href={`https://celoscan.io/tx/${r.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:underline"
            >
              {r.txHash.slice(0, 10)}…
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function decimalsFor(token: Address): number {
  return token.toLowerCase() === MAINNET.tokens.USDC.toLowerCase() ? 6 : 18;
}

function symbolFor(token: Address): string {
  const t = token.toLowerCase();
  if (t === MAINNET.tokens.cUSD.toLowerCase()) return "cUSD";
  if (t === MAINNET.tokens.CELO.toLowerCase()) return "CELO";
  if (t === MAINNET.tokens.USDC.toLowerCase()) return "USDC";
  return "?";
}
