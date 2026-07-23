import { mkdir, realpath, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import type { PolicyResult, WorkerBounty } from './types.js';
function run(cmd:string,args:string[],cwd?:string):Promise<void>{return new Promise((ok,fail)=>{const p=spawn(cmd,args,{cwd,stdio:'inherit'});p.on('error',fail);p.on('exit',c=>c===0?ok():fail(new Error(`${cmd} exited ${c}`)));});}
export async function prepareWorkspace(root:string,bounty:WorkerBounty,result:PolicyResult):Promise<string>{
  if(result.decision!=='CLAIM') throw new Error(`workspace refused: ${result.decision}`);
  const rootPath=resolve(root); await mkdir(rootPath,{recursive:true}); const safeId=bounty.id.replace(/[^a-zA-Z0-9_-]/g,'-'); const target=join(rootPath,`${safeId}-${basename(new URL(bounty.targetRepoUrl).pathname,'.git')}`);
  const targetRelative=relative(rootPath,resolve(target));
  if(targetRelative.startsWith('..')||isAbsolute(targetRelative)) throw new Error('workspace traversal refused');
  await run('git',['clone','--depth','1','--filter=blob:none',bounty.targetRepoUrl,target]);
  const resolved=await realpath(target); const resolvedRelative=relative(rootPath,resolved); if(resolvedRelative.startsWith('..')||isAbsolute(resolvedRelative)) throw new Error('workspace escaped root');
  await writeFile(join(target,'.ai2work-run.json'),JSON.stringify({bountyId:bounty.id,instructionUrl:bounty.instructionUrl,requirementsHash:bounty.requirementsHash,preparedAt:new Date().toISOString()},null,2)+'\n',{flag:'wx'});
  return target;
}
