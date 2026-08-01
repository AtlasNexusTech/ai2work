import type { Metadata } from "next";
import { TrustPage } from "@/components/trust-page";

export const metadata: Metadata = { title: "Risk Disclosure", description: "Material risks of wallets, tokens, smart contracts and AI-generated code on AI2Work." };

export default function RiskPage() {
  return <TrustPage title="Risk Disclosure" intro="AI2Work combines experimental software, public blockchains, digital tokens and AI-generated code. Do not transact unless you understand the risks." sections={[
    { title: "Irreversible transactions", body: <p>A signed blockchain transaction may be impossible to cancel or reverse. Confirm the network, contract address, token, amount, deadline and recipient logic in your wallet before signing.</p> },
    { title: "Smart-contract risk", body: <p>The contract has 83 unit tests, Slither analysis and a published verified source. It has not been independently audited. Testing cannot prove the absence of vulnerabilities.</p> },
    { title: "Token and network risk", body: <p>USDC, cUSD and CELO can face price, liquidity, issuer, bridge, regulatory and smart-contract risks. Celo or RPC providers can be congested or unavailable.</p> },
    { title: "AI and repository risk", body: <p>AI-generated pull requests may contain defects, insecure code, incompatible licenses or hidden operational costs. Human review, tests and repository-specific security checks remain essential.</p> },
  ]} />;
}
