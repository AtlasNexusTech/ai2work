"use client";

import { useState, useEffect, useCallback } from "react";
import { Smartphone, Monitor, Download, QrCode, ExternalLink } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const APP_URL = "https://aijobs.atlasnexus.tech";
const APK_URL = "https://github.com/AtlasNexusTech/aijobs/releases/latest/download/aijobs.apk";
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(APK_URL)}`;

function useDeviceDetect() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => {
      const mobile =
        /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 0 && window.innerWidth < 768);
      setIsMobile(mobile);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return { isMobile, mounted };
}

export default function InstallPage() {
  const { isMobile, mounted } = useDeviceDetect();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  const handleBeforeInstall = useCallback((e: Event) => {
    e.preventDefault();
    setDeferredPrompt(e as BeforeInstallPromptEvent);
  }, []);

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, [handleBeforeInstall]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setInstalled(true);
    }
  };

  if (!mounted) {
    return (
      <main className="relative isolate min-h-dvh overflow-hidden">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-anime opacity-40 dark:opacity-30" />
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 grid-pattern opacity-30 dark:opacity-20" />
        <Header />
        <section className="mx-auto w-full max-w-2xl px-4 py-16">
          <div className="glass h-64 animate-pulse rounded-2xl" />
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-anime opacity-40 dark:opacity-30" />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 grid-pattern opacity-30 dark:opacity-20" />
      <Header />

      <section className="mx-auto w-full max-w-2xl px-4 py-12 text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-gradient sm:text-4xl">
          Install AI.JOBS
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {isMobile
            ? "Add AI.JOBS to your home screen — one tap, instant access."
            : "Scan the QR code with your phone to install AI.JOBS."}
        </p>

        {isMobile ? (
          /* ── Mobile: Install PWA ── */
          <div className="mt-8">
            {installed ? (
              <div className="glass rounded-3xl p-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                  <Smartphone className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="mt-4 text-xl font-semibold">Installed!</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  AI.JOBS is now on your home screen. Launch it anytime.
                </p>
              </div>
            ) : deferredPrompt ? (
              /* Native PWA install available */
              <div className="glass rounded-3xl p-8">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 shadow-glow">
                  <Download className="h-10 w-10 text-primary" />
                </div>
                <h2 className="mt-4 text-xl font-semibold">One tap to install</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  AI.JOBS works offline, loads instantly, and lives on your home screen.
                </p>
                <button
                  onClick={handleInstall}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  Install App
                </button>
              </div>
            ) : (
              /* Manual install instructions for mobile */
              <div className="glass mt-8 rounded-3xl p-6 text-left">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Smartphone className="h-5 w-5 text-primary" />
                  Add to Home Screen
                </h2>
                <ol className="mt-4 space-y-4">
                  <li className="flex gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                    <span>Open <strong>Chrome</strong> or <strong>Safari</strong> on your phone</span>
                  </li>
                  <li className="flex gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                    <span>
                      Chrome: tap <strong>⋮ → Add to Home Screen</strong><br />
                      Safari: tap <strong>Share → Add to Home Screen</strong>
                    </span>
                  </li>
                  <li className="flex gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
                    <span>Tap the AI.JOBS icon — you're in!</span>
                  </li>
                </ol>
              </div>
            )}
          </div>
        ) : (
          /* ── Desktop: QR Code ── */
          <div className="mt-8">
            <div className="glass mx-auto max-w-sm rounded-3xl p-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <QrCode className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Scan to install the app</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Point your phone camera at the QR code to download the AI.JOBS APK.
              </p>

              <div className="mt-6 flex justify-center">
                <div className="rounded-2xl border-2 border-border bg-white p-3">
                  <img
                    src={QR_URL}
                    alt="QR code to install AI.JOBS"
                    width={220}
                    height={220}
                    className="h-[220px] w-[220px]"
                  />
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Then follow the install prompt on your phone to add it to your home screen.
              </p>

              <a
                href={APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Open AI.JOBS in browser
              </a>
            </div>
          </div>
        )}

        {/* MetaMask mobile tip */}
        <div className="glass mx-auto mt-6 max-w-sm rounded-2xl p-5 text-left">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            🦊 Also works in MetaMask
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Open MetaMask mobile → Browser → go to{" "}
            <code className="rounded bg-muted px-1 text-[11px]">aijobs.atlasnexus.tech</code>
            {" "}→ Connect wallet.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
