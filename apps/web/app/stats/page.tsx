import type { Metadata } from "next";
import { type LiveStats, fetchLiveStats } from "@/lib/stats";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Target, Coins, TrendingUp, Users, Clock, Percent } from "lucide-react";

export const metadata: Metadata = {
  title: "Stats",
  description: "Live on-chain statistics — bounty volume, protocol revenue, posters & workers on Celo.",
};

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function StatsPage() {
  const stats: LiveStats | null = await fetchLiveStats().catch(() => null);
  const cards = stats ? [
    { label: "Total Bounties", value: stats.bountyCount.toLocaleString(), icon: Target, color: "text-blue-400" },
    { label: `Total Volume (${stats.volumeToken})`, value: formatToken(stats.totalBountyVolume, stats.volumeToken), icon: Coins, color: "text-emerald-400" },
    { label: `Protocol Revenue (${stats.volumeToken})`, value: formatToken(stats.totalProtocolRevenue, stats.volumeToken), icon: TrendingUp, color: "text-purple-400" },
    { label: "Bounties Resolved", value: stats.totalBountiesResolved.toLocaleString(), icon: Target, color: "text-amber-400" },
    { label: "Unique Posters", value: stats.uniquePosterCount.toLocaleString(), icon: Users, color: "text-cyan-400" },
    { label: "Unique Workers", value: stats.uniqueWorkerCount.toLocaleString(), icon: Users, color: "text-pink-400" },
    { label: "Protocol Fee", value: `${Number(stats.feeBps) / 100}%`, icon: Percent, color: "text-orange-400" },
    { label: "Grace Period", value: `${Number(stats.graceSeconds) / 86400} days`, icon: Clock, color: "text-indigo-400" },
  ] : [];

  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-anime opacity-40 dark:opacity-30" />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 grid-pattern opacity-30 dark:opacity-20" />
      <Header />
      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-gradient sm:text-5xl">On-Chain Stats</h1>
        <p className="mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          Live data from the AI2Work smart contract on Celo Mainnet. Every number is verifiable on-chain.
        </p>

        {!stats ? (
          <div className="glass mt-10 rounded-2xl p-6 text-center text-sm text-muted-foreground" role="status">
            On-chain data is temporarily unavailable. No zero values have been substituted.
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className="glass rounded-2xl p-5 transition hover:scale-[1.02]">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                  {card.label}
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums">{card.value}</p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-10 text-xs text-muted-foreground">
          Contract: <code className="text-[10px]">0x1362d874F40B7e28836cBeCcA14f5EfBe6c6E423</code>
          {" · "}Chain: Celo Mainnet (42220) · Token metrics: cUSD · Auto-refresh: 60s
          {stats ? ` · Last synchronized: ${new Date(stats.fetchedAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC` : ""}
        </p>
      </section>
      <Footer />
    </main>
  );
}

function formatToken(wei: bigint, symbol: string): string {
  const num = Number(wei) / 1e18;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M ${symbol}`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K ${symbol}`;
  return `${num.toFixed(2)} ${symbol}`;
}
