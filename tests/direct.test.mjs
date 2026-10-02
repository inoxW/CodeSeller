import assert from 'node:assert/strict';
import ganache from 'ganache';
import solc from 'solc';
import { createPublicClient,createWalletClient,custom,zeroAddress,keccak256,encodeFunctionData,erc20Abi } from 'viem';
import { directReceiptMatches,sellerAmount,nextPayoutAt } from '../lib/direct-proof.ts';
const provider=ganache.provider({logging:{quiet:true},chain:{chainId:137}});
const transport=custom({request:async({method,params})=>{if(method==='wallet_sendTransaction')method='eth_sendTransaction';if(method==='eth_sendTransaction'&&!params[0].gas)params[0].gas=await provider.request({method:'eth_estimateGas',params});return provider.request({method,params});}});
const client=createPublicClient({transport});const accounts=await provider.request({method:'eth_accounts'});
const [buyer,platform,seller,other]=accounts;const wallet=account=>createWalletClient({account,transport});const ref=keccak256(new TextEncoder().encode('invoice-1'));let count=0;
const check=(name,fn)=>{fn();count++;console.log('PASS:',name);};
async function proof(hash,intent){const receipt=await provider.request({method:'eth_getTransactionReceipt',params:[hash]});const tx=await provider.request({method:'eth_getTransactionByHash',params:[hash]});const block=await provider.request({method:'eth_getBlockByNumber',params:[receipt.blockNumber,false]});return {receipt,tx,block,intent:{...intent,created:new Date((Number(BigInt(block.timestamp))-1)*1000).toISOString()}};}
const valid=(x,patch={})=>directReceiptMatches(x.receipt,x.tx,x.block,x.block,{...x.intent,...patch},x.receipt.transactionHash);
try{
 const before=await client.getBalance({address:platform});const hash=await wallet(buyer).sendTransaction({chain:null,to:platform,value:1000n,data:ref});await client.waitForTransactionReceipt({hash});const x=await proof(hash,{sender:buyer,recipient:platform,token:zeroAddress,amountRaw:'1000',reference:ref});
 const after=await client.getBalance({address:platform});check('buyer sends 100% to platform',()=>assert.equal(after-before,1000n));
 check('native payment accepted',()=>assert.equal(valid(x),true));
 for(const [label,patch] of [['wrong sender',{sender:other}],['wrong recipient',{recipient:seller}],['wrong amount',{amountRaw:'999'}],['wrong reference',{reference:keccak256(new TextEncoder().encode('different'))}],['expired',{deadline:1}],['old payment',{created:new Date((Number(BigInt(x.block.timestamp))+1)*1000).toISOString()}]])check(label+' rejected',()=>assert.equal(valid(x,patch),false));
 check('unfinalized rejected',()=>assert.equal(directReceiptMatches(x.receipt,x.tx,x.block,{...x.block,number:'0x0'},x.intent,hash),false));
 check('failed rejected',()=>assert.equal(directReceiptMatches({...x.receipt,status:'0x0'},x.tx,x.block,x.block,x.intent,hash),false));
 check('reorganized rejected',()=>assert.equal(directReceiptMatches(x.receipt,x.tx,{...x.block,hash:'0x'+'11'.repeat(32)},x.block,x.intent,hash),false));
 const mock=`// SPDX-License-Identifier: MIT\npragma solidity 0.8.28;contract T{mapping(address=>uint)public balanceOf;event Transfer(address indexed from,address indexed to,uint value);function mint(address to,uint n)external{balanceOf[to]+=n;}function transfer(address to,uint n)external returns(bool){balanceOf[msg.sender]-=n;balanceOf[to]+=n;emit Transfer(msg.sender,to,n);return true;}}`;
 const c=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{'T.sol':{content:mock}},settings:{evmVersion:'paris',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}}))).contracts['T.sol'].T;
 const deployed=await wallet(buyer).deployContract({chain:null,abi:c.abi,bytecode:'0x'+c.evm.bytecode.object});const token=(await client.waitForTransactionReceipt({hash:deployed})).contractAddress;
 await client.waitForTransactionReceipt({hash:await wallet(buyer).writeContract({chain:null,address:token,abi:c.abi,functionName:'mint',args:[buyer,1000n]})});
 const th=await wallet(buyer).writeContract({chain:null,address:token,abi:erc20Abi,functionName:'transfer',args:[platform,1000n]});await client.waitForTransactionReceipt({hash:th});const t=await proof(th,{sender:buyer,recipient:platform,token,amountRaw:'1000',reference:ref});
 check('ERC20 direct transfer accepted without approval',()=>assert.equal(valid(t),true));
 check('wrong token rejected',()=>assert.equal(valid(t,{token:other}),false));
 check('removed log rejected',()=>assert.equal(directReceiptMatches({...t.receipt,logs:t.receipt.logs.map(l=>({...l,removed:true}))},t.tx,t.block,t.block,t.intent,th),false));
 check('missing credit rejected',()=>assert.equal(directReceiptMatches({...t.receipt,logs:[]},t.tx,t.block,t.block,t.intent,th),false));
 const payoutRef=keccak256(new TextEncoder().encode('weekly-payout'));const ph=await wallet(platform).writeContract({chain:null,address:token,abi:erc20Abi,functionName:'transfer',args:[seller,900n]});await client.waitForTransactionReceipt({hash:ph});const payout=await proof(ph,{sender:platform,recipient:seller,token,amountRaw:'900',reference:payoutRef});
 check('weekly seller payout verified',()=>assert.equal(valid(payout),true));
 const balance=address=>client.readContract({address:token,abi:c.abi,functionName:'balanceOf',args:[address]});const sellerBalance=await balance(seller),fee=await balance(platform);check('seller 90%, platform retains 10%',()=>{assert.equal(sellerBalance,900n);assert.equal(fee,100n);});
 check('rounding retains smallest-unit accuracy',()=>assert.equal(sellerAmount('101'),'91'));
 check('Tuesday due next Monday',()=>assert.equal(nextPayoutAt('2026-09-29T21:00:00Z'),'2026-10-05T00:00:00.000Z'));
 check('Monday sale due following Monday',()=>assert.equal(nextPayoutAt('2026-10-05T00:00:00Z'),'2026-10-12T00:00:00.000Z'));
 console.log(count,'checks passed; no real funds used');
}finally{await provider.disconnect();}

