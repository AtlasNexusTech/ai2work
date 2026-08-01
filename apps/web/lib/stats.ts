import { createPublicClient, http } from "viem";

import { celoSepolia, DEFAULT_CHAIN_ID, chainById } from "./chain";
import { coreAbi, getDeployment } from "./contracts";

export type LiveStats = {
  bountyCount: bigint;
  totalBountyVolume: bigint;
  totalProtocolRevenue: bigint;
  totalBountiesResolved: bigint;
  uniquePosterCount: bigint;
  uniqueWorkerCount: bigint;
  feeBps: bigint;
  graceSeconds: bigint;
  fetchedAt: string;
  volumeToken: "cUSD";
};

const rpcOverrides: Partial<Record<number, string>> = {
  [celoSepolia.id]: process.env.NEXT_PUBLIC_CELO_SEPOLIA_RPC,
  42_220: process.env.NEXT_PUBLIC_CELO_MAINNET_RPC,
};

export async function fetchLiveStats(chainId: number = DEFAULT_CHAIN_ID): Promise<LiveStats> {
  const chain = chainById(chainId);
  if (!chain) throw new Error(`Unsupported chain id ${chainId}`);
  const rpc = rpcOverrides[chainId] ?? chain.rpcUrls.default.http[0];
  const client = createPublicClient({ chain, transport: http(rpc) });
  const deploy = getDeployment(chainId);

  const [
    bountyCount,
    totalBountyVolume,
    totalProtocolRevenue,
    totalBountiesResolved,
    uniquePosterCount,
    uniqueWorkerCount,
    feeBps,
    graceSeconds,
  ] = await client.multicall({
    contracts: [
      { address: deploy.core, abi: coreAbi, functionName: "bountyCount" },
      { address: deploy.core, abi: coreAbi, functionName: "totalBountyVolume", args: [deploy.cUSD] },
      { address: deploy.core, abi: coreAbi, functionName: "totalProtocolRevenue", args: [deploy.cUSD] },
      { address: deploy.core, abi: coreAbi, functionName: "totalBountiesResolved" },
      { address: deploy.core, abi: coreAbi, functionName: "uniquePosterCount" },
      { address: deploy.core, abi: coreAbi, functionName: "uniqueWorkerCount" },
      { address: deploy.core, abi: coreAbi, functionName: "PROTOCOL_FEE_BPS" },
      { address: deploy.core, abi: coreAbi, functionName: "RESOLUTION_GRACE_PERIOD" },
    ] as const,
    allowFailure: false,
  });

  return {
    bountyCount,
    totalBountyVolume,
    totalProtocolRevenue,
    totalBountiesResolved,
    uniquePosterCount,
    uniqueWorkerCount,
    feeBps,
    graceSeconds,
    fetchedAt: new Date().toISOString(),
    volumeToken: "cUSD",
  };
}
