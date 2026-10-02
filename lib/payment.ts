export const USDC='0x3c499c542cef5e3811e1192ce70d8cc03d5c3359';
export const TRANSFER='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const RPC_ENDPOINTS=['https://polygon-bor-rpc.publicnode.com','https://polygon.drpc.org'];
export type ChainLog={address:string;topics:string[];data:string;removed?:boolean;transactionHash?:string};
export type Receipt={status:string;transactionHash:string;blockNumber:string;blockHash:string;logs:ChainLog[]};
export type Block={number:string;hash:string;timestamp:string};
export type Invoice={wallet:string;amountUnits:number;created:string};
export function receiptMatches(receipt:Receipt,block:Block,finalized:Block,invoice:Invoice,hash:string):boolean{
 if(receipt.status!=='0x1'||receipt.transactionHash.toLowerCase()!==hash.toLowerCase())return false;
 if(block.hash.toLowerCase()!==receipt.blockHash.toLowerCase()||BigInt(block.number)!==BigInt(receipt.blockNumber))return false;
 if(BigInt(finalized.number)<BigInt(receipt.blockNumber))return false;
 if(Number(BigInt(block.timestamp))*1000<Math.floor(Date.parse(invoice.created)/1000)*1000)return false;
 const address=invoice.wallet.toLowerCase().slice(2);
 let matched=false,net=BigInt(0);
 for(const log of receipt.logs){
  if(log.removed||log.address.toLowerCase()!==USDC||log.topics.length!==3||log.topics[0].toLowerCase()!==TRANSFER||!/^0x[0-9a-fA-F]{64}$/.test(log.data))continue;
  if(log.transactionHash&&log.transactionHash.toLowerCase()!==hash.toLowerCase())return false;
  if(!log.topics.slice(1).every(topic=>/^0x[0-9a-fA-F]{64}$/.test(topic)&&topic.slice(2,26)==='0'.repeat(24)))continue;
  const value=BigInt(log.data),to=log.topics[2].slice(26).toLowerCase(),from=log.topics[1].slice(26).toLowerCase();
  if(to===address){net+=value;if(value===BigInt(invoice.amountUnits))matched=true;}
  if(from===address)net-=value;
 }
 return matched&&net>=BigInt(invoice.amountUnits);
}
export async function rpc<T>(url:string,method:string,params:unknown[]):Promise<T>{const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('RPC unavailable');const d=await r.json() as {result:T;error?:unknown};if(d.error)throw Error('RPC error');return d.result;}
export async function verifyPayment(hash:string,invoice:Invoice){
 const checks=await Promise.all(RPC_ENDPOINTS.map(async url=>{
  const chain=await rpc<string>(url,'eth_chainId',[]);if(BigInt(chain)!==BigInt(137))throw Error('Wrong RPC chain');
  const receipt=await rpc<Receipt|null>(url,'eth_getTransactionReceipt',[hash]);if(!receipt)return {valid:false,pending:true,blockHash:null};
  const [block,finalized]=await Promise.all([rpc<Block|null>(url,'eth_getBlockByNumber',[receipt.blockNumber,false]),rpc<Block|null>(url,'eth_getBlockByNumber',['finalized',false])]);if(!block||!finalized)throw Error('Block unavailable');
  if(BigInt(finalized.number)<BigInt(receipt.blockNumber))return {valid:false,pending:true,blockHash:receipt.blockHash};
  return {valid:receiptMatches(receipt,block,finalized,invoice,hash),pending:false,blockHash:receipt.blockHash};
 }));
 if(checks.some(x=>x.pending))return 'pending';
 return checks.every(x=>x.valid)&&checks[0].blockHash===checks[1].blockHash?'paid':'invalid';
}
export function formatUnits(n:number){return (BigInt(n)/BigInt(1000000)).toString()+'.'+(BigInt(n)%BigInt(1000000)).toString().padStart(6,'0');}
