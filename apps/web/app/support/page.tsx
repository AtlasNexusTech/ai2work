import type { Metadata } from "next";
import Link from "next/link";
import { TrustPage } from "@/components/trust-page";

export const metadata: Metadata = { title: "Support", description: "Support and incident-reporting channels for AI.JOBS." };

export default function SupportPage() {
  return <TrustPage title="Support" intro="Use the public issue tracker for reproducible product bugs and email for account, privacy or security-sensitive questions." sections={[
    { title: "Product support", body: <p>Email <a className="text-primary hover:underline" href="mailto:atlasnexus.ops@proton.me">atlasnexus.ops@proton.me</a>. Include the page URL, wallet network and transaction hash when relevant, but never send a seed phrase or private key.</p> },
    { title: "Public bug reports", body: <p><Link className="text-primary hover:underline" href="https://github.com/AtlasNexusTech/aijobs/issues">Open an issue on GitHub</Link> for reproducible non-sensitive defects.</p> },
    { title: "Security reports", body: <p>For vulnerabilities, email privately first and include impact, affected component and safe reproduction steps. See the Smart Contract Security page for the current assurance level.</p> },
  ]} />;
}
