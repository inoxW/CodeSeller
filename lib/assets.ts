import { zeroAddress } from 'viem';
export const networks=[
 {id:1,name:'Ethereum',native:'ETH',rpcs:['https://ethereum-rpc.publicnode.com','https://eth.drpc.org'],explorer:'https://etherscan.io'},
 {id:56,name:'BNB Smart Chain',native:'BNB',rpcs:['https://bsc-rpc.publicnode.com','https://bsc.drpc.org'],explorer:'https://bscscan.com'},
 {id:137,name:'Polygon',native:'POL',rpcs:['https://polygon-bor-rpc.publicnode.com','https://polygon.drpc.org'],explorer:'https://polygonscan.com'},
] as const;
export const assets=[
 {id:'USDC_POLYGON',symbol:'USDC',chainId:137,token:'0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',decimals:6,coin:'usd-coin'},
 {id:'POL',symbol:'POL',chainId:137,token:zeroAddress,decimals:18,coin:'polygon-ecosystem-token'},
 {id:'ETH',symbol:'ETH',chainId:1,token:zeroAddress,decimals:18,coin:'ethereum'},
 {id:'USDC_ETHEREUM',symbol:'USDC',chainId:1,token:'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',decimals:6,coin:'usd-coin'},
 {id:'USDT_ETHEREUM',symbol:'USDT',chainId:1,token:'0xdac17f958d2ee523a2206206994597c13d831ec7',decimals:6,coin:'tether'},
 {id:'BNB',symbol:'BNB',chainId:56,token:zeroAddress,decimals:18,coin:'binancecoin'},
] as const;
export type Asset=typeof assets[number];
export function assetById(id:string){return assets.find(a=>a.id===id);}
export function networkById(id:number){return networks.find(n=>n.id===id);}
