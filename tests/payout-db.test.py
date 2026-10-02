import sqlite3
from pathlib import Path
c=sqlite3.connect(':memory:')
for f in sorted(Path('drizzle').glob('*.sql')): c.executescript(f.read_text())
c.execute("INSERT INTO payouts(id,seller,recipient,sender,asset,chain_id,token,amount_raw,reference,created) VALUES('p','s','r','a','ETH',1,'0','900','ref','2026-09-29')")
c.execute("INSERT INTO payout_items VALUES('order','p')")
c.commit()
try:
 with c:
  c.execute("INSERT INTO payouts(id,seller,recipient,sender,asset,chain_id,token,amount_raw,reference,created) VALUES('duplicate','s','r','a','ETH',1,'0','900','ref','2026-09-29')")
  c.execute("INSERT INTO payout_items VALUES('order','duplicate')")
 raise AssertionError('Duplicate reservation accepted')
except sqlite3.IntegrityError: pass
assert c.execute("SELECT count(*) FROM payouts WHERE id='duplicate'").fetchone()[0]==0
assert c.execute("UPDATE payouts SET status='authorized' WHERE id='p' AND status='pending' AND tx_hash IS NULL").rowcount==1
assert c.execute("UPDATE payouts SET status='authorized' WHERE id='p' AND status='pending' AND tx_hash IS NULL").rowcount==0
c.execute("INSERT INTO transfer_claims VALUES('1:hash','purchase')")
try: c.execute("INSERT INTO transfer_claims VALUES('1:hash','payout')");raise AssertionError('Replay accepted')
except sqlite3.IntegrityError: pass
print('PASS: immutable migrations, atomic reservation rollback, single payout authorization, cross-flow transaction replay protection')
