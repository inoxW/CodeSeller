import { zeroAddress,encodeFunctionData,erc20Abi } from 'viem';
import { TRANSFER,type Receipt,type Block } from './payment.ts';
export type TransferIntent={sender:string;recipient:string;token:string;amountRaw:string;created:string;deadline?:number|null;reference:string};
export type ChainTransaction={hash:string;from:string;to:string|null;value:string;input:string;blockHash:string|null};
export function directReceiptMatches(receipt:Receipt,tx:ChainTransaction,block:Block,finalized:Block,intent:TransferIntent,hash:string){
 const lower=(s:string)=>s.toLowerCase();
 if(receipt.status!=='0x1'||lower(receipt.transactionHash)!==lower(hash)||lower(tx.hash)!==lower(hash)||!tx.blockHash||lower(tx.blockHash)!==lower(receipt.blockHash)||lower(block.hash)!==lower(receipt.blockHash)||BigInt(block.number)!==BigInt(receipt.blockNumber)||BigInt(finalized.number)<BigInt(receipt.blockNumber))return false;
 const time=Number(BigInt(block.timestamp));if(time<Math.floor(Date.parse(intent.created)/1000)||(intent.deadline&&time>intent.deadline)||lower(tx.from)!==lower(intent.sender))return false;
 const amount=BigInt(intent.amountRaw);if(amount<=BigInt(0))return false;
 if(lower(intent.token)===zeroAddress)return lower(tx.to||'')===lower(intent.recipient)&&BigInt(tx.value)===amount&&lower(tx.input)===lower(intent.reference);
 const data=encodeFunctionData({abi:erc20Abi,functionName:'transfer',args:[intent.recipient as `0x${string}`,amount]});
 if(lower(tx.to||'')!==lower(intent.token)||lower(tx.input)!==lower(data)||BigInt(tx.value)!==BigInt(0))return false;
 let matched=false,net=BigInt(0);
 for(const log of receipt.logs){if(lower(log.address)!==lower(intent.token))continue;if(log.removed)return false;if(log.topics.length!==3||lower(log.topics[0])!==TRANSFER)continue;if(!/^0x[0-9a-fA-F]{64}$/.test(log.data)||!log.topics.slice(1).every(t=>/^0x[0-9a-fA-F]{64}$/.test(t)&&t.slice(2,26)==='0'.repeat(24)))return false;if(log.transactionHash&&lower(log.transactionHash)!==lower(hash))return false;
 const from='0x'+log.topics[1].slice(26),to='0x'+log.topics[2].slice(26),value=BigInt(log.data);if(lower(to)===lower(intent.recipient)){net+=value;if(lower(from)===lower(intent.sender)&&value===amount)matched=true;}if(lower(from)===lower(intent.recipient))net-=value;}
 return matched&&net===amount;
}
export function sellerAmount(gross:string){const n=BigInt(gross);return (n-n/BigInt(10)).toString();}
// Weekly settlement window: next Monday, 00:00 UTC. No exchange of assets.
export function nextPayoutAt(paidAt:string){const d=new Date(paidAt);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()+((8-d.getUTCDay())%7||7));return d.toISOString();}
