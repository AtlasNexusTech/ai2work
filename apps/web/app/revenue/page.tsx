import { Suspense } from "react";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { RevenueCard } from "@/components/revenue-card";
import { TreasuryFeed } from "@/components/treasury-feed";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Treasury & Revenue",
  description:
    "Live on-chain revenue accrued at the AI.JOBS treasury. Every resolved bounty contributes a 2% protocol fee.",
};

// The revenue widgets read live Celo RPC data. Keep this page dynamic so
// transient RPC outages do not fail the production build during prerendering.
export const dynamic = "force-dynamic";

export default function RevenuePage() {
  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-anime opacity-40 dark:opacity-30"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 grid-pattern opacity-30 dark:opacity-20"
      />

      <Header />

      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-gradient sm:text-5xl">
          Treasury &amp; Revenue
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          Every resolved bounty contributes a 2% protocol fee to the
          treasury. All revenue is on-chain and verifiable via Celoscan.
        </p>

        <Suspense
          fallback={
            <div className="glass mt-10 h-44 animate-pulse rounded-3xl" />
          }
        >
          <RevenueCard />
        </Suspense>

        <Suspense
          fallback={
            <div className="glass mt-6 h-48 animate-pulse rounded-3xl" />
          }
        >
          <TreasuryFeed />
        </Suspense>
      </section>

      <Footer />
    </main>
  );
}
