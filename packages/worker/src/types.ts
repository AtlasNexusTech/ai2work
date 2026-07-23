export type Address = `0x${string}`;
export type WorkerDecision = 'CLAIM' | 'REVIEW' | 'REJECT';
export type WorkerBounty = {
  id: string;
  targetRepoUrl: string;
  instructionUrl: string;
  deadline: string;
  status: 'open' | 'resolved' | 'cancelled' | 'expired';
  reward: string;
  stakeRequired: string;
  maxSlots: number;
  claimedSlots: number;
  targetWorker?: Address;
  requirementsHash?: `0x${string}`;
};
export type WorkerPolicy = {
  workerAddress?: Address;
  maxStake: string;
  minReward: string;
  minHoursRemaining: number;
  allowedHosts: string[];
  requireRequirementsHash: boolean;
};
export type PolicyResult = {
  decision: WorkerDecision;
  reasons: string[];
  checks: Record<string, boolean>;
};
export type LedgerEvent = {
  sequence: number;
  timestamp: string;
  runId: string;
  type: string;
  payload: unknown;
  previousHash: string;
  hash: string;
};
