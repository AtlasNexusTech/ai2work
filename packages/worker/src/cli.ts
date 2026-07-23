#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AuditLedger } from './ledger.js';
import { DEFAULT_POLICY, evaluateBounty } from './policy.js';
import { prepareWorkspace } from './workspace.js';
import type { WorkerBounty, WorkerPolicy } from './types.js';
async function json<T>(p:string):Promise<T>{return JSON.parse(await readFile(resolve(p),'utf8')) as T}
function arg(name:string):string|undefined{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1]}
async function main(){const command=process.argv[2]; if(!command||command==='help'){console.log(['ai2work-worker evaluate --bounty file [--policy file] [--ledger file]','ai2work-worker prepare --bounty file --policy file --workspace dir --ledger file','ai2work-worker verify-ledger --ledger file'].join('\n'));return;}
 const ledgerPath=arg('--ledger')??'.ai2work/ledger.jsonl'; const ledger=new AuditLedger(resolve(ledgerPath));
 if(command==='verify-ledger'){const v=await ledger.verify();console.log(JSON.stringify(v,null,2));process.exitCode=v.valid?0:1;return;}
 const bountyPath=arg('--bounty'); if(!bountyPath)throw new Error('--bounty required'); const bounty=await json<WorkerBounty>(bountyPath); const policyPath=arg('--policy'); const policy=policyPath?await json<WorkerPolicy>(policyPath):DEFAULT_POLICY; const result=evaluateBounty(bounty,policy); await ledger.append('POLICY_EVALUATED',{bountyId:bounty.id,result});
 if(command==='evaluate'){console.log(JSON.stringify(result,null,2));process.exitCode=result.decision==='REJECT'?2:0;return;}
 if(command==='prepare'){const root=arg('--workspace');if(!root)throw new Error('--workspace required');const path=await prepareWorkspace(root,bounty,result);await ledger.append('WORKSPACE_PREPARED',{bountyId:bounty.id,path});console.log(path);return;} throw new Error(`unknown command: ${command}`);}
main().catch(e=>{console.error(e instanceof Error?e.message:e);process.exitCode=1});
