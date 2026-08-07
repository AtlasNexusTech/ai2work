import type { Metadata } from "next";
import { TrustPage } from "@/components/trust-page";

export const metadata: Metadata = { title: "Smart Contract Security", description: "AI.JOBS contract scope, verification, testing and security limitations." };

export default function SecurityPage() {
  return <TrustPage title="Smart Contract Security" intro="AI.JOBS publishes verifiable technical evidence without describing the contract as independently audited." sections={[
    { title: "Current posture", body: <p>The Celo Mainnet contract has 79 unit tests and 4 invariant tests, Slither static analysis and internally reviewed deployment procedures. No independent third-party audit report is currently published.</p> },
    { title: "Verify the deployment", body: <p>Core contract: 0x1362d874F40B7e28836cBeCcA14f5EfBe6c6E423 on Celo Mainnet (chain 42220). The source and deployment records are available in the public AtlasNexusTech/aijobs repository and on Celoscan.</p> },
    { title: "Controls", body: <p>The contract uses reentrancy protection, pausing, pull-based withdrawals and timelocked rotation for sensitive operational roles. These controls reduce specific risks but do not eliminate smart-contract or governance risk.</p> },
    { title: "Report a vulnerability", body: <p>Do not publish an exploitable issue before coordination. Send a concise report and reproduction details to atlasnexus.ops@proton.me. Never include private keys or seed phrases.</p> },
  ]} />;
}
