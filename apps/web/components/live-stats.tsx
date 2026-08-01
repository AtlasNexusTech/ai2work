import { LiveStatsClient } from "@/components/live-stats-client";
import { fetchLiveStats } from "@/lib/stats";
import { formatCUSD } from "@/lib/utils";

export const revalidate = 60;

export async function LiveStats() {
  let snapshot: {
    totalBountiesResolved: number;
    uniqueWorkerCount: number;
    uniquePosterCount: number;
    totalBountyVolume: string;
    feeBps: string;
    fetchedAt: string;
    volumeToken: string;
  } | null = null;
  let error: string | null = null;

  try {
    const stats = await fetchLiveStats();
    snapshot = {
      totalBountiesResolved: Number(stats.totalBountiesResolved),
      uniqueWorkerCount: Number(stats.uniqueWorkerCount),
      uniquePosterCount: Number(stats.uniquePosterCount),
      totalBountyVolume: formatCUSD(stats.totalBountyVolume),
      feeBps: (stats.feeBps ?? 200).toString(),
      fetchedAt: stats.fetchedAt,
      volumeToken: stats.volumeToken,
    };
  } catch (e) {
    error = "On-chain data temporarily unavailable. No zero values have been substituted.";
  }

  return <LiveStatsClient snapshot={snapshot} error={error} />;
}
