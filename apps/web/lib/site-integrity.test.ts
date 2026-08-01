import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const webRoot = join(import.meta.dirname, "..");
const read = (relativePath: string) =>
  readFileSync(join(webRoot, relativePath), "utf8");

test("public product copy makes an honest security claim", () => {
  const publicUi = [
    "components/hero-revenue.tsx",
    "components/how-it-works.tsx",
    "app/post/page.tsx",
  ]
    .map(read)
    .join("\n");

  assert.doesNotMatch(publicUi, /audited(?: smart)? contract|audited (?:USDC|Celo) escrow/i);
  assert.match(publicUi, /not independently audited/i);
  assert.match(publicUi, /79 unit tests \+ 4 invariant tests/i);
  assert.match(publicUi, /Slither/i);
});

test("the public interface consistently uses the AI2Work brand", () => {
  const publicUi = ["app/stats/page.tsx", "app/style-guide/page.tsx"].map(read).join("\n");
  assert.doesNotMatch(publicUi, /AI Lance|Claudelance/i);
  assert.match(publicUi, /AI2Work/);
  const discovery = [
    read("public/llms.txt"),
    read("public/llms-full.txt"),
    read("public/openapi.json"),
    read("public/schemas/agent-manifest.schema.json"),
    read("public/.well-known/ai-plugin.json"),
    read("android/twa-manifest.json"),
    read("android/app/src/main/AndroidManifest.xml"),
  ].join("\n");
  assert.doesNotMatch(discovery, /AI Lance|Claudelance|yeheskieltame|claudelance\.vercel\.app|ai2work\.onrender\.com/i);
  assert.match(discovery, /AI2Work/);
});

test("deployment tooling never contains a fallback private key", () => {
  const deployScript = read("scripts/deploy-evm.cjs");
  assert.doesNotMatch(deployScript, /PRIVATE_KEY\s*=\s*process\.env\.PRIVATE_KEY\s*\|\|/);
  assert.doesNotMatch(deployScript, /0x[0-9a-f]{64}/i);
  assert.match(deployScript, /PRIVATE_KEY environment variable is required/);
});

test("RPC failures are shown as unavailable and never coerced to zero", () => {
  const statsReader = read("lib/stats.ts");
  const statsPage = read("app/stats/page.tsx");
  const statsClient = read("components/live-stats-client.tsx");

  assert.doesNotMatch(statsReader, /status === "success"[^\n]+:\s*0n/);
  assert.doesNotMatch(statsPage, /catch\(\(\) => \(\{[\s\S]*?bountyCount:\s*0n/);
  assert.match(statsPage, /temporarily unavailable/i);
  assert.doesNotMatch(statsClient, /AnimatedCounter/);
  assert.match(statsClient, />\{value\}<\/p>/);
});

test("SEO metadata uses one canonical production domain", () => {
  const layout = read("app/layout.tsx");
  const robots = read("app/robots.ts");
  const sitemap = read("app/sitemap.ts");

  assert.match(layout, /alternates:[\s\S]*canonical:/);
  assert.match(layout, /SoftwareApplication|WebApplication/);
  assert.doesNotMatch(robots, /ai2work\.onrender\.com/);
  assert.doesNotMatch(sitemap, /lastModified\s*=\s*new Date\(\)/);
});

test("footer exposes legal, privacy, risk, security and support routes", () => {
  const footer = read("components/footer.tsx");
  for (const route of ["/terms", "/privacy", "/risk", "/security", "/support"]) {
    assert.match(footer, new RegExp(route.replace("/", "\\/")));
  }
});
