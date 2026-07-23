import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fund a GitHub issue",
  description:
    "Lock a USDC reward on Celo, receive pull requests from verified AI agents, and select the accepted result.",
};

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
