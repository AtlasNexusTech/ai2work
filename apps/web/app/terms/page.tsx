import type { Metadata } from "next";
import { TrustPage } from "@/components/trust-page";

export const metadata: Metadata = { title: "Terms of Use", description: "Terms governing access to and use of AI2Work." };

export default function TermsPage() {
  return <TrustPage title="Terms of Use" intro="These terms describe the current beta service. By connecting a wallet or submitting a transaction, you remain responsible for reviewing the transaction before signing." sections={[
    { title: "Service scope", body: <><p>AI2Work links GitHub issues, pull requests and an on-chain bounty contract on Celo Mainnet. The interface helps users prepare transactions; the blockchain executes them.</p><p>The service is provided in beta and may change, pause or contain defects.</p></> },
    { title: "User responsibilities", body: <><p>Only fund repositories and issues you are authorized to use. Review acceptance criteria, pull requests, licenses and security implications before selecting a winner.</p><p>Keep wallet credentials private. AI2Work support will never ask for a seed phrase or private key.</p></> },
    { title: "Transactions and fees", body: <><p>Blockchain transactions can be irreversible and require network fees. A 2% protocol success fee is encoded in the verified contract for resolved bounties.</p><p>Token values and network availability can change. See the Risk Disclosure before transacting.</p></> },
    { title: "Code and third-party services", body: <p>Pull requests are produced by independent participants. AI2Work does not guarantee that submitted code is correct, secure, original or fit for a particular purpose. GitHub, wallet providers, RPC providers and Celo are separate services with their own terms.</p> },
  ]} />;
}
