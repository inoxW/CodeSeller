import { getChatGPTUser } from '@/app/chatgpt-auth';
import { db,sameOrigin,errorResponse,StoreError } from '@/lib/store-server';
import { digest,randomToken,cookie,cookieValue,SESSION_COOKIE,CHALLENGE_COOKIE,challengeMessage,validSignature,getWalletUser } from '@/lib/wallet-auth';
export const dynamic='force-dynamic';
export async function GET(){try{const user=await getWalletUser();return Response.json({address:user?.address||null},{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
export async function POST(req:Request){try{sameOrigin(req);const f=await req.formData(),action=String(f.get('action')||'');if(action==='logout'){const token=cookieValue(req.headers.get('cookie'),SESSION_COOKIE);if(token)await db().prepare('DELETE FROM wallet_sessions WHERE hash=?').bind(await digest(token)).run();return Response.json({ok:true},{headers:{'Set-Cookie':cookie(SESSION_COOKIE,'',0)}});}
 if(action==='challenge'){
  const wallet=String(f.get('wallet')||'').toLowerCase();if(!/^0x[0-9a-f]{40}$/.test(wallet)||/^0x0{40}$/.test(wallet))throw new StoreError('Некоректна адреса гаманця.');
  const ip=req.headers.get('cf-connecting-ip')||'unknown',key=await digest(ip+':'+Math.floor(Date.now()/60000));const limit=await db().prepare('INSERT INTO auth_limits (key,n,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET n=n+1 RETURNING n').bind(key,Date.now()+120000).first<{n:number}>();if((limit?.n||0)>20)throw new StoreError('Забагато запитів входу. Спробуйте за хвилину.',429);
  const requestedChain=Number(f.get('chainId'));const chainId=[1,56,137].includes(requestedChain)?requestedChain:137;const nonce=randomToken(),browser=randomToken(),expires=Date.now()+300000,message=challengeMessage(wallet,nonce,expires,chainId);
  await db().prepare('INSERT INTO auth_challenges (nonce,wallet,browser_hash,message,expires,used) VALUES (?,?,?,?,?,0)').bind(nonce,wallet,await digest(browser),message,expires).run();
  return Response.json({nonce,message},{headers:{'Set-Cookie':cookie(CHALLENGE_COOKIE,browser,300),'Cache-Control':'no-store'}});
 }
 if(action==='login'){
  const nonce=String(f.get('nonce')||''),signature=String(f.get('signature')||''),browser=cookieValue(req.headers.get('cookie'),CHALLENGE_COOKIE);if(!/^[0-9a-f]{64}$/.test(nonce)||!browser)throw new StoreError('Запит входу застарів. Повторіть підключення.');
  const ch=await db().prepare('SELECT * FROM auth_challenges WHERE nonce=? AND used=0 AND expires>? AND browser_hash=?').bind(nonce,Date.now(),await digest(browser)).first<{wallet:string;message:string;expires:number}>();if(!ch||!await validSignature(ch.message,ch.wallet,signature))throw new StoreError('Підпис не підтверджено.',401);
  const consumed=await db().prepare('UPDATE auth_challenges SET used=1 WHERE nonce=? AND used=0 AND expires>?').bind(nonce,Date.now()).run();if(!consumed.meta.changes)throw new StoreError('Цей підпис уже використано.',401);
  const token=randomToken();await db().prepare('INSERT INTO wallet_sessions (hash,wallet,expires) VALUES (?,?,?)').bind(await digest(token),ch.wallet,Date.now()+7*86400000).run();
  // Only the currently authenticated legacy owner can bind their old records.
  const legacy=await getChatGPTUser();if(legacy){const link=await db().prepare('SELECT wallet FROM wallet_links WHERE legacy_id=?').bind(legacy.userId).first<{wallet:string}>();if(!link){await db().prepare('INSERT OR IGNORE INTO wallet_links (legacy_id,wallet) VALUES (?,?)').bind(legacy.userId,ch.wallet).run();}const bound=await db().prepare('SELECT wallet FROM wallet_links WHERE legacy_id=?').bind(legacy.userId).first<{wallet:string}>();if(bound?.wallet===ch.wallet)await db().batch([db().prepare('UPDATE products SET owner=? WHERE owner=?').bind('wallet:'+ch.wallet,legacy.userId),db().prepare('UPDATE orders SET buyer=? WHERE buyer=?').bind('wallet:'+ch.wallet,legacy.userId),db().prepare('UPDATE orders SET seller=? WHERE seller=?').bind('wallet:'+ch.wallet,legacy.userId)]);}
  const response=Response.json({address:ch.wallet},{headers:{'Cache-Control':'no-store'}});response.headers.append('Set-Cookie',cookie(SESSION_COOKIE,token,7*86400));response.headers.append('Set-Cookie',cookie(CHALLENGE_COOKIE,'',0));return response;
 }throw new StoreError('Невідома дія.');}catch(e){return errorResponse(e);}}
