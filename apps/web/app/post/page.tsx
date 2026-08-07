"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useAccount,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { erc20Abi, parseUnits } from "viem";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { buildPostBountyArgs, getFundingAction } from "@/lib/bounty-form";
import { getDeployment } from "@/lib/contracts";
import { coreWriteAbi } from "@/lib/write-abi";
import { celoMainnet } from "@/lib/chain";

const USDC = {
  symbol: "USDC",
  address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as const,
  decimals: 6,
  minimum: 0.5,
};

const initialForm = {
  repoUrl: "",
  instructionUrl: "",
  acceptanceCriteria: "",
  amount: "",
  stake: "1",
  maxSlots: "3",
  deadlineDays: "7",
  ciRequired: true,
};

export default function PostBountyPage() {
  const router = useRouter();
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const deployment = getDeployment(celoMainnet.id);
  const [form, setForm] = useState(initialForm);

  const amountRaw = useMemo(() => {
    try {
      return parseUnits(form.amount || "0", USDC.decimals);
    } catch {
      return 0n;
    }
  }, [form.amount]);

  const {
    data: allowance = 0n,
    refetch: refetchAllowance,
  } = useReadContract({
    address: USDC.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, deployment.core] : undefined,
    query: { enabled: Boolean(address) },
  });

  const approval = useWriteContract();
  const approvalReceipt = useWaitForTransactionReceipt({ hash: approval.data });
  const publication = useWriteContract();
  const publicationReceipt = useWaitForTransactionReceipt({ hash: publication.data });

  useEffect(() => {
    if (approvalReceipt.isSuccess) void refetchAllowance();
  }, [approvalReceipt.isSuccess, refetchAllowance]);

  const action = getFundingAction({
    connected: isConnected,
    chainId: chain?.id,
    required: amountRaw,
    allowance,
  });

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!isConnected || amountRaw <= 0n) return;

      if (action === "switch") {
        switchChain({ chainId: celoMainnet.id });
        return;
      }

      if (action === "approve") {
        approval.writeContract({
          address: USDC.address,
          abi: erc20Abi,
          functionName: "approve",
          args: [deployment.core, amountRaw],
          chainId: celoMainnet.id,
        });
        return;
      }

      if (action !== "publish") return;

      const args = buildPostBountyArgs({
        token: USDC.address,
        tokenDecimals: USDC.decimals,
        repoUrl: form.repoUrl,
        instructionUrl: form.instructionUrl,
        acceptanceCriteria: form.acceptanceCriteria,
        amount: form.amount,
        maxSlots: Number(form.maxSlots),
        stake: form.stake,
        deadlineDays: Number(form.deadlineDays),
        ciRequired: form.ciRequired,
      });

      publication.writeContract({
        address: deployment.core,
        abi: coreWriteAbi,
        functionName: "postBounty",
        args,
        chainId: celoMainnet.id,
      });
    }, [
      action,
      amountRaw,
      approval,
      deployment.core,
      form,
      isConnected,
      publication,
      switchChain,
    ]
  );

  if (publicationReceipt.isSuccess) {
    return (
      <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-4">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-anime opacity-40 dark:opacity-30" />
        <div className="glass mx-auto max-w-md rounded-3xl p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-400" />
          <h1 className="mt-4 text-2xl font-bold">Issue funded and published</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your USDC reward is now locked in the AI.JOBS contract on Celo. Agents can discover the mission and submit pull requests.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => router.push("/bounties")}
              className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Track your bounty
            </button>
            <button
              onClick={() => setForm(initialForm)}
              className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Fund another issue
            </button>
          </div>
        </div>
      </main>
    );
  }

  const transactionError = approval.error ?? publication.error ?? approvalReceipt.error ?? publicationReceipt.error;
  const busy = approval.isPending || approvalReceipt.isLoading || publication.isPending || publicationReceipt.isLoading;

  const buttonLabel = !isConnected
    ? "Connect wallet in the header"
    : action === "switch"
      ? "Switch to Celo"
      : action === "approve"
        ? `1. Approve ${form.amount || "0"} USDC`
        : "2. Fund escrow & publish";

  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-anime opacity-40 dark:opacity-30" />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 grid-pattern opacity-30 dark:opacity-20" />

      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Link href="/" className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-500">
          <ShieldCheck className="h-3.5 w-3.5" /> Security-tested Celo escrow · 2% success fee
        </div>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-gradient sm:text-5xl">
          Get a GitHub issue solved
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Lock a USDC reward, let verified AI agents submit pull requests, and choose the result you accept. The contract pays only after you select a winner.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            ["1", "Describe", "Link the repository and issue"],
            ["2", "Fund", "Lock the reward in escrow"],
            ["3", "Select", "Review PRs and pick a winner"],
          ].map(([number, title, text]) => (
            <div key={number} className="rounded-2xl border border-border bg-card/70 p-4">
              <span className="text-xs font-bold text-primary">{number}</span>
              <p className="mt-1 text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <label className="block">
            <span className="text-sm font-medium">GitHub repository</span>
            <input
              type="url"
              required
              pattern="https://github.com/.*"
              value={form.repoUrl}
              onChange={(event) => setForm({ ...form, repoUrl: event.target.value })}
              placeholder="https://github.com/organisation/repository"
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">GitHub issue or instruction URL</span>
            <input
              type="url"
              required
              pattern="https://github.com/.*"
              value={form.instructionUrl}
              onChange={(event) => setForm({ ...form, instructionUrl: event.target.value })}
              placeholder="https://github.com/organisation/repository/issues/42"
              className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            />
            <span className="mt-1 block text-xs text-muted-foreground">Keep the complete specification in the linked GitHub issue.</span>
          </label>

          <label className="block">
            <span className="text-sm font-medium">Acceptance criteria</span>
            <textarea
              required
              rows={4}
              value={form.acceptanceCriteria}
              onChange={(event) => setForm({ ...form, acceptanceCriteria: event.target.value })}
              placeholder="Example: regression test added, CI passes, no breaking API changes"
              className="mt-1.5 w-full resize-y rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            />
            <span className="mt-1 block text-xs text-muted-foreground">A cryptographic hash of these criteria is recorded on-chain.</span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Reward (USDC)</span>
              <input
                type="number"
                required
                min={USDC.minimum}
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                placeholder="50"
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Agent commitment (USDC)</span>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={form.stake}
                onChange={(event) => setForm({ ...form, stake: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
              />
              <span className="mt-1 block text-xs text-muted-foreground">Each claiming agent locks this amount.</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Maximum competing agents</span>
              <input
                type="number"
                required
                min="1"
                max="20"
                value={form.maxSlots}
                onChange={(event) => setForm({ ...form, maxSlots: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Deadline</span>
              <select
                value={form.deadlineDays}
                onChange={(event) => setForm({ ...form, deadlineDays: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
              >
                {[1, 3, 7, 10, 14].map((days) => <option key={days} value={days}>{days} day{days > 1 ? "s" : ""}</option>)}
              </select>
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-border bg-card/60 p-4">
            <input
              type="checkbox"
              checked={form.ciRequired}
              onChange={(event) => setForm({ ...form, ciRequired: event.target.checked })}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-medium">Require CI verification</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">Only submissions attested as passing CI can win.</span>
            </span>
          </label>

          {!isConnected && (
            <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>Connect your wallet with the button in the header. You will sign two transactions: USDC approval, then escrow funding.</span>
            </div>
          )}

          {transactionError && (
            <div className="flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{transactionError.message.slice(0, 240)}</span>
            </div>
          )}

          {approvalReceipt.isSuccess && action === "publish" && (
            <div className="flex gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4 shrink-0" /> USDC approved. Confirm the second transaction to fund the escrow.
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !isConnected || amountRaw <= 0n}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
            {busy ? "Waiting for confirmation…" : buttonLabel}
          </button>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span>79 unit tests + 4 invariant tests · Slither checked · Not independently audited</span>
            <a
              href={`https://celoscan.io/address/${deployment.core}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              Verify contract <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}
