import type { PolicyResult, WorkerBounty, WorkerPolicy } from './types.js';
const ZERO='0x0000000000000000000000000000000000000000';
function safeUrl(value:string, hosts:string[]):boolean { try { const u=new URL(value); return u.protocol==='https:' && hosts.includes(u.hostname.toLowerCase()) && !u.username && !u.password; } catch { return false; } }
function positiveInteger(value:string):bigint|null { try { const n=BigInt(value); return n>=0n?n:null; } catch { return null; } }
export function evaluateBounty(b:WorkerBounty,p:WorkerPolicy,now=new Date()):PolicyResult {
  const reasons:string[]=[]; const reward=positiveInteger(b.reward); const stake=positiveInteger(b.stakeRequired);
  const deadline=new Date(b.deadline); const hours=(deadline.getTime()-now.getTime())/3_600_000;
  const target=(b.targetWorker??ZERO).toLowerCase(); const worker=p.workerAddress?.toLowerCase();
  const checks:Record<string,boolean>={
    open:b.status==='open', repo:safeUrl(b.targetRepoUrl,p.allowedHosts), instructions:safeUrl(b.instructionUrl,p.allowedHosts),
    deadline:Number.isFinite(deadline.getTime())&&hours>=p.minHoursRemaining, slots:Number.isInteger(b.maxSlots)&&b.claimedSlots<b.maxSlots,
    reward:reward!==null&&reward>=BigInt(p.minReward), stake:stake!==null&&stake<=BigInt(p.maxStake),
    directHire:target===ZERO||Boolean(worker&&target===worker), hash:!p.requireRequirementsHash||Boolean(b.requirementsHash&&/^0x[0-9a-fA-F]{64}$/.test(b.requirementsHash))
  };
  const labels:Record<string,string>={open:'bounty non ouverte',repo:'dépôt non autorisé',instructions:'instructions non sécurisées',deadline:'délai insuffisant ou invalide',slots:'aucun slot disponible',reward:'récompense sous le minimum',stake:'stake supérieur à la limite',directHire:'direct hire destiné à un autre worker',hash:'requirementsHash absent ou invalide'};
  for(const [key,ok] of Object.entries(checks)) if(!ok) reasons.push(labels[key]??key);
  const hard=['open','repo','instructions','deadline','slots','stake','directHire'];
  const decision=hard.some(k=>!checks[k])?'REJECT':(!checks.reward||!checks.hash?'REVIEW':'CLAIM');
  return {decision,reasons,checks};
}
export const DEFAULT_POLICY:WorkerPolicy={maxStake:'0',minReward:'0',minHoursRemaining:24,allowedHosts:['github.com','raw.githubusercontent.com'],requireRequirementsHash:true};
