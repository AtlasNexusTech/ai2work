import test from 'node:test';import assert from 'node:assert/strict';import { evaluateBounty } from '../src/policy.js';import type { WorkerBounty,WorkerPolicy } from '../src/types.js';
const bounty:WorkerBounty={id:'42',targetRepoUrl:'https://github.com/a/b',instructionUrl:'https://github.com/a/b/issues/1',deadline:'2099-01-01T00:00:00Z',status:'open',reward:'1000',stakeRequired:'10',maxSlots:2,claimedSlots:0,requirementsHash:`0x${'a'.repeat(64)}`};
const policy:WorkerPolicy={maxStake:'20',minReward:'500',minHoursRemaining:24,allowedHosts:['github.com'],requireRequirementsHash:true};
test('claims a safe eligible bounty',()=>assert.equal(evaluateBounty(bounty,policy).decision,'CLAIM'));
test('rejects credential-bearing repo URL',()=>assert.equal(evaluateBounty({...bounty,targetRepoUrl:'https://token@github.com/a/b'},policy).decision,'REJECT'));
test('rejects excessive stake',()=>assert.equal(evaluateBounty({...bounty,stakeRequired:'21'},policy).decision,'REJECT'));
test('rejects full slots',()=>assert.equal(evaluateBounty({...bounty,claimedSlots:2},policy).decision,'REJECT'));
test('reviews low reward instead of auto-claiming',()=>assert.equal(evaluateBounty({...bounty,reward:'499'},policy).decision,'REVIEW'));
test('rejects another direct hire',()=>assert.equal(evaluateBounty({...bounty,targetWorker:'0x1111111111111111111111111111111111111111'},policy).decision,'REJECT'));
