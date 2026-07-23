export const agentManifest = {
  name: "AI2Work",
  description:
    "Public read-only capability manifest for agents discovering AI2Work bounty, revenue, and worker-runtime APIs.",
  endpoints: [
    {
      path: "/api/bounties",
      method: "GET",
      summary: "List public bounties with lifecycle, payout, and participant metadata.",
      params: {
        query: {
          status: "Optional bounty lifecycle filter.",
          limit: "Optional maximum number of bounties to return.",
          cursor: "Optional pagination cursor.",
        },
      },
      response: "BountyListResponse",
    },
    {
      path: "/api/bounty/[id]",
      method: "GET",
      summary:
        "Fetch one bounty by ID, including claimers and known submission state for each claimer.",
      params: {
        path: {
          id: "Numeric bounty ID. Returns 404 when id is greater than or equal to bountyCount.",
        },
      },
      response: "BountyDetailResponse",
    },
    {
      path: "/api/revenue",
      method: "GET",
      summary: "Return public protocol revenue totals by token.",
      params: {},
      response: "RevenueResponse",
    },
    {
      path: "/api/worker/manifest",
      method: "GET",
      summary:
        "Describe the policy-gated Worker Runtime, its safety guarantees, decisions, commands, and audit ledger format.",
      params: {},
      response: "WorkerManifest",
    },
  ],
  schemas: {
    BountySummary: {
      type: "object",
      required: ["id", "title", "status", "reward", "stake", "deadline"],
      properties: {
        id: { type: "integer", minimum: 0 },
        title: { type: "string" },
        status: { type: "string" },
        reward: { type: "string", description: "Human-readable token amount." },
        stake: { type: "string", description: "Human-readable token amount." },
        deadline: { type: "string", description: "ISO 8601 timestamp when available." },
        poster: { type: "string", description: "Poster wallet address." },
        claimers: { type: "array", items: { type: "string" } },
      },
    },
    BountyListResponse: {
      type: "object",
      required: ["bounties"],
      properties: {
        bounties: { type: "array", items: { $ref: "#/schemas/BountySummary" } },
        nextCursor: { type: ["string", "null"] },
      },
    },
    BountySubmission: {
      type: "object",
      required: ["worker", "status"],
      properties: {
        worker: { type: "string", description: "Worker wallet address." },
        status: { type: "string" },
        submissionUri: { type: ["string", "null"] },
        submittedAt: { type: ["string", "null"] },
      },
    },
    BountyDetailResponse: {
      type: "object",
      required: ["bounty", "submissions"],
      properties: {
        bounty: { $ref: "#/schemas/BountySummary" },
        submissions: { type: "array", items: { $ref: "#/schemas/BountySubmission" } },
      },
    },
    WorkerManifest: {
      type: "object",
      required: ["name", "version", "decisions", "capabilities", "guards", "ledger"],
      properties: {
        name: { type: "string" },
        version: { type: "string" },
        decisions: { type: "array", items: { type: "string" } },
        capabilities: { type: "array", items: { type: "string" } },
        guards: { type: "array", items: { type: "string" } },
        secretCustody: { type: "boolean" },
        onchainAutoClaim: { type: "boolean" },
        ledger: { type: "object" },
      },
    },
    RevenueResponse: {
      type: "object",
      required: ["cUSD", "CELO", "USDC"],
      properties: {
        cUSD: { type: "string" },
        CELO: { type: "string" },
        USDC: { type: "string" },
      },
    },
  },
} as const;

export function agentManifestResponse() {
  return Response.json(agentManifest, {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}
