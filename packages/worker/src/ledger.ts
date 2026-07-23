import { createHash, randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { LedgerEvent } from './types.js';
const GENESIS='0'.repeat(64);
function canonical(value:unknown):string { if(Array.isArray(value)) return `[${value.map(canonical).join(',')}]`; if(value&&typeof value==='object') return `{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`; return JSON.stringify(value) ?? 'null'; }
function digest(e:Omit<LedgerEvent,'hash'>):string { return createHash('sha256').update(canonical(e)).digest('hex'); }
export class AuditLedger {
  constructor(readonly path:string,readonly runId:string=randomUUID()){}
  async append(type:string,payload:unknown):Promise<LedgerEvent>{ const events=await this.read(); const base={sequence:events.length+1,timestamp:new Date().toISOString(),runId:this.runId,type,payload,previousHash:events.at(-1)?.hash??GENESIS}; const event={...base,hash:digest(base)}; await mkdir(dirname(this.path),{recursive:true}); await appendFile(this.path,JSON.stringify(event)+'\n','utf8'); return event; }
  async read():Promise<LedgerEvent[]>{ try { return (await readFile(this.path,'utf8')).split('\n').filter(Boolean).map(x=>JSON.parse(x) as LedgerEvent); } catch(e){ if((e as NodeJS.ErrnoException).code==='ENOENT') return []; throw e; } }
  async verify():Promise<{valid:boolean;index?:number;reason?:string}>{ const events=await this.read(); let prev=GENESIS; for(let i=0;i<events.length;i++){ const e=events[i]!; const {hash,...base}=e; if(e.sequence!==i+1)return{valid:false,index:i,reason:'sequence'}; if(e.previousHash!==prev)return{valid:false,index:i,reason:'previousHash'}; if(digest(base)!==hash)return{valid:false,index:i,reason:'hash'}; prev=hash; } return{valid:true}; }
}
