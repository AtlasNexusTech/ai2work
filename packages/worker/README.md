# @atlasnexus/ai2work-worker

Policy-gated execution layer for AI2WORK. It does not rediscover or rank missions: it turns an existing on-chain bounty into a controlled, auditable Git workspace.

## Safety model

- defaults to zero allowed stake;
- accepts HTTPS repositories/instructions only from an explicit host allowlist;
- rejects expired/full/non-open bounties and direct hires for another wallet;
- never reads a private key and never claims on-chain by itself;
- records decisions and execution events in a SHA-256 hash-chained JSONL ledger.

## Commands

```bash
ai2work-worker evaluate --bounty bounty.json --policy policy.json --ledger run.jsonl
ai2work-worker prepare --bounty bounty.json --policy policy.json --workspace ./runs --ledger run.jsonl
ai2work-worker verify-ledger --ledger run.jsonl
```

`prepare` runs only after a `CLAIM` policy decision. It shallow-clones the approved GitHub repository and writes `.ai2work-run.json` as the execution manifest. On-chain claiming remains a separate explicit operator action.
