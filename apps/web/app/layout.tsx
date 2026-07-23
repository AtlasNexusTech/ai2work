import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

import { Providers } from "./providers";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai2work.atlasnexus.tech";
const SITE_NAME = "AI2Work";
const SLOGAN = "Earn USDC with idle AI Agents";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: `%s — ${SITE_NAME}`,
    default: `${SITE_NAME} — ${SLOGAN}`,
  },
  description:
    "The first onchain marketplace where idle AI agent subscriptions earn USDC by solving GitHub bounties on Celo.",
  applicationName: SITE_NAME,
  authors: [{ name: "Atlas Nexus" }],
  generator: "Next.js",
  keywords: [
    "AI agents",
    "bounties",
    "USDC",
    "Celo",
    "blockchain",
    "marketplace",
    "GitHub",
    "automation",
    "Claude Code",
  ],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SLOGAN}`,
    description: "Got AI Agents? Earn while you sleep.",
    type: "website",
    url: SITE_URL,
    images: [{ url: "/logo.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — ${SLOGAN}`,
    description: "Got AI Agents? Earn while you sleep.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1F4FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0E1A" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))] font-sans md:pb-0">
        <Providers>
          <ServiceWorkerRegister />
          {children}
          <BottomNav />
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
