# CodeSeller
Wallet-authenticated ZIP marketplace. Buyers transfer the entire invoice amount directly to PLATFORM_FEE_WALLET. Native payments use sendTransaction with the invoice reference; ERC20 payments call the issuer token's transfer function, with no spending approval or marketplace contract.

Supported assets: ETH, BNB, POL, USDC on Ethereum/Polygon, USDT on Ethereum. Prices are in USDC; other assets receive a server-issued quote with a 15-minute sending window. A delayed mining/confirmation never voids an otherwise exact payment. No native BTC/SOL support.

Two independent RPCs verify the chain, finalized canonical receipt, exact authenticated sender/recipient, amount, token, transaction input and invoice creation time. ZIP access is server-gated until confirmation. A global unique transfer claim prevents reuse between purchases and payouts.

Each paid version-3 order creates a seller liability: gross less floor(gross / 10), in the original asset and using the seller address captured at checkout. Prior contract orders are retained for downloads but new invoices use direct payments.

Weekly settlement starts Monday 00:00 UTC for the previous week. The platform owner prepares grouped payouts by seller/address/asset/network. Items are reserved atomically, with a unique order key. The owner signs each transfer in their wallet; no server private key, allowance or automatic withdrawal exists. A database authorization lock prevents simultaneous payout initiation. Submitted transaction hashes survive reload; finalized receipts are required before payout completion. If a wallet tab crashes while authorizing, resume by entering the transaction hash, rather than sending a second payment. Proceeds due to the same platform wallet are marked retained, with no redundant self-transfer.

Private publication preserves the current audience. No real funds were moved during testing.

Validation:
- node --experimental-strip-types tests/direct.test.mjs (actual local native/ERC20 transfers, proofs, 90/10 balances and weekly cutoff)
- python tests/payout-db.test.py (migrations, atomic reservation, concurrent authorization, replay constraints)
- npx tsc --noEmit

Wallet API references: https://viem.sh/docs/actions/wallet/sendTransaction and https://viem.sh/docs/contract/writeContract.


## Live website

https://codeseller-studio.exmashana67.chatgpt.site/

Source files are expanded in this repository. Original archives retain the source and Git history. Production database, uploaded products and secrets remain on Sites. GitHub Pages alone cannot run this dynamic application.
