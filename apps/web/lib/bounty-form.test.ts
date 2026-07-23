import assert from "node:assert/strict";
import test from "node:test";

import { buildPostBountyArgs, getFundingAction } from "./bounty-form";

const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as const;

test("buildPostBountyArgs serializes a USDC GitHub bounty for AI2WorkCore", () => {
  const args = buildPostBountyArgs({
    token: USDC,
    tokenDecimals: 6,
    repoUrl: "https://github.com/AtlasNexusTech/ai2work",
    instructionUrl: "https://github.com/AtlasNexusTech/ai2work/issues/42",
    acceptanceCriteria: "Tests pass and the regression is covered.",
    amount: "12.34",
    maxSlots: 3,
    stake: "1",
    deadlineDays: 7,
    ciRequired: true,
  });

  assert.equal(args[0], USDC);
  assert.equal(args[1], 0);
  assert.equal(args[2], "https://github.com/AtlasNexusTech/ai2work");
  assert.equal(args[3], "https://github.com/AtlasNexusTech/ai2work/issues/42");
  assert.match(args[4], /^0x[0-9a-f]{64}$/);
  assert.equal(args[5], 12_340_000n);
  assert.equal(args[6], 3);
  assert.equal(args[7], 1_000_000n);
  assert.equal(args[8], 604_800n);
  assert.equal(args[9], true);
});

test("getFundingAction enforces Celo approval before publishing", () => {
  assert.equal(
    getFundingAction({ connected: false, chainId: undefined, required: 10n, allowance: 0n }),
    "connect"
  );
  assert.equal(
    getFundingAction({ connected: true, chainId: 1, required: 10n, allowance: 0n }),
    "switch"
  );
  assert.equal(
    getFundingAction({ connected: true, chainId: 42220, required: 10n, allowance: 9n }),
    "approve"
  );
  assert.equal(
    getFundingAction({ connected: true, chainId: 42220, required: 10n, allowance: 10n }),
    "publish"
  );
});
