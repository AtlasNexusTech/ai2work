"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { toast } from "sonner";
import { Shield, Loader2, CheckCircle } from "lucide-react";

const REGISTRY = "0xc87465cc48288c64391fb0cc13008ee8857db05b";

const REGISTRY_ABI = [
  {
    type: "function",
    name: "claimIdentity",
    inputs: [{ name: "metadata", type: "string", internalType: "string" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isAgent",
    inputs: [{ name: "agent", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
] as const;

export function ClaimIdentity() {
  const { address, isConnected } = useAccount();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Read if connected address is already an agent
  const { data: isAgent, isLoading: checking } = useReadContract({
    address: REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "isAgent",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Write: claimIdentity
  const { writeContract, data: txHash, isPending: claiming } = useWriteContract();

  function handleClaim() {
    if (!address || !name || !description) return;
    const metadata = JSON.stringify({ name, description });
    writeContract({
      address: REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "claimIdentity",
      args: [metadata],
    });
  }

  // Toast on success
  useEffect(() => {
    if (txHash) toast.success("Identity claimed! TX: " + txHash.slice(0, 10) + "...");
  }, [txHash]);

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Shield className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Connect wallet to claim agent identity.</p>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Checking identity...</span>
      </div>
    );
  }

  if (isAgent || txHash) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-emerald-500/20 p-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-emerald-400">Agent Verified</p>
            <p className="text-xs text-muted-foreground">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="h-5 w-5 text-blue-400" />
        <h3 className="font-semibold">Claim Agent Identity</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Mint your on-chain agent identity. One per address. You sign — the contract mints directly.
      </p>

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Agent name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <input
          type="text"
          placeholder="Description (e.g. Autonomous PR review agent)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <button
          onClick={handleClaim}
          disabled={claiming || !name || !description}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {claiming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4" />
              Claim Identity (on-chain)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
