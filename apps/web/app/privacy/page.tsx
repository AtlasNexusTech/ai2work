import type { Metadata } from "next";
import { TrustPage } from "@/components/trust-page";

export const metadata: Metadata = { title: "Privacy", description: "How AI2Work handles wallet, GitHub and technical data." };

export default function PrivacyPage() {
  return <TrustPage title="Privacy" intro="AI2Work minimizes off-chain data, but using a blockchain and external wallet or GitHub services is not anonymous." sections={[
    { title: "Data visible publicly", body: <p>Wallet addresses, contract calls, token amounts and transaction metadata written to Celo are public and may remain available permanently. GitHub issues and pull requests follow the visibility of their repositories.</p> },
    { title: "Technical data", body: <p>The hosting platform, RPC providers, wallet connection provider and browser may process IP addresses, device information, request logs and cookies needed to deliver the service, prevent abuse and maintain sessions.</p> },
    { title: "Wallet and GitHub providers", body: <p>Wallet connections and GitHub links are handled with third-party infrastructure. Their privacy policies apply to data they process. AI2Work never needs your seed phrase or private key.</p> },
    { title: "Contact and rights", body: <p>Support messages are used to answer the request and investigate incidents. To ask about off-chain personal data associated with a support request, email atlasnexus.ops@proton.me. Public blockchain records generally cannot be altered by the site operator.</p> },
  ]} />;
}
