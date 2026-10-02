import { headers } from 'next/headers';
import type { Hex } from 'viem';
import { db,StoreError } from './store-server';
export {SESSION_COOKIE,CHALLENGE_COOKIE,APP_ORIGIN,digest,randomToken,cookieValue,cookie,challengeMessage,validSignature} from './wallet-proof';
import { SESSION_COOKIE,cookieValue,digest } from './wallet-proof';
export type WalletUser={userId:string;address:Hex;email:string};
export async function getWalletUser():Promise<WalletUser|null>{const h=await headers();const token=cookieValue(h.get('cookie'),SESSION_COOKIE);if(!/^[0-9a-f]{64}$/.test(token))return null;const session=await db().prepare('SELECT wallet FROM wallet_sessions WHERE hash=? AND expires>?').bind(await digest(token),Date.now()).first<{wallet:string}>();if(!session)return null;return {userId:'wallet:'+session.wallet,address:session.wallet as Hex,email:session.wallet};}
export async function walletIdentity(){const user=await getWalletUser();if(!user)throw new StoreError('Підключіть гаманець і підпишіть повідомлення для входу.',401);return user;}
