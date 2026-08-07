import { createPublicClient, http, type Address } from "viem";

import { MAINNET, CLAUDELANCE_CORE_ABI } from "@atlasnexus/aijobs-types";

import { celoMainnet } from "./chain";

const rpcOverride = process.env.NEXT_PUBLIC_CELO_MAINNET_RPC;

export type TreasuryRevenue = {
  cUSD: bigint;
  CELO: bigint;
  USDC: bigint;
};

/**
 * Server-side multicall reading `totalProtocolRevenue(token)` for each of the
 * three whitelisted tokens on the Celo Mainnet Core contract. One round-trip
 * to Forno, three results.
 */
export async function fetchTreasuryRevenue(): Promise<TreasuryRevenue> {
  const client = createPublicClient({
    chain: celoMainnet,
    transport: http(rpcOverride),
  });

  const [cusd, celo, usdc] = await client.multicall({
    contracts: [
      makeRevenueRead(MAINNET.tokens.cUSD),
      makeRevenueRead(MAINNET.tokens.CELO),
      makeRevenueRead(MAINNET.tokens.USDC),
    ],
    allowFailure: false,
  });

  return {
    cUSD: cusd as bigint,
    CELO: celo as bigint,
    USDC: usdc as bigint,
  };
}

function makeRevenueRead(token: Address) {
  return {
    address: MAINNET.core,
    abi: CLAUDELANCE_CORE_ABI,
    functionName: "totalProtocolRevenue" as const,
    args: [token] as const,
  };
}
