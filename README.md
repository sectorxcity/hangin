# Hangin - Secure Escrow Marketplace

Hangin is a secure, web-based escrow platform designed to facilitate trustless digital transactions, particularly for software and digital goods. 

## What the App Does

In digital transactions, there is often a lack of trust: the buyer doesn't want to send money before seeing the product, and the seller doesn't want to send the product before receiving the money. 

Hangin solves this by acting as a secure middleman:
1. **Secure Deposit**: The buyer deposits funds into the Hangin platform using:
   - **Credit Cards** (via Stripe with 3D Secure fraud protection)
   - **Wrapped BTC** (via EVM-compatible ERC20/BEP20 transactions)
   - **USDT Tether** (via EVM-compatible ERC20/BEP20 transactions)
2. **Funds Held in Escrow**: The funds are locked securely by the platform.
3. **Live Verification**: The buyer and seller enter a live WebRTC Verification Room where the seller shares their screen to prove the software/digital good works as promised.
4. **Resolution**: 
   - If the buyer is satisfied, they accept the offer. The funds are released to the seller (minus a 5% platform fee).
   - If the product is faulty or misrepresented, the buyer can cancel the transaction and instantly refund their money.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Ethers.js (Web3), Stripe.js
- **Backend**: Node.js, Express, SQLite (local dev), Stripe API
- **Real-Time**: Socket.io (Signaling for WebRTC Screen Sharing)
