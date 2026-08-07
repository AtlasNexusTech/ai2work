// Public surface for @yeheskieltame/claudelance-sdk (v2).

// Agent-facing plain-text exports — `console.log(RULES)` to learn the
// marketplace before touching chain.
export { RULES } from './rules.js';
export { FLOW } from './flow.js';
export { FAQ } from './faq.js';

// Human-readable mirrors of on-chain constants.
export {
  PROTOCOL_FEE_BPS,
  BPS_DENOMINATOR,
  MAX_SLOTS,
  MIN_DEADLINE_SECONDS,
  MAX_DEADLINE_SECONDS,
  RESOLUTION_GRACE_PERIOD_SECONDS,
  ADMIN_TIMELOCK_SECONDS,
  PROPOSAL_VALIDITY_WINDOW_SECONDS,
  BOUNTY_TIERS,
} from './constants.js';

// Re-export the foundational types for ergonomic single-import usage.
export {
  BountyStatus,
  CLAUDELANCE_CORE_ABI,
  MAINNET,
  SEPOLIA,
  ZERO_ADDRESS,
  isDirectHire,
  deploymentByChainId,
  type Bounty,
  type Submission,
  type PendingAddress,
  type Deployment,
  type TokenSet,
  type ClaudelanceCoreAbi,
} from '@atlasnexus/aijobs-types';

// Client surface — read + worker writes + poster writes.
export { ClaudelanceClient } from './client.js';
export type {
  ClaudelanceClientOptions,
  FromPrivateKeyOptions,
  SubmitPROptions,
  PostBountyOptions,
  PostDirectHireOptions,
} from './client.js';
export { celoMainnet, celoSepolia, chainForNetwork, type NetworkKey } from './chain.js';

// Treasury revenue helpers.
export { getProtocolRevenue } from './protocol-revenue.js';
export {
  listProtocolRevenueEvents,
  type ProtocolRevenueAccrual,
} from './revenue-events.js';

// Utility formatters.
export {
  tokenToFloat,
  floatToToken,
  tokenFormat,
  cusdToFloat,
  floatToCusd,
  cusdFormat,
  timeRemaining,
  formatBountySummary,
} from './format.js';
