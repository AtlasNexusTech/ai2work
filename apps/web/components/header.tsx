"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { useConnect } from "wagmi";
import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

import { ThemeToggle } from "@/components/theme-toggle";
import { NetworkSwitcher } from "@/components/network-switcher";
import { ConnectWallet } from "@/components/connect-wallet";
import { ProfileAvatar } from "@/components/profile-avatar";
import { useMiniPayDetection } from "@/lib/minipay";

export function Header() {
  const isMiniPay = useMiniPayDetection();
  const { connect, connectors } = useConnect();
  const attemptedRef = useRef(false);
  const headerRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const headerY = useTransform(scrollY, [0, 100], [0, -4]);
  const opacity = useTransform(scrollY, [0, 80], [1, 0.95]);
  const scale = useTransform(scrollY, [0, 80], [1, 0.985]);

  // Auto-connect only if injected wallet is detected
  useEffect(() => {
    if (attemptedRef.current || typeof window === "undefined") return;
    if (!window.ethereum) return;

    const injectedConnector = connectors.find((c) => c.id === "injected");
    if (!injectedConnector) return;

    attemptedRef.current = true;
    connect({ connector: injectedConnector });
  }, [connect, connectors]);

  return (
    <motion.header
      ref={headerRef}
      className="sticky top-4 z-40 mx-auto w-full max-w-6xl px-4"
      style={{ y: headerY, opacity, scale }}
    >
      <nav className="glass flex h-14 items-center justify-between rounded-full px-4 sm:h-16 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <motion.img
            src="/logo.png"
            alt="AI.JOBS"
            className="h-8 w-8 rounded-lg"
            whileHover={{ rotate: 8, scale: 1.08 }}
            transition={{ type: "spring", stiffness: 400, damping: 12 }}
          />
          <span className="hidden text-sm font-semibold tracking-tight sm:inline-flex items-center">
            AI.JOBS
          </span>
          <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 items-center gap-1">
            <FlaskConical className="h-3 w-3" />
            Live Beta
          </span>
        </Link>

        <ul className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
          {[
            { label: "Find work", href: "/bounties" },
            { label: "Fund an issue", href: "/post" },
            { label: "Stats", href: "/stats" },
            { label: "Install app", href: "/install" },
          ].map(({ label, href }) => (
            <li key={href}>
              <Link
                href={href}
                className="relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NetworkSwitcher />
          {!isMiniPay && <ConnectWallet />}
          <ProfileAvatar />
        </div>
      </nav>
    </motion.header>
  );
}
