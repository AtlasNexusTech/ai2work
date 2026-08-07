import type { Address, PublicClient } from "viem";

import { CLAUDELANCE_CORE_ABI } from "@atlasnexus/aijobs-types";

/**
 * Read `totalProtocolRevenue(token)` from the Claudelance Core. Each resolved
 * bounty contributes 2% of its amount in this token, plus any forfeited
 * stakes. Sums are denominated in the token's smallest unit (wei for cUSD/CELO,
 * micro-USDC for USDC).
 */
export async function getProtocolRevenue(
  client: PublicClient,
  core: Address,
  token: Address,
): Promise<bigint> {
  return (await client.readContract({
    address: core,
    abi: CLAUDELANCE_CORE_ABI,
    functionName: "totalProtocolRevenue",
    args: [token],
  })) as bigint;
}
