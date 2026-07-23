import { keccak256, parseUnits, toBytes, type Address, type Hex } from "viem";

export type BountyFormInput = {
  token: Address;
  tokenDecimals: number;
  repoUrl: string;
  instructionUrl: string;
  acceptanceCriteria: string;
  amount: string;
  maxSlots: number;
  stake: string;
  deadlineDays: number;
  ciRequired: boolean;
};

export type PostBountyArgs = readonly [
  Address,
  number,
  string,
  string,
  Hex,
  bigint,
  number,
  bigint,
  bigint,
  boolean,
];

export type FundingAction = "connect" | "switch" | "approve" | "publish";

export function getFundingAction(input: {
  connected: boolean;
  chainId: number | undefined;
  required: bigint;
  allowance: bigint;
}): FundingAction {
  if (!input.connected) return "connect";
  if (input.chainId !== 42_220) return "switch";
  if (input.allowance < input.required) return "approve";
  return "publish";
}

export function buildPostBountyArgs(input: BountyFormInput): PostBountyArgs {
  return [
    input.token,
    0,
    input.repoUrl.trim(),
    input.instructionUrl.trim(),
    keccak256(toBytes(input.acceptanceCriteria.trim())),
    parseUnits(input.amount, input.tokenDecimals),
    input.maxSlots,
    parseUnits(input.stake, input.tokenDecimals),
    BigInt(input.deadlineDays * 86_400),
    input.ciRequired,
  ] as const;
}
