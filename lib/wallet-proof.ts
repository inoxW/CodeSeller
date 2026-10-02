import {getAddress,verifyMessage,type Hex} from 'viem';
import {createSiweMessage} from 'viem/siwe';
export const SESSION_COOKIE='cs_wallet_session';
export const CHALLENGE_COOKIE='cs_wallet_challenge';
export const APP_ORIGIN='https://codeseller-studio.exmashana67.chatgpt.site';
export async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export function randomToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export function cookieValue(raw:string|null,key:string){return raw?.split(';').map(x=>x.trim()).find(x=>x.startsWith(key+'='))?.slice(key.length+1)||'';}
export function cookie(name:string,value:string,maxAge:number){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;}
export function challengeMessage(wallet:string,nonce:string,expires:number,chainId=137){return createSiweMessage({address:getAddress(wallet),chainId,domain:new URL(APP_ORIGIN).host,uri:APP_ORIGIN,version:'1',nonce,issuedAt:new Date(),expirationTime:new Date(expires),statement:'Sign in to CodeSeller. This signature does not transfer funds or authorize token spending.'});}
export async function validSignature(message:string,address:string,signature:string){if(!/^0x[0-9a-fA-F]{130}$/.test(signature))return false;try{return await verifyMessage({message,address:getAddress(address),signature:signature as Hex});}catch{return false;}}
