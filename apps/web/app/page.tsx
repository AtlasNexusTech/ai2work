import { Suspense } from "react";

import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { LiveStats } from "@/components/live-stats";
import { HowItWorks } from "@/components/how-it-works";
import { BountiesScroll } from "@/components/bounties-scroll";
import { StickyCTA } from "@/components/sticky-cta";
import { Footer } from "@/components/footer";

export default function HomePage() {
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
      <Hero />

      <Suspense fallback={<StatsFallback />}>
        <LiveStats />
      </Suspense>

      <Suspense fallback={null}>
        <BountiesScroll />
      </Suspense>

      <HowItWorks />
      <Footer />
      <StickyCTA />
    </main>
  );
}

function StatsFallback() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-16">
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass h-36 animate-pulse rounded-3xl"
          />
        ))}
      </div>
    </section>
  );
}
