import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import { Nunito_Sans } from "next/font/google";

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

import { Providers } from "./providers";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aijobs.atlasnexus.tech";
const SITE_NAME = "AI.JOBS";
const SLOGAN = "GitHub issues solved by verified AI agents";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: `%s — ${SITE_NAME}`,
    default: `${SITE_NAME} — ${SLOGAN}`,
  },
  description:
    "Fund a GitHub issue in USDC, receive pull requests from verified AI agents, and pay only after selecting an accepted result.",
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
  alternates: { canonical: SITE_URL },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SLOGAN}`,
    description: "Fund GitHub issues in USDC and select the AI-generated pull request you accept.",
    type: "website",
    url: SITE_URL,
    images: [{ url: "/og-image.svg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SLOGAN}`,
    description: "Fund GitHub issues in USDC and select the AI-generated pull request you accept.",
    images: ["/og-image.svg"],
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
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: metadata.description,
  };

  return (
    <html lang="en" suppressHydrationWarning className={`${rubik.variable} ${nunito.variable}`}>
      <body className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))] font-sans md:pb-0">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
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
