"use client";

import { useChain } from "@/lib/chain/context";
import { ChainNetwork } from "@/lib/chain/types";
import { CHAIN_META } from "@/lib/chain";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

// Ordered in logical grouping: EVM chains first, then Solana
const CHAIN_ORDER: ChainNetwork[] = [
  ChainNetwork.CELO,
  ChainNetwork.BASE,
  ChainNetwork.POLYGON,
  ChainNetwork.SOLANA,
];

// Map ChainNetwork to chainId for CHAIN_META lookup
const NETWORK_TO_CHAIN_ID: Record<ChainNetwork, number> = {
  [ChainNetwork.CELO]: 42220,
  [ChainNetwork.BASE]: 8453,
  [ChainNetwork.POLYGON]: 137,
  [ChainNetwork.SOLANA]: -1,
};

const SOLANA_META = {
  name: "Solana",
  color: "bg-gradient-to-r from-blue-500 to-emerald-400",
  textColor: "text-blue-400",
  borderColor: "border-blue-500/30",
  hoverColor: "hover:bg-blue-500/10",
  status: "live" as const,
};

function getChainStyle(network: ChainNetwork) {
  if (network === ChainNetwork.SOLANA) return SOLANA_META;
  const chainId = NETWORK_TO_CHAIN_ID[network];
  return CHAIN_META[chainId] ?? SOLANA_META;
}

export function NetworkSwitcher() {
  const { chain, switchChain, isSwitching } = useChain();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = getChainStyle(chain);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isSwitching}
        className={`inline-flex items-center gap-1.5 rounded-full border ${current.borderColor} px-3 py-1.5 text-xs font-medium ${current.textColor} transition ${current.hoverColor} disabled:opacity-50`}
      >
        <span
          className={`h-2 w-2 rounded-full bg-current ${isSwitching ? "animate-pulse" : ""}`}
        />
        <span className="hidden sm:inline">{current.name}</span>
        <ChevronDown
          className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-card p-1 shadow-lg">
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Switch Network
          </div>
          <div className="border-t border-border pt-1">
            <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground/60">
              EVM Chains
            </div>
            {CHAIN_ORDER.filter((n) => n !== ChainNetwork.SOLANA).map(
              (network) => {
                const style = getChainStyle(network);
                const isActive = chain === network;
                return (
                  <button
                    key={network}
                    onClick={() => {
                      switchChain(network);
                      setOpen(false);
                    }}
                    disabled={isSwitching || isActive}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs transition disabled:opacity-40 ${style.hoverColor}`}
                  >
                    <span className={`h-2 w-2 rounded-full bg-current`} />
                    <span className="flex-1 text-left">{style.name}</span>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                    {!isActive && (
                      <span className="text-[10px] text-muted-foreground">
                        {style.status === "live" ? "Live" : "Soon"}
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </div>
          <div className="border-t border-border pt-1 mt-1">
            <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground/60">
              Non-EVM
            </div>
            {CHAIN_ORDER.filter((n) => n === ChainNetwork.SOLANA).map(
              (network) => {
                const style = getChainStyle(network);
                const isActive = chain === network;
                return (
                  <button
                    key={network}
                    onClick={() => {
                      switchChain(network);
                      setOpen(false);
                    }}
                    disabled={isSwitching || isActive}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs transition disabled:opacity-40 ${style.hoverColor}`}
                  >
                    <span className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" />
                    <span className="flex-1 text-left">{style.name}</span>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                    {!isActive && (
                      <span className="text-[10px] text-muted-foreground">
                        Soon
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
}
