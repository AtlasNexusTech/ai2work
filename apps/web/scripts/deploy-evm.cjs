#!/usr/bin/env node
/**
 * AI Lance — EVM Multi-Chain Deployer (CJS, runs from apps/web)
 * 
 * USAGE: cd apps/web && node scripts/deploy-evm.cjs [arbitrum|base|polygon|all]
 * 
 * Wallet: 0x93a96A14209aDAC1C1540f1164a854E5844ee39F
 * PRIVATE_KEY env var or default below
 */

const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { arbitrum, base, polygon } = require('viem/chains');
const { readFileSync } = require('fs');
const { resolve } = require('path');

// ── Config ─────────────────────────────────────────────────────────
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable is required');
}
const ARTIFACT_PATH = resolve(__dirname, '..', '..', '..', 'contracts', 'out', 'ClaudelanceCore.sol', 'ClaudelanceCore.json');

const ERC8004_ADDRESSES = {
  [arbitrum.id]: '0x0000000000000000000000000000000000000000',
  [base.id]:     '0x0000000000000000000000000000000000000000',
  [polygon.id]:  '0x0000000000000000000000000000000000000000',
};

const RPC_URLS = {
  [arbitrum.id]: 'https://arb1.arbitrum.io/rpc',
  [base.id]:     'https://mainnet.base.org',
  [polygon.id]:  'https://polygon-bor-rpc.publicnode.com',
};

const CHAIN_MAP = { arbitrum, base, polygon };

// ── Setup ──────────────────────────────────────────────────────────
const account = privateKeyToAccount(PRIVATE_KEY);
const G='\x1b[32m', B='\x1b[34m', Y='\x1b[33m', R='\x1b[31m', N='\x1b[0m';

const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf-8'));
const creationBytecode = artifact.bytecode.object;

console.log(`${B}══════════════════════════════════════════════════${N}`);
console.log(`${B}  AI Lance — EVM Multi-Chain Deployer${N}`);
console.log(`${B}══════════════════════════════════════════════════${N}`);
console.log(`${Y}Wallet:    ${account.address}${N}`);
console.log(`${Y}Bytecode:  ${creationBytecode.length} chars${N}\n`);

// ── Deploy ─────────────────────────────────────────────────────────
async function deployToChain(chain) {
  const rpc = RPC_URLS[chain.id];
  const erc8004 = ERC8004_ADDRESSES[chain.id];
  
  console.log(`${B}── ${chain.name} ─────────────────────────────────${N}`);
  
  const client = createPublicClient({ chain, transport: http(rpc) });
  
  const balance = await client.getBalance({ address: account.address });
  const balanceEth = Number(balance) / 1e18;
  console.log(`${Y}Balance:   ${balanceEth.toFixed(6)} ${chain.nativeCurrency.symbol}${N}`);
  
  if (balance === 0n) {
    console.log(`${R}❌ Solde = 0. Funder le wallet.${N}`);
    console.log(`${Y}   Adresse: ${account.address}${N}\n`);
    return null;
  }
  
  // constructor(address _treasury, address _ciRelayer, address _owner, IERC721 _identityRegistry, address _reputationRegistry)
  // All 5 must be non-zero. Use deployer wallet as placeholder for all roles.
  const deployerAddr = account.address.toLowerCase().replace('0x', '');
  const encodedArg = (addr) => addr.toLowerCase().replace('0x', '').padStart(64, '0');
  const encodedArgs = '0x' + 
    encodedArg(account.address) +  // _treasury
    encodedArg(account.address) +  // _ciRelayer
    encodedArg(account.address) +  // _owner
    encodedArg(account.address) +  // _identityRegistry (placeholder, no real ERC-8004 on this chain)
    encodedArg(account.address);   // _reputationRegistry
  
  const fullBytecode = creationBytecode + encodedArgs.slice(2);
  
  let gasEstimate;
  try {
    gasEstimate = await client.estimateGas({
      account: account.address,
      data: fullBytecode,
    });
    console.log(`${Y}Gas estimé: ${gasEstimate}${N}`);
  } catch (e) {
    console.log(`${R}❌ Estimation gas échouée: ${e.shortMessage || e.message?.slice(0,100)}${N}\n`);
    return null;
  }
  
  const gasPrice = await client.getGasPrice();
  const gasCost = gasEstimate * gasPrice;
  if (gasCost > balance) {
    console.log(`${R}❌ Solde insuffisant. Besoin: ${Number(gasCost)/1e18} ${chain.nativeCurrency.symbol}${N}\n`);
    return null;
  }
  
  try {
    const wallet = createWalletClient({ chain, transport: http(rpc), account });
    console.log(`${Y}Envoi TX...${N}`);
    
    const hash = await wallet.sendTransaction({ data: fullBytecode, gas: gasEstimate });
    console.log(`${Y}TX: ${hash}${N}`);
    
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
    
    if (receipt.status === 'success') {
      const addr = receipt.contractAddress;
      console.log(`${G}✅ DÉPLOYÉ !${N}`);
      console.log(`${G}   Adresse:   ${addr}${N}`);
      console.log(`${G}   Explorer:  ${chain.blockExplorers.default.url}/address/${addr}${N}\n`);
      return addr;
    } else {
      console.log(`${R}❌ TX échouée (reverted)${N}\n`);
      return null;
    }
  } catch (e) {
    const msg = e.shortMessage || e.details || e.message?.slice(0,200);
    console.log(`${R}❌ ${msg}${N}\n`);
    return null;
  }
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  const target = process.argv[2] || 'all';
  
  const chainsToDeploy = target === 'all'
    ? [arbitrum, base, polygon]
    : [CHAIN_MAP[target]].filter(Boolean);
  
  if (chainsToDeploy.length === 0) {
    console.log(`${R}Chaîne inconnue: ${target}. Options: arbitrum, base, polygon, all${N}`);
    process.exit(1);
  }
  
  const deployments = {};
  for (const chain of chainsToDeploy) {
    const addr = await deployToChain(chain);
    if (addr) deployments[chain.name] = addr;
  }
  
  console.log(`${G}══════════════════════════════════════════════════${N}`);
  console.log(`${G}  RÉSUMÉ${N}`);
  console.log(`${G}══════════════════════════════════════════════════${N}`);
  if (Object.keys(deployments).length === 0) {
    console.log(`${R}Aucun déploiement.${N}`);
    console.log(`${Y}Funder: ${account.address}${N}`);
  } else {
    for (const [chain, addr] of Object.entries(deployments)) {
      console.log(`  ${G}${chain}:${N} ${addr}`);
    }
  }
}

main().catch(err => { console.error(`${R}${err.message}${N}`); process.exit(1); });
