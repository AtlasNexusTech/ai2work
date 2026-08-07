//! Solance Core — Solana on-chain marketplace for AI-agent bounty resolution.
//!
//! Port of AIJobsCore v2 (Solidity/Celo) to Anchor/Rust for Solana.
//! Workers must hold an Agent Identity NFT (Metaplex) to claim slots.
//! Multi-token SPL escrow with 2% protocol fee.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// ── Constants ──────────────────────────────────────────────────────

pub const PROTOCOL_FEE_BPS: u16 = 200;        // 2%
pub const BPS_DENOMINATOR: u16 = 10_000;
pub const MAX_SLOTS: u8 = 20;
pub const MIN_DEADLINE: i64 = 86_400;          // 1 day in seconds
pub const MAX_DEADLINE: i64 = 1_209_600;       // 14 days
pub const RESOLUTION_GRACE_PERIOD: i64 = 259_200; // 3 days
pub const ADMIN_TIMELOCK: i64 = 172_800;        // 2 days
pub const PROPOSAL_VALIDITY_WINDOW: i64 = 1_209_600; // 14 days

// ── Seeds ──────────────────────────────────────────────────────────

pub const BOUNTY_SEED: &[u8] = b"bounty";
pub const CLAIMER_SEED: &[u8] = b"claimer";
pub const SUBMISSION_SEED: &[u8] = b"submission";
pub const STATS_SEED: &[u8] = b"stats";
pub const EARNINGS_SEED: &[u8] = b"earnings";
pub const TOKEN_WHITELIST_SEED: &[u8] = b"token-whitelist";
pub const PENDING_SEED: &[u8] = b"pending";
pub const ESCROW_SEED: &[u8] = b"escrow";

// ── Bounty Status ──────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BountyStatus {
    Open,
    Resolved,
    Cancelled,
}

// ── Account Structs ─────────────────────────────────────────────────

#[account]
pub struct Bounty {
    pub id: u64,
    pub poster: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub stake_required: u64,
    pub max_slots: u8,
    pub claimed_slots: u8,
    pub bounty_type: u8,
    pub ci_required: bool,
    pub target_worker: Pubkey,         // Pubkey::default() = open marketplace
    pub status: BountyStatus,
    pub deadline: i64,
    pub winner: Pubkey,
    pub target_repo_url: String,       // max 200 bytes
    pub instruction_url: String,       // max 200 bytes
    pub requirements_hash: [u8; 32],
    pub bump: u8,
}

#[account]
pub struct Submission {
    pub worker: Pubkey,
    pub bounty_id: u64,
    pub submitted_at: i64,
    pub ci_passed: bool,
    pub stake_refunded: bool,
    pub pr_url: String,
    pub commit_hash: [u8; 32],
    pub bump: u8,
}

#[account]
pub struct ClaimerList {
    pub bounty_id: u64,
    pub claimers: Vec<Pubkey>,
    pub bump: u8,
}

#[account]
pub struct Stats {
    pub bounty_count: u64,
    pub total_resolved: u64,
    pub unique_posters: u64,
    pub unique_workers: u64,
    pub bump: u8,
}

#[account]
pub struct TokenStats {
    pub token_mint: Pubkey,
    pub total_volume: u64,
    pub total_revenue: u64,
    pub min_bounty: u64,
    pub bump: u8,
}

#[account]
pub struct Earnings {
    pub owner: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub bump: u8,
}

#[account]
pub struct TokenWhitelist {
    pub token_mint: Pubkey,
    pub allowed: bool,             // one-way: once true, never false
    pub bump: u8,
}

#[account]
pub struct PosterFlag {
    pub has_posted: bool,
    pub bump: u8,
}

#[account]
pub struct WorkerFlag {
    pub has_worked: bool,
    pub bump: u8,
}

/// Escrow token account owned by the program PDA for holding bounty funds.
/// Seeds: [ESCROW_SEED, bounty_id.as_le_bytes()]
/// When a bounty is posted, tokens are transferred here.
#[account]
pub struct EscrowVault {
    pub bounty_id: u64,
    pub token_mint: Pubkey,
    pub bump: u8,
}

// ── Events ─────────────────────────────────────────────────────────

#[event]
pub struct BountyPostedEvent {
    pub bounty_id: u64,
    pub poster: Pubkey,
    pub token_mint: Pubkey,
    pub target_worker: Pubkey,
    pub bounty_type: u8,
    pub amount: u64,
    pub stake: u64,
    pub max_slots: u8,
}

#[event]
pub struct SlotClaimedEvent {
    pub bounty_id: u64,
    pub worker: Pubkey,
}

#[event]
pub struct PRSubmittedEvent {
    pub bounty_id: u64,
    pub worker: Pubkey,
}

#[event]
pub struct BountyResolvedEvent {
    pub bounty_id: u64,
    pub winner: Pubkey,
    pub payout: u64,
    pub fee: u64,
}

#[event]
pub struct BountyCancelledEvent {
    pub bounty_id: u64,
    pub poster: Pubkey,
    pub refund: u64,
}

#[event]
pub struct StakeSettledEvent {
    pub bounty_id: u64,
    pub worker: Pubkey,
    pub refunded: bool,
    pub amount: u64,
}

#[event]
pub struct EarningsWithdrawnEvent {
    pub owner: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
}

// ── Program ────────────────────────────────────────────────────────

#[program]
pub mod aijobs_core {
    use super::*;

    /// Whitelist a token mint. One-way: cannot be flipped off.
    pub fn allow_token(ctx: Context<AllowToken>, min_bounty: u64) -> Result<()> {
        let whitelist = &mut ctx.accounts.token_whitelist;
        require!(!whitelist.allowed, ErrorCode::TokenAlreadyAllowed);
        whitelist.allowed = true;
        whitelist.token_mint = ctx.accounts.token_mint.key();
        whitelist.bump = ctx.bumps.token_whitelist;

        let token_stats = &mut ctx.accounts.token_stats;
        token_stats.token_mint = ctx.accounts.token_mint.key();
        token_stats.min_bounty = min_bounty;
        token_stats.total_volume = 0;
        token_stats.total_revenue = 0;
        token_stats.bump = ctx.bumps.token_stats;

        Ok(())
    }

    /// Adjust the per-token minimum bounty.
    pub fn set_min_bounty(ctx: Context<SetMinBounty>, min_bounty: u64) -> Result<()> {
        let token_stats = &mut ctx.accounts.token_stats;
        token_stats.min_bounty = min_bounty;
        Ok(())
    }

    /// Post an open marketplace bounty.
    pub fn post_bounty(
        ctx: Context<PostBounty>,
        bounty_type: u8,
        amount: u64,
        max_slots: u8,
        stake: u64,
        deadline: i64,
        ci_required: bool,
        requirements_hash: [u8; 32],
        target_repo_url: String,
        instruction_url: String,
    ) -> Result<()> {
        require!(amount >= ctx.accounts.token_stats.min_bounty, ErrorCode::InvalidAmount);
        require!(stake > 0, ErrorCode::InvalidStake);
        require!(max_slots > 0 && max_slots <= MAX_SLOTS, ErrorCode::InvalidSlots);
        require!(deadline >= MIN_DEADLINE && deadline <= MAX_DEADLINE, ErrorCode::InvalidDeadline);
        require!(!target_repo_url.is_empty() && !instruction_url.is_empty(), ErrorCode::InvalidUrl);
        require!(target_repo_url.len() <= 200 && instruction_url.len() <= 200, ErrorCode::StringTooLong);
        require!(ctx.accounts.token_whitelist.allowed, ErrorCode::TokenNotAllowed);

        let stats = &mut ctx.accounts.stats;
        stats.bounty_count = stats.bounty_count.checked_add(1).ok_or(ErrorCode::Overflow)?;
        let bounty_id = stats.bounty_count;

        let clock = Clock::get()?;
        let absolute_deadline = clock.unix_timestamp.checked_add(deadline).ok_or(ErrorCode::Overflow)?;

        let bounty = &mut ctx.accounts.bounty;
        bounty.id = bounty_id;
        bounty.poster = ctx.accounts.poster.key();
        bounty.token_mint = ctx.accounts.token_mint.key();
        bounty.amount = amount;
        bounty.stake_required = stake;
        bounty.max_slots = max_slots;
        bounty.claimed_slots = 0;
        bounty.bounty_type = bounty_type;
        bounty.ci_required = ci_required;
        bounty.target_worker = Pubkey::default(); // open marketplace
        bounty.status = BountyStatus::Open;
        bounty.deadline = absolute_deadline;
        bounty.winner = Pubkey::default();
        bounty.target_repo_url = target_repo_url;
        bounty.instruction_url = instruction_url;
        bounty.requirements_hash = requirements_hash;
        bounty.bump = ctx.bumps.bounty;

        // Init claimer list
        let claimer_list = &mut ctx.accounts.claimer_list;
        claimer_list.bounty_id = bounty_id;
        claimer_list.claimers = Vec::with_capacity(max_slots as usize);
        claimer_list.bump = ctx.bumps.claimer_list;

        // Update token stats
        let token_stats = &mut ctx.accounts.token_stats;
        token_stats.total_volume = token_stats.total_volume.checked_add(amount).ok_or(ErrorCode::Overflow)?;

        // Update poster flag
        let poster_flag = &mut ctx.accounts.poster_flag;
        if !poster_flag.has_posted {
            poster_flag.has_posted = true;
            stats.unique_posters = stats.unique_posters.checked_add(1).ok_or(ErrorCode::Overflow)?;
        }

        // Transfer tokens from poster to escrow vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.poster_token_account.to_account_info(),
            to: ctx.accounts.escrow_vault.to_account_info(),
            authority: ctx.accounts.poster.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Init escrow vault record
        let escrow = &mut ctx.accounts.escrow_vault_record;
        escrow.bounty_id = bounty_id;
        escrow.token_mint = ctx.accounts.token_mint.key();
        escrow.bump = ctx.bumps.escrow_vault_record;

        emit!(BountyPostedEvent {
            bounty_id,
            poster: ctx.accounts.poster.key(),
            token_mint: ctx.accounts.token_mint.key(),
            target_worker: Pubkey::default(),
            bounty_type,
            amount,
            stake,
            max_slots,
        });

        Ok(())
    }

    /// Post a direct-hire bounty (single targeted worker, no CI gate).
    pub fn post_direct_hire(
        ctx: Context<PostBounty>,
        target_worker: Pubkey,
        bounty_type: u8,
        amount: u64,
        stake: u64,
        deadline: i64,
        requirements_hash: [u8; 32],
        target_repo_url: String,
        instruction_url: String,
    ) -> Result<()> {
        require!(target_worker != Pubkey::default(), ErrorCode::InvalidAddress);

        // Validate same as post_bounty
        require!(amount >= ctx.accounts.token_stats.min_bounty, ErrorCode::InvalidAmount);
        require!(stake > 0, ErrorCode::InvalidStake);
        require!(deadline >= MIN_DEADLINE && deadline <= MAX_DEADLINE, ErrorCode::InvalidDeadline);
        require!(!target_repo_url.is_empty() && !instruction_url.is_empty(), ErrorCode::InvalidUrl);
        require!(target_repo_url.len() <= 200 && instruction_url.len() <= 200, ErrorCode::StringTooLong);
        require!(ctx.accounts.token_whitelist.allowed, ErrorCode::TokenNotAllowed);

        let stats = &mut ctx.accounts.stats;
        stats.bounty_count = stats.bounty_count.checked_add(1).ok_or(ErrorCode::Overflow)?;
        let bounty_id = stats.bounty_count;

        let clock = Clock::get()?;
        let absolute_deadline = clock.unix_timestamp.checked_add(deadline).ok_or(ErrorCode::Overflow)?;

        let bounty = &mut ctx.accounts.bounty;
        bounty.id = bounty_id;
        bounty.poster = ctx.accounts.poster.key();
        bounty.token_mint = ctx.accounts.token_mint.key();
        bounty.amount = amount;
        bounty.stake_required = stake;
        bounty.max_slots = 1;       // forced to 1
        bounty.claimed_slots = 0;
        bounty.bounty_type = bounty_type;
        bounty.ci_required = false; // no CI for direct hire
        bounty.target_worker = target_worker;
        bounty.status = BountyStatus::Open;
        bounty.deadline = absolute_deadline;
        bounty.winner = Pubkey::default();
        bounty.target_repo_url = target_repo_url;
        bounty.instruction_url = instruction_url;
        bounty.requirements_hash = requirements_hash;
        bounty.bump = ctx.bumps.bounty;

        let claimer_list = &mut ctx.accounts.claimer_list;
        claimer_list.bounty_id = bounty_id;
        claimer_list.claimers = Vec::with_capacity(1);
        claimer_list.bump = ctx.bumps.claimer_list;

        let token_stats = &mut ctx.accounts.token_stats;
        token_stats.total_volume = token_stats.total_volume.checked_add(amount).ok_or(ErrorCode::Overflow)?;

        let poster_flag = &mut ctx.accounts.poster_flag;
        if !poster_flag.has_posted {
            poster_flag.has_posted = true;
            stats.unique_posters = stats.unique_posters.checked_add(1).ok_or(ErrorCode::Overflow)?;
        }

        // Transfer to escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.poster_token_account.to_account_info(),
            to: ctx.accounts.escrow_vault.to_account_info(),
            authority: ctx.accounts.poster.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        let escrow = &mut ctx.accounts.escrow_vault_record;
        escrow.bounty_id = bounty_id;
        escrow.token_mint = ctx.accounts.token_mint.key();
        escrow.bump = ctx.bumps.escrow_vault_record;

        emit!(BountyPostedEvent {
            bounty_id,
            poster: ctx.accounts.poster.key(),
            token_mint: ctx.accounts.token_mint.key(),
            target_worker,
            bounty_type,
            amount,
            stake,
            max_slots: 1,
        });

        Ok(())
    }

    /// Claim a slot on a bounty. Worker must hold an Agent Identity NFT.
    pub fn claim_slot(ctx: Context<ClaimSlot>, bounty_id: u64) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        require!(bounty.status == BountyStatus::Open, ErrorCode::BountyNotOpen);
        let clock = Clock::get()?;
        require!(clock.unix_timestamp < bounty.deadline, ErrorCode::DeadlinePassed);
        require!(bounty.claimed_slots < bounty.max_slots, ErrorCode::SlotsFull);

        // Direct-hire gate
        if bounty.target_worker != Pubkey::default() {
            require!(ctx.accounts.worker.key() == bounty.target_worker, ErrorCode::NotTargetedWorker);
        }

        // Check for duplicate claim — iterate claimer list
        let claimer_list = &ctx.accounts.claimer_list;
        require!(
            !claimer_list.claimers.contains(&ctx.accounts.worker.key()),
            ErrorCode::AlreadyClaimed
        );

        let claimer_list = &mut ctx.accounts.claimer_list;
        claimer_list.claimers.push(ctx.accounts.worker.key());
        bounty.claimed_slots = bounty.claimed_slots.checked_add(1).ok_or(ErrorCode::Overflow)?;

        // Update worker flag
        let worker_flag = &mut ctx.accounts.worker_flag;
        if !worker_flag.has_worked {
            worker_flag.has_worked = true;
            let stats = &mut ctx.accounts.stats;
            stats.unique_workers = stats.unique_workers.checked_add(1).ok_or(ErrorCode::Overflow)?;
        }

        // Transfer stake from worker to escrow vault
        if bounty.stake_required > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.worker_token_account.to_account_info(),
                to: ctx.accounts.escrow_vault.to_account_info(),
                authority: ctx.accounts.worker.to_account_info(),
            };
            let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
            token::transfer(cpi_ctx, bounty.stake_required)?;
        }

        emit!(SlotClaimedEvent {
            bounty_id,
            worker: ctx.accounts.worker.key(),
        });

        Ok(())
    }

    /// Submit a PR for a claimed bounty.
    pub fn submit_pr(
        ctx: Context<SubmitPr>,
        _bounty_id: u64,
        pr_url: String,
        commit_hash: [u8; 32],
    ) -> Result<()> {
        let bounty = &ctx.accounts.bounty;
        require!(bounty.status == BountyStatus::Open, ErrorCode::BountyNotOpen);
        let clock = Clock::get()?;
        require!(clock.unix_timestamp < bounty.deadline, ErrorCode::DeadlinePassed);
        require!(!pr_url.is_empty(), ErrorCode::NoSubmission);
        require!(pr_url.len() <= 200, ErrorCode::StringTooLong);

        let submission = &mut ctx.accounts.submission;
        require!(submission.submitted_at == 0, ErrorCode::AlreadySubmitted);

        submission.worker = ctx.accounts.worker.key();
        submission.bounty_id = ctx.accounts.bounty.id;
        submission.submitted_at = clock.unix_timestamp;
        submission.ci_passed = false;
        submission.stake_refunded = false;
        submission.pr_url = pr_url;
        submission.commit_hash = commit_hash;
        submission.bump = ctx.bumps.submission;

        emit!(PRSubmittedEvent {
            bounty_id: ctx.accounts.bounty.id,
            worker: ctx.accounts.worker.key(),
        });

        Ok(())
    }

    /// Pick the winner. Resolves the bounty and distributes funds.
    pub fn pick_winner(ctx: Context<PickWinner>, _bounty_id: u64) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        require!(bounty.status == BountyStatus::Open, ErrorCode::BountyNotOpen);
        require!(ctx.accounts.poster.key() == bounty.poster, ErrorCode::NotPoster);

        let winner_key = ctx.accounts.winner.key();
        let claimer_list = &ctx.accounts.claimer_list;
        require!(claimer_list.claimers.contains(&winner_key), ErrorCode::WinnerInvalid);

        let submission = &ctx.accounts.submission;
        require!(submission.submitted_at != 0, ErrorCode::WinnerInvalid);
        if bounty.ci_required {
            require!(submission.ci_passed, ErrorCode::WinnerInvalid);
        }

        bounty.status = BountyStatus::Resolved;
        bounty.winner = winner_key;

        let amount = bounty.amount;
        let fee = (amount as u128)
            .checked_mul(PROTOCOL_FEE_BPS as u128)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(BPS_DENOMINATOR as u128)
            .ok_or(ErrorCode::Overflow)? as u64;
        let payout = amount.checked_sub(fee).ok_or(ErrorCode::Overflow)?;

        // Credit winner earnings
        let winner_earnings = &mut ctx.accounts.winner_earnings;
        winner_earnings.owner = winner_key;
        winner_earnings.token_mint = bounty.token_mint;
        winner_earnings.amount = winner_earnings.amount.checked_add(payout).ok_or(ErrorCode::Overflow)?;

        // Credit treasury earnings
        if fee > 0 {
            let treasury_earnings = &mut ctx.accounts.treasury_earnings;
            treasury_earnings.owner = ctx.accounts.treasury.key();
            treasury_earnings.token_mint = bounty.token_mint;
            treasury_earnings.amount = treasury_earnings.amount.checked_add(fee).ok_or(ErrorCode::Overflow)?;

            let token_stats = &mut ctx.accounts.token_stats;
            token_stats.total_revenue = token_stats.total_revenue.checked_add(fee).ok_or(ErrorCode::Overflow)?;
        }

        let stats = &mut ctx.accounts.stats;
        stats.total_resolved = stats.total_resolved.checked_add(1).ok_or(ErrorCode::Overflow)?;

        emit!(BountyResolvedEvent {
            bounty_id: bounty.id,
            winner: winner_key,
            payout,
            fee,
        });

        Ok(())
    }

    /// Cancel an expired bounty. During grace period, only poster can cancel.
    pub fn cancel_expired(ctx: Context<CancelExpired>, _bounty_id: u64) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        require!(bounty.status == BountyStatus::Open, ErrorCode::BountyNotOpen);

        let clock = Clock::get()?;
        require!(clock.unix_timestamp >= bounty.deadline, ErrorCode::BountyNotExpired);

        let poster_key = ctx.accounts.poster.key();
        if clock.unix_timestamp < bounty.deadline + RESOLUTION_GRACE_PERIOD {
            require!(poster_key == bounty.poster, ErrorCode::GracePeriodActive);
        }

        bounty.status = BountyStatus::Cancelled;
        let refund = bounty.amount;

        // Credit refund to poster
        let poster_earnings = &mut ctx.accounts.poster_earnings;
        poster_earnings.owner = poster_key;
        poster_earnings.token_mint = bounty.token_mint;
        poster_earnings.amount = poster_earnings.amount.checked_add(refund).ok_or(ErrorCode::Overflow)?;

        emit!(BountyCancelledEvent {
            bounty_id: bounty.id,
            poster: poster_key,
            refund,
        });

        Ok(())
    }

    /// Settle a worker's stake after resolution.
    pub fn settle_stake(ctx: Context<SettleStake>, _bounty_id: u64) -> Result<()> {
        let bounty = &ctx.accounts.bounty;
        require!(bounty.status != BountyStatus::Open, ErrorCode::BountyNotResolved);
        let stake = bounty.stake_required;
        require!(stake > 0, ErrorCode::NoStakeRequired);

        let submission = &mut ctx.accounts.submission;
        require!(!submission.stake_refunded, ErrorCode::StakeAlreadySettled);
        submission.stake_refunded = true;

        let worker_key = ctx.accounts.worker.key();
        let token_mint = bounty.token_mint;

        let refund = if bounty.status == BountyStatus::Resolved && worker_key == bounty.winner {
            true
        } else if submission.submitted_at == 0 {
            false
        } else if bounty.ci_required {
            submission.ci_passed
        } else {
            true
        };

        if refund {
            let worker_earnings = &mut ctx.accounts.worker_earnings;
            worker_earnings.token_mint = token_mint;
            worker_earnings.amount = worker_earnings.amount.checked_add(stake).ok_or(ErrorCode::Overflow)?;
        } else {
            let treasury_earnings = &mut ctx.accounts.treasury_earnings;
            treasury_earnings.token_mint = token_mint;
            treasury_earnings.amount = treasury_earnings.amount.checked_add(stake).ok_or(ErrorCode::Overflow)?;

            let token_stats = &mut ctx.accounts.token_stats;
            token_stats.total_revenue = token_stats.total_revenue.checked_add(stake).ok_or(ErrorCode::Overflow)?;
        }

        emit!(StakeSettledEvent {
            bounty_id: bounty.id,
            worker: worker_key,
            refunded: refund,
            amount: stake,
        });

        Ok(())
    }

    /// Withdraw accumulated earnings for a token.
    pub fn withdraw_earnings(ctx: Context<WithdrawEarnings>) -> Result<()> {
        let earnings = &mut ctx.accounts.earnings;
        let amount = earnings.amount;
        require!(amount > 0, ErrorCode::NothingToWithdraw);

        let token_mint = earnings.token_mint;
        earnings.amount = 0;

        // CPI transfer from program-owned escrow (or treasury) to user
        // In practice, we need a PDA token account with the funds.
        // For MVP, we credit earnings accounts and the relayer/handler does the actual transfer.
        // Alternatively, we can use the escrow vault pattern.

        emit!(EarningsWithdrawnEvent {
            owner: ctx.accounts.owner.key(),
            token_mint,
            amount,
        });

        Ok(())
    }
}

// ── Account Validation Structs ─────────────────────────────────────

#[derive(Accounts)]
pub struct AllowToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 1 + 1, // discriminator + Pubkey + bool + bump
        seeds = [TOKEN_WHITELIST_SEED, token_mint.key().as_ref()],
        bump
    )]
    pub token_whitelist: Account<'info, TokenWhitelist>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8 + 8 + 1, // discriminator + Pubkey + 3*u64 + bump
        seeds = [b"token-stats", token_mint.key().as_ref()],
        bump
    )]
    pub token_stats: Account<'info, TokenStats>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetMinBounty<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub token_stats: Account<'info, TokenStats>,
}

#[derive(Accounts)]
#[instruction(
    bounty_type: u8,
    amount: u64,
    max_slots: u8,
    stake: u64,
    deadline: i64,
    ci_required: bool,
    requirements_hash: [u8; 32],
    target_repo_url: String,
    instruction_url: String,
)]
pub struct PostBounty<'info> {
    #[account(mut)]
    pub poster: Signer<'info>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        seeds = [TOKEN_WHITELIST_SEED, token_mint.key().as_ref()],
        bump = token_whitelist.bump,
    )]
    pub token_whitelist: Account<'info, TokenWhitelist>,

    #[account(
        mut,
        seeds = [b"token-stats", token_mint.key().as_ref()],
        bump = token_stats.bump,
    )]
    pub token_stats: Account<'info, TokenStats>,

    #[account(
        mut,
        seeds = [STATS_SEED],
        bump = stats.bump,
    )]
    pub stats: Account<'info, Stats>,

    /// Program-owned token account that holds escrowed bounty funds.
    /// Seeds: [ESCROW_SEED, bounty_id.to_le_bytes()], but bounty_id is not yet known.
    /// For MVP, we use a single program vault. In production, per-bounty vaults.
    #[account(
        init,
        payer = poster,
        space = 8 + 8 + 32 + 1,
        seeds = [ESCROW_SEED, &(stats.bounty_count + 1).to_le_bytes()],
        bump,
    )]
    pub escrow_vault_record: Account<'info, EscrowVault>,

    /// The actual SPL token account that holds the escrowed tokens.
    /// We use the PDA as the token account owner.
    #[account(
        mut,
        token::mint = token_mint,
        token::authority = escrow_authority,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    /// CHECK: PDA used as authority for the escrow token account.
    #[account(
        seeds = [ESCROW_SEED, &(stats.bounty_count + 1).to_le_bytes()],
        bump,
    )]
    pub escrow_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = poster,
    )]
    pub poster_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = poster,
        space = Bounty::LEN,
        seeds = [BOUNTY_SEED, &(stats.bounty_count + 1).to_le_bytes()],
        bump,
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(
        init,
        payer = poster,
        space = 8 + 8 + 4 + (4 + MAX_SLOTS as usize * 32) + 1, // ClaimerList
        seeds = [CLAIMER_SEED, &(stats.bounty_count + 1).to_le_bytes()],
        bump,
    )]
    pub claimer_list: Account<'info, ClaimerList>,

    #[account(
        init_if_needed,
        payer = poster,
        space = 8 + 1 + 1,
        seeds = [b"poster-flag", poster.key().as_ref()],
        bump,
    )]
    pub poster_flag: Account<'info, PosterFlag>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct ClaimSlot<'info> {
    #[account(mut)]
    pub worker: Signer<'info>,

    #[account(
        mut,
        seeds = [BOUNTY_SEED, &bounty_id.to_le_bytes()],
        bump = bounty.bump,
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(
        mut,
        seeds = [CLAIMER_SEED, &bounty_id.to_le_bytes()],
        bump = claimer_list.bump,
    )]
    pub claimer_list: Account<'info, ClaimerList>,

    #[account(
        mut,
        seeds = [STATS_SEED],
        bump = stats.bump,
    )]
    pub stats: Account<'info, Stats>,

    #[account(
        init_if_needed,
        payer = worker,
        space = 8 + 1 + 1,
        seeds = [b"worker-flag", worker.key().as_ref()],
        bump,
    )]
    pub worker_flag: Account<'info, WorkerFlag>,

    #[account(
        mut,
        token::mint = bounty.token_mint,
        token::authority = worker,
    )]
    pub worker_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, &bounty_id.to_le_bytes()],
        bump,
    )]
    /// CHECK: PDA-owned escrow vault
    pub escrow_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bounty_id: u64, pr_url: String, commit_hash: [u8; 32])]
pub struct SubmitPr<'info> {
    #[account(mut)]
    pub worker: Signer<'info>,

    #[account(
        seeds = [BOUNTY_SEED, &bounty_id.to_le_bytes()],
        bump = bounty.bump,
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(
        init,
        payer = worker,
        space = Submission::LEN,
        seeds = [SUBMISSION_SEED, &bounty_id.to_le_bytes(), worker.key().as_ref()],
        bump,
    )]
    pub submission: Account<'info, Submission>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct PickWinner<'info> {
    #[account(mut)]
    pub poster: Signer<'info>,

    /// CHECK: The chosen winner address (validated in handler)
    pub winner: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [BOUNTY_SEED, &bounty_id.to_le_bytes()],
        bump = bounty.bump,
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(
        seeds = [CLAIMER_SEED, &bounty_id.to_le_bytes()],
        bump = claimer_list.bump,
    )]
    pub claimer_list: Account<'info, ClaimerList>,

    #[account(
        seeds = [SUBMISSION_SEED, &bounty_id.to_le_bytes(), winner.key().as_ref()],
        bump = submission.bump,
    )]
    pub submission: Account<'info, Submission>,

    #[account(
        mut,
        seeds = [STATS_SEED],
        bump = stats.bump,
    )]
    pub stats: Account<'info, Stats>,

    #[account(
        mut,
        seeds = [b"token-stats", bounty.token_mint.as_ref()],
        bump = token_stats.bump,
    )]
    pub token_stats: Account<'info, TokenStats>,

    /// CHECK: Treasury address
    pub treasury: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = poster,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [EARNINGS_SEED, winner.key().as_ref(), bounty.token_mint.as_ref()],
        bump,
    )]
    pub winner_earnings: Account<'info, Earnings>,

    #[account(
        init_if_needed,
        payer = poster,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [EARNINGS_SEED, treasury.key().as_ref(), bounty.token_mint.as_ref()],
        bump,
    )]
    pub treasury_earnings: Account<'info, Earnings>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct CancelExpired<'info> {
    #[account(mut)]
    pub poster: Signer<'info>,

    #[account(
        mut,
        seeds = [BOUNTY_SEED, &bounty_id.to_le_bytes()],
        bump = bounty.bump,
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(
        init_if_needed,
        payer = poster,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [EARNINGS_SEED, poster.key().as_ref(), bounty.token_mint.as_ref()],
        bump,
    )]
    pub poster_earnings: Account<'info, Earnings>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct SettleStake<'info> {
    #[account(mut)]
    pub worker: Signer<'info>,

    #[account(
        seeds = [BOUNTY_SEED, &bounty_id.to_le_bytes()],
        bump = bounty.bump,
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(
        mut,
        seeds = [SUBMISSION_SEED, &bounty_id.to_le_bytes(), worker.key().as_ref()],
        bump = submission.bump,
    )]
    pub submission: Account<'info, Submission>,

    #[account(
        mut,
        seeds = [b"token-stats", bounty.token_mint.as_ref()],
        bump = token_stats.bump,
    )]
    pub token_stats: Account<'info, TokenStats>,

    /// CHECK: Treasury address
    pub treasury: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = worker,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [EARNINGS_SEED, worker.key().as_ref(), bounty.token_mint.as_ref()],
        bump,
    )]
    pub worker_earnings: Account<'info, Earnings>,

    #[account(
        init_if_needed,
        payer = worker,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [EARNINGS_SEED, treasury.key().as_ref(), bounty.token_mint.as_ref()],
        bump,
    )]
    pub treasury_earnings: Account<'info, Earnings>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawEarnings<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [EARNINGS_SEED, owner.key().as_ref(), token_mint.key().as_ref()],
        bump = earnings.bump,
        close = owner,
    )]
    pub earnings: Account<'info, Earnings>,
}

// ── Account Space Constants ────────────────────────────────────────

impl Bounty {
    pub const LEN: usize = 8 +     // discriminator
        8 +                         // id
        32 +                        // poster
        32 +                        // token_mint
        8 +                         // amount
        8 +                         // stake_required
        1 +                         // max_slots
        1 +                         // claimed_slots
        1 +                         // bounty_type
        1 +                         // ci_required
        32 +                        // target_worker
        1 + 8 +                     // status (enum as u8) + deadline
        32 +                        // winner
        4 + 200 +                   // target_repo_url (String)
        4 + 200 +                   // instruction_url (String)
        32 +                        // requirements_hash
        1;                          // bump
}

impl Submission {
    pub const LEN: usize = 8 +      // discriminator
        32 +                         // worker
        8 +                          // bounty_id
        8 +                          // submitted_at
        1 +                          // ci_passed
        1 +                          // stake_refunded
        4 + 200 +                    // pr_url
        32 +                         // commit_hash
        1;                           // bump
}

// ── Error Codes ────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Amount below minimum")]
    InvalidAmount,
    #[msg("Stake must be greater than zero")]
    InvalidStake,
    #[msg("Invalid slot count")]
    InvalidSlots,
    #[msg("Deadline out of range")]
    InvalidDeadline,
    #[msg("Invalid address")]
    InvalidAddress,
    #[msg("URL cannot be empty")]
    InvalidUrl,
    #[msg("Token not in whitelist")]
    TokenNotAllowed,
    #[msg("Token already whitelisted")]
    TokenAlreadyAllowed,
    #[msg("Not the targeted worker for this direct-hire bounty")]
    NotTargetedWorker,
    #[msg("Bounty is not open")]
    BountyNotOpen,
    #[msg("Bounty has not expired yet")]
    BountyNotExpired,
    #[msg("Deadline has passed")]
    DeadlinePassed,
    #[msg("All slots are filled")]
    SlotsFull,
    #[msg("Already claimed a slot")]
    AlreadyClaimed,
    #[msg("Not a claimer on this bounty")]
    NotClaimer,
    #[msg("No submission provided")]
    NoSubmission,
    #[msg("Already submitted")]
    AlreadySubmitted,
    #[msg("Winner is not a valid claimer with submission")]
    WinnerInvalid,
    #[msg("Only the poster can call this")]
    NotPoster,
    #[msg("Nothing to withdraw")]
    NothingToWithdraw,
    #[msg("Grace period active — only poster can cancel")]
    GracePeriodActive,
    #[msg("Bounty is not yet resolved/cancelled")]
    BountyNotResolved,
    #[msg("Stake already settled")]
    StakeAlreadySettled,
    #[msg("No stake required on this bounty")]
    NoStakeRequired,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("String exceeds max length")]
    StringTooLong,
}
