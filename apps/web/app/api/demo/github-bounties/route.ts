import { type NextRequest, NextResponse } from "next/server";

// Searches ALL GitHub issues labeled "bounty" created in the last 24 hours

interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
  state: string;
  labels: Array<{ name: string; color?: string }>;
  repository_url: string;
  created_at: string;
  updated_at: string;
  body?: string;
  comments: number;
  user: { login: string; avatar_url: string };
}

export interface DemoBounty {
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
}

function buildDateQuery(): string {
  // GitHub search uses YYYY-MM-DD format
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const y = yesterday.getFullYear();
  const m = String(yesterday.getMonth() + 1).padStart(2, "0");
  const d = String(yesterday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function searchGitHubIssues(
  page = 1,
): Promise<{ items: GitHubIssue[]; total_count: number }> {
  const since = buildDateQuery();
  const query = `is:issue is:open label:bounty created:>=${since}`;

  const url = new URL("https://api.github.com/search/issues");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "created");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", "12");
  url.searchParams.set("page", String(page));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "AI.JOBS/1.0",
    },
    next: { revalidate: 120 },
  });

  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json() as Promise<{ items: GitHubIssue[]; total_count: number }>;
}

function extractRewardHint(body: string | undefined, labels: string[]): string {
  if (!body) return "TBD";
  const rewardRegex =
    /(?:bounty|reward|prize|payout|💰)\s*:?\s*\$?(\d[\d,.]*)\s*(USDC|USD|ETH|CELO)?/i;
  const match = body.match(rewardRegex);
  if (match && match[1]) {
    const amount = match[1].replace(/,/g, "");
    const token = match[2]?.toUpperCase() || "";
    return `${amount} ${token}`.trim();
  }
  for (const label of labels) {
    const labelMatch = label.match(/\$(\d+)|(\d+)\s*(USDC|USD|ETH|CELO)/i);
    if (labelMatch) return labelMatch[0];
  }
  return "TBD";
}

function mapToDemoBounty(issue: GitHubIssue): DemoBounty {
  const repoName = issue.repository_url.replace(
    "https://api.github.com/repos/",
    "",
  );
  return {
    id: `gh-${repoName.replace("/", "-")}-${issue.number}`,
    title: issue.title,
    repo: repoName,
    url: issue.html_url,
    labels: issue.labels.map((l) => l.name),
    estimatedReward: extractRewardHint(issue.body, issue.labels.map((l) => l.name)),
    bountyLabel: "bounty",
    createdAt: issue.created_at,
    author: issue.user.login,
    avatar: issue.user.avatar_url,
    body: issue.body ?? "",
    commentsCount: issue.comments ?? 0,
    source: "github",
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  try {
    const data = await searchGitHubIssues(page);
    const BLACKLISTED_REPOS = ["SecureBananaLabs/bug-bounty"];
    const bounties = data.items
      .filter((issue) => {
        const repo = issue.repository_url.replace("https://api.github.com/repos/", "");
        if (issue.user.login.toLowerCase() === "securebanana") return false;
        if (BLACKLISTED_REPOS.includes(repo)) return false;
        return true;
      })
      .map(mapToDemoBounty);

    return NextResponse.json({
      items: bounties,
      total: data.total_count,
      page,
      hasMore: bounties.length === 12,
    });
  } catch (error) {
    console.error("GitHub bounty search error:", error);
    return NextResponse.json(
      { error: "GitHub API rate limit reached. Try again soon." },
      { status: 502 },
    );
  }
}
