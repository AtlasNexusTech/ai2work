"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Coins, ExternalLink, GitPullRequest, Loader2, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BountyStatus = "open" | "resolved" | "cancelled" | "expired";
type TokenFilter = "cusd" | "celo" | "usdc";
type StatusFilter = "open" | "resolved";
type FilterValue = "all" | TokenFilter | StatusFilter;

type ApiBounty = {
  id?: string | number;
  title?: string;
  description?: string;
  targetRepoUrl?: string;
  instructionUrl?: string;
  repo?: string;
  token?: string;
  tokenSymbol?: string;
  amount?: string | number;
  deadline?: string | number;
  status?: string | number;
  claimedSlots?: number;
  maxSlots?: number;
  ciRequired?: boolean;
  source?: "onchain" | "github";
};

type GhBounty = {
  id: string;
  title: string;
  repo: string;
  url: string;
  labels: string[];
  estimatedReward: string;
  bountyLabel: string | null;
  createdAt: string;
  author: string;
  avatar: string;
  body: string;
  commentsCount: number;
  source: "github";
};

type BountiesResponse = {
  items?: ApiBounty[];
  nextCursor?: string | null;
  total?: number;
};

type GhResponse = {
  items?: GhBounty[];
  total?: number;
  hasMore?: boolean;
};

const FILTERS: Array<{ label: string; value: FilterValue }> = [
  { label: "All", value: "all" },
  { label: "CELO", value: "celo" },
  { label: "USDC", value: "usdc" },
  { label: "Open", value: "open" },
  { label: "Resolved", value: "resolved" },
];

const TOKEN_STYLES: Record<string, string> = {
  cusd: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  celo: "bg-amber-400/15 text-amber-800 ring-amber-400/30 dark:text-amber-200",
  usdc: "bg-sky-500/12 text-sky-700 ring-sky-500/25 dark:text-sky-300",
  github: "bg-blue-500/12 text-blue-700 ring-blue-500/25 dark:text-blue-300",
};

const BLACKLIST = ["orchestration-agent"];

function isBlacklisted(bounty: ApiBounty): boolean {
  const haystack = [
    bounty.title,
    bounty.description,
    bounty.repo,
    bounty.targetRepoUrl,
    bounty.instructionUrl,
    (bounty as any).author,
    (bounty as any).url,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return BLACKLIST.some((term) => haystack.includes(term.toLowerCase()));
}

export function BountiesFeed() {
  const [activeFilter, setActiveFilter] = React.useState<FilterValue>("all");
  const [items, setItems] = React.useState<ApiBounty[]>([]);
  const [ghItems, setGhItems] = React.useState<ApiBounty[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [total, setTotal] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingGh, setIsLoadingGh] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const requestIdRef = React.useRef(0);

  // ---- On-chain bounties ----
  const loadPage = React.useCallback(
    async (cursor?: string | null, mode: "replace" | "append" = "replace") => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ limit: "12" });
      if (cursor) params.set("cursor", cursor);
      if (isTokenFilter(activeFilter)) params.set("token", activeFilter);
      if (isStatusFilter(activeFilter)) params.set("status", activeFilter);

      try {
        const response = await fetch(`/api/bounties?${params.toString()}`, {
          headers: { accept: "application/json" },
        });

        if (!response.ok) throw new Error(`Request failed with ${response.status}`);

        const data = (await response.json()) as BountiesResponse;
        if (requestId !== requestIdRef.current) return;

        setItems((current) =>
          mode === "append" ? [...current, ...(data.items ?? [])] : data.items ?? [],
        );
        setNextCursor(data.nextCursor ?? null);
        setTotal(typeof data.total === "number" ? data.total : null);
      } catch {
        if (requestId !== requestIdRef.current) return;
        if (mode === "replace") setItems([]);
        setNextCursor(null);
        setError("AI.JOBS bounties are not available yet. Try again in a moment.");
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    [activeFilter],
  );

  // ---- GitHub bounties (always shown, unfiltered) ----
  const loadGitHub = React.useCallback(async () => {
    setIsLoadingGh(true);
    try {
      const res = await fetch("/api/demo/github-bounties?limit=6");
      const data: GhResponse = await res.json();
      if (data.items) {
        setGhItems(
          data.items.map((gh) => ({
            id: gh.id,
            title: gh.title,
            repo: gh.repo,
            description: gh.body || "",
            url: gh.url,
            token: gh.estimatedReward,
            tokenSymbol: "github",
            amount: 0,
            deadline: gh.createdAt,
            status: "open",
            source: "github" as const,
            instructionUrl: gh.url,
            commentsCount: gh.commentsCount,
            claimedSlots: 0,
            maxSlots: 1,
            author: gh.author,
            avatar: gh.avatar,
          })),
        );
      }
    } catch {
      // GitHub bounties are bonus content — fail silently
    } finally {
      setIsLoadingGh(false);
    }
  }, []);

  React.useEffect(() => {
    void loadPage(null, "replace");
    void loadGitHub();
  }, [loadPage, loadGitHub]);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry?.isIntersecting && nextCursor && !isLoading) {
        void loadPage(nextCursor, "append");
      }
    }, { rootMargin: "360px" });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading, loadPage, nextCursor]);

  // Merge on-chain + GitHub, sort open → resolved, then apply blacklist
  const allItems = [...ghItems, ...items]
    .sort((a, b) => {
      const sa = normalizeStatus(a.status);
      const sb = normalizeStatus(b.status);
      if (sa === "open" && sb !== "open") return -1;
      if (sa !== "open" && sb === "open") return 1;
      return 0; // preserve existing order within same status
    })
    .filter((b) => !isBlacklisted(b));

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-24 pt-10 sm:pt-14">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Open marketplace</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            Browse bounties
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Filter live escrowed work by token and status. GitHub bounties are
            fresh issues (&lt;24h) from across open-source.
          </p>
        </div>
        <Button asChild>
          <Link href="/post">
            Post a bounty
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Bounty filters">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setActiveFilter(filter.value)}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition",
              activeFilter === filter.value
                ? "border-primary bg-primary text-primary-foreground shadow-glow"
                : "border-border bg-card/70 text-muted-foreground hover:text-foreground",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? <EmptyState message={error} /> : null}

      {!error && allItems.length === 0 && !isLoading && !isLoadingGh ? (
        <EmptyState message="No matching bounties yet." />
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allItems.map((bounty, index) => (
          <BountyFeedCard key={String(bounty.id ?? index)} bounty={bounty} />
        ))}
      </div>

      <div ref={sentinelRef} className="flex min-h-16 items-center justify-center">
        {isLoading ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading bounties
          </span>
        ) : null}
        {!isLoading && items.length > 0 && !nextCursor ? (
          <span className="text-sm text-muted-foreground">
            {total === null ? "End of feed" : `${items.length} of ${total} on-chain bounties loaded`}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function BountyFeedCard({ bounty }: { bounty: ApiBounty }) {
  const isGitHub = bounty.source === "github";

  if (isGitHub) {
    return <GitHubBountyCard bounty={bounty} />;
  }

  const token = normalizeToken(bounty);
  const status = normalizeStatus(bounty.status);
  const deadline = formatDeadline(bounty.deadline);
  const amount = formatAmount(bounty.amount);
  const title = bounty.title ?? deriveTitle(bounty);
  const description = bounty.description ?? bounty.instructionUrl ?? "Review the linked issue for full acceptance criteria.";
  const href = bounty.instructionUrl || bounty.targetRepoUrl || `/bounty/${bounty.id ?? ""}`;

  return (
    <article className="group flex min-h-48 flex-col rounded-2xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur transition motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-glass">
      <div className="flex items-start justify-between gap-3">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", TOKEN_STYLES[token.toLowerCase()] ?? "bg-muted text-muted-foreground ring-border")}>
          <Coins className="h-3.5 w-3.5" />
          {token}
        </span>
        <span className={cn(
          "rounded-full px-2.5 py-1 text-xs font-medium",
          status === "resolved" ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300" : "bg-primary/10 text-primary",
        )}>
          {capitalize(status)}
        </span>
      </div>

      <h2 className="mt-4 line-clamp-1 text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      <div className="mt-5 grid gap-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Coins className="h-4 w-4 text-foreground" />
          {amount} {token}
        </span>
        <span className="inline-flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-foreground" />
          {deadline}
        </span>
        <span className="inline-flex items-center gap-2">
          <GitPullRequest className="h-4 w-4 text-foreground" />
          {(bounty.claimedSlots ?? 0).toString()} / {(bounty.maxSlots ?? 1).toString()} slots claimed
        </span>
      </div>

      <Link
        href={href}
        className="mt-auto inline-flex min-h-11 items-center justify-between gap-2 pt-5 text-sm font-medium text-primary"
      >
        View bounty
        <ExternalLink className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </Link>
    </article>
  );
}

function GitHubBountyCard({ bounty }: { bounty: ApiBounty }) {
  const reward = bounty.token ?? "TBD";
  const createdAt = bounty.deadline ? new Date(bounty.deadline) : null;
  const timeAgo = createdAt ? timeSince(createdAt) : "";
  const repo = (bounty as any).repo ?? "";
  const author = (bounty as any).author ?? "";
  const avatar = (bounty as any).avatar ?? "";
  const url = (bounty as any).url ?? (bounty as any).instructionUrl ?? "#";
  const commentsCount = (bounty as any).commentsCount ?? 0;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group flex min-h-48 flex-col rounded-2xl border border-blue-500/20 bg-card/80 p-5 shadow-sm backdrop-blur transition motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-glass"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", TOKEN_STYLES.github)}>
          🐙 GitHub
        </span>
        {reward !== "TBD" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
            <Coins className="h-3 w-3" />
            {reward}
          </span>
        ) : null}
      </div>

      {repo && (
        <p className="mt-2 text-xs font-medium text-blue-500 dark:text-blue-400">
          {repo}
        </p>
      )}

      <h2 className="mt-1 line-clamp-1 text-lg font-semibold tracking-tight group-hover:text-blue-500 transition-colors">
        {bounty.title ?? "Untitled"}
      </h2>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {bounty.description ?? ""}
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          {avatar && (
            <img src={avatar} alt="" className="h-4 w-4 rounded-full" width={16} height={16} />
          )}
          {author}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="h-3 w-3" />
          {timeAgo}
        </span>
        {commentsCount > 0 && (
          <span className="inline-flex items-center gap-1 text-blue-500 dark:text-blue-400">
            <MessageSquare className="h-3 w-3" />
            {commentsCount}
          </span>
        )}
        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/70 p-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button asChild variant="secondary" className="mt-4">
        <Link href="/post">Post a bounty</Link>
      </Button>
    </div>
  );
}

function isTokenFilter(value: FilterValue): value is TokenFilter {
  return value === "cusd" || value === "celo" || value === "usdc";
}

function isStatusFilter(value: FilterValue): value is StatusFilter {
  return value === "open" || value === "resolved";
}

function normalizeToken(bounty: ApiBounty) {
  const symbol = bounty.tokenSymbol ?? bounty.token ?? "USDC";
  const normalized = symbol.toString().replace(/^0x[a-f0-9]+$/i, "USDC").toLowerCase();
  if (normalized === "usdc" || normalized === "cusd") return "USDC";
  if (normalized === "celo") return "CELO";
  return symbol.toString();
}

function normalizeStatus(status: ApiBounty["status"]): BountyStatus {
  if (status === 1 || String(status).toLowerCase() === "resolved") return "resolved";
  if (status === 2 || String(status).toLowerCase() === "cancelled") return "cancelled";
  if (status === 3 || String(status).toLowerCase() === "expired") return "expired";
  return "open";
}

function formatAmount(amount: ApiBounty["amount"]) {
  if (amount === undefined || amount === null || amount === "") return "0";
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return String(amount);
  if (numeric > 1_000_000) return (numeric / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDeadline(deadline: ApiBounty["deadline"]) {
  if (!deadline) return "No deadline";
  const numeric = Number(deadline);
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric)
    : new Date(deadline);
  if (Number.isNaN(date.getTime())) return "No deadline";

  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / 86_400_000);
  if (diffDays <= 0) return "Deadline reached";
  if (diffDays === 1) return "1 day left";
  return `${diffDays} days left`;
}

function deriveTitle(bounty: ApiBounty) {
  if (bounty.repo) return bounty.repo;
  if (bounty.targetRepoUrl) {
    return bounty.targetRepoUrl.replace(/^https?:\/\/github\.com\//, "");
  }
  return `Bounty ${bounty.id ?? ""}`.trim();
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function timeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
