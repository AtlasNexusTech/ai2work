import { ShieldCheck } from "lucide-react";

export async function HeroRevenue() {
  return (
    <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
      <ShieldCheck className="h-4 w-4" />
      83 unit tests · Slither checked · Not independently audited
    </div>
  );
}
