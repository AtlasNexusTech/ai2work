"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CodeCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-slate-950 text-slate-100">
      <pre className="overflow-x-auto p-4 pr-12 text-xs leading-6"><code>{code}</code></pre>
      <button onClick={copy} aria-label="Copy command" className="absolute right-3 top-3 rounded-lg border border-white/10 bg-white/10 p-2 text-slate-300 transition hover:bg-white/20 hover:text-white">
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
