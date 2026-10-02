import { verifyTransfer } from '@/lib/direct-checkout';
import { nextPayoutAt } from '@/lib/direct-proof';
import { getWalletUser } from '@/lib/wallet-auth';
import { assetById } from '@/lib/assets';
import { feeWallet,platformView,quote,invoiceHash } from '@/lib/split-checkout';
import { db,bucket,identity,sameOrigin,errorResponse,StoreError,productView,orderView,type ProductRow,type OrderRow } from '@/lib/store-server';

export const dynamic='force-dynamic';
export async function GET(){try{const user=await getWalletUser();const products=await db().prepare('SELECT * FROM products WHERE archived=0 ORDER BY created DESC').all<ProductRow>();const orders=user?await db().prepare('SELECT * FROM orders WHERE buyer=? ORDER BY created DESC').bind(user.userId).all<OrderRow>():{results:[]};const sales=user?await db().prepare('SELECT * FROM orders WHERE seller=? ORDER BY created DESC').bind(user.userId).all<OrderRow>():{results:[]};return Response.json({products:products.results.map(p=>productView(p,user?.userId)),orders:orders.results.map(orderView),sales:sales.results.map(orderView),signedIn:!!user,walletAddress:user?.address||null,platform:await platformView()},{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
function field(f:FormData,k:string,max:number,required=true){const v=String(f.get(k)||'').trim();if((required&&!v)||v.length>max)throw new StoreError('Перевірте поле «'+k+'».');return v;}
export async function POST(req:Request){let uploaded:string|undefined;try{sameOrigin(req);const user=await identity();if(Number(req.headers.get('content-length')||0)>52*1024*1024)throw new StoreError('Файл завеликий.',413);const f=await req.formData();const action=field(f,'action',20);
 if(action==='save'){
  const id=field(f,'id',100,false)||crypto.randomUUID();const old=await db().prepare('SELECT * FROM products WHERE id=?').bind(id).first<ProductRow>();if(old&&old.owner!==user.userId)throw new StoreError('Немає доступу до товару.',403);
  const name=field(f,'name',80),description=field(f,'description',2000),wallet=field(f,'wallet',42).toLowerCase(),category=field(f,'category',40),stack=field(f,'stack',80,false),version=field(f,'version',25);
  if(!/^0x[0-9a-f]{40}$/.test(wallet)||/^0x0{40}$/.test(wallet))throw new StoreError('Вкажіть дійсну адресу гаманця Polygon: 0x…');
  if(!['Вебзастосунки','Шаблони','Інструменти','Боти'].includes(category))throw new StoreError('Невідома категорія.');
  const priceText=field(f,'price',20);if(!/^\d{1,5}(\.\d{1,2})?$/.test(priceText))throw new StoreError('Ціна має містити не більше 2 знаків після крапки.');const cents=Math.round(Number(priceText)*100);if(cents<1||cents>1000000)throw new StoreError('Ціна — від 0.01 до 10 000 USDC.');
  const file=f.get('file');let fileKey=old?.file_key,fileName=old?.file_name,size=old?.size;
  if(file instanceof File&&file.size){if(file.size>50*1024*1024||!file.name.toLowerCase().endsWith('.zip'))throw new StoreError('Потрібен ZIP до 50 МБ.');const sig=new Uint8Array(await file.slice(0,4).arrayBuffer());if(sig[0]!==80||sig[1]!==75||!([3,5,7].includes(sig[2])))throw new StoreError('Файл не має сигнатури ZIP.');fileKey='projects/'+crypto.randomUUID()+'.zip';fileName=file.name.replace(/[\r\n\\/]/g,'_').slice(0,180);size=file.size;await bucket().put(fileKey,file.stream(),{httpMetadata:{contentType:'application/zip'}});uploaded=fileKey;}
  if(!fileKey||!fileName||!size)throw new StoreError('Завантажте ZIP-файл.');
  if(old)await db().prepare('UPDATE products SET name=?,description=?,price_cents=?,wallet=?,category=?,stack=?,version=?,file_key=?,file_name=?,size=? WHERE id=? AND owner=?').bind(name,description,cents,wallet,category,stack,version,fileKey,fileName,size,id,user.userId).run();
  else await db().prepare('INSERT INTO products (id,owner,name,description,price_cents,wallet,category,stack,version,color,file_key,file_name,size,created,archived) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)').bind(id,user.userId,name,description,cents,wallet,category,stack,version,'lime',fileKey,fileName,size,new Date().toISOString()).run();
  return Response.json({ok:true});
 }
 if(action==='delete'){const id=field(f,'id',100);const result=await db().prepare('UPDATE products SET archived=1 WHERE id=? AND owner=?').bind(id,user.userId).run();if(!result.meta.changes)throw new StoreError('Товар не знайдено.',404);return Response.json({ok:true});}
 if(action==='invoice'){
  const productId=field(f,'productId',100),asset=assetById(field(f,'asset',40));if(!asset)throw new StoreError('Оберіть підтримувану криптовалюту.');
  const platform=feeWallet();if(!platform)throw new StoreError('Адресу отримання оплат ще не налаштовано.',503);
  const product=await db().prepare('SELECT * FROM products WHERE id=? AND archived=0').bind(productId).first<ProductRow>();if(!product)throw new StoreError('Товар недоступний.',404);
  const existing=await db().prepare("SELECT * FROM orders WHERE buyer=? AND product_id=? AND asset=? AND payment_version=3 AND status='pending' AND deadline>? ORDER BY created DESC LIMIT 1").bind(user.userId,productId,asset.id,Math.floor(Date.now()/1000)).first<OrderRow>();if(existing)return Response.json({order:orderView(existing)});
  const limit=await db().prepare('SELECT COUNT(*) AS n FROM orders WHERE buyer=? AND created>?').bind(user.userId,new Date(Date.now()-3600000).toISOString()).first<{n:number}>();if((limit?.n||0)>=5)throw new StoreError('Можна створити до 5 рахунків на годину.',429);
  const id=crypto.randomUUID(),created=new Date().toISOString(),deadline=Math.floor(Date.now()/1000)+900,amount=await quote(product.price_cents,asset);if(amount<BigInt(10))throw new StoreError('Сума занадто мала для розподілу комісії.');
  await db().prepare("INSERT INTO orders (id,buyer,seller,product_id,name,price_cents,amount_units,wallet,email,file_key,file_name,status,created,last_check,payment_version,asset,chain_id,contract,token,amount_raw,order_hash,deadline,fee_wallet) VALUES (?,?,?,?,?,?,0,?,?,?,?,'pending',?,0,3,?,?,?,?,?,?,?,?)").bind(id,user.userId,product.owner,product.id,product.name,product.price_cents,product.wallet,user.address,product.file_key,product.file_name,created,asset.id,asset.chainId,null,asset.token,amount.toString(),invoiceHash(id),deadline,platform).run();
  const o=await db().prepare('SELECT * FROM orders WHERE id=?').bind(id).first<OrderRow>();return Response.json({order:orderView(o!)});
 }
 if(action==='verify'){
  const id=field(f,'id',100),hash=field(f,'txHash',66).toLowerCase();if(!/^0x[0-9a-f]{64}$/.test(hash))throw new StoreError('Хеш транзакції має починатися з 0x і містити 64 шістнадцяткові символи.');
  const o=await db().prepare('SELECT * FROM orders WHERE id=? AND buyer=?').bind(id,user.userId).first<OrderRow>();if(!o)throw new StoreError('Замовлення не знайдено.',404);if(o.status==='paid')return Response.json({order:orderView(o),result:'paid'});if(o.payment_version!==3)throw new StoreError('Це старий рахунок. Створіть нове замовлення з прямою оплатою платформі.');
  const used=await db().prepare('SELECT id FROM orders WHERE chain_id=? AND tx_hash=? AND id<>?').bind(o.chain_id,hash,id).first();if(used)throw new StoreError('Цю транзакцію вже використано для іншого замовлення.');
  const now=Date.now();const lock=await db().prepare("UPDATE orders SET last_check=? WHERE id=? AND buyer=? AND status='pending' AND last_check<?").bind(now,id,user.userId,now-10000).run();if(!lock.meta.changes)throw new StoreError('Зачекайте 10 секунд перед наступною перевіркою.',429);
  if(!o.fee_wallet||o.fee_wallet!==feeWallet())throw new StoreError('Адреса отримання оплат змінилася. Створіть новий рахунок.');const result=await verifyTransfer(o.chain_id!,hash,{sender:o.email,recipient:o.fee_wallet,token:o.token!,amountRaw:o.amount_raw!,created:o.created,reference:o.order_hash!});
  if(result==='invalid')throw new StoreError('Платіж не відповідає рахунку: перевірте гаманець покупця, адресу платформи, валюту, суму та строк рахунку.');
  if(result==='pending')return Response.json({result,message:'Транзакція ще не знайдена або очікує остаточного підтвердження. Спробуйте за 15 секунд.'});
  const license='CS-'+crypto.randomUUID().toUpperCase();
  const paidAt=new Date().toISOString();
  try{await db().batch([db().prepare('INSERT INTO transfer_claims (key,reference) VALUES (?,?)').bind(o.chain_id+':'+hash,id),db().prepare("UPDATE orders SET status='paid',tx_hash=?,license_key=?,paid_at=?,payout_due=? WHERE id=? AND buyer=? AND status='pending'").bind(hash,license,paidAt,nextPayoutAt(paidAt),id,user.userId)]);}catch(e){if(e instanceof Error&&e.message.includes('UNIQUE constraint'))throw new StoreError('Транзакцію вже використано.');throw e;}
  const paid=await db().prepare('SELECT * FROM orders WHERE id=? AND buyer=?').bind(id,user.userId).first<OrderRow>();return Response.json({result:'paid',order:orderView(paid!)});
 }
 throw new StoreError('Невідома дія.');
 }catch(e){if(uploaded)await bucket().delete(uploaded).catch(()=>{});return errorResponse(e);}}
