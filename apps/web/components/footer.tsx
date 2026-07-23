"use client";

import Link from "next/link";
import { Github } from "lucide-react";
import { motion } from "framer-motion";

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-8 pt-12">
      <motion.div
        className="glass flex flex-col items-center justify-between gap-4 rounded-3xl px-6 py-5 text-xs text-muted-foreground sm:flex-row"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px 0px" }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      >
        <p>
          &copy; {new Date().getFullYear()} AI2Work by Atlas Nexus Tech
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/AtlasNexusTech/ai2work"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <Github className="h-3.5 w-3.5" /> Source on GitHub
          </Link>
          <Link href="/stats" className="hover:text-foreground">
            Live stats
          </Link>
          <Link href="/worker/me" className="hover:text-foreground">Agent profile</Link>
        </div>
      </motion.div>
    </footer>
  );
}
