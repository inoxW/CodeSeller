import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptMatches, verifyPayment, formatUnits, USDC, TRANSFER, type Receipt, type Block } from './payment.ts';
const hash='0x'+'a'.repeat(64),wallet='0x'+'1'.repeat(40),blockHash='0x'+'b'.repeat(64);
const block:Block={number:'0x64',hash:blockHash,timestamp:'0x6553f100'};
const invoice={wallet,amountUnits:19001234,created:new Date(1699999999*1000).toISOString()};
const make=():Receipt=>({status:'0x1',transactionHash:hash,blockNumber:'0x64',blockHash,logs:[{address:USDC,topics:[TRANSFER,'0x'+'0'.repeat(24)+'2'.repeat(40),'0x'+'0'.repeat(24)+wallet.slice(2)],data:'0x'+invoice.amountUnits.toString(16).padStart(64,'0')}]});
test('only a finalized exact native-USDC receipt matches',()=>assert.equal(receiptMatches(make(),block,block,invoice,hash),true));
for(const [name,mutate] of [
 ['wrong token',(r:Receipt)=>r.logs[0].address='0x'+'3'.repeat(40)],
 ['wrong recipient',(r:Receipt)=>r.logs[0].topics[2]='0x'+'0'.repeat(24)+'3'.repeat(40)],
 ['underpayment',(r:Receipt)=>r.logs[0].data='0x'+(invoice.amountUnits-1).toString(16).padStart(64,'0')],
 ['overpayment',(r:Receipt)=>r.logs[0].data='0x'+(invoice.amountUnits+1).toString(16).padStart(64,'0')],
 ['failed transaction',(r:Receipt)=>r.status='0x0'],
 ['removed log',(r:Receipt)=>r.logs[0].removed=true],
 ['wrong transaction',(r:Receipt)=>r.transactionHash='0x'+'4'.repeat(64)],
 ['wrong event',(r:Receipt)=>r.logs[0].topics[0]='0x'+'5'.repeat(64)],
 ['reorganized block',(r:Receipt)=>r.blockHash='0x'+'6'.repeat(64)],
] as const)test(name,()=>{const r=make();mutate(r);assert.equal(receiptMatches(r,block,block,invoice,hash),false);});
test('unfinalized and historical transfers fail',()=>{assert.equal(receiptMatches(make(),block,{...block,number:'0x63'},invoice,hash),false);assert.equal(receiptMatches(make(),block,block,{...invoice,created:new Date(1700000001*1000).toISOString()},hash),false);});
test('amount retains all six decimal digits',()=>{assert.equal(formatUnits(19001234),'19.001234');assert.equal(formatUnits(10001),'0.010001');});
test('both independent RPC providers must confirm; disagreement fails closed',async()=>{const original=globalThis.fetch;let disagree=false;globalThis.fetch=async(input,init)=>{const body=JSON.parse(String(init?.body));const url=String(input);let result:unknown;switch(body.method){case 'eth_chainId':result='0x89';break;case 'eth_getTransactionReceipt':result=make();if(disagree&&url.includes('drpc'))(result as Receipt).status='0x0';break;case 'eth_getBlockByNumber':result=block;break;}return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result}),{headers:{'content-type':'application/json'}});};try{assert.equal(await verifyPayment(hash,invoice),'paid');disagree=true;assert.equal(await verifyPayment(hash,invoice),'invalid');}finally{globalThis.fetch=original;}});
test('RPC outage never marks a payment paid',async()=>{const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline');};try{await assert.rejects(verifyPayment(hash,invoice));}finally{globalThis.fetch=original;}});

test('an incoming transfer immediately sent back does not unlock the file',()=>{const r=make();r.logs.push({...r.logs[0],topics:[TRANSFER,r.logs[0].topics[2],r.logs[0].topics[1]]});assert.equal(receiptMatches(r,block,block,invoice,hash),false);});
