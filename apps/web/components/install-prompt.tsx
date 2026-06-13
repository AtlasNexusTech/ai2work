"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isMobileInstallSurface() {
  if (typeof window === "undefined") return false;

  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const isNarrowViewport = window.matchMedia("(max-width: 768px)").matches;
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUserAgent = /android|iphone|ipad|ipod|mobile/.test(userAgent);

  return (hasCoarsePointer && isNarrowViewport) || isMobileUserAgent;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isMobileSurface, setIsMobileSurface] = useState(false);

  const handleBeforeInstall = useCallback((e: Event) => {
    if (!isMobileInstallSurface()) {
      setDeferredPrompt(null);
      return;
    }

    e.preventDefault();
    setDeferredPrompt(e as BeforeInstallPromptEvent);
  }, []);

  useEffect(() => {
    const updateSurface = () => setIsMobileSurface(isMobileInstallSurface());

    updateSurface();
    window.addEventListener("resize", updateSurface);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("resize", updateSurface);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [handleBeforeInstall]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDeferredPrompt(null);
    setDismissed(true);
  };

  if (!isMobileSurface || !deferredPrompt || dismissed) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-sm rounded-2xl border border-border bg-card p-4 shadow-glass-strong backdrop-blur-xl md:bottom-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install AI2Work</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add to your home screen. Earn USDC on the go.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition"
            >
              Install
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground transition"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
