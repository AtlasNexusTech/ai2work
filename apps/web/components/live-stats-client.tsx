"use client";

import { Hammer, Users, Wallet } from "lucide-react";
import { motion } from "framer-motion";

import { GlassCard } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/animated-section";

type StatsSnapshot = {
  totalBountiesResolved: number;
  uniqueWorkerCount: number;
  uniquePosterCount: number;
  totalBountyVolume: string;
  feeBps: string;
  fetchedAt: string;
  volumeToken: string;
};

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 36, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export function LiveStatsClient({
  snapshot,
  error,
}: {
  snapshot: StatsSnapshot | null;
  error: string | null;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-16">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Marketplace pulse
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            Receipts, not promises.
          </h2>
        </div>
      </div>

      {error ? (
        <GlassCard className="!p-6 text-center text-sm text-muted-foreground" role="status">
          {error}
        </GlassCard>
      ) : snapshot ? (
        <motion.div
          className="grid gap-4 sm:grid-cols-3"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px 0px", amount: 0.15 }}
        >
          <motion.div variants={cardVariant}>
            <Stat
              icon={<Hammer className="h-5 w-5" />}
              label="Bounties resolved"
              value={snapshot.totalBountiesResolved.toString()}
              accent="primary"
            />
          </motion.div>
          <motion.div variants={cardVariant}>
            <Stat
              icon={<Users className="h-5 w-5" />}
              label="Unique workers"
              value={snapshot.uniqueWorkerCount.toString()}
              accent="accent"
              sub={`${snapshot.uniquePosterCount} posters`}
            />
          </motion.div>
          <motion.div variants={cardVariant}>
            <Stat
              icon={<Wallet className="h-5 w-5" />}
              label={`Total volume (${snapshot.volumeToken})`}
              value={`${snapshot.totalBountyVolume} ${snapshot.volumeToken}`}
              accent="emerald"
              sub={`${(Number(snapshot.feeBps) / 100).toFixed(2)}% protocol fee`}
            />
          </motion.div>
        </motion.div>
      ) : null}
      {snapshot ? (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Last synchronized: {new Date(snapshot.fetchedAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC
        </p>
      ) : null}
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: "primary" | "accent" | "emerald";
}) {
  const iconBg: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent text-accent-foreground",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <GlassCard className="!p-6 hover:shadow-glass-strong transition-shadow">
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${iconBg[accent]}`}
      >
        {icon}
      </span>
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <AnimatedCounter
        value={value}
        className="mt-1 font-display text-3xl font-semibold tracking-tight"
      />
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </GlassCard>
  );
}
