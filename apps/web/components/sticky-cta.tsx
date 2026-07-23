"use client";

import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function StickyCTA() {
  const pathname = usePathname();
  const show = pathname === "/";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-x-0 bottom-[4.5rem] z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl md:hidden"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
        >
          <div className="mx-auto flex max-w-md items-center gap-3">
            <Link
              href="/post"
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)] active:scale-[0.98] transition-transform"
            >
              <PenLine className="h-4 w-4" />
              Fund an issue
            </Link>
            <Link
              href="/bounties"
              className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground active:scale-[0.98] transition-transform"
            >
              Find work
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
