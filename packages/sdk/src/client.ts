import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type Address,
  type Chain,
  type PublicClient,
  type Transport,
  type WalletClient,
} from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';

import {
  CLAUDELANCE_CORE_ABI,
  MAINNET,
  SEPOLIA,
  type Bounty,
  type Deployment,
  type TokenSet,
} from '@atlasnexus/aijobs-types';

import { chainForNetwork, type NetworkKey } from './chain.js';
import { CUSD_ABI } from './cusd-abi.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

/** Inputs accepted by {@link ClaudelanceClient.fromPrivateKey}. */
export type FromPrivateKeyOptions = {
  privateKey: `0x${string}`;
  network: NetworkKey;
  /** Override the default forno RPC; useful for an Alchemy/Infura key. */
  rpcUrl?: string;
};

/** Inputs accepted by {@link ClaudelanceClient.fromMnemonic}. */
export type FromMnemonicOptions = {
  /** BIP-39 mnemonic phrase (12 or 24 words). */
  mnemonic: string;
  network: NetworkKey;
  /** Override the default forno RPC; useful for an Alchemy/Infura key. */
  rpcUrl?: string;
  /**
   * BIP-44 derivation path. Defaults to `m/44'/60'/0'/0/0` — the Ethereum
   * standard for the first account / first address, which matches what
   * MetaMask + most desktop wallets produce.
   */
  derivationPath?: `m/44'/60'/${string}`;
};

/** Inputs accepted by the {@link ClaudelanceClient} constructor. */
export type ClaudelanceClientOptions = {
  publicClient: PublicClient;
  walletClient?: WalletClient<Transport, Chain, Account>;
  core: Address;
  /** Whitelisted escrow tokens (cUSD, CELO, USDC). */
  tokens: TokenSet;
  /** ERC-8004 Identity Registry. Workers must hold a token here to claimSlot. */
  identityRegistry: Address;
};

/** Optional payload accepted by {@link ClaudelanceClient.submitPR}. */
export type SubmitPROptions = {
  prUrl: string;
  commitHash: `0x${string}`;
  /** Free-form JSON the worker wants to attach (capabilities, model, notes). */
  metadata?: string;
};

/** Payload accepted by {@link ClaudelanceClient.postBounty} (open marketplace). */
export type PostBountyOptions = {
  /** ERC20 used for escrow + payout. Must be whitelisted on chain. */
  token: Address;
  /** 0 = Code; 0-255 reserved for future tiers. */
  bountyType?: number;
  targetRepoUrl: string;
  instructionUrl: string;
  /** keccak256 of the off-chain JSON spec, or 0x000… for ad-hoc bounties. */
  requirementsHash?: `0x${string}`;
  /** Reward in token wei. Must be >= the per-token `minBounty`. */
  amount: bigint;
  /** Maximum simultaneous claimers (1..MAX_SLOTS=20). */
  maxSlots: number;
  /** Anti-sybil stake in token wei. v2 requires `> 0`. */
  stake: bigint;
  /** Bounty lifetime in seconds (1..14 days). */
  deadlineSeconds: bigint;
  /** Require CI to pass before a winner is eligible. */
  ciRequired: boolean;
};

/** Payload accepted by {@link ClaudelanceClient.postDirectHire} (single chosen worker). */
export type PostDirectHireOptions = {
  token: Address;
  /** Worker who will exclusively own the single slot. Must be non-zero. */
  targetWorker: Address;
  bountyType?: number;
  targetRepoUrl: string;
  instructionUrl: string;
  requirementsHash?: `0x${string}`;
  amount: bigint;
  /** Stake required from the chosen worker. Must be `> 0`. */
  stake: bigint;
  deadlineSeconds: bigint;
};

/**
 * High-level read + write client for ClaudelanceCore v2.
 *
 * Multi-token escrow: every write that moves tokens takes (or infers from
 * the bounty) the ERC20 to use. Workers must be registered ERC-8004 agents
 * before they can `claimSlot`.
 */
export class ClaudelanceClient {
  readonly publicClient: PublicClient;
  readonly walletClient?: WalletClient<Transport, Chain, Account>;
  readonly core: Address;
  readonly tokens: TokenSet;
  readonly identityRegistry: Address;

  constructor(opts: ClaudelanceClientOptions) {
    this.publicClient = opts.publicClient;
    this.walletClient = opts.walletClient;
    this.core = opts.core;
    this.tokens = opts.tokens;
    this.identityRegistry = opts.identityRegistry;
  }

  /**
   * Convenience: build a fully-wired client from a private key + network
   * key. Resolves the canonical addresses from `@atlasnexus/aijobs-types`.
   *
   * Supported networks: `'sepolia'` (Celo Sepolia) and `'celo'` (Celo Mainnet).
   */
  static fromPrivateKey(opts: FromPrivateKeyOptions): ClaudelanceClient {
    const deployment: Deployment = opts.network === 'celo' ? MAINNET : SEPOLIA;
    const chain = chainForNetwork(opts.network);
    const account = privateKeyToAccount(opts.privateKey);
    const transport = http(opts.rpcUrl);

    const publicClient = createPublicClient({ chain, transport });
    const walletClient = createWalletClient({ chain, transport, account });

    return new ClaudelanceClient({
      publicClient,
      walletClient,
      core: deployment.core,
      tokens: deployment.tokens,
      identityRegistry: deployment.identityRegistry,
    });
  }

  /**
   * Build a fully-wired client from a BIP-39 mnemonic + network key.
   * Friendly onboarding path: an operator can paste their seed phrase
   * (12 or 24 words) without ever extracting the raw private key.
   *
   * Default derivation `m/44'/60'/0'/0/0` (Ethereum standard, first
   * account / first address). Override `derivationPath` to use a
   * different index — e.g. `m/44'/60'/0'/0/1` for the second address.
   *
   * Supported networks: `'sepolia'` (Celo Sepolia) and `'celo'` (Celo Mainnet).
   */
  static fromMnemonic(opts: FromMnemonicOptions): ClaudelanceClient {
    const deployment: Deployment = opts.network === 'celo' ? MAINNET : SEPOLIA;
    const chain = chainForNetwork(opts.network);
    const account = mnemonicToAccount(opts.mnemonic, {
      path: opts.derivationPath ?? "m/44'/60'/0'/0/0",
    });
    const transport = http(opts.rpcUrl);

    const publicClient = createPublicClient({ chain, transport });
    const walletClient = createWalletClient({ chain, transport, account });

    return new ClaudelanceClient({
      publicClient,
      walletClient,
      core: deployment.core,
      tokens: deployment.tokens,
      identityRegistry: deployment.identityRegistry,
    });
  }

  // ─── Read API ─────────────────────────────────────────────────────────

  async getBounty(bountyId: bigint): Promise<Bounty> {
    return (await this.publicClient.readContract({
      address: this.core,
      abi: CLAUDELANCE_CORE_ABI,
      functionName: 'getBounty',
      args: [bountyId],
    })) as Bounty;
  }

  async getBountyCount(): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: this.core,
      abi: CLAUDELANCE_CORE_ABI,
      functionName: 'bountyCount',
    })) as bigint;
  }

  /**
   * Return every currently-open bounty. Linear scan via multicall — fine for
   * the hackathon scope (hundreds at most).
   */
  async listOpenBounties(): Promise<Array<Bounty & { id: bigint }>> {
    const count = await this.getBountyCount();
    if (count === 0n) return [];

    const calls = [];
    for (let i = 1n; i <= count; i++) {
      calls.push({
        address: this.core,
        abi: CLAUDELANCE_CORE_ABI,
        functionName: 'getBounty' as const,
        args: [i] as const,
      });
    }
    const results = await this.publicClient.multicall({
      contracts: calls,
      allowFailure: false,
    });

    const out: Array<Bounty & { id: bigint }> = [];
    for (let idx = 0; idx < results.length; idx++) {
      const b = results[idx] as Bounty;
      if (b.status === 0) out.push({ ...b, id: BigInt(idx + 1) });
    }
    return out;
  }

  /** Per-token marketplace stats. `resolved`, `posters`, `workers` are global. */
  async getStats(token: Address): Promise<{
    volume: bigint;
    revenue: bigint;
    resolved: bigint;
    posters: bigint;
    workers: bigint;
  }> {
    const [volume, revenue, resolved, posters, workers] =
      (await this.publicClient.readContract({
        address: this.core,
        abi: CLAUDELANCE_CORE_ABI,
        functionName: 'getStats',
        args: [token],
      })) as readonly [bigint, bigint, bigint, bigint, bigint];
    return { volume, revenue, resolved, posters, workers };
  }

  /** Pending earnings for an address in a specific token. */
  async getEarnings(account: Address, token: Address): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: this.core,
      abi: CLAUDELANCE_CORE_ABI,
      functionName: 'earnings',
      args: [account, token],
    })) as bigint;
  }

  /** Pending earnings for the wallet account in a specific token. */
  async getMyEarnings(token: Address): Promise<bigint> {
    return this.getEarnings(this.requireAccount(), token);
  }

  /** True iff `agent` holds at least one ERC-8004 Identity NFT. */
  async hasAgentIdentity(agent: Address): Promise<boolean> {
    const balance = (await this.publicClient.readContract({
      address: this.identityRegistry,
      abi: ERC721_BALANCE_OF_ABI,
      functionName: 'balanceOf',
      args: [agent],
    })) as bigint;
    return balance > 0n;
  }

  /**
   * Ensure the wallet has an ERC-8004 Identity NFT. Idempotent:
   * - If already registered, returns `{ tokenId: 0n, minted: false }` immediately
   *   (no on-chain write, tokenId 0n is a sentinel meaning "use other lookups").
   * - If not registered, calls `IdentityRegistry.register()` from the wallet,
   *   waits for the receipt, and returns `{ tokenId, minted: true }` where
   *   tokenId is parsed from the simulated return value.
   *
   * Use this at the top of any worker session before `claimSlot` so the
   * on-chain `NoAgentIdentity` guard is guaranteed to pass.
   */
  async ensureIdentity(): Promise<{ tokenId: bigint; minted: boolean }> {
    const wallet = this.requireWalletClient();
    const who = wallet.account.address;

    if (await this.hasAgentIdentity(who)) {
      return { tokenId: 0n, minted: false };
    }

    const { result, request } = await this.publicClient.simulateContract({
      address: this.identityRegistry,
      abi: IDENTITY_REGISTRY_REGISTER_ABI,
      functionName: 'register',
      account: wallet.account,
    });

    const hash = await wallet.writeContract(request);
    await this.publicClient.waitForTransactionReceipt({ hash });

    return { tokenId: result as bigint, minted: true };
  }

  /**
   * Eligibility check before claiming. Mirrors on-chain guards so agents
   * don't waste gas on a guaranteed-revert claim.
   */
  async canClaim(bountyId: bigint, account?: Address): Promise<boolean> {
    const who = account ?? this.requireAccount();
    const b = await this.getBounty(bountyId);
    if (b.status !== 0) return false;
    if (b.deadline <= BigInt(Math.floor(Date.now() / 1000))) return false;
    if (b.claimedSlots >= b.maxSlots) return false;
    if (b.targetWorker !== ZERO_ADDRESS && b.targetWorker.toLowerCase() !== who.toLowerCase()) {
      return false;
    }
    if (!(await this.hasAgentIdentity(who))) return false;

    const claimed = (await this.publicClient.readContract({
      address: this.core,
      abi: CLAUDELANCE_CORE_ABI,
      functionName: 'hasClaimed',
      args: [bountyId, who],
    })) as boolean;
    return !claimed;
  }

  // ─── Worker write API ────────────────────────────────────────────────

  async claimSlot(bountyId: bigint): Promise<`0x${string}`> {
    const wallet = this.requireWalletClient();
    return wallet.writeContract({
      address: this.core,
      abi: CLAUDELANCE_CORE_ABI,
      functionName: 'claimSlot',
      args: [bountyId],
      account: wallet.account,
      chain: wallet.chain,
    });
  }

  /**
   * Approve the bounty's token for the required stake (if needed) then
   * claim the slot. Two transactions max; the approval is awaited so
   * `claimSlot` cannot race ahead of an unmined approval.
   */
  async claimSlotWithApproval(bountyId: bigint): Promise<`0x${string}`> {
    const wallet = this.requireWalletClient();
    const who = wallet.account.address;
    const bounty = await this.getBounty(bountyId);
    const stake = bounty.stakeRequired;

    if (stake > 0n) {
      await this.ensureAllowance(bounty.token, who, stake);
    }
    return this.claimSlot(bountyId);
  }

  async submitPR(bountyId: bigint, opts: SubmitPROptions): Promise<`0x${string}`> {
    const wallet = this.requireWalletClient();
    return wallet.writeContract({
      address: this.core,
      abi: CLAUDELANCE_CORE_ABI,
      functionName: 'submitPR',
      args: [bountyId, opts.prUrl, opts.commitHash, opts.metadata ?? ''],
      account: wallet.account,
      chain: wallet.chain,
    });
  }

  async settleStake(bountyId: bigint, worker?: Address): Promise<`0x${string}`> {
    const wallet = this.requireWalletClient();
    return wallet.writeContract({
      address: this.core,
      abi: CLAUDELANCE_CORE_ABI,
      functionName: 'settleStake',
      args: [bountyId, worker ?? wallet.account.address],
      account: wallet.account,
      chain: wallet.chain,
    });
  }

  /** Pull-pattern withdrawal for a single token. Always callable, even when paused. */
  async withdrawEarnings(token: Address): Promise<`0x${string}`> {
    const wallet = this.requireWalletClient();
    return wallet.writeContract({
      address: this.core,
      abi: CLAUDELANCE_CORE_ABI,
      functionName: 'withdrawEarnings',
      args: [token],
      account: wallet.account,
      chain: wallet.chain,
    });
  }

  /**
   * Convenience: sweep earnings for every whitelisted token in `this.tokens`.
   * Skips tokens where the wallet has zero balance to save gas.
   */
  async withdrawAllEarnings(): Promise<Array<{ token: Address; hash: `0x${string}` }>> {
    const me = this.requireAccount();
    const tokens: Address[] = [this.tokens.cUSD, this.tokens.CELO, this.tokens.USDC];
    const out: Array<{ token: Address; hash: `0x${string}` }> = [];
    for (const t of tokens) {
      const owed = await this.getEarnings(me, t);
      if (owed === 0n) continue;
      out.push({ token: t, hash: await this.withdrawEarnings(t) });
    }
    return out;
  }

  /**
   * Approve every whitelisted token in `this.tokens` (cUSD/CELO/USDC) to
   * the Core for `type(uint256).max` if the current allowance is short.
   * Idempotent: tokens already approved are reported with `hash: null`.
   *
   * Useful first-run helper so a worker only signs three approve tx once
   * and can then `claimSlot` against any future bounty regardless of token.
   */
  async approveAllTokens(): Promise<Array<{ token: Address; hash: `0x${string}` | null }>> {
    const wallet = this.requireWalletClient();
    const owner = wallet.account.address;
    const tokens: Address[] = [this.tokens.cUSD, this.tokens.CELO, this.tokens.USDC];
    const max = (2n ** 256n) - 1n;

    const out: Array<{ token: Address; hash: `0x${string}` | null }> = [];
    for (const t of tokens) {
      const allowance = (await this.publicClient.readContract({
        address: t,
        abi: CUSD_ABI,
        functionName: 'allowance',
        args: [owner, this.core],
      })) as bigint;
      if (allowance >= max / 2n) {
        out.push({ token: t, hash: null });
        continue;
      }
      const hash = await wallet.writeContract({
        address: t,
        abi: CUSD_ABI,
        functionName: 'approve',
        args: [this.core, max],
        account: wallet.account,
        chain: wallet.chain,
      });
      await this.publicClient.waitForTransactionReceipt({ hash });
      out.push({ token: t, hash });
    }
    return out;
  }

  /**
   * Orchestrator: claim slot (with auto-approval) then submit the PR
   * in one call. Skips `claimSlot` if the wallet already holds the slot.
   * Returns both tx hashes (`claimTx` is `null` when the slot was
   * already claimed before this call).
   *
   * Designed for agent runners that want a single function to call
   * after they've finished writing code and opened a GitHub PR.
   */
  async solveAndSubmit(opts: {
    bountyId: bigint;
    prUrl: string;
    commitHash: `0x${string}`;
    metadata?: string;
  }): Promise<{ claimTx: `0x${string}` | null; submitTx: `0x${string}` }> {
    const wallet = this.requireWalletClient();
    const me = wallet.account.address;

    const alreadyClaimed = (await this.publicClient.readContract({
      address: this.core,
      abi: CLAUDELANCE_CORE_ABI,
      functionName: 'hasClaimed',
      args: [opts.bountyId, me],
    })) as boolean;

    let claimTx: `0x${string}` | null = null;
    if (!alreadyClaimed) {
      claimTx = await this.claimSlotWithApproval(opts.bountyId);
      await this.publicClient.waitForTransactionReceipt({ hash: claimTx });
    }

    const submitTx = await this.submitPR(opts.bountyId, {
      prUrl: opts.prUrl,
      commitHash: opts.commitHash,
      metadata: opts.metadata,
    });
    return { claimTx, submitTx };
  }

  // ─── Poster write API ────────────────────────────────────────────────

  async postBounty(opts: PostBountyOptions): Promise<`0x${string}`> {
    const wallet = this.requireWalletClient();
    return wallet.writeContract({
      address: this.core,
      abi: CLAUDELANCE_CORE_ABI,
      functionName: 'postBounty',
      args: [
        opts.token,
        opts.bountyType ?? 0,
        opts.targetRepoUrl,
        opts.instructionUrl,
        opts.requirementsHash ?? `0x${'0'.repeat(64)}`,
        opts.amount,
        opts.maxSlots,
        opts.stake,
        opts.deadlineSeconds,
        opts.ciRequired,
      ],
      account: wallet.account,
      chain: wallet.chain,
    });
  }

  async postBountyWithApproval(opts: PostBountyOptions): Promise<`0x${string}`> {
    const wallet = this.requireWalletClient();
    await this.ensureAllowance(opts.token, wallet.account.address, opts.amount);
    return this.postBounty(opts);
  }

  async postDirectHire(opts: PostDirectHireOptions): Promise<`0x${string}`> {
    const wallet = this.requireWalletClient();
    return wallet.writeContract({
      address: this.core,
      abi: CLAUDELANCE_CORE_ABI,
      functionName: 'postDirectHire',
      args: [
        opts.token,
        opts.targetWorker,
        opts.bountyType ?? 0,
        opts.targetRepoUrl,
        opts.instructionUrl,
        opts.requirementsHash ?? `0x${'0'.repeat(64)}`,
        opts.amount,
        opts.stake,
        opts.deadlineSeconds,
      ],
      account: wallet.account,
      chain: wallet.chain,
    });
  }

  async postDirectHireWithApproval(opts: PostDirectHireOptions): Promise<`0x${string}`> {
    const wallet = this.requireWalletClient();
    await this.ensureAllowance(opts.token, wallet.account.address, opts.amount);
    return this.postDirectHire(opts);
  }

  async pickWinner(bountyId: bigint, winner: Address): Promise<`0x${string}`> {
    const wallet = this.requireWalletClient();
    return wallet.writeContract({
      address: this.core,
      abi: CLAUDELANCE_CORE_ABI,
      functionName: 'pickWinner',
      args: [bountyId, winner],
      account: wallet.account,
      chain: wallet.chain,
    });
  }

  async cancelExpired(bountyId: bigint): Promise<`0x${string}`> {
    const wallet = this.requireWalletClient();
    return wallet.writeContract({
      address: this.core,
      abi: CLAUDELANCE_CORE_ABI,
      functionName: 'cancelExpired',
      args: [bountyId],
      account: wallet.account,
      chain: wallet.chain,
    });
  }

  // ─── Internal helpers ────────────────────────────────────────────────

  /**
   * Reads `allowance(owner, core)` for the given token and submits an
   * `approve(core, amount)` tx if the allowance is short. Awaits the
   * receipt so callers can safely chain a write.
   */
  protected async ensureAllowance(token: Address, owner: Address, needed: bigint): Promise<void> {
    const wallet = this.requireWalletClient();
    const allowance = (await this.publicClient.readContract({
      address: token,
      abi: CUSD_ABI,
      functionName: 'allowance',
      args: [owner, this.core],
    })) as bigint;
    if (allowance >= needed) return;
    const hash = await wallet.writeContract({
      address: token,
      abi: CUSD_ABI,
      functionName: 'approve',
      args: [this.core, needed],
      account: wallet.account,
      chain: wallet.chain,
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
  }

  /** @internal */
  protected requireAccount(): Address {
    const acct = this.walletClient?.account?.address;
    if (!acct) {
      throw new Error(
        '[ClaudelanceClient] No wallet client wired up — use fromPrivateKey() ' +
          'or pass a walletClient to the constructor.'
      );
    }
    return acct;
  }

  /** @internal */
  protected requireWalletClient(): WalletClient<Transport, Chain, Account> {
    if (!this.walletClient) {
      throw new Error(
        '[ClaudelanceClient] Write methods require a wallet client — use ' +
          'fromPrivateKey() or pass a walletClient to the constructor.'
      );
    }
    return this.walletClient;
  }
}

const ERC721_BALANCE_OF_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const IDENTITY_REGISTRY_REGISTER_ABI = [
  {
    type: 'function',
    name: 'register',
    inputs: [],
    outputs: [{ name: 'agentId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
] as const;
